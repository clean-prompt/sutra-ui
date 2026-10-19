import * as React from "react";
import { RiFlashlightFill } from "@remixicon/react";
import { cn, type Size } from "../lib/cn";
import { clamp } from "../lib/math";
import { toneClasses } from "../lib/tone";
import { accentClasses, accentStyle, type Accent } from "../lib/accent";
import { Skeleton } from "./progress";

export type BatteryLevelVariant = "icon" | "bar" | "text";

/** Status of a battery reading: `critical` at or below `critical`, `low` at or below `low`, otherwise `ok`. */
export type BatteryLevelState = "ok" | "low" | "critical" | "unknown";

export interface BatteryThresholds {
  /** At or below this percentage the level reads as low (warning). Default 20. */
  low?: number;
  /** At or below this percentage the level reads as critical (destructive). Default 10. */
  critical?: number;
}

/** Classify a battery percentage against the thresholds. */
export function batteryLevelState(value: number | null | undefined, { low = 20, critical = 10 }: BatteryThresholds = {}): BatteryLevelState {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown";
  const pct = clamp(value, 0, 100);
  if (pct <= critical) return "critical";
  if (pct <= low) return "low";
  return "ok";
}

/** Accessible description of a reading, e.g. "42% battery, charging" or "8% battery, critically low". */
export function formatBatteryLevel(
  value: number | null | undefined,
  { charging = false, ...thresholds }: BatteryThresholds & { charging?: boolean } = {}
): string {
  const state = batteryLevelState(value, thresholds);
  if (state === "unknown") return charging ? "Battery level unknown, charging" : "Battery level unknown";
  const parts = [`${Math.round(clamp(value as number, 0, 100))}% battery`];
  if (charging) parts.push("charging");
  if (state === "critical") parts.push("critically low");
  else if (state === "low") parts.push("low");
  return parts.join(", ");
}

export interface BatteryLevelProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Charge 0–100. `null`/`undefined` renders an unknown reading ("—"). */
  value?: number | null;
  /**
   * Shows a charging bolt and announces "charging".
   * @default false
   */
  charging?: boolean;
  /** Low threshold (warning tone). Default 20. */
  low?: number;
  /** Critical threshold (destructive tone). Default 10. */
  critical?: number;
  /** `icon`: battery glyph + percentage · `bar`: small horizontal bar + percentage · `text`: percentage only. Default `icon`. */
  variant?: BatteryLevelVariant;
  /** Glyph and text size. */
  size?: Size;
  /** Show the percentage next to the glyph or bar. Default true. */
  showValue?: boolean;
  /** Fill colour in the normal range (thresholds and charging still win). Default foreground. */
  accent?: Accent;
  /** Accessible text override. Default from `formatBatteryLevel`, e.g. "42% battery, charging". */
  label?: string;
  /** Waiting for the first reading: with no `value` the glyph or bar is an empty placeholder with no percentage. */
  loading?: boolean;
}

const glyphSize: Record<Size, { body: string; nub: string; bolt: string }> = {
  sm: { body: "h-2.5 w-5", nub: "h-1 w-px", bolt: "size-3" },
  md: { body: "h-3 w-6", nub: "h-1.5 w-0.5", bolt: "size-3.5" },
  lg: { body: "h-3.5 w-7", nub: "h-1.5 w-0.5", bolt: "size-4" },
};
const barSize: Record<Size, string> = { sm: "h-1 w-12", md: "h-1.5 w-16", lg: "h-2 w-24" };
const textSize: Record<Size, string> = { sm: "text-xs", md: "text-sm", lg: "text-base" };

/** Battery reading: a glyph or small bar with the percentage, toned warning when low and destructive when critical. */
export const BatteryLevel = React.forwardRef<HTMLSpanElement, BatteryLevelProps>(
  (
    {
      value,
      charging = false,
      low = 20,
      critical = 10,
      variant = "icon",
      size = "md",
      showValue = true,
      accent,
      label,
      loading,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const state = batteryLevelState(value, { low, critical });
    const s = glyphSize[size];

    if (loading && state === "unknown") {
      return (
        <span
          ref={ref}
          aria-busy
          data-slot="battery-level"
          data-state="loading"
          style={accentStyle(accent, style)}
          className={cn("inline-flex shrink-0 items-center gap-1.5 align-middle", className)}
          {...props}
        >
          {variant === "icon" ? (
            <span aria-hidden className="inline-flex animate-pulse items-center motion-reduce:animate-none">
              <span className={cn("relative flex rounded-[3px] border border-muted-foreground/40 p-px", s.body)} />
              <span className={cn("ms-px rounded-e-[1px] bg-muted-foreground/40", s.nub)} />
            </span>
          ) : variant === "bar" ? (
            <span aria-hidden className={cn("relative block shrink-0 animate-pulse overflow-hidden rounded-full bg-muted motion-reduce:animate-none", barSize[size])} />
          ) : null}
          {showValue || variant === "text" ? (
            <Skeleton shape="text" className={cn("inline-block w-[2.2em] shrink-0", textSize[size])} />
          ) : null}
          <span className="sr-only">Loading battery level…</span>
        </span>
      );
    }

    const pct = state === "unknown" ? 0 : Math.round(clamp(value as number, 0, 100));
    const text = label ?? formatBatteryLevel(value, { charging, low, critical });
    const fill =
      state === "critical"
        ? toneClasses.dot.destructive
        : state === "low"
          ? toneClasses.dot.warning
          : charging
            ? toneClasses.dot.success
            : accent
              ? accentClasses.solid
              : "bg-foreground/80";
    const valueTone =
      state === "critical" ? toneClasses.text.destructive : state === "low" ? toneClasses.text.warning : "text-foreground";

    return (
      <span
        ref={ref}
        aria-busy={loading || undefined}
        role="img"
        aria-label={text}
        data-slot="battery-level"
        data-state={state}
        data-charging={charging ? "" : undefined}
        style={accentStyle(accent, style)}
        className={cn("inline-flex shrink-0 items-center gap-1.5 align-middle", className)}
        {...props}
      >
        {variant === "icon" ? (
          <span className="inline-flex items-center">
            <span className={cn("relative flex rounded-[3px] border border-muted-foreground/70 p-px", s.body)}>
              <span
                data-slot="battery-level-fill"
                className={cn("block h-full rounded-[1.5px] transition-[width] duration-500 motion-reduce:transition-none", fill)}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className={cn("ms-px rounded-e-[1px] bg-muted-foreground/70", s.nub)} />
          </span>
        ) : variant === "bar" ? (
          <span className={cn("relative block shrink-0 overflow-hidden rounded-full bg-muted", barSize[size])}>
            <span
              data-slot="battery-level-fill"
              className={cn("block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", fill)}
              style={{ width: `${pct}%` }}
            />
          </span>
        ) : null}
        {charging ? <RiFlashlightFill aria-hidden className={cn("-mx-0.5 shrink-0 text-success", s.bolt)} /> : null}
        {showValue || variant === "text" ? (
          <span className={cn("font-medium tabular-nums", textSize[size], state === "unknown" ? "text-muted-foreground" : valueTone)}>
            {state === "unknown" ? "—" : `${pct}%`}
          </span>
        ) : null}
      </span>
    );
  }
);
BatteryLevel.displayName = "BatteryLevel";
