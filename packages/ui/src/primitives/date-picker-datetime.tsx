import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import type { Matcher } from "react-day-picker";
import { RiCalendarLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { dateKey, pad2, startOfDay } from "../lib/time";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { FieldContext, useField } from "./field";
import { TimePicker, type TimeGranularity } from "./time-picker";
import {
  ClearButton,
  dateTriggerVariants,
  isSameDay,
  popoverContentClass,
  useCalendarLocale,
  useOnOpen,
  useOptionalControlled,
  type BasePickerProps,
} from "./date-picker-internal";

/* ---------------------------------------------------------------- */
/* DateTimePicker                                                    */
/* ---------------------------------------------------------------- */

/** Accepted inputs for `DateTimePicker` values: a `Date`, or a local `"YYYY-MM-DDTHH:mm"` / ISO string. */
export type DateTimeInput = Date | string;

const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/** Parse a Date or string into a valid Date; bare `"YYYY-MM-DD[THH:mm[:ss]]"` is read as local time. */
function toLocalDate(v: DateTimeInput | undefined | null): Date | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
  const m = LOCAL_DATETIME.exec(v.trim());
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0))
    : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Local wall-clock string in `<input type="datetime-local">` format: `"YYYY-MM-DDTHH:mm"` (`:ss` with seconds). */
function toLocalValue(d: Date | undefined, granularity: TimeGranularity) {
  if (!d) return "";
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}${granularity === "second" ? `:${pad2(d.getSeconds())}` : ""}`;
  return `${dateKey(d)}T${time}`;
}

const timeOf = (d: Date, granularity: TimeGranularity) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}${granularity === "second" ? `:${pad2(d.getSeconds())}` : ""}`;

function withTime(day: Date, time: string) {
  const [h = 0, m = 0, s = 0] = time.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, s);
}

function clampDate(d: Date, min?: Date, max?: Date) {
  if (min && d < min) return new Date(min);
  if (max && d > max) return new Date(max);
  return d;
}

export interface DateTimePreset {
  label: string;
  /** Called when the preset is chosen, so relative values ("In 1 hour") stay fresh. */
  getValue: () => Date;
}

export interface DateTimePickerProps extends Omit<BasePickerProps, "formatOptions"> {
  /** A `Date`, or a local `"YYYY-MM-DDTHH:mm"` string (what `<input type="datetime-local">` uses). */
  value?: DateTimeInput;
  /** Initial date and time when uncontrolled; a `Date` or a local `"YYYY-MM-DDTHH:mm"` string. */
  defaultValue?: DateTimeInput;
  /** Called with the new local date-time; `meta.localValue` is the same moment as `"YYYY-MM-DDTHH:mm"` (`""` when cleared). */
  onValueChange?: (value: Date | undefined, meta: { localValue: string }) => void;
  /** Earliest selectable moment. Days before it are disabled and times are clamped. */
  min?: DateTimeInput;
  /** Latest selectable moment. */
  max?: DateTimeInput;
  /** Force a 12- or 24-hour clock. Defaults to the locale's convention. */
  hourCycle?: 12 | 24;
  /** Add a seconds segment. Default `"minute"`. */
  granularity?: TimeGranularity;
  /** Minutes moved by the minute segment's arrow keys. */
  step?: number;
  /** Time used when a day is picked before any time is set. Default `"00:00"`. */
  defaultTime?: string;
  /** Quick picks shown in a sidebar ("In 1 hour", "Tomorrow 9:00"). Choosing one sets the value and closes. */
  presets?: DateTimePreset[];
  /** Options passed to `Intl.DateTimeFormat`. Defaults to `{ dateStyle: "medium", timeStyle: "short" }`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Custom formatter for the trigger text; overrides `formatOptions`. */
  formatDateTime?: (date: Date) => string;
  /** Show month/year dropdowns in the calendar caption. */
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  /** Label next to the time field. Default "Time". */
  timeLabel?: string;
  /** Label of the button that closes the popover. Default "Done". */
  doneLabel?: string;
}

/**
 * Input-like button that opens a calendar plus a `TimePicker` to pick a local date and time.
 * Time-zone agnostic: the value is wall-clock time in the user's zone, like `datetime-local`.
 */
export const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>((props, ref) => {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    min: minProp,
    max: maxProp,
    hourCycle,
    granularity = "minute",
    step,
    defaultTime = "00:00",
    presets = [],
    placeholder = "Pick a date and time",
    clearable,
    disabled: disabledProp,
    required: requiredProp,
    invalid: invalidProp,
    size = "md",
    variant,
    locale,
    formatOptions,
    formatDateTime,
    disabledDates,
    startMonth,
    endMonth,
    captionLayout,
    timeLabel = "Time",
    doneLabel = "Done",
    align = "start",
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
    contentClassName,
    id,
    name,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  } = props;

  const field = useField({
    id,
    disabled: disabledProp,
    required: requiredProp,
    invalid: invalidProp,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  const disabled = field.disabled;
  const timeLabelId = `${React.useId().replace(/:/g, "")}-time`;

  const isControlled = "value" in props;
  const [internal, setInternal] = React.useState<Date | undefined>(() => toLocalDate(defaultValue));
  const value = isControlled ? toLocalDate(valueProp) : internal;
  const min = toLocalDate(minProp);
  const max = toLocalDate(maxProp);

  const setValue = (next: Date | undefined) => {
    const clamped = next ? clampDate(next, min, max) : undefined;
    if (!isControlled) setInternal(clamped);
    onValueChange?.(clamped, { localValue: toLocalValue(clamped, granularity) });
  };

  const [open, setOpen] = useOptionalControlled<boolean>(
    openProp !== undefined,
    openProp ?? false,
    defaultOpen,
    onOpenChange
  );
  /** Time typed before a day is picked. */
  const [draftTime, setDraftTime] = React.useState<string | undefined>(undefined);
  const [month, setMonth] = React.useState<Date>(() => value ?? min ?? new Date());
  // Re-sync the month and the pre-pick time from `value` on every false -> true transition, whether
  // the user opened it or a controlled `open` did (Radix only calls onOpenChange for the former).
  useOnOpen(open, () => {
    setMonth(value ?? min ?? new Date());
    setDraftTime(undefined);
  });

  const calendarLocale = useCalendarLocale(locale);
  const formatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(
        locale,
        formatOptions ?? {
          dateStyle: "medium",
          timeStyle: granularity === "second" ? "medium" : "short",
          ...(hourCycle ? { hourCycle: hourCycle === 12 ? "h12" : "h23" } : null),
        }
      ),
    [locale, formatOptions, granularity, hourCycle]
  );
  const label = value ? (formatDateTime ? formatDateTime(value) : formatter.format(value)) : null;
  const showClear = clearable && !!value && !disabled;

  const boundsMatchers: Matcher[] = [];
  if (min) boundsMatchers.push({ before: startOfDay(min) });
  if (max) boundsMatchers.push({ after: startOfDay(max) });
  const calendarDisabled =
    boundsMatchers.length || disabledDates
      ? [...boundsMatchers, ...(disabledDates ? (Array.isArray(disabledDates) ? disabledDates : [disabledDates]) : [])]
      : undefined;

  const pickDay = (day: Date | undefined) => {
    if (!day) return;
    setValue(withTime(day, value ? timeOf(value, granularity) : (draftTime ?? defaultTime)));
  };
  const pickTime = (time: string | undefined) => {
    if (!time) return;
    if (value) setValue(withTime(value, time));
    else setDraftTime(time);
  };

  const timeValue = value ? timeOf(value, granularity) : draftTime;
  const fmtBound = (d: Date) => timeOf(d, granularity);
  const timeMin = value && min && isSameDay(value, min) ? fmtBound(min) : undefined;
  const timeMax = value && max && isSameDay(value, max) ? fmtBound(max) : undefined;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative w-full", className)}>
        <PopoverPrimitive.Trigger asChild>
          <button
            ref={ref}
            id={field.id}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={field["aria-describedby"]}
            aria-invalid={field["aria-invalid"]}
            aria-required={field.required}
            className={cn(dateTriggerVariants({ size, variant }), showClear && "pe-9")}
          >
            <RiCalendarLine aria-hidden className="text-muted-foreground" />
            <span className={cn("flex-1 truncate", !label && "text-muted-foreground")}>{label ?? placeholder}</span>
          </button>
        </PopoverPrimitive.Trigger>
        {showClear && <ClearButton size={size} onClear={() => setValue(undefined)} />}
        {name && <input type="hidden" name={name} value={toLocalValue(value, granularity)} />}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          aria-label={ariaLabel || placeholder || "Choose date and time"}
          collisionPadding={8}
          className={cn(
            popoverContentClass,
            "w-auto max-w-[calc(100vw-1rem)] max-h-(--radix-popover-content-available-height) overflow-y-auto overscroll-contain",
            contentClassName
          )}
        >
          <div className="flex flex-col sm:flex-row">
            {presets.length > 0 && (
              <div
                role="group"
                aria-label="Presets"
                className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border bg-subtle p-2 sm:w-40 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-e"
              >
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setValue(preset.getValue());
                      setOpen(false);
                    }}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-control px-2.5 py-1.5 text-start text-sm text-foreground transition-colors hover:bg-accent",
                      focusRing
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col">
              <Calendar
                {...calendarLocale}
                mode="single"
                required
                selected={value}
                month={month}
                onMonthChange={setMonth}
                captionLayout={captionLayout}
                startMonth={startMonth}
                endMonth={endMonth}
                disabled={calendarDisabled}
                onSelect={(next: Date | undefined) => pickDay(next)}
                autoFocus
              />
              <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2.5">
                <span id={timeLabelId} className="text-sm text-muted-foreground">
                  {timeLabel}
                </span>
                {/* Detach from a surrounding Field: its id and description belong to the trigger. */}
                <FieldContext.Provider value={null}>
                  <TimePicker
                    aria-labelledby={timeLabelId}
                    size="sm"
                    className="w-auto flex-1"
                    value={timeValue}
                    onValueChange={pickTime}
                    min={timeMin}
                    max={timeMax}
                    locale={locale}
                    hourCycle={hourCycle}
                    granularity={granularity}
                    step={step}
                  />
                </FieldContext.Provider>
                <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
                  {doneLabel}
                </Button>
              </div>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
DateTimePicker.displayName = "DateTimePicker";
