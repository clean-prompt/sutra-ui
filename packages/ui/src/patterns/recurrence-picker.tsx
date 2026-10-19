import * as React from "react";
import { cn, focusRing } from "../lib/cn";
import { dateKey, toValidDate } from "../lib/time";
import { clamp } from "../lib/math";
import { useControllableState } from "../hooks/use-controllable-state";
import { Input } from "../primitives/input";
import { SegmentedControl } from "../primitives/segmented-control";
import { SimpleSelect } from "../primitives/select";
import {
  describeRecurrence,
  recurrenceWeekdays,
  recurrenceMonthNames as monthNames,
  recurrenceNthNames as nthNames,
  recurrenceWeekdayNames as weekdayNames,
  sortRecurrenceWeekdays as sortDays,
  type RecurrenceFrequency,
  type RecurrenceRule,
  type RecurrenceWeekday,
} from "../lib/rrule";

/** Back-compat: the pure RRULE helpers live in `lib/rrule`. */
export { recurrenceWeekdays, toRRule, describeRecurrence } from "../lib/rrule";
export type { RecurrenceWeekday, RecurrenceFrequency, RecurrenceEnd, RecurrenceRule } from "../lib/rrule";

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

type Preset = RecurrenceFrequency | "custom";

interface RuleNumberInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | "";
  min: number;
  max?: number;
  onValueChange: (value: number) => void;
}

/** Number field that can be cleared while typing: commits whole numbers in range, shows the committed value on blur. */
function RuleNumberInput({ value, min, max = Number.MAX_SAFE_INTEGER, onValueChange, onBlur, ...props }: RuleNumberInputProps) {
  const [draft, setDraft] = React.useState<string | null>(null);
  return (
    <Input
      {...props}
      type="number"
      min={min}
      max={max === Number.MAX_SAFE_INTEGER ? undefined : max}
      value={draft ?? value}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const n = Number(text);
        if (text.trim() !== "" && Number.isFinite(n)) onValueChange(clamp(Math.round(n), min, max));
      }}
      onBlur={(e) => {
        setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}

/** Repeat-rule editor: none / daily / weekly (weekday toggles) / monthly / yearly / custom interval, plus an end condition. */
export const RecurrencePicker = React.forwardRef<HTMLFieldSetElement, RecurrencePickerProps>(
  (
    { value: valueProp, defaultValue = { freq: "none" }, onValueChange, referenceDate, showSummary = true, legend = "Repeat", className, ...props },
    ref
  ) => {
    const [rule, setRule] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [ref0] = React.useState(() => referenceDate ?? new Date());
    const [customChosen, setCustomMode] = React.useState(false);
    // An interval above 1 is only expressible in custom mode, including one that arrives after mount.
    const customMode = customChosen || (rule.interval ?? 1) > 1;
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
            <RuleNumberInput
              id={`${id}-interval`}
              size="sm"
              min={1}
              value={rule.interval ?? 1}
              onValueChange={(interval) => {
                setCustomMode(true);
                patch({ interval });
              }}
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
              <RuleNumberInput
                size="sm"
                min={1}
                max={31}
                aria-label="Day of month"
                value={rule.monthDay ?? ref0.getDate()}
                onValueChange={(monthDay) => patch({ monthlyMode: "day", monthDay })}
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
            <RuleNumberInput
              size="sm"
              min={1}
              max={31}
              aria-label="Day"
              value={rule.monthDay ?? ref0.getDate()}
              onValueChange={(monthDay) => patch({ monthDay })}
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
                value={end.type === "on" ? dateKey(end.date) : ""}
                onChange={(e) => {
                  const date = toValidDate(e.target.value);
                  if (date) patch({ end: { type: "on", date } });
                }}
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
              <RuleNumberInput
                size="sm"
                min={1}
                aria-label="Occurrences"
                value={end.type === "after" ? end.count : ""}
                placeholder="10"
                onValueChange={(count) => patch({ end: { type: "after", count } })}
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
