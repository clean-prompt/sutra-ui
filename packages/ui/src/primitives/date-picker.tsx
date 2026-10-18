import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cva } from "class-variance-authority";
import type { DateRange, Matcher } from "react-day-picker";
import { RiCalendarLine, RiCloseCircleFill } from "@remixicon/react";
import { cn, focusRing, invalidRing, type Size } from "../lib/cn";
import { addDays, calendarDayDiff, dateKey, pad2, startOfDay } from "../lib/time";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { FieldContext, useField } from "./field";
import { TimePicker, type TimeGranularity } from "./time-picker";

export type { DateRange } from "react-day-picker";

/* ---------------------------------------------------------------- */
/* Date helpers                                                      */
/* ---------------------------------------------------------------- */

/** Local midnight `n` calendar days from `d`. */
const dayOffset = (d: Date, n: number) => startOfDay(addDays(d, n));
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const isSameDay = (a?: Date, b?: Date) => !!a && !!b && calendarDayDiff(a, b) === 0;
const isSameRange = (a?: DateRange, b?: DateRange) =>
  !!a && !!b && isSameDay(a.from, b.from) && (isSameDay(a.to, b.to) || (!a.to && !b.to));

function useOptionalControlled<T>(
  isControlled: boolean,
  value: T,
  defaultValue: T,
  onChange?: (value: T) => void
) {
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const current = isControlled ? value : internal;
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [current, set] as const;
}

/* ---------------------------------------------------------------- */
/* Shared trigger                                                    */
/* ---------------------------------------------------------------- */

const dateTriggerVariants = cva(
  [
    "group/date-trigger flex w-full items-center gap-2 rounded-control border border-input bg-background text-left text-sm text-foreground shadow-xs",
    "transition-[color,border-color,box-shadow] duration-150 hover:border-border-strong",
    "data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20",
    "disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusRing,
    invalidRing,
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 [&_svg]:size-4",
        md: "h-9 px-3 [&_svg]:size-4",
        lg: "h-10 px-3.5 [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

const popoverContentClass = cn(
  "z-50 rounded-box border border-border bg-popover text-popover-foreground shadow-lg outline-none",
  "origin-(--radix-popover-content-transform-origin)",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
);

interface ClearButtonProps {
  onClear: () => void;
  size: Size;
}

function ClearButton({ onClear, size }: ClearButtonProps) {
  return (
    <button
      type="button"
      aria-label="Clear date"
      onClick={onClear}
      className={cn(
        "absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
        size === "sm" ? "right-2" : size === "lg" ? "right-3" : "right-2.5",
        focusRing
      )}
    >
      <RiCloseCircleFill aria-hidden className="size-4" />
    </button>
  );
}

interface BasePickerProps {
  placeholder?: string;
  /** Show an inline button that resets the value. */
  clearable?: boolean;
  disabled?: boolean;
  /** Marks the picker required. Inherited from a surrounding `Field` when omitted. */
  required?: boolean;
  invalid?: boolean;
  size?: Size;
  /** BCP 47 locale passed to `Intl.DateTimeFormat`. */
  locale?: string;
  /** Options passed to `Intl.DateTimeFormat`. Defaults to `{ dateStyle: "medium" }`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Dates that can't be picked (react-day-picker matchers). */
  disabledDates?: Matcher | Matcher[];
  startMonth?: Date;
  endMonth?: Date;
  align?: "start" | "center" | "end";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/* ---------------------------------------------------------------- */
/* DatePicker                                                        */
/* ---------------------------------------------------------------- */

export interface DatePickerProps extends BasePickerProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (value: Date | undefined) => void;
  /** Custom formatter for the trigger text; overrides `formatOptions`. */
  formatDate?: (date: Date) => string;
  /** Show month/year dropdowns in the calendar caption. */
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
}

/** Input-like button that opens a calendar popover to pick a single date. */
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>((props, ref) => {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    placeholder = "Pick a date",
    clearable,
    disabled: disabledProp,
    required: requiredProp,
    invalid: invalidProp,
    size = "md",
    locale,
    formatOptions,
    formatDate,
    disabledDates,
    startMonth,
    endMonth,
    captionLayout,
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

  const [value, setValue] = useOptionalControlled<Date | undefined>(
    "value" in props,
    valueProp,
    defaultValue,
    onValueChange
  );
  const [open, setOpen] = useOptionalControlled<boolean>(
    openProp !== undefined,
    openProp ?? false,
    defaultOpen,
    onOpenChange
  );

  const formatter = React.useMemo(
    () => new Intl.DateTimeFormat(locale, formatOptions ?? { dateStyle: "medium" }),
    [locale, formatOptions]
  );
  const label = value ? (formatDate ? formatDate(value) : formatter.format(value)) : null;
  const showClear = clearable && !!value && !disabled;

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
            className={cn(dateTriggerVariants({ size }), showClear && "pr-9")}
          >
            <RiCalendarLine aria-hidden className="text-muted-foreground" />
            <span className={cn("flex-1 truncate", !label && "text-muted-foreground")}>
              {label ?? placeholder}
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        {showClear && <ClearButton size={size} onClear={() => setValue(undefined)} />}
        {name && <input type="hidden" name={name} value={value ? dateKey(value) : ""} />}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          aria-label={ariaLabel || placeholder || "Choose date"}
          className={cn(popoverContentClass, "w-auto", contentClassName)}
        >
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value}
            captionLayout={captionLayout}
            startMonth={startMonth}
            endMonth={endMonth}
            disabled={disabledDates}
            onSelect={(next: Date | undefined) => {
              setValue(next);
              if (next) setOpen(false);
            }}
            autoFocus
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
DatePicker.displayName = "DatePicker";

/* ---------------------------------------------------------------- */
/* DateRangePicker                                                   */
/* ---------------------------------------------------------------- */

export interface DateRangePreset {
  label: string;
  /** Called when the preset is chosen, so relative ranges stay fresh. */
  getRange: () => DateRange;
}

/** Default presets for `DateRangePicker`. */
export const defaultDateRangePresets: DateRangePreset[] = [
  { label: "Today", getRange: () => ({ from: startOfDay(new Date()), to: startOfDay(new Date()) }) },
  {
    label: "Yesterday",
    getRange: () => {
      const d = dayOffset(new Date(), -1);
      return { from: d, to: d };
    },
  },
  { label: "Last 7 days", getRange: () => ({ from: dayOffset(new Date(), -6), to: startOfDay(new Date()) }) },
  { label: "Last 30 days", getRange: () => ({ from: dayOffset(new Date(), -29), to: startOfDay(new Date()) }) },
  {
    label: "This month",
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: "Last month",
    getRange: () => {
      const prev = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      return { from: prev, to: endOfMonth(prev) };
    },
  },
];

export interface DateRangePickerProps extends BasePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange | undefined) => void;
  /** Sidebar presets. Pass `[]` to hide the sidebar. */
  presets?: DateRangePreset[];
  /** Number of months shown side by side. */
  numberOfMonths?: number;
  /** Custom formatter for the trigger text. */
  formatRange?: (range: DateRange) => string;
  applyLabel?: string;
  cancelLabel?: string;
}

/** Date range picker with two months, a presets sidebar and an Apply/Cancel footer. */
export const DateRangePicker = React.forwardRef<HTMLButtonElement, DateRangePickerProps>(
  (props, ref) => {
    const {
      value: valueProp,
      defaultValue,
      onValueChange,
      placeholder = "Pick a date range",
      clearable,
      disabled: disabledProp,
      required: requiredProp,
      invalid: invalidProp,
      size = "md",
      locale,
      formatOptions,
      formatRange,
      disabledDates,
      startMonth,
      endMonth,
      presets = defaultDateRangePresets,
      numberOfMonths = 2,
      applyLabel = "Apply",
      cancelLabel = "Cancel",
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

    const [value, setValue] = useOptionalControlled<DateRange | undefined>(
      "value" in props,
      valueProp,
      defaultValue,
      onValueChange
    );
    const [open, setOpenState] = useOptionalControlled<boolean>(
      openProp !== undefined,
      openProp ?? false,
      defaultOpen,
      onOpenChange
    );
    const [draft, setDraft] = React.useState<DateRange | undefined>(value);
    const [month, setMonth] = React.useState<Date>(value?.from ?? new Date());

    const setOpen = (next: boolean) => {
      if (next) {
        setDraft(value);
        setMonth(value?.from ?? new Date());
      }
      setOpenState(next);
    };

    const formatter = React.useMemo(
      () => new Intl.DateTimeFormat(locale, formatOptions ?? { dateStyle: "medium" }),
      [locale, formatOptions]
    );

    const formatLabel = (range?: DateRange) => {
      if (!range?.from) return null;
      if (formatRange) return formatRange(range);
      if (!range.to || isSameDay(range.from, range.to)) return formatter.format(range.from);
      return formatter.formatRange(range.from, range.to);
    };

    const label = formatLabel(value);
    const draftLabel = formatLabel(draft);
    const showClear = clearable && !!value?.from && !disabled;

    const applyPreset = (preset: DateRangePreset) => {
      const range = preset.getRange();
      setDraft(range);
      if (range.from) setMonth(range.from);
    };

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
              className={cn(dateTriggerVariants({ size }), showClear && "pr-9")}
            >
              <RiCalendarLine aria-hidden className="text-muted-foreground" />
              <span className={cn("flex-1 truncate", !label && "text-muted-foreground")}>
                {label ?? placeholder}
              </span>
            </button>
          </PopoverPrimitive.Trigger>
          {showClear && <ClearButton size={size} onClear={() => setValue(undefined)} />}
          {name && (
            <>
              <input type="hidden" name={`${name}[from]`} value={value?.from ? dateKey(value.from) : ""} />
              <input type="hidden" name={`${name}[to]`} value={value?.to ? dateKey(value.to) : ""} />
            </>
          )}
        </div>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align={align}
            sideOffset={6}
            collisionPadding={8}
            aria-label={ariaLabel || placeholder || "Choose date range"}
            className={cn(popoverContentClass, "w-auto max-w-[calc(100vw-1rem)] max-h-(--radix-popover-content-available-height) overflow-y-auto overscroll-contain", contentClassName)}
          >
            <div className="flex flex-col sm:flex-row">
              {presets.length > 0 && (
                <div
                  role="group"
                  aria-label="Presets"
                  className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border bg-subtle p-2 sm:w-40 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r"
                >
                  {presets.map((preset) => {
                    const active = isSameRange(draft, preset.getRange());
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => applyPreset(preset)}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-control px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent",
                          active && "bg-primary-soft font-medium text-primary-soft-foreground hover:bg-primary-soft",
                          focusRing
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col">
                <Calendar
                  mode="range"
                  numberOfMonths={numberOfMonths}
                  month={month}
                  onMonthChange={setMonth}
                  selected={draft}
                  onSelect={(next: DateRange | undefined) => setDraft(next)}
                  startMonth={startMonth}
                  endMonth={endMonth}
                  disabled={disabledDates}
                  autoFocus
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                  <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                    {draftLabel ?? "Select a start date"}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                      {cancelLabel}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!draft?.from}
                      onClick={() => {
                        setValue(draft?.from ? { from: draft.from, to: draft.to ?? draft.from } : undefined);
                        setOpenState(false);
                      }}
                    >
                      {applyLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);
DateRangePicker.displayName = "DateRangePicker";

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
  const handleOpenChange = (next: boolean) => {
    if (next) setMonth(value ?? min ?? new Date());
    setOpen(next);
  };

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
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
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
            className={cn(dateTriggerVariants({ size }), showClear && "pr-9")}
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
                className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border bg-subtle p-2 sm:w-40 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r"
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
                      "shrink-0 whitespace-nowrap rounded-control px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent",
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
