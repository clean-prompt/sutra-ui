/** Sweep over the primitives: useMergedRefs forwarding, SegmentedControl, ScrollArea, inputShellVariants, CloseButton, tone matrices. */
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Badge } from "../src/primitives/badge";
import { Chip } from "../src/primitives/chip";
import { Combobox } from "../src/primitives/combobox";
import { Dropzone } from "../src/primitives/dropzone";
import { FloatingActionButton as Fab } from "../src/primitives/fab";
import { InlineEditText } from "../src/primitives/inline-edit-text";
import { inputShellVariants, inputVariants } from "../src/primitives/input";
import { AlertBanner } from "../src/primitives/alert-banner";
import { InlineAlert } from "../src/primitives/inline-alert";
import { NumberInput } from "../src/primitives/number-input";
import { Progress } from "../src/primitives/progress";
import { ScrollArea } from "../src/primitives/scroll-area";
import { SegmentedControl } from "../src/primitives/segmented-control";
import { Tabs, TabsList, TabsTrigger } from "../src/primitives/tabs";
import { TagInput } from "../src/primitives/tag-input";

/** Captures every ResizeObserver so a test can fire its callback. */
function mockResizeObserver() {
  const observers: { cb: ResizeObserverCallback; targets: Element[] }[] = [];
  class RO {
    targets: Element[] = [];
    constructor(public cb: ResizeObserverCallback) {
      observers.push(this);
    }
    observe(el: Element) {
      this.targets.push(el);
    }
    unobserve() {}
    disconnect() {
      this.targets = [];
    }
  }
  vi.stubGlobal("ResizeObserver", RO);
  return {
    observers,
    fire() {
      for (const o of observers) if (o.targets.length) o.cb([], o as unknown as ResizeObserver);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ref forwarding through useMergedRefs", () => {
  it("Fab, InlineEditText, TabsList, SegmentedControl and Dropzone's inputRef still reach the node", () => {
    const fab = React.createRef<HTMLButtonElement>();
    const edit = React.createRef<HTMLInputElement>();
    const list = React.createRef<HTMLDivElement>();
    const seg = React.createRef<HTMLDivElement>();
    const dzInput = React.createRef<HTMLInputElement>();
    const cb = vi.fn();
    render(
      <>
        <Fab ref={fab} label="Add" />
        <InlineEditText ref={edit} defaultValue="x" aria-label="Name" />
        <Tabs defaultValue="a">
          <TabsList ref={list}>
            <TabsTrigger value="a">A</TabsTrigger>
          </TabsList>
        </Tabs>
        <SegmentedControl ref={seg} aria-label="View" options={[{ value: "a", label: "A" }]} />
        <Dropzone inputRef={dzInput} />
        <InlineEditText ref={cb} defaultValue="y" aria-label="Other" />
      </>
    );
    expect(fab.current).toBe(screen.getByRole("button", { name: "Add" }));
    expect(edit.current).toBe(screen.getByRole("textbox", { name: "Name" }));
    expect(list.current).toBe(screen.getByRole("tablist"));
    expect(seg.current).toHaveAttribute("aria-label", "View");
    expect(seg.current?.querySelector("[data-segment]")).not.toBeNull();
    expect(dzInput.current).toBeInstanceOf(HTMLInputElement);
    expect(dzInput.current?.type).toBe("file");
    expect(cb).toHaveBeenLastCalledWith(screen.getByRole("textbox", { name: "Other" }));
  });
});

describe("SegmentedControl on useActiveIndicator", () => {
  it("places the thumb under the active segment and re-measures when a segment resizes", () => {
    const ro = mockResizeObserver();
    let width = 40;
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute("data-segment") ? width : 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
      if (!this.hasAttribute("data-segment")) return 0;
      return [...this.parentElement!.querySelectorAll("[data-segment]")].indexOf(this) * 50;
    });
    const options = [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ];
    const { container, rerender } = render(<SegmentedControl aria-label="View" value="b" options={options} />);
    const thumb = () => container.querySelector<HTMLElement>("span[aria-hidden]")!;
    expect(thumb().style.width).toBe("40px");
    expect(thumb().style.transform).toBe("translateX(50px)");
    // The root and every segment are observed.
    const watched = ro.observers.flatMap((o) => o.targets);
    expect(watched).toEqual(expect.arrayContaining([...container.querySelectorAll("[data-segment]")]));

    width = 64;
    act(() => ro.fire());
    expect(thumb().style.width).toBe("64px");

    rerender(<SegmentedControl aria-label="View" value="a" options={options} />);
    expect(thumb().style.transform).toBe("translateX(0px)");
  });
});

describe("ScrollArea on useScrollEdges", () => {
  it("re-checks the edges when the content resizes, and drops the mask when fadeEdges is off", () => {
    const ro = mockResizeObserver();
    let scrollHeight = 100;
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(() => scrollHeight);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    const viewportRef = React.createRef<HTMLDivElement>();
    const { rerender } = render(
      <ScrollArea fadeEdges="vertical" viewportRef={viewportRef}>
        <div>Body</div>
      </ScrollArea>
    );
    const vp = viewportRef.current!;
    // Nothing to scroll yet: no edge is transparent.
    expect(vp.style.maskImage).not.toContain("transparent");
    scrollHeight = 400;
    act(() => ro.fire());
    expect(vp.style.maskImage).toMatch(/^linear-gradient\(to bottom, #000.*transparent\)$/);
    rerender(
      <ScrollArea viewportRef={viewportRef}>
        <div>Body</div>
      </ScrollArea>
    );
    expect(vp.style.maskImage).toBe("");
  });
});

describe("inputShellVariants", () => {
  const tokens = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

  it("control mode carries the focus ring, aria-invalid and :disabled styles", () => {
    const t = tokens(inputShellVariants());
    for (const c of ["rounded-control", "border-input", "focus-visible:ring-[3px]", "aria-invalid:border-destructive", "disabled:opacity-50"]) {
      expect(t.has(c), c).toBe(true);
    }
  });

  it("within mode uses focus-within and state-driven invalid/disabled", () => {
    const base = tokens(inputShellVariants({ focus: "within" }));
    expect(base.has("focus-within:ring-[3px]")).toBe(true);
    expect(base.has("aria-invalid:border-destructive")).toBe(false);
    const invalid = tokens(inputShellVariants({ focus: "within", invalid: true, disabled: true, size: "lg", radius: "box" }));
    for (const c of ["border-destructive", "focus-within:ring-destructive/20", "opacity-50", "h-10", "rounded-[min(var(--radius-control),var(--radius-box))]"]) {
      expect(invalid.has(c), c).toBe(true);
    }
  });

  it("inputVariants keeps the same classes as before the shell was shared", () => {
    expect([...tokens(inputVariants({ size: "sm" }))].sort()).toEqual(
      [
        ...tokens(
          "flex w-full min-w-0 rounded-control border border-input bg-background text-foreground shadow-xs transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground selection:bg-primary/25 file:me-3 file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-subtle outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 h-8 px-2.5 text-sm"
        ),
      ].sort()
    );
  });

  it("NumberInput and TagInput wrappers turn red when invalid (border-input dropped by tailwind-merge)", () => {
    const { container } = render(
      <>
        <NumberInput invalid aria-label="Count" />
        <TagInput invalid aria-label="Tags" />
      </>
    );
    const number = container.querySelector('[data-slot="number-input"]')!;
    expect(number).toHaveClass("border-destructive", "h-9");
    expect(number).not.toHaveClass("border-input");
    const tagShell = screen.getByRole("textbox", { name: "Tags" }).closest("div.rounded-\\[min\\(var\\(--radius-control\\)\\,var\\(--radius-box\\)\\)\\]");
    expect(tagShell).toHaveClass("border-destructive");
  });
});

describe("remove buttons on CloseButton shape=pill", () => {
  it("keep their labels, sizes and click behaviour", () => {
    const onBadge = vi.fn();
    const onChip = vi.fn();
    render(
      <>
        <Badge onRemove={onBadge} removeLabel="Remove beta">beta</Badge>
        <Chip onRemove={onChip} size="sm">alpha</Chip>
        <TagInput defaultValue={["one"]} aria-label="Tags" />
        <Combobox multiple aria-label="Pick" options={[{ value: "a", label: "Apple" }]} defaultValue={["a"]} />
      </>
    );
    const badgeX = screen.getByRole("button", { name: "Remove beta" });
    expect(badgeX).toHaveClass("rounded-full", "size-4", "hover:bg-current/15", "opacity-60");
    expect(badgeX).not.toHaveClass("active:scale-95");
    fireEvent.click(badgeX);
    expect(onBadge).toHaveBeenCalledTimes(1);

    const chipX = screen.getByRole("button", { name: "Remove" });
    expect(chipX).toHaveClass("size-4", "-me-0.5", "hover:bg-current/10");
    expect(chipX).toHaveAttribute("tabindex", "-1");
    fireEvent.click(chipX);
    expect(onChip).toHaveBeenCalledTimes(1);

    const tagX = screen.getByRole("button", { name: "Remove one" });
    expect(tagX).toHaveClass("size-4", "[&_svg]:size-3", "text-muted-foreground", "hover:bg-border");
    fireEvent.click(tagX);
    expect(screen.queryByRole("button", { name: "Remove one" })).toBeNull();

    const comboX = screen.getByRole("button", { name: "Remove Apple" });
    expect(comboX).toHaveClass("size-5", "[&_svg]:size-3");
    expect(comboX).not.toHaveClass("[&_svg]:size-3.5");
  });
});

describe("tone matrices on toneClasses", () => {
  it("keep the component-specific classes where they differ from toneClasses", () => {
    const { container } = render(
      <>
        <Badge variant="outline" tone="success">ok</Badge>
        <Badge tone="neutral">n</Badge>
        <AlertBanner tone="inverse" message="Inverse" />
        <AlertBanner tone="brand" appearance="soft" message="Soft brand" />
        <InlineAlert tone="warning">w</InlineAlert>
        <InlineAlert tone="neutral" appearance="accent">n</InlineAlert>
        <Progress tone="neutral" value={50} aria-label="P" />
        <Chip tone="primary" variant="solid">c</Chip>
      </>
    );
    expect(screen.getByText("ok").parentElement).toHaveClass("border-success/45", "text-success-soft-foreground");
    expect(screen.getByText("n", { selector: "span.truncate" }).parentElement).toHaveClass("bg-muted", "text-foreground");
    expect(screen.getByText("Inverse").closest(".z-40")).toHaveClass("bg-inverse", "text-inverse-foreground");
    expect(screen.getByText("Soft brand").closest(".z-40")).toHaveClass("border-b", "border-primary/20", "bg-primary-soft");
    const alerts = container.querySelectorAll('[role][data-tone]:not(.z-40)');
    expect(alerts[0]).toHaveClass("border-warning/25", "bg-warning-soft", "[&>[data-slot=inline-alert-icon]]:text-warning");
    expect(alerts[1]).toHaveClass("border-border-strong", "bg-subtle", "text-foreground");
    expect(container.querySelector(".bg-foreground")).not.toBeNull();
    expect(screen.getByText("c").closest("span.rounded-control")).toHaveClass("bg-primary", "shadow-inner-highlight");
  });
});
