import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent, type TabsVariant } from "../src/primitives/tabs";
import { Slider } from "../src/primitives/slider";
import { SparkBar, Sparkline } from "../src/patterns/sparkline";
import { useRollingSeries, useSampler } from "../src/hooks/use-rolling-series";
import { ACCENT_COLORS } from "../src/lib/accent";
import { axeViolations } from "./a11y";

const ACCENT_TEXT = "data-[state=active]:text-[var(--sutra-accent,var(--primary))]";

const settleFrame = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));

function SectionTabs({ variant, rootAccent }: { variant?: TabsVariant; rootAccent?: string }) {
  return (
    <Tabs defaultValue="overview" variant={variant} accent={rootAccent}>
      <TabsList aria-label="Sections">
        <TabsTrigger value="overview" accent="blue">
          Overview
        </TabsTrigger>
        <TabsTrigger value="disk" accent="amber" badge={2}>
          Disk
        </TabsTrigger>
        <TabsTrigger value="plain">Plain</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview panel</TabsContent>
      <TabsContent value="disk">Disk panel</TabsContent>
      <TabsContent value="plain">Plain panel</TabsContent>
    </Tabs>
  );
}

const accentVar = (el: HTMLElement) => el.style.getPropertyValue("--sutra-accent");
const indicator = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[role="tablist"] > span[aria-hidden]');

/* jsdom has no layout: give each tab a distinct offset (100px per position) so the indicator's movement is visible. */
function mockTabLayout() {
  const proto = HTMLElement.prototype;
  const saved = (["offsetLeft", "offsetWidth", "offsetHeight", "offsetTop"] as const).map(
    (k) => [k, Object.getOwnPropertyDescriptor(proto, k)] as const
  );
  const indexOf = (el: HTMLElement) =>
    el.getAttribute("role") === "tab" ? Array.from(el.parentElement!.querySelectorAll('[role="tab"]')).indexOf(el) : 0;
  Object.defineProperty(proto, "offsetLeft", { configurable: true, get() { return indexOf(this) * 100; } });
  Object.defineProperty(proto, "offsetWidth", { configurable: true, get() { return 80; } });
  Object.defineProperty(proto, "offsetHeight", { configurable: true, get() { return 28; } });
  Object.defineProperty(proto, "offsetTop", { configurable: true, get() { return 0; } });
  return () => {
    for (const [k, d] of saved) {
      if (d) Object.defineProperty(proto, k, d);
      else delete (proto as unknown as Record<string, unknown>)[k];
    }
  };
}

describe("Tabs accent", () => {
  let restoreLayout: () => void;
  beforeEach(() => {
    restoreLayout = mockTabLayout();
  });
  afterEach(() => restoreLayout());

  it.each<TabsVariant>(["pill", "underline", "solid", "ghost"])(
    "%s: per-trigger accents; the indicator follows the active trigger and takes its colour",
    async (variant) => {
      const user = userEvent.setup();
      const { container } = render(<SectionTabs variant={variant} />);
      await settleFrame();
      const overview = screen.getByRole("tab", { name: "Overview" });
      const disk = screen.getByRole("tab", { name: /Disk/ });
      const plain = screen.getByRole("tab", { name: "Plain" });

      expect(accentVar(overview)).toBe(ACCENT_COLORS.blue);
      expect(accentVar(disk)).toBe(ACCENT_COLORS.amber);
      expect(accentVar(plain)).toBe("");
      expect(plain).not.toHaveAttribute("data-accent");
      expect(plain.className).not.toContain("--sutra-accent");
      // Inactive triggers stay neutral.
      expect(disk).toHaveAttribute("data-state", "inactive");
      expect(disk.className).toContain("text-muted-foreground");

      if (variant === "solid") expect(overview.className).toContain("data-[state=active]:bg-[var(--sutra-accent,var(--primary))]");
      else expect(overview.className).toContain(ACCENT_TEXT);
      if (variant === "underline")
        expect(overview.className).toContain("data-[state=active]:after:bg-[var(--sutra-accent,var(--primary))]");
      if (variant === "pill" || variant === "ghost")
        expect(overview.className).toContain(
          "data-[state=active]:bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_14%,transparent)]"
        );

      if (variant === "ghost") {
        expect(indicator(container)).toBeNull();
        await user.click(disk);
        expect(disk).toHaveAttribute("data-state", "active");
      } else {
        // Accented triggers hand their fill to the indicator once it is measured.
        expect(overview.className).toContain("group-data-[indicator=ready]/tabs-list:data-[state=active]");
        let ind = indicator(container)!;
        expect(accentVar(ind)).toBe(ACCENT_COLORS.blue);
        expect(ind.className).toContain("var(--sutra-accent,var(--primary))");
        expect(ind.className).toContain("motion-reduce:transition-none");
        expect(ind.style.left).toBe("0px");

        await user.click(disk);
        ind = indicator(container)!;
        expect(disk).toHaveAttribute("data-state", "active");
        expect(ind.style.left).toBe("100px");
        expect(accentVar(ind)).toBe(ACCENT_COLORS.amber);

        // A neutral trigger in a mix gets the plain indicator.
        await user.click(plain);
        ind = indicator(container)!;
        expect(ind.style.left).toBe("200px");
        expect(accentVar(ind)).toBe("");
        expect(ind.className).not.toContain("--sutra-accent");
      }
      expect(await axeViolations(container)).toEqual([]);
    }
  );

  it("a root accent colours the indicator for triggers without their own; trigger accents override it", async () => {
    const user = userEvent.setup();
    const { container } = render(<SectionTabs variant="pill" rootAccent="green" />);
    await settleFrame();
    const root = container.firstElementChild as HTMLElement;
    expect(accentVar(root)).toBe(ACCENT_COLORS.green);
    const plain = screen.getByRole("tab", { name: "Plain" });
    expect(plain.className).toContain(ACCENT_TEXT);
    expect(plain.className).toContain("group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent");
    expect(accentVar(indicator(container)!)).toBe(ACCENT_COLORS.blue);

    await user.click(plain);
    const ind = indicator(container)!;
    expect(ind.style.left).toBe("200px");
    // No own accent on the active trigger: the indicator inherits the root's variable.
    expect(accentVar(ind)).toBe("");
    expect(ind.className).toContain("bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_14%,transparent)]");
    expect(ind.className).not.toContain("bg-background");
  });

  it("follows a change of the active trigger's accent", async () => {
    const { container, rerender } = render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Live">
          <TabsTrigger value="a" accent="blue">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    await settleFrame();
    expect(accentVar(indicator(container)!)).toBe(ACCENT_COLORS.blue);
    rerender(
      <Tabs defaultValue="a">
        <TabsList aria-label="Live">
          <TabsTrigger value="a" accent="pink">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    await settleFrame();
    expect(accentVar(indicator(container)!)).toBe(ACCENT_COLORS.pink);
  });

  it("without an accent nothing changes", async () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Plain tabs">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    await settleFrame();
    const a = screen.getByRole("tab", { name: "A" });
    expect(a.className).not.toContain("--sutra-accent");
    expect(a).not.toHaveAttribute("data-accent");
    expect(a.getAttribute("style")).toBeNull();
    expect((container.firstElementChild as HTMLElement).getAttribute("style")).toBeNull();
    const ind = indicator(container)!;
    expect(ind.className).toContain("bg-background");
    expect(ind.className).toContain("transition-[left,top,width,height]");
    expect(accentVar(ind)).toBe("");
  });
});

describe("Slider accent", () => {
  it("colours the range and thumb from the accent", () => {
    const { container } = render(<Slider accent="pink" defaultValue={[40]} aria-label="Volume" thumbLabels={["Volume"]} />);
    expect(accentVar(container.firstElementChild as HTMLElement)).toBe(ACCENT_COLORS.pink);
    const range = container.querySelector<HTMLElement>(".absolute.h-full.rounded-full")!;
    expect(range.className).toContain("bg-[var(--sutra-accent,var(--primary))]");
    expect(range.className).not.toContain("bg-primary");
    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb.className).toContain("border-[var(--sutra-accent,var(--primary))]");
    expect(thumb.className).not.toContain("border-primary");
  });

  it("tone maps to the semantic colour; the default stays primary; invalid wins", () => {
    const { container, rerender } = render(<Slider tone="success" defaultValue={[10]} thumbLabels={["Level"]} />);
    expect(accentVar(container.firstElementChild as HTMLElement)).toBe("var(--success)");
    rerender(<Slider defaultValue={[10]} thumbLabels={["Level"]} />);
    expect(accentVar(container.firstElementChild as HTMLElement)).toBe("");
    expect(screen.getByRole("slider").className).toContain("border-primary");
    rerender(<Slider accent="blue" invalid defaultValue={[10]} thumbLabels={["Level"]} />);
    expect(screen.getByRole("slider").className).toContain("border-destructive");
    expect(screen.getByRole("slider").className).not.toContain("--sutra-accent");
  });
});

describe("SparkBar scale and accent", () => {
  const heights = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("rect")).map((r) => Number(r.getAttribute("height")));

  it("draws on a fixed 0–100 scale when max is set", () => {
    const { container } = render(<SparkBar data={[25, 50, 100, 150]} max={100} height={40} label="CPU load" />);
    const [a, b, c, d] = heights(container);
    expect(a).toBe(10);
    expect(b).toBe(20);
    expect(c).toBe(40);
    expect(d).toBe(40); // clamped to the scale
    expect(container.querySelector("rect")!.getAttribute("y")).toBe("30");
  });

  it("auto-scales by default and honours min", () => {
    const { container, rerender } = render(<SparkBar data={[25, 50]} height={40} />);
    expect(heights(container)).toEqual([20, 40]);
    rerender(<SparkBar data={[60, 80, 100]} min={50} max={100} height={40} />);
    expect(heights(container)).toEqual([8, 24, 40]);
  });

  it("Sparkline type=bar forwards min/max", () => {
    const { container } = render(<Sparkline type="bar" data={[25]} max={100} height={40} />);
    expect(heights(container)).toEqual([10]);
  });

  it("accepts an accent; color keeps precedence; the accent variable works as a colour", () => {
    const { container, rerender } = render(<SparkBar data={[1, 2]} accent="amber" />);
    expect(container.querySelector("rect")!.style.fill).toBe(ACCENT_COLORS.amber);
    rerender(<SparkBar data={[1, 2]} accent="amber" color="#123456" />);
    expect(container.querySelector("rect")!.style.fill).toBe("#123456");
    rerender(<SparkBar data={[1, 2]} color="var(--sutra-accent, var(--primary))" />);
    expect(container.querySelector("rect")!.style.fill).toBe("var(--sutra-accent, var(--primary))");
    rerender(<SparkBar data={[1, 2]} />);
    expect(container.querySelector("rect")!.style.fill).toBe("var(--primary)");

    rerender(<Sparkline data={[1, 3, 2]} accent="purple" trend label="Memory" />);
    expect(container.querySelector("path")!.getAttribute("stroke")).toBe(ACCENT_COLORS.purple);
    rerender(<Sparkline data={[1, 3, 2]} accent="purple" tone="success" label="Memory" />);
    expect(container.querySelector("path")!.getAttribute("stroke")).toBe("var(--success)");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <SparkBar data={[10, 20]} max={100} accent="blue" label="CPU usage" />
        <Sparkline data={[10, 20]} accent="green" label="Network" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("useRollingSeries", () => {
  it("keeps the last `capacity` values and accepts arrays", () => {
    const { result } = renderHook(() => useRollingSeries({ capacity: 3, initial: [1, 2, 3, 4] }));
    expect(result.current.data).toEqual([2, 3, 4]);
    act(() => result.current.push(5));
    expect(result.current.data).toEqual([3, 4, 5]);
    act(() => result.current.push([6, 7]));
    expect(result.current.data).toEqual([5, 6, 7]);
    act(() => result.current.push([8, 9, 10, 11]));
    expect(result.current.data).toEqual([9, 10, 11]);
  });

  it("reset replaces or restores the initial values; callbacks are stable", () => {
    const { result } = renderHook(() => useRollingSeries<number>({ capacity: 2, initial: [0] }));
    const { push, reset } = result.current;
    act(() => push([1, 2]));
    act(() => result.current.reset([7, 8, 9]));
    expect(result.current.data).toEqual([8, 9]);
    act(() => result.current.reset());
    expect(result.current.data).toEqual([0]);
    expect(result.current.push).toBe(push);
    expect(result.current.reset).toBe(reset);
  });

  it("applies a smaller capacity immediately and handles 0", () => {
    const { result, rerender } = renderHook(({ capacity }) => useRollingSeries({ capacity, initial: [1, 2, 3] }), {
      initialProps: { capacity: 3 },
    });
    rerender({ capacity: 2 });
    expect(result.current.data).toEqual([2, 3]);
    act(() => result.current.push(4));
    expect(result.current.data).toEqual([3, 4]);
    rerender({ capacity: 0 });
    expect(result.current.data).toEqual([]);
  });

  it("works with non-number values", () => {
    const { result } = renderHook(() => useRollingSeries<{ t: number }>({ capacity: 2 }));
    act(() => result.current.push({ t: 1 }));
    act(() => result.current.push([{ t: 2 }, { t: 3 }]));
    expect(result.current.data).toEqual([{ t: 2 }, { t: 3 }]);
  });
});

describe("useSampler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("samples every interval and keeps capacity (StrictMode does not double-sample)", () => {
    let n = 0;
    const read = vi.fn(() => ++n);
    const { result } = renderHook(() => useSampler(read, { interval: 1000, capacity: 3 }));
    expect(result.current.data).toEqual([]);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.data).toEqual([1]);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.data).toEqual([2, 3, 4]);
    expect(read).toHaveBeenCalledTimes(4);
  });

  it("immediate samples once on mount even under StrictMode", () => {
    let n = 0;
    const { result } = renderHook(() => useSampler(() => ++n, { interval: 500, capacity: 10, immediate: true }));
    expect(result.current.data).toEqual([1]);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.data).toEqual([1, 2]);
  });

  it("pauses while disabled and clears its timer on unmount", () => {
    let n = 0;
    const read = vi.fn(() => ++n);
    const { result, rerender, unmount } = renderHook(
      ({ enabled }) => useSampler(read, { interval: 100, capacity: 5, enabled }),
      { initialProps: { enabled: true } }
    );
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.data).toEqual([1, 2]);
    rerender({ enabled: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.data).toEqual([1, 2]);
    rerender({ enabled: true });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.data).toEqual([1, 2, 3]);
    unmount();
    const calls = read.mock.calls.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(read.mock.calls.length).toBe(calls);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the latest read function without restarting the timer", () => {
    const { result, rerender } = renderHook(({ v }) => useSampler(() => v, { interval: 100, capacity: 5 }), {
      initialProps: { v: "a" },
    });
    act(() => vi.advanceTimersByTime(50));
    rerender({ v: "b" });
    act(() => vi.advanceTimersByTime(50));
    expect(result.current.data).toEqual(["b"]);
  });
});
