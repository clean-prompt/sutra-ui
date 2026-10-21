/**
 * Reading direction: the pure helpers (lib/direction), useDirection and DirectionProvider (document, forced, nested, SSR),
 * and the components that had left-to-right assumptions, driven with `dir="rtl"`: Radix roots get the direction, arrow keys
 * follow the reading order, offsets flip sign, scroll edges read the negative `scrollLeft`, LTR islands stay LTR.
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  directionOf,
  endArrowKey,
  inlineKeyStep,
  inlineScrollOffset,
  inlineSide,
  inlineSign,
  logicalArrow,
  normalizeDirection,
  physicalScrollX,
  scrollLeftForInlineOffset,
  startArrowKey,
  toLogicalDelta,
} from "../src/lib/direction";
import { useDirection } from "../src/hooks/use-direction";
import { useScrollEdges } from "../src/hooks/use-scroll-edges";
import { DirectionProvider } from "../src/primitives/direction-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/primitives/tabs";
import { Slider } from "../src/primitives/slider";
import { Rating } from "../src/primitives/rating";
import { Progress } from "../src/primitives/progress";
import { SlideToConfirm } from "../src/primitives/slide-to-confirm";
import { SegmentedControl } from "../src/primitives/segmented-control";
import { Carousel } from "../src/patterns/carousel";
import { TreeView } from "../src/patterns/tree-view";
import { ChartContainer } from "../src/patterns/chart-container";
import { Marquee } from "../src/assets/marquee";
import { axeViolations } from "./helpers/a11y";

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

describe("lib/direction (pure)", () => {
  it("normalizeDirection accepts only rtl, in any case", () => {
    expect(normalizeDirection("rtl")).toBe("rtl");
    expect(normalizeDirection(" RTL ")).toBe("rtl");
    for (const v of ["ltr", "auto", "", undefined, null, 3]) expect(normalizeDirection(v)).toBe("ltr");
  });

  it("inlineSign and the logical/physical deltas flip together", () => {
    expect(inlineSign("ltr")).toBe(1);
    expect(inlineSign("rtl")).toBe(-1);
    expect(toLogicalDelta(30, "ltr")).toBe(30);
    expect(toLogicalDelta(30, "rtl")).toBe(-30);
    expect(inlineSide(40, "ltr")).toBe("end");
    expect(inlineSide(40, "rtl")).toBe("start");
    expect(inlineSide(-40, "rtl")).toBe("end");
    expect(inlineSide(0, "ltr")).toBe("end");
  });

  it("arrow keys: the key towards the inline end is +1, and logical keys swap in RTL", () => {
    expect(inlineKeyStep("ArrowRight", "ltr")).toBe(1);
    expect(inlineKeyStep("ArrowLeft", "ltr")).toBe(-1);
    expect(inlineKeyStep("ArrowRight", "rtl")).toBe(-1);
    expect(inlineKeyStep("ArrowLeft", "rtl")).toBe(1);
    expect(inlineKeyStep("ArrowUp", "rtl")).toBe(0);
    expect(endArrowKey("ltr")).toBe("ArrowRight");
    expect(endArrowKey("rtl")).toBe("ArrowLeft");
    expect(startArrowKey("ltr")).toBe("ArrowLeft");
    expect(startArrowKey("rtl")).toBe("ArrowRight");
    const rtl = document.createElement("div");
    rtl.dir = "rtl";
    document.body.append(rtl);
    expect(logicalArrow({ key: "ArrowLeft", currentTarget: rtl })).toBe("ArrowRight");
    expect(logicalArrow({ key: "ArrowRight", currentTarget: rtl })).toBe("ArrowLeft");
    expect(logicalArrow({ key: "Enter", currentTarget: rtl })).toBe("Enter");
    expect(logicalArrow({ key: "ArrowLeft", currentTarget: document.body })).toBe("ArrowLeft");
    expect(logicalArrow({ key: "ArrowLeft" })).toBe("ArrowLeft");
    rtl.remove();
  });

  it("scroll offsets: scrollLeft is negative in RTL, so the inline offset is its absolute value", () => {
    expect(inlineScrollOffset(120, "ltr")).toBe(120);
    expect(inlineScrollOffset(-120, "rtl")).toBe(120);
    expect(scrollLeftForInlineOffset(120, "rtl")).toBe(-120);
    expect(scrollLeftForInlineOffset(120, "ltr")).toBe(120);
    // 400px of overflow: at rest (scrollLeft 0) an RTL scroller shows its right end, so it is 400px from the physical left
    expect(physicalScrollX(0, 400, "rtl")).toBe(400);
    expect(physicalScrollX(-400, 400, "rtl")).toBe(0);
    expect(physicalScrollX(150, 400, "ltr")).toBe(150);
  });

  it("directionOf reads the nearest dir ancestor, then the document, and never throws without a DOM node", () => {
    const outer = document.createElement("div");
    outer.dir = "rtl";
    const inner = document.createElement("div");
    inner.dir = "ltr";
    const leaf = document.createElement("span");
    inner.append(leaf);
    outer.append(inner);
    document.body.append(outer);
    expect(directionOf(leaf)).toBe("ltr");
    expect(directionOf(outer)).toBe("rtl");
    expect(directionOf(null)).toBe("ltr");
    document.documentElement.dir = "rtl";
    expect(directionOf(null)).toBe("rtl");
    const plain = document.createElement("p");
    document.body.append(plain);
    expect(directionOf(plain)).toBe("rtl");
    outer.remove();
    plain.remove();
  });
});

function Probe({ id = "probe", useRef = false }: { id?: string; useRef?: boolean }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const dir = useDirection(useRef ? ref : undefined);
  return (
    <span ref={ref} id={id}>
      {dir}
    </span>
  );
}

describe("useDirection and DirectionProvider", () => {
  it("is ltr by default and follows <html dir> live", async () => {
    render(<Probe />);
    expect(screen.getByText("ltr")).toBeInTheDocument();
    await act(async () => {
      document.documentElement.dir = "rtl";
      await Promise.resolve();
    });
    expect(screen.getByText("rtl")).toBeInTheDocument();
    await act(async () => {
      document.documentElement.dir = "ltr";
      await Promise.resolve();
    });
    expect(screen.getByText("ltr")).toBeInTheDocument();
  });

  it("a provider with dir forces its subtree (and renders a display:contents element carrying it); nesting works", () => {
    document.documentElement.dir = "ltr";
    const { container } = render(
      <DirectionProvider dir="rtl" data-testid="outer">
        <Probe id="a" />
        <DirectionProvider dir="ltr">
          <Probe id="b" />
        </DirectionProvider>
        <Probe id="c" />
      </DirectionProvider>
    );
    expect(document.getElementById("a")).toHaveTextContent("rtl");
    expect(document.getElementById("b")).toHaveTextContent("ltr");
    expect(document.getElementById("c")).toHaveTextContent("rtl");
    const outer = screen.getByTestId("outer");
    expect(outer).toHaveAttribute("dir", "rtl");
    expect(outer).toHaveAttribute("data-slot", "direction-provider");
    expect(outer.className).toContain("contents");
    expect(container.querySelectorAll("[dir]")).toHaveLength(2);
  });

  it("a provider without dir renders no element and passes the document direction down", async () => {
    document.documentElement.dir = "rtl";
    const { container } = render(
      <DirectionProvider>
        <Probe />
      </DirectionProvider>
    );
    expect(container.firstElementChild?.tagName).toBe("SPAN");
    expect(screen.getByText("rtl")).toBeInTheDocument();
  });

  it("with a ref it reads the nearest dir ancestor of that element (an LTR island in an RTL page)", () => {
    document.documentElement.dir = "rtl";
    render(
      <div dir="ltr">
        <Probe id="island" useRef />
      </div>
    );
    expect(document.getElementById("island")).toHaveTextContent("ltr");
  });

  it("renders ltr on the server", () => {
    document.documentElement.dir = "rtl";
    expect(renderToString(<Probe />)).toContain(">ltr<");
  });
});

describe("Radix roots get the direction", () => {
  it("Tabs: dir reaches the root and the arrow keys follow it (ArrowLeft goes to the next tab in RTL)", async () => {
    render(
      <DirectionProvider dir="rtl">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
            <TabsTrigger value="c">C</TabsTrigger>
          </TabsList>
          <TabsContent value="a">one</TabsContent>
          <TabsContent value="b">two</TabsContent>
        </Tabs>
      </DirectionProvider>
    );
    expect(document.querySelector('[role="tablist"]')?.closest("[dir]")).toHaveAttribute("dir", "rtl");
    const a = screen.getByRole("tab", { name: "A" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "B" })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole("tab", { name: "B" }), { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "A" })).toHaveFocus());
  });

  it("Tabs read <html dir> without any provider", async () => {
    document.documentElement.dir = "rtl";
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    const a = screen.getByRole("tab", { name: "A" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "B" })).toHaveFocus());
  });

  it("A dir container (no provider) is honoured too, and an LTR island inside an RTL page stays LTR", async () => {
    document.documentElement.dir = "rtl";
    render(
      <div dir="ltr">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    );
    const a = screen.getByRole("tab", { name: "A" });
    expect(a.closest('[dir]')).toHaveAttribute("dir", "ltr");
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "B" })).toHaveFocus());
  });

  it("Slider and SegmentedControl roots carry dir; a consumer dir still wins", () => {
    document.documentElement.dir = "rtl";
    const { container } = render(
      <>
        <Slider defaultValue={[50]} thumbLabels={["Volume"]} />
        <SegmentedControl options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} aria-label="Mode" />
        <Slider defaultValue={[50]} dir="ltr" thumbLabels={["Forced"]} />
      </>
    );
    const roots = [...container.querySelectorAll("[dir]")].map((el) => el.getAttribute("dir"));
    expect(roots.filter((d) => d === "rtl").length).toBeGreaterThanOrEqual(2);
    const thumb = screen.getAllByRole("slider")[0]!;
    fireEvent.keyDown(thumb, { key: "ArrowLeft" });
    expect(thumb).toHaveAttribute("aria-valuenow", "51");
    const forced = screen.getByLabelText("Forced");
    fireEvent.keyDown(forced, { key: "ArrowLeft" });
    expect(forced).toHaveAttribute("aria-valuenow", "49");
  });
});

describe("keys follow the reading order", () => {
  it("Carousel: ArrowLeft is next and ArrowRight previous in RTL", () => {
    const { rerender } = render(
      <div dir="rtl">
        <Carousel label="Featured">{["One", "Two", "Three"].map((t) => <div key={t}>{t}</div>)}</Carousel>
      </div>
    );
    const strip = document.querySelector<HTMLElement>('[data-slot="carousel-track"]') ?? screen.getByRole("region", { name: "Featured" }).querySelector<HTMLElement>("[tabindex]")!;
    strip.focus();
    const current = () => screen.getAllByRole("button", { name: /Go to slide/ }).findIndex((d) => d.getAttribute("aria-current") === "true");
    fireEvent.keyDown(strip, { key: "ArrowLeft" });
    expect(current()).toBe(1);
    fireEvent.keyDown(strip, { key: "ArrowRight" });
    expect(current()).toBe(0);
    rerender(
      <div dir="ltr">
        <Carousel label="Featured">{["One", "Two", "Three"].map((t) => <div key={t}>{t}</div>)}</Carousel>
      </div>
    );
    const strip2 = screen.getByRole("region", { name: "Featured" }).querySelector<HTMLElement>("[tabindex]")!;
    fireEvent.keyDown(strip2, { key: "ArrowRight" });
    expect(screen.getAllByRole("button", { name: /Go to slide/ }).findIndex((d) => d.getAttribute("aria-current") === "true")).toBe(1);
  });

  it("Rating: the key towards the inline end adds a star", () => {
    const { rerender } = render(
      <div dir="rtl">
        <Rating defaultValue={2} />
      </div>
    );
    const checkedIndex = () => screen.getAllByRole("radio").findIndex((r) => r.getAttribute("aria-checked") === "true");
    const group = () => screen.getByRole("radiogroup");
    expect(checkedIndex()).toBe(1);
    fireEvent.keyDown(group(), { key: "ArrowLeft" });
    expect(checkedIndex()).toBe(2);
    fireEvent.keyDown(group(), { key: "ArrowRight" });
    expect(checkedIndex()).toBe(1);
    rerender(
      <div dir="ltr">
        <Rating defaultValue={2} />
      </div>
    );
    fireEvent.keyDown(group(), { key: "ArrowRight" });
    expect(checkedIndex()).toBe(2);
  });

  it("SlideToConfirm: ArrowLeft moves the thumb forward in RTL", () => {
    // Give the track and the thumb a width so the thumb has somewhere to travel, and keep the settling spring still.
    const real = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const slot = this.getAttribute("data-slot");
      const w = slot === "slide-to-confirm" ? 300 : slot === "slide-to-confirm-thumb" ? 40 : null;
      return w === null ? real.call(this) : ({ width: w, height: 48, top: 0, left: 0, right: w, bottom: 48, x: 0, y: 0, toJSON() {} } as DOMRect);
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    render(
      <div dir="rtl">
        <SlideToConfirm label="Slide to pay" />
      </div>
    );
    const thumb = screen.getByRole("slider");
    thumb.focus();
    fireEvent.keyDown(thumb, { key: "ArrowLeft" });
    expect(thumb).toHaveAttribute("aria-valuenow", "10");
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(thumb).toHaveAttribute("aria-valuenow", "0");
    vi.restoreAllMocks();
  });

  it("TreeView: the key towards the inline end expands (ArrowLeft in RTL), the other collapses", () => {
    const nodes = [{ id: "a", label: "Folder", children: [{ id: "a1", label: "File" }] }];
    render(
      <div dir="rtl">
        <TreeView nodes={nodes} aria-label="Files" />
      </div>
    );
    const folder = screen.getByRole("treeitem", { name: /Folder/ });
    folder.focus();
    fireEvent.keyDown(folder, { key: "ArrowLeft" });
    expect(screen.getByRole("treeitem", { name: /Folder/ })).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(screen.getByRole("treeitem", { name: /Folder/ }), { key: "ArrowRight" });
    expect(screen.getByRole("treeitem", { name: /Folder/ })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("offsets and edges flip", () => {
  it("Progress: the fill hides from the end side (translateX sign follows the direction)", () => {
    document.documentElement.dir = "ltr";
    const { rerender } = render(<Progress value={70} aria-label="Upload" />);
    const fill = () => document.querySelector<HTMLElement>('[role="progressbar"] > div')!;
    expect(fill().style.transform).toBe("translateX(-30%)");
    rerender(
      <div dir="rtl">
        <DirectionProvider dir="rtl">
          <Progress value={70} aria-label="Upload" />
        </DirectionProvider>
      </div>
    );
    expect(fill().style.transform).toBe("translateX(30%)");
  });

  function Edges({ rtl }: { rtl: boolean }) {
    const ref = React.useRef<HTMLDivElement>(null);
    const edges = useScrollEdges(ref);
    return (
      <div dir={rtl ? "rtl" : "ltr"}>
        <div ref={ref} data-testid="scroller" />
        <output>{`${edges.left ? "L" : "-"}${edges.right ? "R" : "-"}`}</output>
      </div>
    );
  }
  const shape = (el: HTMLElement, scrollLeft: number) => {
    Object.defineProperty(el, "scrollWidth", { configurable: true, value: 500 });
    Object.defineProperty(el, "clientWidth", { configurable: true, value: 100 });
    Object.defineProperty(el, "scrollLeft", { configurable: true, writable: true, value: scrollLeft });
  };

  it("useScrollEdges keeps left and right physical, using the negative scrollLeft of right-to-left scrollers", () => {
    const { rerender } = render(<Edges rtl={false} />);
    const el = screen.getByTestId("scroller");
    shape(el, 0);
    fireEvent.scroll(el);
    expect(screen.getByRole("status", { hidden: true }) ?? null).toBeTruthy();
    expect(document.querySelector("output")?.textContent).toBe("-R");
    shape(el, 400);
    fireEvent.scroll(el);
    expect(document.querySelector("output")?.textContent).toBe("L-");
    rerender(<Edges rtl />);
    const rtlEl = screen.getByTestId("scroller");
    shape(rtlEl, 0); // at rest an RTL scroller shows its right end: content hides on the left
    fireEvent.scroll(rtlEl);
    expect(document.querySelector("output")?.textContent).toBe("L-");
    shape(rtlEl, -400); // scrolled to the left end
    fireEvent.scroll(rtlEl);
    expect(document.querySelector("output")?.textContent).toBe("-R");
    shape(rtlEl, -200);
    fireEvent.scroll(rtlEl);
    expect(document.querySelector("output")?.textContent).toBe("LR");
  });
});

describe("LTR islands and glyphs", () => {
  it("ChartContainer pins dir=ltr so axes, marks and tooltips keep their coordinates in an RTL page", () => {
    document.documentElement.dir = "rtl";
    render(<ChartContainer label="Revenue">{() => <svg />}</ChartContainer>);
    expect(screen.getByRole("img", { name: "Revenue" })).toHaveAttribute("dir", "ltr");
  });

  it("Marquee runs its track the other way in RTL (rtl: animation-name) and Progress mirrors its indeterminate bar", () => {
    const { container } = render(
      <>
        <Marquee label="Logos">
          <span>One</span>
        </Marquee>
        <Progress aria-label="Loading" />
      </>
    );
    expect(container.querySelector('[data-slot="marquee-track"]')?.className).toContain("rtl:[animation-name:sutra-marquee-rtl]");
    expect(container.querySelector('[role="progressbar"] > div')?.className).toContain("rtl:[animation-name:sutra-indeterminate-rtl]");
  });

  it("direction glyphs carry rtl:-scale-x-100", () => {
    document.documentElement.dir = "rtl";
    render(<SlideToConfirm label="Slide" />);
    expect(document.querySelector('[data-slot="slide-to-confirm-thumb"] svg')?.getAttribute("class")).toContain("rtl:-scale-x-100");
  });

  it("is axe-clean under dir=rtl", async () => {
    const { container } = render(
      <DirectionProvider dir="rtl">
        <Tabs defaultValue="a">
          <TabsList aria-label="Sections">
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">one</TabsContent>
        </Tabs>
        <Slider defaultValue={[20]} thumbLabels={["Volume"]} />
      </DirectionProvider>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
