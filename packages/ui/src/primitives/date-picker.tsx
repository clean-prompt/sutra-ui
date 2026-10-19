import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { RiCalendarLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { dateKey } from "../lib/time";
import { Calendar } from "./calendar";
import { useField } from "./field";
import {
  ClearButton,
  dateTriggerVariants,
  popoverContentClass,
  useOptionalControlled,
  type BasePickerProps,
} from "./date-picker-internal";

export type { DateRange } from "react-day-picker";
// The range and date-time pickers live in sibling modules; every public name is still exported from here.
export {
  DateRangePicker,
  defaultDateRangePresets,
  type DateRangePickerProps,
  type DateRangePreset,
} from "./date-picker-range";
export { DateTimePicker, type DateTimeInput, type DateTimePickerProps, type DateTimePreset } from "./date-picker-datetime";

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
    variant,
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
            className={cn(dateTriggerVariants({ size, variant }), showClear && "pr-9")}
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

