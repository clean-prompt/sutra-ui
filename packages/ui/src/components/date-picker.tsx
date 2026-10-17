import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cva } from "class-variance-authority";
import type { DateRange, Matcher } from "react-day-picker";
import { RiCalendarLine, RiCloseCircleFill } from "@remixicon/react";
import { cn, focusRing, invalidRing, type Size } from "../lib/cn";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { useField } from "./field";

export type { DateRange } from "react-day-picker";

/* ---------------------------------------------------------------- */
/* Date helpers                                                      */
/* ---------------------------------------------------------------- */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const isSameDay = (a?: Date, b?: Date) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
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
      <RiCloseCircleFill className="size-4" />
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
    false,
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
            <RiCalendarLine className="text-muted-foreground" />
            <span className={cn("flex-1 truncate", !label && "text-muted-foreground")}>
              {label ?? placeholder}
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        {showClear && <ClearButton size={size} onClear={() => setValue(undefined)} />}
        {name && <input type="hidden" name={name} value={value ? toISODate(value) : ""} />}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
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

function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
      const d = addDays(new Date(), -1);
      return { from: d, to: d };
    },
  },
  { label: "Last 7 days", getRange: () => ({ from: addDays(new Date(), -6), to: startOfDay(new Date()) }) },
  { label: "Last 30 days", getRange: () => ({ from: addDays(new Date(), -29), to: startOfDay(new Date()) }) },
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
      false,
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
              <RiCalendarLine className="text-muted-foreground" />
              <span className={cn("flex-1 truncate", !label && "text-muted-foreground")}>
                {label ?? placeholder}
              </span>
            </button>
          </PopoverPrimitive.Trigger>
          {showClear && <ClearButton size={size} onClear={() => setValue(undefined)} />}
          {name && (
            <>
              <input type="hidden" name={`${name}[from]`} value={value?.from ? toISODate(value.from) : ""} />
              <input type="hidden" name={`${name}[to]`} value={value?.to ? toISODate(value.to) : ""} />
            </>
          )}
        </div>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align={align}
            sideOffset={6}
            collisionPadding={8}
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
