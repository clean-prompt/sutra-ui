import * as React from "react";
import { cn, focusRing } from "../../lib/cn";
import { ContextUsageBreakdown, type ContextUsageCategory } from "./agent-usage";
import { RingMeter } from "../../patterns/gauge";
import { defaultMeterThresholds, meterLevel, type MeterLevel, type MeterThresholds } from "../../primitives/meter";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { formatTokenCount } from "../../lib/token-count";

/* ------------------------------------------------------------------ */
/* ContextMeter                                                        */
/* ------------------------------------------------------------------ */

export interface ContextMeterBreakdown {
  system?: number;
  history?: number;
  attachments?: number;
  /** Tokens reserved for the reply (counted against the window). */
  reserved?: number;
}

export interface ContextMeterProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Tokens currently in the prompt. Defaults to the sum of the breakdown (or of the non-reserved categories). */
  used?: number;
  /** Model context size in tokens. */
  limit: number;
  /** Fixed-key breakdown. Ignored when `categories` is set. */
  breakdown?: ContextMeterBreakdown;
  /** Free-form breakdown, the same shape as `ContextUsageBreakdown` (mark reply reservations with `reserved: true`). */
  categories?: ContextUsageCategory[];
  /** Model name shown in the popover. */
  model?: string;
  /** Percent thresholds for warn/danger coloring. Default 75 / 90. */
  thresholds?: MeterThresholds;
  /** Shows a "Compact conversation" button in the popover. */
  onCompact?: () => void;
  /** Shows a spinner on the compact button. */
  compacting?: boolean;
  /** Default: true when `onCompact` is set. */
  canCompact?: boolean;
  /** Called when the user presses the compress button. @deprecated Use `onCompact`. Keeps the old "Compress conversation" wording. */
  onCompress?: () => void;
  /** Shows a spinner on the button and disables it while compressing. @deprecated Use `compacting`. */
  compressing?: boolean;
  /** Whether compressing is available. Default true when `onCompress` is set. @deprecated Use `canCompact`. */
  canCompress?: boolean;
  /** Ring diameter in px. Default 20. */
  size?: number;
  /** Extra content under the breakdown. */
  note?: React.ReactNode;
}

const levelWord: Record<MeterLevel, string> = { ok: "Plenty of room", warn: "Getting full", danger: "Almost full" };

function breakdownCategories({ system = 0, history = 0, attachments = 0, reserved = 0 }: ContextMeterBreakdown): ContextUsageCategory[] {
  const rows: ContextUsageCategory[] = [
    { key: "system", label: "System", tokens: system, color: "info" },
    { key: "history", label: "History", tokens: history, color: "primary" },
    { key: "attachments", label: "Attachments", tokens: attachments, color: "warning" },
  ];
  if (reserved > 0) rows.push({ key: "reserved", label: "Reserved for reply", tokens: reserved, color: "muted", reserved: true });
  return rows;
}

/** Context-window usage ring; its popover is a `ContextUsageBreakdown` with an optional compact action. */
export const ContextMeter = React.forwardRef<HTMLButtonElement, ContextMeterProps>(
  (
    {
      used: usedProp,
      limit,
      breakdown,
      categories: categoriesProp,
      model,
      thresholds = defaultMeterThresholds,
      onCompact: onCompactProp,
      compacting: compactingProp,
      canCompact: canCompactProp,
      onCompress,
      compressing,
      canCompress,
      size = 20,
      note,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const categories = React.useMemo(
      () => categoriesProp ?? breakdownCategories(breakdown ?? {}),
      [categoriesProp, breakdown]
    );
    const used = usedProp ?? categories.reduce((s, c) => s + (c.reserved ? 0 : Math.max(0, c.tokens)), 0);
    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const level = meterLevel(pct, thresholds);
    const warnAt = thresholds.warn ?? defaultMeterThresholds.warn;
    const pctText = `${Math.round(pct)}%`;
    const onCompact = onCompactProp ?? onCompress;
    const legacyWording = !onCompactProp && !!onCompress;
    const compacting = compactingProp ?? compressing ?? false;
    const canCompact = canCompactProp ?? canCompress ?? !!onCompact;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            data-level={level}
            aria-label={`Context window ${pctText} full`}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-control px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing,
              className
            )}
            {...props}
          >
            <span aria-hidden="true" className="inline-flex">
              <RingMeter value={pct} size={size} thresholds={thresholds} showValueAbove={warnAt} label="Context window" role="presentation" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent size="sm" align="end" side="top" className="w-72" aria-label="Context window details">
          <ContextUsageBreakdown
            categories={categories}
            max={limit}
            used={used}
            thresholds={thresholds}
            valueFormatter={formatTokenCount}
            caption={levelWord[level]}
            freeLabel="Remaining"
            actionLayout="block"
            compactLabel={legacyWording ? "Compress conversation" : "Compact conversation"}
            compactingLabel={legacyWording ? "Compressing…" : "Compacting…"}
            compacting={compacting}
            canCompact={canCompact}
            onCompact={
              onCompact
                ? () => {
                    setOpen(false);
                    onCompact();
                  }
                : undefined
            }
          >
            <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2 text-xs">
              <span className="text-muted-foreground">Model context</span>
              <span className="font-mono tabular-nums text-foreground">{formatTokenCount(limit)} tokens</span>
            </div>
            {model ? (
              <p className="text-xs text-muted-foreground">
                Model: <span className="font-medium text-foreground">{model}</span>
              </p>
            ) : null}
            {note ? <div className="text-xs text-muted-foreground">{note}</div> : null}
          </ContextUsageBreakdown>
        </PopoverContent>
      </Popover>
    );
  }
);
ContextMeter.displayName = "ContextMeter";
