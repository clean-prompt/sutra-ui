import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import type { DateRange } from "react-day-picker";
import { RiCalendarLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { dateKey, startOfDay } from "../lib/time";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { useField } from "./field";
import {
  ClearButton,
  dateTriggerVariants,
  dayOffset,
  endOfMonth,
  isSameDay,
  isSameRange,
  popoverContentClass,
  startOfMonth,
  useCalendarLocale,
  useOnOpen,
  useOptionalControlled,
  type BasePickerProps,
} from "./date-picker-internal";

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
  /** Controlled range as `{ from, to }`; either may be undefined while picking. Use with `onValueChange`. */
  value?: DateRange;
  /** Initial range when uncontrolled. */
  defaultValue?: DateRange;
  /** Called with the new range (or `undefined` when cleared); with `presets` or apply/cancel it fires on apply. */
  onValueChange?: (value: DateRange | undefined) => void;
  /** Sidebar presets. Pass `[]` to hide the sidebar. */
  presets?: DateRangePreset[];
  /** Number of months shown side by side. */
  numberOfMonths?: number;
  /** Custom formatter for the trigger text. */
  formatRange?: (range: DateRange) => string;
  /**
   * Text of the apply button.
   * @default "Apply"
   */
  applyLabel?: string;
  /**
   * Text of the cancel button.
   * @default "Cancel"
   */
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
    variant,
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
    const [open, setOpen] = useOptionalControlled<boolean>(
      openProp !== undefined,
      openProp ?? false,
      defaultOpen,
      onOpenChange
    );
    const [draft, setDraft] = React.useState<DateRange | undefined>(value);
    const [month, setMonth] = React.useState<Date>(value?.from ?? new Date());

    // Re-sync the draft and month from `value` on every false -> true transition, whether the user
    // opened it or a controlled `open` did (Radix only calls onOpenChange for the former).
    useOnOpen(open, () => {
      setDraft(value);
      setMonth(value?.from ?? new Date());
    });

    const calendarLocale = useCalendarLocale(locale);
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
              className={cn(dateTriggerVariants({ size, variant }), showClear && "pe-9")}
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
                  className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border bg-subtle p-2 sm:w-40 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-e"
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
                          "shrink-0 whitespace-nowrap rounded-control px-2.5 py-1.5 text-start text-sm text-foreground transition-colors hover:bg-accent",
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
                  {...calendarLocale}
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
                  <div className="ms-auto flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                      {cancelLabel}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!draft?.from}
                      onClick={() => {
                        setValue(draft?.from ? { from: draft.from, to: draft.to ?? draft.from } : undefined);
                        setOpen(false);
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

