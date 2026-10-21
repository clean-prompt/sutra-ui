/** Sweep over the patterns: lib/svg-path, chart colour tokens, ImageWithFallback, CoachmarkTour measuring, forwarded refs. */
import * as React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { linearPath, monotonePath } from "../src/lib/svg-path";
import { COLOR_TOKENS, resolveColorToken } from "../src/lib/tone";
import { monotonePath as chartMonotonePath, resolveChartColor } from "../src/patterns/chart";
import { Sparkline } from "../src/patterns/sparkline";
import { Gauge } from "../src/patterns/gauge";
import { heatmapColor } from "../src/patterns/heatmap";
import { ImageWithFallback } from "../src/patterns/lightbox";
import { CoachmarkTour } from "../src/patterns/coachmarks";
import { FanMenu } from "../src/patterns/fan-menu";
import { ZoomPan } from "../src/patterns/zoom-pan";
import { FadeText } from "../src/patterns/fade-text";

afterEach(cleanup);

const paths = (container: HTMLElement) => Array.from(container.querySelectorAll("path")).map((p) => p.getAttribute("d"));

describe("lib/svg-path", () => {
  // Outputs pinned from the copies that lived in chart.tsx (rounded) and sparkline.tsx (raw) before the move.
  const series: [number, number][][] = [
    [],
    [[3.333, 7.777]],
    [[0, 10], [10.123, 0.456]],
    [[0, 10], [10, 0], [20, 5]],
    [[0, 1.005], [3.3333, 2.6667], [6.6666, 2.6667], [10, 9.12345], [13.1, -4.2], [13.1, 3], [20, 3]],
  ];

  it("Chart's monotonePath (2-decimal preset) is unchanged", () => {
    expect(series.map((s) => chartMonotonePath(s))).toEqual([
      "",
      "M3.33,7.78",
      "M0,10L10.12,0.46",
      "M0,10C3.33,6.67,6.67,0,10,0C13.33,0,16.67,3.33,20,5",
      "M0,1C1.11,1.56,2.22,2.67,3.33,2.67C4.44,2.67,5.56,2.67,6.67,2.67C7.78,2.67,8.89,9.12,10,9.12C11.03,9.12,12.07,-4.2,13.1,-4.2C13.1,-4.2,13.1,3,13.1,3C15.4,3,17.7,3,20,3",
    ]);
    const r2 = (n: number) => Math.round(n * 100) / 100;
    for (const s of series) expect(monotonePath(s, r2)).toBe(chartMonotonePath(s));
  });

  it("writes raw coordinates without a round function", () => {
    expect(monotonePath([[3.333, 7.777]])).toBe("M3.333,7.777");
    expect(monotonePath([[0, 10], [10.123, 0.456]])).toBe("M0,10L10.123,0.456");
    expect(linearPath([[0, 1.5], [2, 3]])).toBe("M0,1.5L2,3");
    expect(linearPath([])).toBe("");
  });

  it("Sparkline paths are unchanged (smooth and straight, line and area)", () => {
    const smooth =
      "M3.75,28.25C13.125,23.583333333333332,22.5,14.25,31.875,14.25C41.25,14.25,50.625,21.25,60,21.25C69.375,21.25,78.75,3.75,88.125,3.75C97.5,3.75,106.875,17.75,116.25,24.75";
    const straight = "M3.75,28.25L31.875,14.25L60,21.25L88.125,3.75L116.25,24.75";
    const data = [1, 5, 3, 8, 2];
    expect(paths(render(<Sparkline data={data} highlightLast />).container)).toEqual([smooth]);
    expect(paths(render(<Sparkline data={data} type="area" highlightLast />).container)).toEqual([
      `${smooth}L116.25,32L3.75,32Z`,
      smooth,
    ]);
    expect(paths(render(<Sparkline data={data} smooth={false} highlightLast />).container)).toEqual([straight]);
    expect(paths(render(<Sparkline data={[4]} highlightLast />).container)).toEqual(["M3.75,28.25L116.25,28.25"]);
    expect(paths(render(<Sparkline data={[2.5, 7.25, 3.125, 9.0625, 0.5]} highlightLast />).container)).toEqual([
      "M3.75,22.527372262773724C13.125,17.996958637469586,22.5,8.936131386861312,31.875,8.936131386861312C41.25,8.936131386861312,50.625,20.73905109489051,60,20.73905109489051C69.375,20.73905109489051,78.75,3.75,88.125,3.75C97.5,3.75,106.875,20.083333333333336,116.25,28.25",
    ]);
  });

  it("resolveColorToken maps the chart tokens and passes everything else through", () => {
    expect(resolveColorToken("primary")).toBe("var(--primary)");
    expect(resolveColorToken("muted")).toBe("var(--muted-foreground)");
    expect(resolveColorToken("foreground")).toBe("var(--foreground)");
    expect(resolveColorToken("blue")).toBe("blue");
    expect(resolveColorToken("#123")).toBe("#123");
    expect(resolveColorToken("toString")).toBe("toString");
    for (const [token, css] of Object.entries(COLOR_TOKENS)) expect(resolveChartColor(token)).toBe(css);
  });
});

describe("chart colour tokens", () => {
  it("Sparkline resolves color, tone, accent and trend the same way", () => {
    const stroke = (el: React.ReactElement) => render(el).container.querySelector("path")!.getAttribute("stroke");
    expect(stroke(<Sparkline data={[1, 2]} color="muted" />)).toBe("var(--muted-foreground)");
    // `color="neutral"` used to pass through as an invalid CSS colour; it is now the muted token, like `tone="neutral"`.
    expect(stroke(<Sparkline data={[1, 2]} color="neutral" />)).toBe("var(--muted-foreground)");
    expect(stroke(<Sparkline data={[1, 2]} tone="neutral" />)).toBe("var(--muted-foreground)");
    expect(stroke(<Sparkline data={[1, 2]} tone="danger" />)).toBe("var(--destructive)");
    expect(stroke(<Sparkline data={[1, 2]} accent="blue" />)).toBe("#2b7fff");
    expect(stroke(<Sparkline data={[3, 1]} trend />)).toBe("var(--destructive)");
    expect(stroke(<Sparkline data={[1, 3]} trend />)).toBe("var(--success)");
    expect(stroke(<Sparkline data={[1, 3]} />)).toBe("var(--primary)");
  });

  it("Gauge keeps neutral as the foreground colour; Heatmap scales use the token variables", () => {
    const { container } = render(<Gauge value={40} tone="neutral" thresholds={false} />);
    expect(container.innerHTML).toContain("var(--foreground)");
    expect(heatmapColor(100, { scale: "success" })).toBe("var(--success)");
    expect(heatmapColor(30, { scale: "info" })).toBe("color-mix(in oklab, var(--info) 53%, var(--muted))");
  });
});

describe("ImageWithFallback object URLs (useObjectUrl)", () => {
  it("revokes the previous URL when src changes and the last one on unmount", async () => {
    let n = 0;
    const create = vi.fn(() => `blob:mock-${++n}`);
    const revoke = vi.fn();
    const orig = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    try {
      const fetcher = vi.fn(async (src: string) => new Blob([src], { type: "image/png" }));
      const { rerender, unmount } = render(<ImageWithFallback src="/a.png" alt="Pic" fetcher={fetcher} />);
      await waitFor(() => expect(screen.getByRole("img", { name: "Pic" })).toHaveAttribute("src", "blob:mock-1"));
      rerender(<ImageWithFallback src="/b.png" alt="Pic" fetcher={fetcher} />);
      await waitFor(() => expect(screen.getByRole("img", { name: "Pic" })).toHaveAttribute("src", "blob:mock-2"));
      expect(revoke).toHaveBeenCalledWith("blob:mock-1");
      expect(revoke).not.toHaveBeenCalledWith("blob:mock-2");
      unmount();
      expect(revoke).toHaveBeenCalledWith("blob:mock-2");
      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      Object.assign(URL, { createObjectURL: orig.create, revokeObjectURL: orig.revoke });
    }
  });

  it("uses src directly without a fetcher", () => {
    render(<ImageWithFallback src="/plain.png" alt="Plain" />);
    expect(screen.getByRole("img", { name: "Plain" })).toHaveAttribute("src", "/plain.png");
  });
});

describe("CoachmarkTour target measuring (useResizeObserver)", () => {
  it("observes the current step's target and re-measures when it resizes", async () => {
    const observed: Element[] = [];
    const callbacks: ResizeObserverCallback[] = [];
    const disconnect = vi.fn();
    class FakeRO {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }
      observe(el: Element) {
        observed.push(el);
      }
      unobserve() {}
      disconnect = disconnect;
    }
    vi.stubGlobal("ResizeObserver", FakeRO);
    try {
      const a = document.createElement("div");
      a.id = "tour-a";
      const b = document.createElement("div");
      b.id = "tour-b";
      document.body.append(a, b);
      let rect = { top: 10, left: 20, width: 30, height: 40 };
      b.getBoundingClientRect = () => ({ ...rect, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }) as DOMRect;
      const steps = [
        { target: "#tour-a", title: "First" },
        { target: "#tour-b", title: "Second" },
      ];
      const { rerender, unmount } = render(<CoachmarkTour open step={0} steps={steps} />);
      expect(observed).toContain(a);
      rerender(<CoachmarkTour open step={1} steps={steps} />);
      expect(observed[observed.length - 1]).toBe(b);
      expect(disconnect).toHaveBeenCalled();
      const holeX = () => Number(document.querySelector("rect[fill='black']")?.getAttribute("x"));
      await waitFor(() => expect(Number.isFinite(holeX())).toBe(true));
      const before = holeX();
      rect = { top: 50, left: 60, width: 70, height: 80 };
      act(() => callbacks[callbacks.length - 1]!([], {} as ResizeObserver));
      await waitFor(() => expect(holeX()).toBe(before + 40));
      unmount();
      a.remove();
      b.remove();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("forwarded refs (useMergedRefs)", () => {
  it("FanMenu, ZoomPan and FadeText fill callback and object refs", () => {
    const fan = React.createRef<HTMLDivElement>();
    const zoom = vi.fn();
    const fade = React.createRef<HTMLSpanElement>();
    render(
      <>
        <FanMenu ref={fan} label="Menu" icon={<span />} items={[{ id: "a", label: "A", icon: <span /> }]} />
        <ZoomPan ref={zoom} label="Map">
          <span>content</span>
        </ZoomPan>
        <FadeText ref={fade}>Hello</FadeText>
      </>
    );
    expect(fan.current).toBeInstanceOf(HTMLDivElement);
    expect(zoom).toHaveBeenLastCalledWith(expect.any(HTMLDivElement));
    expect(fade.current?.textContent).toBe("Hello");
  });
});
