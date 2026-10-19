import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { normalizeTone, type Tone, type ToneInput } from "../lib/tone";
import { formatDuration } from "../lib/duration";
import { clamp } from "../lib/math";
import { toMs, type TimeInput } from "../lib/time";
import { useNow } from "../hooks/use-now";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { useElementSize } from "../hooks/use-resize-observer";
import { SimpleTooltip } from "../primitives/tooltip";

/** Compact duration: "45s", "12m", "2h 30m", "3d 4h". */
export function formatTimelineDuration(ms: number): string {
  const rounded = Math.round(ms / 1000) * 1000;
  return formatDuration(rounded, { units: rounded < 3_600_000 ? 1 : 2, keepZeros: false, round: "floor" });
}

/* ------------------------------------------------------------------ */
/* TimelineBar                                                         */
/* ------------------------------------------------------------------ */

/** Span tone. Canonical `Tone` plus deprecated aliases (`brand`, `danger`, …). */
export type TimelineTone = ToneInput;

export interface TimelineSpan {
  id?: string;
  start: TimeInput;
  /** Omit (or null) for an open span; open spans end at `now`. */
  end?: TimeInput | null;
  label?: string;
  tone?: TimelineTone;
  /** Still running: highlighted, pulsing, extends to now. */
  live?: boolean;
  /** Extra tooltip line. */
  detail?: React.ReactNode;
}

export interface TimelineLane {
  id: string;
  label: React.ReactNode;
  spans: TimelineSpan[];
}

export interface TimelinePosition {
  /** Percent from the left of the window. */
  left: number;
  /** Percent width. */
  width: number;
  start: number;
  end: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

/** Percent position of a span over [from, to]; `null` when fully outside. */
export function timelinePosition(span: TimelineSpan, from: TimeInput, to: TimeInput, now: TimeInput = Date.now()): TimelinePosition | null {
  const f = toMs(from);
  const t = toMs(to);
  const s = toMs(span.start);
  if (f === undefined || t === undefined || s === undefined) return null;
  const range = t - f;
  if (range <= 0) return null;
  const e = span.end != null ? toMs(span.end) : Math.max(s, toMs(now) ?? Date.now());
  if (e === undefined || e < f || s > t) return null;
  const cs = Math.max(s, f);
  const ce = Math.min(e, t);
  return {
    left: ((cs - f) / range) * 100,
    width: Math.max(0, ((ce - cs) / range) * 100),
    start: s,
    end: e,
    clippedStart: s < f,
    clippedEnd: e > t,
  };
}

/** Evenly spaced tick timestamps from `from` to `to` (count intervals → count+1 ticks). */
export function timelineTicks(from: TimeInput, to: TimeInput, count = 6): number[] {
  const f = toMs(from);
  const t = toMs(to);
  if (f === undefined || t === undefined) return [];
  const n = Math.max(1, count);
  return Array.from({ length: n + 1 }, (_, i) => f + ((t - f) * i) / n);
}

const toneClass: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/60",
};

export interface TimelineBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Window start. */
  from: TimeInput;
  /** Window end. */
  to: TimeInput;
  /** Multiple labelled lanes. */
  lanes?: TimelineLane[];
  /** Single unlabelled lane (shorthand). */
  spans?: TimelineSpan[];
  /** Reference "now" for live spans. Default Date.now(). */
  now?: TimeInput;
  /** Number of tick intervals. Default 6; fewer are drawn when the axis is too narrow for their labels. */
  ticks?: number;
  /** Formats the axis tick labels. Default depends on the window: time of day, or date and time across days. */
  tickFormatter?: (time: Date) => string;
  /**
   * Shows the time axis under the lanes.
   * @default true
   */
  showAxis?: boolean;
  /** Show the "now" marker when inside the window. Default true. */
  showNow?: boolean;
  /** Lane height in px. Default 24. */
  laneHeight?: number;
  /** Width of the lane label column in px. Default 112. */
  labelWidth?: number;
  /** Formats the time shown in the span tooltip. */
  formatTime?: (time: Date) => string;
  /** Formats the duration shown in the span tooltip. Default is a short "1h 20m". */
  formatDuration?: (ms: number) => string;
  /** Called with the span (and its lane) when a span is clicked; spans then become buttons. */
  onSpanClick?: (span: TimelineSpan, lane?: TimelineLane) => void;
  /** Accessible name. */
  label?: string;
  /** BCP 47 locale for the default time formatting. */
  locale?: string;
}

/** Time-window bar with spans per lane (session uptime, GPU job occupancy), live spans and a tick axis. */
export const TimelineBar = React.forwardRef<HTMLDivElement, TimelineBarProps>(
  (
    {
      className,
      from,
      to,
      lanes: lanesProp,
      spans,
      now: nowProp,
      ticks = 6,
      tickFormatter,
      showAxis = true,
      showNow = true,
      laneHeight = 24,
      labelWidth = 112,
      formatTime,
      formatDuration = formatTimelineDuration,
      onSpanClick,
      label = "Timeline",
      locale,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = useMergedRefs(rootRef, ref);
    const size = useElementSize(rootRef);
    const lanes: TimelineLane[] = lanesProp ?? [{ id: "default", label: null, spans: spans ?? [] }];
    const hasLabels = lanes.some((l) => l.label != null && l.label !== false);
    const f = toMs(from) ?? NaN;
    const t = toMs(to) ?? NaN;
    const range = t - f;
    // Open spans grow with the clock: tick while one is showing and no fixed `now` is given.
    const hasOpen = nowProp == null && lanes.some((l) => l.spans.some((sp) => sp.end == null));
    const clock = useNow({ active: hasOpen, interval: clamp(range / 1000, 1000, 60_000) });
    const now = toMs(nowProp) ?? (hasOpen ? clock : Date.now());
    const sameDay = range <= 36 * 3600 * 1000;
    const timeFmt = React.useMemo(
      () =>
        new Intl.DateTimeFormat(locale, sameDay ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      [locale, sameDay]
    );
    const tickFmt = React.useMemo(
      () => new Intl.DateTimeFormat(locale, sameDay ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" }),
      [locale, sameDay]
    );
    const fmtTime = formatTime ?? ((d: Date) => timeFmt.format(d));
    const fmtTick = tickFormatter ?? ((d: Date) => tickFmt.format(d));
    // Axis labels never get closer than their own width: a narrow bar draws fewer ticks instead of overlapping ones.
    const axisWidth = size.width - (hasLabels ? labelWidth + 8 : 0);
    let tickList = timelineTicks(f, t, ticks);
    if (axisWidth > 0) {
      for (let n = ticks; n > 1; n--) {
        tickList = timelineTicks(f, t, n);
        const widest = tickList.reduce((m, tk) => Math.max(m, fmtTick(new Date(tk)).length), 0) * 6.2 + 12;
        if (widest * tickList.length <= axisWidth) break;
      }
    }
    const nowPct = range > 0 ? ((now - f) / range) * 100 : -1;

    return (
      <div ref={setRefs} role="group" aria-label={label} className={cn("w-full text-xs", className)} dir="ltr" {...props}>
        <div className="flex flex-col gap-1.5">
          {lanes.map((lane) => {
            return (
              <div key={lane.id} className="flex items-center gap-2">
                {hasLabels ? (
                  <div className="shrink-0 truncate text-xs text-muted-foreground" style={{ width: labelWidth }} title={typeof lane.label === "string" ? lane.label : undefined}>
                    {lane.label}
                  </div>
                ) : null}
                <div
                  role="list"
                  aria-label={typeof lane.label === "string" ? lane.label : lanesProp ? undefined : label}
                  className="relative min-w-0 flex-1 overflow-hidden rounded-xs bg-muted/60"
                  style={{ height: laneHeight }}
                >
                  {tickList.slice(1, -1).map((tk) => (
                    <span
                      key={tk}
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-border"
                      style={{ left: `${((tk - f) / range) * 100}%` }}
                    />
                  ))}
                  {lane.spans.map((span, i) => {
                    const pos = timelinePosition(span, f, t, now);
                    if (!pos) return null;
                    const isLive = !!span.live || span.end == null;
                    const duration = pos.end - pos.start;
                    const rangeText = `${fmtTime(new Date(pos.start))} – ${isLive ? "now" : fmtTime(new Date(pos.end))}`;
                    const text = `${span.label ? `${span.label}: ` : ""}${rangeText} (${formatDuration(duration)}${isLive ? ", live" : ""})`;
                    const tone = normalizeTone(span.tone, "primary");
                    const content = (
                      <span className="flex flex-col gap-0.5">
                        {span.label ? <span className="font-semibold">{span.label}</span> : null}
                        <span>
                          {rangeText} · {formatDuration(duration)}
                          {isLive ? " · live" : ""}
                        </span>
                        {span.detail ? <span className="opacity-80">{span.detail}</span> : null}
                      </span>
                    );
                    const Comp = onSpanClick ? "button" : "span";
                    return (
                      <div
                        key={span.id ?? i}
                        role="listitem"
                        data-live={isLive || undefined}
                        data-left={pos.left.toFixed(2)}
                        data-width={pos.width.toFixed(2)}
                        className="absolute inset-y-0.5 min-w-[3px] transition-[left,width] duration-300"
                        style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                      >
                        <SimpleTooltip content={content}>
                          <Comp
                            {...(onSpanClick
                              ? { type: "button" as const, onClick: () => onSpanClick(span, lanesProp ? lane : undefined) }
                              : { tabIndex: 0, role: "img" })}
                            aria-label={text}
                            className={cn(
                              "relative flex size-full items-center overflow-hidden rounded-xs text-start text-2xs font-medium leading-none text-white/95 transition-opacity hover:opacity-90",
                              toneClass[tone],
                              tone === "warning" && "text-warning-foreground",
                              isLive && "ring-2 ring-inset ring-white/30",
                              pos.clippedStart && "rounded-s-none",
                              pos.clippedEnd && "rounded-e-none",
                              focusRing
                            )}
                          >
                            <span aria-hidden className="truncate px-1">
                              {span.label}
                            </span>
                            {isLive ? (
                              <span aria-hidden className="absolute inset-y-0 end-0 flex w-2 items-center justify-center">
                                <span className="absolute size-2 rounded-full bg-white/70 motion-safe:animate-ping" />
                                <span className="relative size-1.5 rounded-full bg-white" />
                              </span>
                            ) : null}
                          </Comp>
                        </SimpleTooltip>
                      </div>
                    );
                  })}
                  {showNow && nowPct >= 0 && nowPct <= 100 ? (
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `${nowPct}%` }} />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {showAxis ? (
          <div aria-hidden className="mt-1 flex gap-2">
            {hasLabels ? <div className="shrink-0" style={{ width: labelWidth }} /> : null}
            <div className="relative h-4 min-w-0 flex-1 font-mono text-2xs text-muted-foreground tabular-nums">
              {tickList.map((tk, i) => (
                <span
                  key={tk}
                  className={cn(
                    "absolute top-0 whitespace-nowrap",
                    i === 0 ? "translate-x-0" : i === tickList.length - 1 ? "-translate-x-full rtl:translate-x-full" : "-translate-x-1/2 rtl:translate-x-1/2"
                  )}
                  style={{ left: `${((tk - f) / range) * 100}%` }}
                >
                  {fmtTick(new Date(tk))}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);
TimelineBar.displayName = "TimelineBar";

/* ------------------------------------------------------------------ */
/* UptimeBar                                                           */
/* ------------------------------------------------------------------ */

export type UptimeStatus = "up" | "degraded" | "down" | "no-data";

export interface UptimeBucket {
  status: UptimeStatus;
  /** Bucket label, e.g. a date. */
  label?: string;
  detail?: React.ReactNode;
}

/** Uptime % over buckets with data (degraded counts as up); null when no data at all. */
export function uptimePercent(buckets: (UptimeBucket | UptimeStatus)[]): number | null {
  let known = 0;
  let up = 0;
  for (const b of buckets) {
    const s = typeof b === "string" ? b : b.status;
    if (s === "no-data") continue;
    known++;
    if (s !== "down") up++;
  }
  return known ? (up / known) * 100 : null;
}

const uptimeClass: Record<UptimeStatus, string> = {
  up: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
  "no-data": "bg-muted",
};

const uptimeLabel: Record<UptimeStatus, string> = {
  up: "Operational",
  degraded: "Degraded",
  down: "Down",
  "no-data": "No data",
};

export interface UptimeBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Time slices from oldest to newest: each is a status (`up`, `degraded`, `down`, `no-data`) or a `{ status, label, detail }` object. */
  buckets: (UptimeBucket | UptimeStatus)[];
  /** Service name shown above the bar. */
  label?: React.ReactNode;
  /**
   * Shows the uptime percentage next to the label.
   * @default true
   */
  showPercent?: boolean;
  /** Override the computed uptime. */
  percent?: number;
  /** Text under the left end of the bar (e.g. "90 days ago"). */
  startLabel?: React.ReactNode;
  /** Text under the right end of the bar (e.g. "Today"). */
  endLabel?: React.ReactNode;
  /** Bar height in px. Default 32. */
  height?: number;
  /** Formats the uptime percentage. Default is e.g. "99.95%". */
  formatPercent?: (percent: number) => string;
}

/** Status-page uptime strip: N buckets colored up / degraded / down / no-data, with uptime %. */
export const UptimeBar = React.forwardRef<HTMLDivElement, UptimeBarProps>(
  (
    {
      className,
      buckets,
      label,
      showPercent = true,
      percent: percentProp,
      startLabel,
      endLabel,
      height = 32,
      formatPercent = (p) => `${p >= 99.995 ? 100 : Number(p.toFixed(2))}%`,
      ...props
    },
    ref
  ) => {
    const items: UptimeBucket[] = buckets.map((b) => (typeof b === "string" ? { status: b } : b));
    const pct = percentProp ?? uptimePercent(items);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [hover, setHover] = React.useState<{ i: number; x: number } | null>(null);
    const incidents = items.filter((b) => b.status === "down").length;
    const degraded = items.filter((b) => b.status === "degraded").length;
    const pctText = pct == null ? "No data" : `${formatPercent(pct)} uptime`;
    const summary = `${typeof label === "string" ? `${label}: ` : ""}${pctText} over ${items.length} periods, ${incidents} down, ${degraded} degraded`;
    return (
      <div ref={ref} className={cn("w-full text-xs", className)} dir="ltr" {...props}>
        {label || showPercent ? (
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">{label}</span>
            {showPercent ? (
              <span className="font-mono tabular-nums text-muted-foreground" data-uptime-percent="">
                {pctText}
              </span>
            ) : null}
          </div>
        ) : null}
        <div ref={containerRef} className="relative" onMouseLeave={() => setHover(null)}>
          <div role="img" aria-label={summary} className={cn("flex", items.length > 45 ? "gap-px" : "gap-[2px]")} style={{ height }}>
            {items.map((b, i) => (
              <span
                key={i}
                data-status={b.status}
                onMouseEnter={(e) => {
                  const box = containerRef.current?.getBoundingClientRect();
                  const r = e.currentTarget.getBoundingClientRect();
                  setHover({ i, x: box ? r.left - box.left + r.width / 2 : 0 });
                }}
                className={cn(
                  "min-w-0 flex-1 rounded-[2px] transition-[opacity,transform,translate,scale,rotate] hover:opacity-80",
                  uptimeClass[b.status],
                  hover?.i === i && "scale-y-110"
                )}
              />
            ))}
          </div>
          {hover && items[hover.i] ? (
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-full z-50 mb-1.5 -translate-x-1/2 rtl:translate-x-1/2 whitespace-nowrap rounded-md bg-inverse px-2 py-1 text-xs font-medium text-inverse-foreground shadow-md"
              style={{ left: hover.x }}
            >
              {items[hover.i].label ? <span className="me-1.5 opacity-75">{items[hover.i].label}</span> : null}
              {uptimeLabel[items[hover.i].status]}
              {items[hover.i].detail ? <div className="font-normal opacity-80">{items[hover.i].detail}</div> : null}
            </div>
          ) : null}
        </div>
        {startLabel || endLabel ? (
          <div aria-hidden className="mt-1 flex justify-between text-2xs text-muted-foreground">
            <span>{startLabel}</span>
            <span>{endLabel}</span>
          </div>
        ) : null}
      </div>
    );
  }
);
UptimeBar.displayName = "UptimeBar";
