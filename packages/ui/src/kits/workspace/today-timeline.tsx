import * as React from "react";
import { RiCalendarCheckLine, RiFireFill } from "@remixicon/react";
import { cn, normalizeDensity, type Density } from "../../lib/cn";
import { addDays, formatClockTime, startOfDay, toValidDate } from "../../lib/time";
import { useNow } from "../../hooks/use-now";
import { SutraAppIcon, sutraAppMeta, type SutraApp } from "../../assets/brand";
import { Checkbox } from "../../primitives/checkbox";

export interface TimelineItem {
  id: string;
  app: SutraApp;
  title: string;
  start?: Date | string;
  end?: Date | string;
  allDay?: boolean;
  /** Completion state for tasks and habits. */
  done?: boolean;
  /** Secondary line (location, project, amount…). */
  meta?: React.ReactNode;
  /** Habit streak in days (shows a flame). */
  streak?: number;
  href?: string;
}

export interface TimelineLayoutItem {
  item: TimelineItem;
  start: Date;
  end: Date;
  /** Zero-based column within its overlap cluster. */
  column: number;
  /** Columns in the item's overlap cluster. */
  columns: number;
}

export interface TimelineLayout {
  /** All-day items and items without a start time. */
  untimed: TimelineItem[];
  timed: TimelineLayoutItem[];
}

const DEFAULT_DURATION_MIN = 30;

/** Splits items into untimed and timed, and assigns side-by-side columns to overlapping timed items. */
export function layoutTimeline(items: TimelineItem[], defaultDurationMinutes = DEFAULT_DURATION_MIN): TimelineLayout {
  const untimed: TimelineItem[] = [];
  const timed: TimelineLayoutItem[] = [];
  for (const item of items) {
    const start = toValidDate(item.start);
    if (item.allDay || !start) {
      untimed.push(item);
      continue;
    }
    let end = toValidDate(item.end);
    if (!end || end <= start) end = new Date(start.getTime() + defaultDurationMinutes * 60000);
    timed.push({ item, start, end, column: 0, columns: 1 });
  }
  timed.sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());

  let cluster: TimelineLayoutItem[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const entry of cluster) entry.columns = columnEnds.length;
    cluster = [];
    columnEnds = [];
  };
  for (const entry of timed) {
    const s = entry.start.getTime();
    if (s >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    let col = columnEnds.findIndex((end) => end <= s);
    if (col < 0) {
      col = columnEnds.length;
      columnEnds.push(entry.end.getTime());
    } else columnEnds[col] = entry.end.getTime();
    entry.column = col;
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.end.getTime());
  }
  flush();
  return { untimed, timed };
}

export interface TodayTimelineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onSelect" | "onToggle"> {
  /** Events, tasks and habits for the day, each with a time, title and kind. */
  items: TimelineItem[];
  /** Toggle a task or habit. */
  onToggle?: (item: TimelineItem, done: boolean) => void;
  /** Called with the item when the user opens it. */
  onSelect?: (item: TimelineItem) => void;
  /**
   * Rail spacing. `compact` tightens the hour rail; `normal` (default) and `relaxed` use the
   * roomy rail. The legacy `"comfortable"` is accepted as an alias of `relaxed`.
   */
  density?: Density | "comfortable";
  /** Fixed current time (otherwise the clock updates every minute). */
  now?: Date;
  /** First / last hour on the rail. Defaults fit the items within 8–20. */
  startHour?: number;
  /** Last hour on the rail; defaults to fit the items within 8 to 20. */
  endHour?: number;
  /** Heading above the timeline. */
  title?: React.ReactNode;
  /** Shown when there are no items. */
  emptyState?: React.ReactNode;
}

const fmtHour = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" });
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

function Streak({ days }: { days: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-warning-soft-foreground">
      <RiFireFill aria-hidden className="size-3.5 text-orange-500" />
      {days}
      <span className="sr-only"> day streak</span>
    </span>
  );
}

function ItemToggle({ item, onToggle }: { item: TimelineItem; onToggle?: TodayTimelineProps["onToggle"] }) {
  if (item.app !== "tasks" && item.app !== "habits") return null;
  return (
    <Checkbox
      size="sm"
      checked={!!item.done}
      onCheckedChange={(c) => onToggle?.(item, c === true)}
      aria-label={`Mark “${item.title}” ${item.done ? "not done" : "done"}`}
      className="shrink-0"
    />
  );
}

function ItemTitle({ item, onSelect }: { item: TimelineItem; onSelect?: TodayTimelineProps["onSelect"] }) {
  const cls = cn("min-w-0 truncate text-start font-medium", item.done && "text-muted-foreground line-through");
  if (item.href)
    return (
      <a href={item.href} className={cn(cls, "hover:underline")}>
        {item.title}
      </a>
    );
  if (onSelect)
    return (
      <button type="button" onClick={() => onSelect(item)} className={cn(cls, "hover:underline")}>
        {item.title}
      </button>
    );
  return <span className={cls}>{item.title}</span>;
}

/** Merged chronological agenda across apps: untimed section, hourly rail, now line and overlap layout. */
export const TodayTimeline = React.forwardRef<HTMLDivElement, TodayTimelineProps>(
  (
    {
      items,
      onToggle,
      onSelect,
      density: densityProp,
      now: nowProp,
      startHour,
      endHour,
      title,
      emptyState,
      className,
      ...props
    },
    ref
  ) => {
    const density = normalizeDensity(densityProp);
    const now = new Date(useNow({ interval: 60_000, fixed: nowProp }));
    const { untimed, timed: allTimed } = React.useMemo(() => layoutTimeline(items), [items]);
    const hourHeight = density === "compact" ? 40 : 64;

    // Only items that overlap the displayed day, clamped to it: an event that crosses midnight
    // runs to the edge of the rail instead of wrapping to the top.
    const dayStart = startOfDay(now).getTime();
    const dayEnd = addDays(dayStart, 1).getTime();
    const timed = allTimed
      .filter((t) => t.end.getTime() > dayStart && t.start.getTime() < dayEnd)
      .map((t) => ({
        ...t,
        startMin: t.start.getTime() <= dayStart ? 0 : minutesOf(t.start),
        endMin: t.end.getTime() >= dayEnd ? 24 * 60 : minutesOf(t.end),
      }));

    const firstHour = startHour ?? Math.min(8, ...timed.map((t) => Math.floor(t.startMin / 60)));
    const lastHour = endHour ?? Math.max(20, ...timed.map((t) => Math.ceil(t.endMin / 60)));
    const hours = Array.from({ length: Math.max(lastHour - firstHour, 1) }, (_, i) => firstHour + i);
    const railHeight = hours.length * hourHeight;
    const toY = (mins: number) => ((mins - firstHour * 60) / 60) * hourHeight;
    const nowMins = minutesOf(now);
    const showNow = nowMins >= firstHour * 60 && nowMins <= lastHour * 60;

    if (items.length === 0) {
      return (
        <div ref={ref} className={cn("rounded-box border border-border bg-card", className)} {...props}>
          {title && <div className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</div>}
          {emptyState ?? (
            <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
              <RiCalendarCheckLine aria-hidden className="size-7 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Nothing planned today</p>
              <p className="text-xs text-muted-foreground">Events, tasks and habits from every app show up here.</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-density={density}
        className={cn("flex flex-col rounded-box border border-border bg-card text-sm", className)}
        {...props}
      >
        {title && <div className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</div>}

        {untimed.length > 0 && (
          <section aria-label="All day" className="border-b border-border px-3 py-2">
            <h3 className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">All day</h3>
            <ul className={cn("flex flex-col", density === "compact" ? "gap-0.5" : "gap-1")}>
              {untimed.map((item) => (
                <li
                  key={item.id}
                  data-app={item.app}
                  className={cn(
                    "flex items-center gap-2 rounded-md bg-primary-soft/60 px-2 text-foreground",
                    density === "compact" ? "py-1" : "py-1.5"
                  )}
                >
                  <ItemToggle item={item} onToggle={onToggle} />
                  <SutraAppIcon app={item.app} size={14} shape="squircle" title={sutraAppMeta[item.app].name} />
                  <ItemTitle item={item} onSelect={onSelect} />
                  {item.meta && <span className="truncate text-xs text-muted-foreground">{item.meta}</span>}
                  {item.streak != null && <span className="ms-auto"><Streak days={item.streak} /></span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="relative flex" style={{ height: railHeight }}>
          <div aria-hidden className="relative w-14 shrink-0">
            {hours.map((h) => (
              <span
                key={h}
                className="absolute end-2 -translate-y-1/2 text-2xs tabular-nums text-muted-foreground first:translate-y-0"
                style={{ top: toY(h * 60) }}
              >
                {fmtHour(h)}
              </span>
            ))}
          </div>
          <div className="relative flex-1 border-s border-border">
            {hours.map((h) => (
              <div
                key={h}
                aria-hidden
                className="absolute inset-x-0 border-t border-border/70"
                style={{ top: toY(h * 60) }}
              />
            ))}

            <ol aria-label="Schedule" className="absolute inset-0">
              {timed.map(({ item, start, end, startMin, endMin, column, columns }) => {
                const top = toY(startMin);
                const height = Math.max(toY(endMin) - top, density === "compact" ? 18 : 24);
                const short = height < (density === "compact" ? 34 : 44);
                return (
                  <li
                    key={item.id}
                    data-app={item.app}
                    data-column={column}
                    data-columns={columns}
                    className={cn(
                      "absolute overflow-hidden rounded-md border-s-[3px] border-primary bg-primary-soft px-2 text-primary-soft-foreground shadow-xs",
                      short ? "flex items-center gap-1.5 py-0" : "flex flex-col gap-0.5 py-1",
                      item.done && "opacity-70"
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${(column / columns) * 100}% + 4px)`,
                      width: `calc(${100 / columns}% - 8px)`,
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <ItemToggle item={item} onToggle={onToggle} />
                      <span className="min-w-0 truncate text-foreground">
                        <ItemTitle item={item} onSelect={onSelect} />
                      </span>
                      {item.streak != null && <Streak days={item.streak} />}
                    </div>
                    <span className="truncate text-xs tabular-nums opacity-80">
                      {formatClockTime(start)}
                      {item.end ? ` – ${formatClockTime(end)}` : ""}
                      {item.meta && !short ? <> · {item.meta}</> : null}
                    </span>
                  </li>
                );
              })}
            </ol>

            {showNow && (
              <div
                data-testid="timeline-now"
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: toY(nowMins) }}
              >
                <span aria-hidden className="-ms-1 size-2 rounded-full bg-destructive" />
                <span aria-hidden className="h-px flex-1 bg-destructive" />
                <span className="sr-only">Now, {formatClockTime(now)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
TodayTimeline.displayName = "TodayTimeline";
