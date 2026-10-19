import * as React from "react";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollSections } from "../src/hooks/use-scroll-sections";
import { SectionRail } from "../src/patterns/section-rail";
import { BlogTableOfContents } from "../src/patterns/blog-content";
import { axeViolations } from "./a11y";

/** A controllable IntersectionObserver: tests decide which elements are "in view". */
type Observed = { cb: IntersectionObserverCallback; els: Element[]; init?: IntersectionObserverInit; disconnected: boolean };
let observers: Observed[] = [];
const RealIO = globalThis.IntersectionObserver;

beforeEach(() => {
  observers = [];
  class FakeIO {
    record: Observed;
    constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
      this.record = { cb, els: [], init, disconnected: false };
      observers.push(this.record);
    }
    observe(el: Element) {
      this.record.els.push(el);
    }
    unobserve() {}
    disconnect() {
      this.record.disconnected = true;
    }
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  globalThis.IntersectionObserver = RealIO;
  vi.restoreAllMocks();
});

const live = () => observers.filter((o) => !o.disconnected).at(-1)!;
function see(...ids: string[]) {
  const o = live();
  act(() => {
    o.cb(
      o.els.map((el) => ({ target: el, isIntersecting: ids.includes(el.id) }) as IntersectionObserverEntry),
      {} as IntersectionObserver
    );
  });
}

function Sections({ ids }: { ids: string[] }) {
  return (
    <div>
      {ids.map((id) => (
        <h2 key={id} id={id}>
          {id}
        </h2>
      ))}
    </div>
  );
}

const sections = [
  { id: "intro", label: "Intro" },
  { id: "usage", label: "Usage" },
  { id: "api", label: "API", level: 3 },
];

describe("useScrollSections", () => {
  it("starts on the first id, follows the first visible section and stays when none is visible", () => {
    const { result } = renderHook(() => useScrollSections({ ids: ["intro", "usage", "api"] }), {
      wrapper: ({ children }) => (
        <>
          <Sections ids={["intro", "usage", "api"]} />
          {children}
        </>
      ),
    });
    expect(result.current.active).toBe("intro");
    see("usage", "api");
    expect(result.current.active).toBe("usage");
    see();
    expect(result.current.active).toBe("usage");
  });

  it("builds the root margin from offset, lets rootMargin override and observes in order", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <>
        <Sections ids={["a", "b"]} />
        {children}
      </>
    );
    const first = renderHook(() => useScrollSections({ ids: ["a", "b"], offset: 80 }), { wrapper });
    expect(live().init?.rootMargin).toBe("-80px 0px -65% 0px");
    first.unmount();
    renderHook(() => useScrollSections({ ids: ["a", "b"], rootMargin: "10px 0px -50% 0px" }), { wrapper });
    expect(live().init?.rootMargin).toBe("10px 0px -50% 0px");
    expect(live().els.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("scrollTo scrolls the element, activates it, and reports a missing element", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const onActiveChange = vi.fn();
    const { result } = renderHook(() => useScrollSections({ ids: ["intro", "usage"], onActiveChange }), {
      wrapper: ({ children }) => (
        <>
          <Sections ids={["intro", "usage"]} />
          {children}
        </>
      ),
    });
    let ok = false;
    act(() => {
      ok = result.current.scrollTo("usage");
    });
    expect(ok).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(result.current.active).toBe("usage");
    expect(onActiveChange).toHaveBeenCalledWith("usage");
    act(() => {
      ok = result.current.scrollTo("nope");
    });
    expect(ok).toBe(false);
    expect(result.current.active).toBe("usage");
  });

  it("jumps instead of smooth-scrolling under reduced motion and when smooth is false", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <>
        <Sections ids={["a"]} />
        {children}
      </>
    );
    const calm = renderHook(() => useScrollSections({ ids: ["a"], smooth: false }), { wrapper });
    act(() => void calm.result.current.scrollTo("a"));
    expect(scroll).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
    calm.unmount();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList
    );
    const reduced = renderHook(() => useScrollSections({ ids: ["a"] }), { wrapper });
    act(() => void reduced.result.current.scrollTo("a"));
    expect(scroll).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
  });

  it("does not observe when disabled, and disconnects on unmount", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <>
        <Sections ids={["a"]} />
        {children}
      </>
    );
    renderHook(() => useScrollSections({ ids: ["a"], enabled: false }), { wrapper });
    expect(observers).toHaveLength(0);
    const on = renderHook(() => useScrollSections({ ids: ["a"] }), { wrapper });
    expect(observers.length).toBeGreaterThan(0);
    on.unmount();
    expect(observers.every((o) => o.disconnected)).toBe(true);
  });

  it("observes inside a scroll container given as a ref", () => {
    const container = document.createElement("div");
    const ref = { current: container };
    renderHook(() => useScrollSections({ ids: ["a"], root: ref }), {
      wrapper: ({ children }) => (
        <>
          <Sections ids={["a"]} />
          {children}
        </>
      ),
    });
    expect(live().init?.root).toBe(container);
  });
});

describe("SectionRail", () => {
  it("renders anchors in a labelled nav, indents by level and marks the active one", () => {
    render(
      <>
        <SectionRail sections={sections} />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    const nav = screen.getByRole("navigation", { name: "Table of contents" });
    expect(within(nav).getByText("On this page")).toBeInTheDocument();
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["#intro", "#usage", "#api"]);
    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[2]!.style.paddingInlineStart).toBe("24px");
    see("usage");
    expect(links[1]).toHaveAttribute("aria-current", "location");
    expect(links[0]).not.toHaveAttribute("aria-current");
  });

  it("clicking scrolls, activates, writes the href and reports the change", async () => {
    const user = userEvent.setup();
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const replace = vi.spyOn(history, "replaceState");
    const onValueChange = vi.fn();
    render(
      <>
        <SectionRail sections={sections} onValueChange={onValueChange} />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    await user.click(screen.getByRole("link", { name: "API" }));
    expect(scroll).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(null, "", "#api");
    expect(screen.getByRole("link", { name: "API" })).toHaveAttribute("aria-current", "location");
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("api");
  });

  it("is controlled with value: no tracking, a click scrolls and asks for the change", async () => {
    const user = userEvent.setup();
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const onValueChange = vi.fn();
    render(
      <>
        <SectionRail sections={sections} value="usage" onValueChange={onValueChange} />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    expect(observers).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("aria-current", "location");
    await user.click(screen.getByRole("link", { name: "API" }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("api");
    // the parent has not accepted it
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("aria-current", "location");
  });

  it("leaves modified clicks and smoothScroll={false} to the browser", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const { rerender } = render(
      <>
        <SectionRail sections={sections} />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    fireEvent.click(screen.getByRole("link", { name: "API" }), { ctrlKey: true });
    expect(scroll).not.toHaveBeenCalled();
    rerender(
      <>
        <SectionRail sections={sections} smoothScroll={false} />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "API" }));
    expect(notPrevented).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
  });

  it("still reports a click when controlled, even without scrolling or when the target is missing", () => {
    const onValueChange = vi.fn();
    render(<SectionRail sections={sections} value="intro" smoothScroll={false} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("link", { name: "Usage" }));
    expect(onValueChange).toHaveBeenLastCalledWith("usage");
    // targets missing from the document: no preventDefault, the change is still reported
    const smooth = render(<SectionRail sections={sections} value="intro" onValueChange={onValueChange} />);
    const ok = fireEvent.click(within(smooth.container).getByRole("link", { name: "API" }));
    expect(ok).toBe(true);
    expect(onValueChange).toHaveBeenLastCalledWith("api");
  });

  it("uses getHref for the link and the address bar", async () => {
    const user = userEvent.setup();
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const replace = vi.spyOn(history, "replaceState");
    render(
      <>
        <SectionRail sections={sections} getHref={(id) => `#/docs/page/${id}`} />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    expect(screen.getByRole("link", { name: "Usage" })).toHaveAttribute("href", "#/docs/page/usage");
    await user.click(screen.getByRole("link", { name: "Usage" }));
    expect(replace).toHaveBeenCalledWith(null, "", "#/docs/page/usage");
  });

  it("horizontal: a tab row without a heading or indent, keeping the active tab in its scroller", () => {
    render(
      <>
        <SectionRail sections={sections} orientation="horizontal" label="Sections" />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav).toHaveAttribute("data-orientation", "horizontal");
    expect(within(nav).queryByText("On this page")).toBeNull();
    expect(within(nav).getAllByRole("link")[2]!.style.paddingInlineStart).toBe("");
    expect(nav.querySelector("ul")!.className).toContain("overflow-x-auto");
    see("api");
    expect(within(nav).getByRole("link", { name: "API" })).toHaveAttribute("aria-current", "location");
  });

  it("loading shows busy placeholders in the layout, never links; empty shows the empty state or nothing", () => {
    const { container, rerender } = render(<SectionRail sections={[]} loading />);
    const nav = screen.getByRole("navigation", { name: "Table of contents" });
    expect(nav).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(observers).toHaveLength(0);
    rerender(<SectionRail sections={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SectionRail sections={[]} emptyState="No headings" />);
    expect(screen.getByText("No headings")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("forwards ref, className and props, and accepts a custom title", () => {
    const ref = React.createRef<HTMLElement>();
    render(<SectionRail ref={ref} sections={sections} className="x" title="Contents" data-testid="r" />);
    expect(ref.current).toBe(screen.getByTestId("r"));
    expect(ref.current).toHaveClass("x");
    expect(screen.getByText("Contents")).toBeInTheDocument();
  });

  it("has no axe violations in either orientation, loading and empty", async () => {
    const { container, rerender } = render(
      <>
        <SectionRail sections={sections} />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    expect(await axeViolations(container)).toEqual([]);
    rerender(
      <>
        <SectionRail sections={sections} orientation="horizontal" />
        <Sections ids={["intro", "usage", "api"]} />
      </>
    );
    expect(await axeViolations(container)).toEqual([]);
    rerender(<SectionRail sections={[]} loading />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("BlogTableOfContents as a SectionRail preset", () => {
  it("keeps its name, title and tracking, and passes activeId through as the controlled value", () => {
    const { rerender } = render(
      <>
        <BlogTableOfContents headings={[{ id: "intro", title: "Intro" }, { id: "setup", title: "Setup", level: 3 }]} />
        <Sections ids={["intro", "setup"]} />
      </>
    );
    expect(screen.getByRole("navigation", { name: "Table of contents" })).toBeInTheDocument();
    expect(screen.getByText("On this page")).toBeInTheDocument();
    see("setup");
    expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute("aria-current", "location");
    rerender(
      <>
        <BlogTableOfContents title={null} activeId="intro" headings={[{ id: "intro", title: "Intro" }, { id: "setup", title: "Setup" }]} />
        <Sections ids={["intro", "setup"]} />
      </>
    );
    expect(screen.queryByText("On this page")).toBeNull();
    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute("aria-current", "location");
  });
});
