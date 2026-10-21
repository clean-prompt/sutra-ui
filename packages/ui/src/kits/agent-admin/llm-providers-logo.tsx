/** LLM provider marks: the ProviderLogo and ProviderQuotaChip. */
import * as React from "react";
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { toMs } from "../../lib/time";
import { toneClasses, type Tone } from "../../lib/tone";
import { Monogram } from "../../primitives/monogram";
import { meterLevel, type MeterThresholds, type MeterLevel } from "../../primitives/meter";
import { SimpleTooltip } from "../../primitives/tooltip";
import { formatResetCaption } from "../ai/agent-usage";
import { type TimeValue } from "./llm-providers-internal";

/* ------------------------------------------------------------------ */
/* ProviderLogo                                                        */
/* ------------------------------------------------------------------ */

export interface ProviderLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Provider name; used for the accessible name and, without `monogram`, to derive the letter. */
  name: string;
  /** Override the generated monogram (1–2 characters). */
  monogram?: string;
  /** Tile color; defaults to a stable color derived from the name. */
  color?: string;
  /** Tile size: `sm`, `md` or `lg`. */
  size?: "sm" | "md" | "lg";
}

/** Local monogram tile for a provider (never fetches a remote logo). A `Monogram` preset (solid seed colour). */
export const ProviderLogo = React.forwardRef<HTMLSpanElement, ProviderLogoProps>(
  ({ name, monogram, color, size = "md", ...props }, ref) => (
    <Monogram ref={ref} data-slot="provider-logo" name={name} letters={monogram} color={color} size={size} variant="solid" {...props} />
  )
);
ProviderLogo.displayName = "ProviderLogo";

/* ------------------------------------------------------------------ */
/* ProviderQuotaChip                                                   */
/* ------------------------------------------------------------------ */

export interface ProviderQuotaChipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Percent of the quota already used, 0–100. */
  used: number;
  /** When the quota window resets (timestamp or date); drives the "Resets in 3h" text. */
  resetsAt?: TimeValue;
  /** Overrides the computed "Resets in 3h" text. */
  resetLabel?: string;
  /** Used-percent thresholds for warning / danger. Default 75 / 90. */
  thresholds?: MeterThresholds;
  /** Name of the quota window, e.g. "Weekly". */
  label?: string;
  /** Reference time for the reset text; set it in tests and SSR for stable output. */
  now?: number;
}

const quotaTone: Record<MeterLevel, Tone> = { ok: "success", warn: "warning", danger: "destructive" };
const quotaFill = (level: MeterLevel) => toneClasses.dot[quotaTone[level]];
const quotaText = (level: MeterLevel) => (level === "ok" ? "text-foreground" : toneClasses.text[quotaTone[level]]);

/** Compact remaining-quota bar with threshold colors and a reset-time tooltip. */
export const ProviderQuotaChip = React.forwardRef<HTMLSpanElement, ProviderQuotaChipProps>(
  ({ used, resetsAt, resetLabel, thresholds = { warn: 75, danger: 90 }, label = "Quota", now, className, ...props }, ref) => {
    const pct = clamp(used, 0, 100);
    const remaining = Math.round(100 - pct);
    const level = meterLevel(pct, thresholds);
    const ms = toMs(resetsAt);
    const reset = resetLabel ?? (ms != null ? formatResetCaption(ms, now ?? Date.now()) : "");
    const valueText = `${remaining}% left${reset ? `, ${reset.charAt(0).toLowerCase()}${reset.slice(1)}` : ""}`;
    const chip = (
      <span
        ref={ref}
        role="meter"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={remaining}
        aria-valuetext={valueText}
        data-level={level}
        data-slot="provider-quota-chip"
        className={cn(
          "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-control border border-border bg-background px-2 text-2xs font-medium shadow-xs",
          focusRing,
          className
        )}
        {...props}
      >
        <span aria-hidden className="relative h-1.5 w-10 overflow-hidden rounded-full bg-muted">
          <span className={cn("absolute inset-y-0 start-0 rounded-full", quotaFill(level))} style={{ width: `${remaining}%` }} />
        </span>
        <span className={cn("font-mono tabular-nums", quotaText(level))}>{remaining}%</span>
      </span>
    );
    return reset ? <SimpleTooltip content={`${label}: ${remaining}% left · ${reset}`}>{chip}</SimpleTooltip> : chip;
  }
);
ProviderQuotaChip.displayName = "ProviderQuotaChip";
