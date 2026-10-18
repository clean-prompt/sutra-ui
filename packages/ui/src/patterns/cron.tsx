import * as React from "react";
import { RiCalendarScheduleLine, RiErrorWarningLine, RiGlobalLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useNow } from "../hooks/use-now";
import { SegmentedControl } from "../primitives/segmented-control";
import { NumberInput } from "../primitives/number-input";
import { Input } from "../primitives/input";
import { DatePicker } from "../primitives/date-picker";
import {
  cronWeekdayNames as DOW_NAMES,
  parseCronTime as parseTime,
  formatCronTime as formatTimeValue,
  scheduleToCron,
  cronToSchedule,
  toScheduleString,
  scheduleToValue,
  valueToSchedule,
  cronScheduleError,
  describeSchedule,
  nextScheduleRuns,
  formatScheduleRelative,
  type CronIntervalUnit,
  type CronSchedule,
  type CronScheduleMode,
  type CronScheduleValue,
} from "../lib/cron";

/** Back-compat: the pure cron/interval logic lives in `lib/cron`. */
export {
  parseCron,
  describeCron,
  nextCronRuns,
  parseInterval,
  formatInterval,
  intervalToMs,
  formatLocalDateTime,
  scheduleToCron,
  cronToSchedule,
  toScheduleString,
  scheduleToValue,
  valueToSchedule,
  cronScheduleError,
  describeSchedule,
  nextScheduleRuns,
  formatCountdownClock,
  formatScheduleRelative,
} from "../lib/cron";
export type {
  CronFieldName,
  ParsedCron,
  CronParseResult,
  DescribeCronOptions,
  NextCronRunsOptions,
  CronIntervalUnit,
  CronInterval,
  CronScheduleMode,
  CronSchedule,
  CronScheduleValue,
} from "../lib/cron";

/** Re-render every `intervalMs` while `enabled`; returns the current timestamp. */
export function useScheduleNow(enabled = true, intervalMs = 1000): number {
  return useNow({ active: enabled, interval: intervalMs });
}

/* ------------------------------------------------------------------ */
/* CronScheduleField                                                   */
/* ------------------------------------------------------------------ */

/** Every mode's inputs at once, so switching modes keeps what was typed. */
export interface CronBuilderState {
  mode: CronScheduleMode;
  every: number | null;
  unit: CronIntervalUnit;
  minute: number | null;
  time: string;
  days: number[];
  day: number | null;
  onceDate?: Date;
  onceTime: string;
  expr: string;
}

/** Sensible starting state: every 30 minutes; 09:00 for timed modes; Monday for weekly; the 1st for monthly. */
export function defaultCronBuilderState(mode: CronScheduleMode = "interval"): CronBuilderState {
  return { mode, every: 30, unit: "m", minute: 0, time: "09:00", days: [1], day: 1, onceDate: undefined, onceTime: "09:00", expr: "0 9 * * 1-5" };
}

function applyScheduleToState(state: CronBuilderState, s: CronSchedule): CronBuilderState {
  switch (s.mode) {
    case "interval":
      return { ...state, mode: s.mode, every: s.every, unit: s.unit };
    case "hourly":
      return { ...state, mode: s.mode, minute: s.minute };
    case "daily":
    case "weekdays":
      return { ...state, mode: s.mode, time: s.time };
    case "weekly":
      return { ...state, mode: s.mode, days: s.days, time: s.time };
    case "monthly":
      return { ...state, mode: s.mode, day: s.day, time: s.time };
    case "once": {
      const d = s.at;
      return { ...state, mode: s.mode, onceDate: new Date(d.getFullYear(), d.getMonth(), d.getDate()), onceTime: formatTimeValue(d.getHours(), d.getMinutes()) };
    }
    case "custom":
      return { ...state, mode: s.mode, expr: s.expr };
  }
}

function stateToSchedule(state: CronBuilderState): CronSchedule {
  switch (state.mode) {
    case "interval":
      return { mode: "interval", every: state.every ?? NaN, unit: state.unit };
    case "hourly":
      return { mode: "hourly", minute: state.minute ?? NaN };
    case "daily":
    case "weekdays":
      return { mode: state.mode, time: state.time };
    case "weekly":
      return { mode: "weekly", days: state.days, time: state.time };
    case "monthly":
      return { mode: "monthly", day: state.day ?? NaN, time: state.time };
    case "once": {
      const [h, m] = parseTime(state.onceTime);
      const d = state.onceDate;
      return { mode: "once", at: d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m) : new Date(NaN) };
    }
    case "custom":
      return { mode: "custom", expr: state.expr };
  }
}

export const cronScheduleModeLabels: Record<CronScheduleMode, string> = {
  interval: "Interval",
  hourly: "Hourly",
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  monthly: "Monthly",
  once: "Once",
  custom: "Cron",
};

const ALL_MODES: CronScheduleMode[] = ["interval", "hourly", "daily", "weekdays", "weekly", "monthly", "once", "custom"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface CronScheduleChangeDetails {
  schedule: CronSchedule;
  error: string | null;
  summary: string;
  /** `toScheduleString(value)` or `null` while invalid. */
  scheduleString: string | null;
}

export interface CronScheduleFieldProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  /** Value or schedule string ("every 30m", cron, ISO timestamp). */
  value?: CronScheduleValue | string | null;
  defaultValue?: CronScheduleValue | string | null;
  /** Fires on every edit; `value` is `null` while the schedule is invalid. */
  onValueChange?: (value: CronScheduleValue | null, details: CronScheduleChangeDetails) => void;
  /** Modes offered (and their order). Default: all eight. */
  modes?: CronScheduleMode[];
  legend?: React.ReactNode;
  /** IANA zone the schedule runs in; shown next to the preview. Default: the browser zone. */
  timeZone?: string;
  /** Reference time for the preview. Default: now. */
  now?: Date | number;
  /** Number of upcoming runs to preview. Default 3; 0 hides the list. */
  previewCount?: number;
  locale?: string;
  hour12?: boolean;
  disabled?: boolean;
}

/** Schedule builder: interval / hourly / daily / weekdays / weekly / monthly / once / raw cron, with a live summary and next-runs preview. */
export const CronScheduleField = React.forwardRef<HTMLFieldSetElement, CronScheduleFieldProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      modes = ALL_MODES,
      legend = "Schedule",
      timeZone,
      now,
      previewCount = 3,
      locale,
      hour12,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const id = React.useId();
    const initial = value ?? defaultValue;
    const [state, setState] = React.useState<CronBuilderState>(() => {
      const base = defaultCronBuilderState(modes[0] ?? "interval");
      return initial ? applyScheduleToState(base, valueToSchedule(initial)) : base;
    });

    const schedule = stateToSchedule(state);
    const error = cronScheduleError(schedule);
    const scheduleString = error ? null : scheduleToCron(schedule);
    const describeOpts = { locale, hour12 };
    const summary = error ? error : describeSchedule(schedule, describeOpts);

    const external = value == null ? null : typeof value === "string" ? value : toScheduleString(value);
    React.useEffect(() => {
      if (external == null) return;
      setState((prev) => {
        const prevSchedule = stateToSchedule(prev);
        if (!cronScheduleError(prevSchedule) && toScheduleString(scheduleToValue(prevSchedule)) === external) return prev;
        return applyScheduleToState(prev, cronToSchedule(external));
      });
    }, [external]);

    const update = (patch: Partial<CronBuilderState>) => {
      const next = { ...state, ...patch };
      setState(next);
      const s = stateToSchedule(next);
      const err = cronScheduleError(s);
      onValueChange?.(err ? null : scheduleToValue(s), {
        schedule: s,
        error: err,
        summary: err ?? describeSchedule(s, describeOpts),
        scheduleString: err ? null : toScheduleString(scheduleToValue(s)),
      });
    };

    const zoneLabel = timeZone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "local time");
    const ref0 = now ?? Date.now();
    const runs = previewCount > 0 && !error ? nextScheduleRuns(schedule, ref0, previewCount, { timeZone }) : [];
    const runFormatter = new Intl.DateTimeFormat(locale ?? "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12,
      timeZone,
    });

    const timeField = (label = "Time") => (
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor={`${id}-time`} className="text-muted-foreground">
          {label}
        </label>
        <Input
          id={`${id}-time`}
          type="time"
          size="sm"
          value={state.time}
          disabled={disabled}
          onChange={(e) => update({ time: e.target.value })}
          className="w-32"
        />
      </div>
    );

    const toggleDay = (d: number) => {
      const next = state.days.includes(d) ? state.days.filter((x) => x !== d) : [...state.days, d];
      update({ days: next.sort((a, b) => a - b) });
    };

    const errorId = `${id}-error`;

    return (
      <fieldset ref={ref} disabled={disabled} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
        {legend ? <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend> : null}
        <SegmentedControl
          size="sm"
          aria-label="Schedule type"
          value={state.mode}
          onValueChange={(v) => v && update({ mode: v as CronScheduleMode })}
          className="max-w-full self-start overflow-x-auto scrollbar-none"
          options={modes.map((m) => ({ value: m, label: cronScheduleModeLabels[m] }))}
        />

        {state.mode === "interval" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Every</span>
            <NumberInput
              size="sm"
              min={1}
              value={state.every}
              onValueChange={(v) => update({ every: v })}
              aria-label="Interval"
              wrapperClassName="w-32"
              disabled={disabled}
            />
            <SegmentedControl
              size="sm"
              aria-label="Interval unit"
              value={state.unit}
              onValueChange={(v) => v && update({ unit: v as CronIntervalUnit })}
              options={[
                { value: "m", label: "min" },
                { value: "h", label: "hours" },
                { value: "d", label: "days" },
              ]}
            />
          </div>
        ) : null}

        {state.mode === "hourly" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">At minute</span>
            <NumberInput
              size="sm"
              min={0}
              max={59}
              value={state.minute}
              onValueChange={(v) => update({ minute: v })}
              aria-label="Minute past the hour"
              wrapperClassName="w-32"
              disabled={disabled}
            />
            <span className="text-muted-foreground">past every hour</span>
          </div>
        ) : null}

        {state.mode === "daily" || state.mode === "weekdays" ? timeField(state.mode === "weekdays" ? "Monday to Friday at" : "Every day at") : null}

        {state.mode === "weekly" ? (
          <div className="flex flex-col gap-3">
            <div role="group" aria-label="Days of the week" className="flex flex-wrap gap-1.5">
              {WEEK_ORDER.map((d) => {
                const on = state.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={DOW_NAMES[d]}
                    disabled={disabled}
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "flex h-8 min-w-10 items-center justify-center rounded-control border px-2 text-xs font-semibold transition-colors disabled:opacity-50",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted",
                      focusRing
                    )}
                  >
                    {DOW_NAMES[d]!.slice(0, 3)}
                  </button>
                );
              })}
            </div>
            {timeField("At")}
          </div>
        ) : null}

        {state.mode === "monthly" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">On day</span>
              <NumberInput
                size="sm"
                min={1}
                max={31}
                value={state.day}
                onValueChange={(v) => update({ day: v })}
                aria-label="Day of the month"
                wrapperClassName="w-32"
                disabled={disabled}
              />
              <span className="text-muted-foreground">of the month</span>
            </div>
            {(state.day ?? 0) > 28 ? <p className="text-xs text-muted-foreground">Months without day {state.day} are skipped.</p> : null}
            {timeField("At")}
          </div>
        ) : null}

        {state.mode === "once" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <DatePicker
              size="sm"
              aria-label="Date"
              value={state.onceDate}
              onValueChange={(d) => update({ onceDate: d })}
              disabled={disabled}
              className="w-44"
            />
            <label htmlFor={`${id}-once-time`} className="text-muted-foreground">
              at
            </label>
            <Input
              id={`${id}-once-time`}
              type="time"
              size="sm"
              value={state.onceTime}
              disabled={disabled}
              onChange={(e) => update({ onceTime: e.target.value })}
              className="w-32"
            />
          </div>
        ) : null}

        {state.mode === "custom" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-expr`} className="text-sm text-muted-foreground">
              Cron expression <span className="text-xs">(minute hour day month weekday)</span>
            </label>
            <Input
              id={`${id}-expr`}
              size="sm"
              value={state.expr}
              placeholder="*/15 * * * *"
              spellCheck={false}
              autoComplete="off"
              invalid={!!error}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              disabled={disabled}
              onChange={(e) => update({ expr: e.target.value })}
              className="font-mono"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2 rounded-box border border-border bg-subtle p-3 text-sm">
          <p
            id={error ? errorId : undefined}
            aria-live="polite"
            className={cn("flex items-start gap-2", error ? "text-destructive" : "text-foreground")}
            data-slot="cron-summary"
          >
            {error ? (
              <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />
            ) : (
              <RiCalendarScheduleLine aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span>{summary}</span>
          </p>
          {scheduleString && state.mode !== "custom" ? (
            <code className="self-start rounded-xs bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{scheduleString}</code>
          ) : null}
          {previewCount > 0 && !error ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span id={`${id}-runs`} className="font-medium">
                  Next runs
                </span>
                <span className="inline-flex items-center gap-1">
                  <RiGlobalLine aria-hidden className="size-3.5" />
                  {zoneLabel}
                </span>
              </div>
              {runs.length ? (
                <ol aria-labelledby={`${id}-runs`} className="flex flex-col gap-0.5">
                  {runs.map((r) => (
                    <li key={r.getTime()} className="flex justify-between gap-2 tabular-nums">
                      <time dateTime={r.toISOString()}>{runFormatter.format(r)}</time>
                      <span className="text-xs text-muted-foreground">{formatScheduleRelative(r, ref0)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">{state.mode === "once" ? "That time is in the past." : "No upcoming runs"}</p>
              )}
            </div>
          ) : null}
        </div>
      </fieldset>
    );
  }
);
CronScheduleField.displayName = "CronScheduleField";
