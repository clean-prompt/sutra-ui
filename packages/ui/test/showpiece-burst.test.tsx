/** CheckBurst: particle geometry, when a burst plays (active, burstKey, apiRef), reduced motion, cleanup, a11y. */
import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckBurst, type CheckBurstApi } from "../src/patterns/check-burst";
import { BURST_MAX, burstKeyframes, burstParticles, clampBurstCount } from "../src/lib/burst";
import { axeViolations } from "./helpers/a11y";
import { reduceMotion, resetMedia } from "./helpers/media";

describe("burst geometry", () => {
  it("clamps the count to a whole number from 0 to the maximum", () => {
    expect([clampBurstCount(-3), clampBurstCount(3.6), clampBurstCount(99), clampBurstCount(NaN)]).toEqual([0, 4, BURST_MAX, 0]);
  });
  it("starts straight up, spaces particles evenly and alternates the reach", () => {
    const ps = burstParticles({ count: 4, radius: 40 });
    expect(ps).toHaveLength(4);
    expect(ps[0]).toMatchObject({ dx: 0, dy: -40, angle: -90 });
    expect(ps[1]!.dx).toBeCloseTo(28.8, 1); // 72% reach at 0 degrees
    expect(ps[2]!.dy).toBeCloseTo(40, 5);
    expect(ps.map((p) => p.angle)).toEqual([-90, 0, 90, 180]);
  });
  it("is deterministic and draws dots, dashes or both", () => {
    expect(burstParticles({ count: 6 })).toEqual(burstParticles({ count: 6 }));
    expect(burstParticles({ count: 4, shape: "dots" }).every((p) => p.shape === "dot")).toBe(true);
    const dashes = burstParticles({ count: 4, shape: "dashes", size: 5 });
    expect(dashes.every((p) => p.shape === "dash" && p.width > p.height)).toBe(true);
    expect(burstParticles({ count: 4 }).map((p) => p.shape)).toEqual(["dot", "dash", "dot", "dash"]);
  });
  it("flies out, peaks at a third and fades", () => {
    const kf = burstKeyframes({ dx: 10, dy: -20 });
    expect(kf).toHaveLength(3);
    expect(kf[0]).toMatchObject({ translate: "0px 0px", opacity: 0 });
    expect(kf[1]).toMatchObject({ opacity: 1, offset: 0.35 });
    expect(kf[2]).toMatchObject({ translate: "10px -20px", opacity: 0 });
  });
});

describe("CheckBurst", () => {
  let animate: ReturnType<typeof vi.fn>;
  let finish: Array<() => void>;
  let cancelled: number;
  beforeEach(() => {
    finish = [];
    cancelled = 0;
    animate = vi.fn(() => {
      let resolve!: () => void;
      const finished = new Promise<void>((r) => (resolve = r));
      finish.push(resolve);
      return { finished, cancel: () => void cancelled++ };
    });
    (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
    (Element.prototype as unknown as { animate: unknown }).animate = animate;
    reduceMotion(false);
  });
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
    delete (Element.prototype as unknown as { animate?: unknown }).animate;
    resetMedia();
  });

  it("plays nothing on mount, even when it starts active", () => {
    const { container } = render(<CheckBurst active>done</CheckBurst>);
    expect(animate).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="check-burst-layer"]')).toBeNull();
  });

  it("bursts when active turns on, one animation per particle plus the pop, then clears the layer", async () => {
    const onBurst = vi.fn();
    const onBurstEnd = vi.fn();
    const { rerender, container } = render(<CheckBurst active={false} count={6} onBurst={onBurst} onBurstEnd={onBurstEnd}>x</CheckBurst>);
    rerender(<CheckBurst active count={6} onBurst={onBurst} onBurstEnd={onBurstEnd}>x</CheckBurst>);
    const layer = container.querySelector('[data-slot="check-burst-layer"]');
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer!.children).toHaveLength(6);
    expect(onBurst).toHaveBeenCalledTimes(1);
    const base = animate.mock.calls.length;
    expect(base).toBeGreaterThanOrEqual(7); // 6 particles + the pop (StrictMode may run the effect twice)
    await act(async () => {
      finish.splice(-7).forEach((f) => f());
    });
    expect(container.querySelector('[data-slot="check-burst-layer"]')).toBeNull();
    expect(onBurstEnd).toHaveBeenCalledTimes(1);
  });

  it("sets --i on every particle and keeps the pop off with pop={false}", () => {
    const { container, rerender } = render(<CheckBurst burstKey={0} count={5} pop={false}>x</CheckBurst>);
    rerender(<CheckBurst burstKey={1} count={5} pop={false}>x</CheckBurst>);
    const dots = Array.from(container.querySelectorAll('[data-slot="check-burst-layer"] > span')) as HTMLElement[];
    expect(dots.map((d) => d.style.getPropertyValue("--i"))).toEqual(["0", "1", "2", "3", "4"]);
    expect(animate.mock.calls.every(([kf]) => Array.isArray(kf) && (kf as Keyframe[]).some((k) => "translate" in k))).toBe(true);
  });

  it("bursts again each time burstKey changes and not when it stays", () => {
    const onBurst = vi.fn();
    const { rerender } = render(<CheckBurst burstKey={3} onBurst={onBurst} />);
    rerender(<CheckBurst burstKey={3} onBurst={onBurst} />);
    expect(onBurst).not.toHaveBeenCalled();
    rerender(<CheckBurst burstKey={4} onBurst={onBurst} />);
    rerender(<CheckBurst burstKey={5} onBurst={onBurst} />);
    expect(onBurst).toHaveBeenCalledTimes(2);
  });

  it("apiRef.burst() plays one; unmounting mid-burst cancels the animations", () => {
    const api = React.createRef<CheckBurstApi>();
    const { unmount } = render(<CheckBurst apiRef={api} count={4}>x</CheckBurst>);
    act(() => api.current!.burst());
    expect(animate).toHaveBeenCalled();
    const before = cancelled;
    unmount();
    expect(cancelled).toBeGreaterThan(before);
  });

  it("shows nothing under reduced motion (the callback still runs)", () => {
    reduceMotion(true);
    const onBurst = vi.fn();
    const api = React.createRef<CheckBurstApi>();
    const { container } = render(<CheckBurst apiRef={api} onBurst={onBurst}>x</CheckBurst>);
    act(() => api.current!.burst());
    expect(onBurst).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="check-burst-layer"]')).toBeNull();
  });

  it("without children it is an absolute decoration; tone paints one colour; props spread", () => {
    const api = React.createRef<CheckBurstApi>();
    const { container } = render(<CheckBurst apiRef={api} tone="success" count={3} data-testid="b" className="extra" />);
    expect(screen.getByTestId("b")).toHaveClass("absolute", "extra");
    act(() => api.current!.burst());
    const dots = Array.from(container.querySelectorAll('[data-slot="check-burst-layer"] > span'));
    expect(dots.every((d) => d.className.includes("bg-success"))).toBe(true);
  });

  it("is axe clean while bursting and adds no text", async () => {
    const api = React.createRef<CheckBurstApi>();
    const { container } = render(
      <CheckBurst apiRef={api}>
        <button type="button" aria-pressed="true">Done</button>
      </CheckBurst>
    );
    act(() => api.current!.burst());
    expect(container.textContent).toBe("Done");
    expect(await axeViolations(container)).toEqual([]);
  });
});
