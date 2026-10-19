/** Private helpers shared by FunnelChart, WaterfallChart, ScatterChart and RadarChart: empty box, label fitting, tooltip placement. */
import * as React from "react";
import { clamp } from "../lib/math";
import type { ChartYAxisOptions } from "./chart-types";
import { niceTicks } from "./chart-scale";

/** Dashed empty box the size of the plot, with the caller's `emptyState` or "No data". */
export function ChartEmptyBox({ height, children }: { height: number; children?: React.ReactNode }) {
  return (
    <div
      data-slot="chart-empty"
      className="flex items-center justify-center rounded-box border border-dashed border-border px-3 text-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {children ?? "No data"}
    </div>
  );
}

/** Average glyph width in px of the 10px chart labels (`text-2xs`), used to fit text without measuring. */
export const LABEL_CHAR_PX = 5.8;

/** Shorten `text` with an ellipsis so it fits about `maxPx` pixels of chart label text. */
export function fitLabel(text: string, maxPx: number): string {
  const max = Math.max(1, Math.floor(maxPx / LABEL_CHAR_PX));
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, Math.max(1, max - 1)).join("")}…`;
}

/**
 * Position for a `ChartTooltip` next to a point at (`x`, `y`): on the side with more room, nudged so it stays
 * inside the plot height. Tooltips are about 144 to 220px wide and up to ~90px tall.
 */
export function tooltipPlacement(x: number, y: number, width: number, height: number, gap = 12): React.CSSProperties {
  const room = Math.max(0, height - 92);
  return {
    left: x,
    top: clamp(y - 24, 0, room),
    transform: x > width / 2 ? `translateX(calc(-100% - ${gap}px))` : `translateX(${gap}px)`,
    maxWidth: Math.max(120, Math.floor(width * 0.7)),
  };
}

/** A ratio as a percentage: whole numbers, one decimal below 10 ("4.2%"). */
export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio)) return "–";
  const pct = ratio * 100;
  return `${Math.abs(pct) < 10 && pct !== 0 ? Math.round(pct * 10) / 10 : Math.round(pct)}%`;
}

/** `value` with an explicit sign (plus or the real minus sign) in front of the formatted magnitude. */
export function signed(value: number, format: (magnitude: number) => string): string {
  if (value > 0) return `+${format(value)}`;
  if (value < 0) return `−${format(-value)}`;
  return format(0);
}

/**
 * Keyboard stepping through `count` stops: arrows move (wrapping), Home and End jump, Escape clears.
 * Returns the next stop, `null` to clear, or `undefined` when the key is not handled.
 */
export function stepIndex(key: string, current: number | null, count: number): number | null | undefined {
  if (count <= 0) return undefined;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return current === null ? 0 : (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return current === null ? count - 1 : (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    case "Escape":
      return null;
    default:
      return undefined;
  }
}

/** Value-axis domain and ticks for data spanning `lo` to `hi`, honouring `min`, `max` and `domain` like the cartesian charts. */
export function valueDomain(
  lo: number,
  hi: number,
  axis: ChartYAxisOptions,
  includeZero: boolean
): { ticks: number[]; d0: number; d1: number } {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  const yMin = axis.min ?? axis.domain?.[0];
  const yMax = axis.max ?? axis.domain?.[1];
  const dMin = typeof yMin === "number" ? yMin : yMin === "auto" ? lo : includeZero ? Math.min(0, lo) : lo;
  let dMax = typeof yMax === "number" ? yMax : hi;
  if (dMax <= dMin) dMax = dMin + 1;
  let ticks = niceTicks(dMin, dMax, axis.tickCount ?? 5);
  const d0 = typeof yMin === "number" ? yMin : ticks[0]!;
  const d1 = typeof yMax === "number" ? yMax : ticks[ticks.length - 1]!;
  const eps = (d1 - d0) * 1e-6;
  ticks = ticks.filter((t) => t >= d0 - eps && t <= d1 + eps);
  return { ticks, d0, d1 };
}

/** Text anchor for a label centered on `x` that would otherwise spill past the left or right edge of a `width`-wide chart. */
export function anchorFor(x: number, label: string, width: number): "start" | "middle" | "end" {
  const half = (Array.from(label).length * LABEL_CHAR_PX) / 2;
  if (x - half < 0) return "start";
  if (x + half > width) return "end";
  return "middle";
}

/** Data-change transition for chart marks: the 500 ms value-fill speed on the shared ease, off under reduced motion. */
export const chartMotion = (animate: boolean) => (animate ? "motion-safe:transition-all motion-safe:duration-500" : "");
