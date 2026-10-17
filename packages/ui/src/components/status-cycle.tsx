import * as React from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Input } from "./input";
import { SegmentedControl } from "./segmented-control";
import { SimpleSelect } from "./select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/* ------------------------------------------------------------------ */
/* StatusCycle                                                         */
/* ------------------------------------------------------------------ */

export type StatusCycleColor = "neutral" | "primary" | "success" | "warning" | "destructive" | "info";

export interface StatusCycleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: StatusCycleColor;
}

const pillColor: Record<StatusCycleColor, string> = {
  neutral: "bg-muted text-foreground hover:bg-border",
  primary: "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70",
  success: "bg-success-soft text-success-soft-foreground hover:bg-success-soft/70",
  warning: "bg-warning-soft text-warning-soft-foreground hover:bg-warning-soft/70",
  destructive: "bg-destructive-soft text-destructive-soft-foreground hover:bg-destructive-soft/70",
  info: "bg-info-soft text-info-soft-foreground hover:bg-info-soft/70",
};

export interface StatusCycleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Ordered statuses, e.g. unread → reading → read. */
  statuses: StatusCycleOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Wrap from the last status back to the first. Default true. */
  loop?: boolean;
  /** Show a chevron menu to pick a status directly. Default true. */
  showMenu?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
  /** Prefix for the accessible label, e.g. "Reading status". Default "Status". */
  label?: string;
}

/** Status pill that advances on click (Shift+click or ← goes back) with a menu to pick a status directly. */
export const StatusCycle = React.forwardRef<HTMLDivElement, StatusCycleProps>(
  (
    {
      statuses,
      value: valueProp,
      defaultValue,
      onValueChange,
      loop = true,
      showMenu = true,
      size = "md",
      disabled,
      label = "Status",
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? statuses[0]?.value ?? "",
      onChange: onValueChange,
    });
    const index = Math.max(0, statuses.findIndex((s) => s.value === value));
    const current = statuses[index];
    const n = statuses.length;

    const stepIndex = (dir: 1 | -1) => {
      const next = index + dir;
      if (next >= n) return loop ? 0 : n - 1;
      if (next < 0) return loop ? n - 1 : 0;
      return next;
    };
    const step = (dir: 1 | -1) => {
      const next = statuses[stepIndex(dir)];
      if (next) setValue(next.value);
    };
    const nextLabel = statuses[stepIndex(1)]?.label;

    if (!current) return null;
    const color = pillColor[current.color ?? "neutral"];
    const height = size === "sm" ? "h-7 text-xs [&_svg]:size-3.5" : "h-8 text-sm [&_svg]:size-4";

    return (
      <div ref={ref} data-status={current.value} className={cn("inline-flex items-stretch rounded-control", className)} {...props}>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${current.label}. ${nextLabel && nextLabel !== current.label ? `Activate to change to ${nextLabel}.` : ""}`.trim()}
          aria-keyshortcuts="Shift+Enter ArrowLeft ArrowRight"
          onClick={(e) => step(e.shiftKey ? -1 : 1)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              step(1);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              step(-1);
            }
          }}
          className={cn(
            "inline-flex select-none items-center gap-1.5 px-3 font-medium transition-[background-color,transform] active:scale-[0.97]",
            "disabled:pointer-events-none disabled:opacity-50",
            showMenu ? "rounded-l-control pr-2" : "rounded-control",
            height,
            color,
            focusRing
          )}
        >
          {current.icon ? <span aria-hidden className="inline-flex">{current.icon}</span> : null}
          <span key={current.value} className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
            {current.label}
          </span>
        </button>
        {showMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={disabled}
              aria-label={`Choose ${label.toLowerCase()}`}
              className={cn(
                "inline-flex items-center rounded-r-control border-l border-current/15 px-1.5 transition-colors disabled:opacity-50",
                height,
                color,
                focusRing
              )}
            >
              <RiArrowDownSLine aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuRadioGroup value={current.value} onValueChange={setValue}>
                {statuses.map((s) => (
                  <DropdownMenuRadioItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-2 [&_svg]:size-4">
                      {s.icon ? <span aria-hidden className="inline-flex">{s.icon}</span> : null}
                      {s.label}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    );
  }
);
StatusCycle.displayName = "StatusCycle";

/* ------------------------------------------------------------------ */
/* Recurrence                                                          */
/* ------------------------------------------------------------------ */

export type RecurrenceWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type RecurrenceEnd =
  | { type: "never" }
  | { type: "on"; date: Date }
  | { type: "after"; count: number };

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  /** Every n units. Default 1. */
  interval?: number;
  /** Weekly: days of the week. */
  byWeekday?: RecurrenceWeekday[];
  /** Monthly: on a day of the month, or on the nth weekday ("first Monday"). */
  monthlyMode?: "day" | "weekday";
  /** Monthly / yearly day of month (1–31). */
  monthDay?: number;
  /** Monthly weekday mode: 1–4, or -1 for "last". */
  nth?: number;
  nthWeekday?: RecurrenceWeekday;
  /** Yearly: month 1–12. */
  month?: number;
  end?: RecurrenceEnd;
}

export const recurrenceWeekdays: RecurrenceWeekday[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const weekdayNames: Record<RecurrenceWeekday, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const nthNames: Record<string, string> = { "1": "first", "2": "second", "3": "third", "4": "fourth", "-1": "last" };
const unitNames: Record<Exclude<RecurrenceFrequency, "none">, string> = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };

const pad2 = (n: number) => String(n).padStart(2, "0");

function sortDays(days: RecurrenceWeekday[]) {
  return [...new Set(days)].sort((a, b) => recurrenceWeekdays.indexOf(a) - recurrenceWeekdays.indexOf(b));
}

/** RFC 5545 RRULE value for a rule ("" when it does not repeat). Pass `{ prefix: true }` for "RRULE:…". */
export function toRRule(rule: RecurrenceRule, options: { prefix?: boolean } = {}): string {
  if (rule.freq === "none") return "";
  const parts = [`FREQ=${rule.freq.toUpperCase()}`];
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  if (rule.freq === "weekly" && rule.byWeekday?.length) parts.push(`BYDAY=${sortDays(rule.byWeekday).join(",")}`);
  if (rule.freq === "monthly") {
    if (rule.monthlyMode === "weekday" && rule.nthWeekday) parts.push(`BYDAY=${rule.nth ?? 1}${rule.nthWeekday}`);
    else if (rule.monthDay) parts.push(`BYMONTHDAY=${rule.monthDay}`);
  }
  if (rule.freq === "yearly") {
    if (rule.month) parts.push(`BYMONTH=${rule.month}`);
    if (rule.monthDay) parts.push(`BYMONTHDAY=${rule.monthDay}`);
  }
  const end = rule.end;
  if (end?.type === "after") parts.push(`COUNT=${Math.max(1, Math.floor(end.count))}`);
  if (end?.type === "on") {
    const d = end.date;
    parts.push(`UNTIL=${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`);
  }
  const value = parts.join(";");
  return options.prefix ? `RRULE:${value}` : value;
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Plain-English summary, e.g. "Every 2 weeks on Monday and Wednesday, 10 times". */
export function describeRecurrence(rule: RecurrenceRule): string {
  if (rule.freq === "none") return "Does not repeat";
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  const unit = unitNames[rule.freq];
  let text = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;

  if (rule.freq === "weekly" && rule.byWeekday?.length) {
    const days = sortDays(rule.byWeekday);
    const isWeekdays = days.length === 5 && days.every((d) => !["SA", "SU"].includes(d));
    if (isWeekdays && interval === 1) text = "Every weekday";
    else if (days.length === 7) text = interval === 1 ? "Every day" : `${text} on every day`;
    else text += ` on ${joinList(days.map((d) => weekdayNames[d]))}`;
  }
  if (rule.freq === "monthly") {
    if (rule.monthlyMode === "weekday" && rule.nthWeekday) text += ` on the ${nthNames[String(rule.nth ?? 1)]} ${weekdayNames[rule.nthWeekday]}`;
    else if (rule.monthDay) text += ` on day ${rule.monthDay}`;
  }
  if (rule.freq === "yearly" && rule.month) {
    text += ` on ${monthNames[rule.month - 1]}${rule.monthDay ? ` ${rule.monthDay}` : ""}`;
  }
  const end = rule.end;
  if (end?.type === "after") text += `, ${end.count} ${end.count === 1 ? "time" : "times"}`;
  if (end?.type === "on") {
    const d = end.date;
    text += `, until ${monthNames[d.getMonth()]!.slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return text;
}

/* ------------------------------------------------------------------ */
/* RecurrencePicker                                                    */
/* ------------------------------------------------------------------ */

export interface RecurrencePickerProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "defaultValue" | "onChange"> {
  value?: RecurrenceRule;
  defaultValue?: RecurrenceRule;
  onValueChange?: (rule: RecurrenceRule) => void;
  /** Reference date used for sensible defaults (weekday, day of month). Default today. */
  referenceDate?: Date;
  /** Show the human-readable summary under the controls. Default true. */
  showSummary?: boolean;
  legend?: string;
}

const jsDayToWeekday = (d: Date): RecurrenceWeekday => recurrenceWeekdays[(d.getDay() + 6) % 7]!;
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromDateInput = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};

type Preset = RecurrenceFrequency | "custom";

/** Repeat-rule editor: none / daily / weekly (weekday toggles) / monthly / yearly / custom interval, plus an end condition. */
export const RecurrencePicker = React.forwardRef<HTMLFieldSetElement, RecurrencePickerProps>(
  (
    { value: valueProp, defaultValue = { freq: "none" }, onValueChange, referenceDate, showSummary = true, legend = "Repeat", className, ...props },
    ref
  ) => {
    const [rule, setRule] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [ref0] = React.useState(() => referenceDate ?? new Date());
    const [customMode, setCustomMode] = React.useState((rule.interval ?? 1) > 1);
    const preset: Preset = rule.freq === "none" ? "none" : customMode ? "custom" : rule.freq;
    const id = React.useId();
    const nthOfMonth = Math.min(4, Math.ceil(ref0.getDate() / 7));

    const patch = (p: Partial<RecurrenceRule>) => setRule({ ...rule, ...p });

    const defaultsFor = (freq: RecurrenceFrequency): Partial<RecurrenceRule> => ({
      freq,
      byWeekday: freq === "weekly" ? (rule.byWeekday?.length ? rule.byWeekday : [jsDayToWeekday(ref0)]) : rule.byWeekday,
      monthlyMode: rule.monthlyMode ?? "day",
      monthDay: rule.monthDay ?? ref0.getDate(),
      nth: rule.nth ?? nthOfMonth,
      nthWeekday: rule.nthWeekday ?? jsDayToWeekday(ref0),
      month: freq === "yearly" ? (rule.month ?? ref0.getMonth() + 1) : rule.month,
      end: rule.end ?? { type: "never" },
    });

    const choosePreset = (p: string) => {
      if (p === "custom") {
        setCustomMode(true);
        setRule({ ...rule, ...defaultsFor(rule.freq === "none" ? "daily" : rule.freq), interval: Math.max(2, rule.interval ?? 1) });
      } else {
        setCustomMode(false);
        setRule({ ...rule, ...defaultsFor(p as RecurrenceFrequency), interval: 1 });
      }
    };

    const toggleDay = (day: RecurrenceWeekday) => {
      const days = rule.byWeekday ?? [];
      const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
      if (next.length === 0) return;
      patch({ byWeekday: sortDays(next) });
    };

    const end = rule.end ?? { type: "never" };
    const repeating = rule.freq !== "none";

    return (
      <fieldset ref={ref} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
        <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
        <SegmentedControl
          size="sm"
          aria-label="Frequency"
          value={preset}
          onValueChange={(v) => v && choosePreset(v)}
          className="max-w-full overflow-x-auto"
          options={[
            { value: "none", label: "Never" },
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
            { value: "custom", label: "Custom" },
          ]}
        />

        {preset === "custom" ? (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor={`${id}-interval`}>Every</label>
            <Input
              id={`${id}-interval`}
              type="number"
              size="sm"
              min={1}
              value={rule.interval ?? 1}
              onChange={(e) => patch({ interval: Math.max(1, Number(e.target.value) || 1) })}
              className="w-20"
            />
            <SimpleSelect
              size="sm"
              aria-label="Interval unit"
              value={rule.freq === "none" ? "daily" : rule.freq}
              onValueChange={(v) => setRule({ ...rule, ...defaultsFor(v as RecurrenceFrequency), interval: rule.interval })}
              options={[
                { value: "daily", label: (rule.interval ?? 1) === 1 ? "day" : "days" },
                { value: "weekly", label: (rule.interval ?? 1) === 1 ? "week" : "weeks" },
                { value: "monthly", label: (rule.interval ?? 1) === 1 ? "month" : "months" },
                { value: "yearly", label: (rule.interval ?? 1) === 1 ? "year" : "years" },
              ]}
              className="w-32"
            />
          </div>
        ) : null}

        {rule.freq === "weekly" ? (
          <div role="group" aria-label="Repeat on" className="flex flex-wrap gap-1.5">
            {recurrenceWeekdays.map((d) => {
              const on = rule.byWeekday?.includes(d) ?? false;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={weekdayNames[d]}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted",
                    focusRing
                  )}
                >
                  {weekdayNames[d].charAt(0)}
                </button>
              );
            })}
          </div>
        ) : null}

        {rule.freq === "monthly" ? (
          <div role="radiogroup" aria-label="Monthly on" className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-monthly`}
                checked={rule.monthlyMode !== "weekday"}
                onChange={() => patch({ monthlyMode: "day" })}
                className="accent-[var(--primary)]"
              />
              On day
              <Input
                type="number"
                size="sm"
                min={1}
                max={31}
                aria-label="Day of month"
                value={rule.monthDay ?? ref0.getDate()}
                onChange={(e) => patch({ monthlyMode: "day", monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                className="w-20"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${id}-monthly`}
                  checked={rule.monthlyMode === "weekday"}
                  onChange={() => patch({ monthlyMode: "weekday" })}
                  className="accent-[var(--primary)]"
                />
                On the
              </label>
              <SimpleSelect
                size="sm"
                aria-label="Week of month"
                value={String(rule.nth ?? nthOfMonth)}
                onValueChange={(v) => patch({ monthlyMode: "weekday", nth: Number(v) })}
                options={["1", "2", "3", "4", "-1"].map((v) => ({ value: v, label: nthNames[v] }))}
                className="w-28"
              />
              <SimpleSelect
                size="sm"
                aria-label="Weekday"
                value={rule.nthWeekday ?? jsDayToWeekday(ref0)}
                onValueChange={(v) => patch({ monthlyMode: "weekday", nthWeekday: v as RecurrenceWeekday })}
                options={recurrenceWeekdays.map((d) => ({ value: d, label: weekdayNames[d] }))}
                className="w-36"
              />
            </div>
          </div>
        ) : null}

        {rule.freq === "yearly" ? (
          <div className="flex items-center gap-2 text-sm">
            <span>On</span>
            <SimpleSelect
              size="sm"
              aria-label="Month"
              value={String(rule.month ?? ref0.getMonth() + 1)}
              onValueChange={(v) => patch({ month: Number(v) })}
              options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
              className="w-36"
            />
            <Input
              type="number"
              size="sm"
              min={1}
              max={31}
              aria-label="Day"
              value={rule.monthDay ?? ref0.getDate()}
              onChange={(e) => patch({ monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-20"
            />
          </div>
        ) : null}

        {repeating ? (
          <div role="radiogroup" aria-label="Ends" className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Ends</span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-end`}
                checked={end.type === "never"}
                onChange={() => patch({ end: { type: "never" } })}
                className="accent-[var(--primary)]"
              />
              Never
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${id}-end`}
                  checked={end.type === "on"}
                  onChange={() => patch({ end: { type: "on", date: end.type === "on" ? end.date : new Date(ref0.getFullYear(), ref0.getMonth() + 1, ref0.getDate()) } })}
                  className="accent-[var(--primary)]"
                />
                On
              </label>
              <Input
                type="date"
                size="sm"
                aria-label="End date"
                value={end.type === "on" ? toDateInput(end.date) : ""}
                onChange={(e) => e.target.value && patch({ end: { type: "on", date: fromDateInput(e.target.value) } })}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${id}-end`}
                  checked={end.type === "after"}
                  onChange={() => patch({ end: { type: "after", count: end.type === "after" ? end.count : 10 } })}
                  className="accent-[var(--primary)]"
                />
                After
              </label>
              <Input
                type="number"
                size="sm"
                min={1}
                aria-label="Occurrences"
                value={end.type === "after" ? end.count : ""}
                placeholder="10"
                onChange={(e) => patch({ end: { type: "after", count: Math.max(1, Number(e.target.value) || 1) } })}
                className="w-20"
              />
              <span>occurrences</span>
            </div>
          </div>
        ) : null}

        {showSummary ? (
          <p aria-live="polite" className="rounded-md bg-muted px-3 py-2 text-sm text-foreground" data-recurrence-summary>
            {describeRecurrence(rule)}
          </p>
        ) : null}
      </fieldset>
    );
  }
);
RecurrencePicker.displayName = "RecurrencePicker";
