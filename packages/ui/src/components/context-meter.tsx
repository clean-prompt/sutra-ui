import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { Button } from "./button";
import { RingMeter } from "./gauge";
import { defaultMeterThresholds, meterLevel, StackedMeter, type MeterLevel, type MeterThresholds } from "./meter";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { formatTokenCount } from "./text-caret";

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
  /** Tokens currently in the prompt. Defaults to the sum of the breakdown. */
  used?: number;
  /** Model context size in tokens. */
  limit: number;
  breakdown?: ContextMeterBreakdown;
  /** Model name shown in the popover. */
  model?: string;
  /** Percent thresholds for warn/danger coloring. Default 75 / 90. */
  thresholds?: MeterThresholds;
  onCompress?: () => void;
  compressing?: boolean;
  /** Default: true when `onCompress` is set. */
  canCompress?: boolean;
  /** Ring diameter in px. Default 20. */
  size?: number;
  /** Extra content under the breakdown. */
  note?: React.ReactNode;
}

const levelWord: Record<MeterLevel, string> = { ok: "Plenty of room", warn: "Getting full", danger: "Almost full" };

/** Context-window usage ring with a token breakdown popover and a compress action. */
export const ContextMeter = React.forwardRef<HTMLButtonElement, ContextMeterProps>(
  (
    {
      used: usedProp,
      limit,
      breakdown = {},
      model,
      thresholds = defaultMeterThresholds,
      onCompress,
      compressing = false,
      canCompress,
      size = 20,
      note,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const { system = 0, history = 0, attachments = 0, reserved = 0 } = breakdown;
    const used = usedProp ?? system + history + attachments;
    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const level = meterLevel(pct, thresholds);
    const warnAt = thresholds.warn ?? defaultMeterThresholds.warn;
    const remaining = Math.max(0, limit - used - reserved);
    const pctText = `${Math.round(pct)}%`;
    const compressible = canCompress ?? !!onCompress;
    const rows: Array<[string, number]> = [
      ["System", system],
      ["History", history],
      ["Attachments", attachments],
    ];
    if (reserved > 0) rows.push(["Reserved for reply", reserved]);

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
        <PopoverContent size="sm" align="end" side="top" className="w-64 space-y-3" aria-label="Context window details">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Context window</p>
            <span
              className={cn(
                "font-mono text-sm tabular-nums",
                level === "danger" ? "text-destructive" : level === "warn" ? "text-warning" : "text-muted-foreground"
              )}
            >
              {pctText}
            </span>
          </div>
          <StackedMeter
            size="sm"
            legend={false}
            max={limit}
            valueText={`${formatTokenCount(used)} / ${formatTokenCount(limit)}`}
            label={levelWord[level]}
            valueFormatter={formatTokenCount}
            parts={[
              { label: "System", value: system, color: "info" },
              { label: "History", value: history, color: "primary" },
              { label: "Attachments", value: attachments, color: "warning" },
              { label: "Reserved", value: reserved, color: "muted" },
            ]}
          />
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
            {rows.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-mono tabular-nums text-foreground">{formatTokenCount(v)}</dd>
              </React.Fragment>
            ))}
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="text-right font-mono tabular-nums text-foreground">{formatTokenCount(remaining)}</dd>
            <dt className="border-t border-border pt-1 text-muted-foreground">Model context</dt>
            <dd className="border-t border-border pt-1 text-right font-mono tabular-nums text-foreground">
              {formatTokenCount(limit)} tokens
            </dd>
          </dl>
          {model ? <p className="text-xs text-muted-foreground">Model: <span className="font-medium text-foreground">{model}</span></p> : null}
          {note ? <div className="text-xs text-muted-foreground">{note}</div> : null}
          {onCompress ? (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              loading={compressing}
              disabled={!compressible || compressing}
              onClick={() => {
                setOpen(false);
                onCompress();
              }}
            >
              {compressing ? "Compressing…" : "Compress conversation"}
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    );
  }
);
ContextMeter.displayName = "ContextMeter";
