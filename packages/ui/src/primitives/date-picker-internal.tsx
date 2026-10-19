import * as React from "react";
import { cva } from "class-variance-authority";
import type { DateRange, Matcher } from "react-day-picker";
import { RiCloseCircleFill } from "@remixicon/react";
import { cn, focusRing, type Size } from "../lib/cn";
import { addDays, calendarDayDiff, startOfDay } from "../lib/time";
import { inputShellVariants } from "./input";
import { filledTrigger } from "./input-internal";

// Private parts shared by DatePicker, DateRangePicker and DateTimePicker (date-picker.tsx re-exports the public names).

/* ---------------------------------------------------------------- */
/* Date helpers                                                      */
/* ---------------------------------------------------------------- */

/** Local midnight `n` calendar days from `d`. */
export const dayOffset = (d: Date, n: number) => startOfDay(addDays(d, n));
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
export const isSameDay = (a?: Date, b?: Date) => !!a && !!b && calendarDayDiff(a, b) === 0;
export const isSameRange = (a?: DateRange, b?: DateRange) =>
  !!a && !!b && isSameDay(a.from, b.from) && (isSameDay(a.to, b.to) || (!a.to && !b.to));

export function useOptionalControlled<T>(
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

export const dateTriggerVariants = cva(
  [
    "group/date-trigger flex w-full items-center gap-2 text-left text-sm",
    inputShellVariants({ hover: true }),
    "data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/20",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 [&_svg]:size-4",
        md: "h-9 px-3 [&_svg]:size-4",
        lg: "h-10 px-3.5 [&_svg]:size-[18px]",
      },
      variant: { outline: "", filled: filledTrigger },
    },
    defaultVariants: { size: "md", variant: "outline" },
  }
);

export const popoverContentClass = cn(
  "z-50 rounded-box border border-border bg-popover text-popover-foreground shadow-lg outline-none",
  "origin-(--radix-popover-content-transform-origin)",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
);

export interface ClearButtonProps {
  onClear: () => void;
  size: Size;
}

export function ClearButton({ onClear, size }: ClearButtonProps) {
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

export interface BasePickerProps {
  placeholder?: string;
  /** Show an inline button that resets the value. */
  clearable?: boolean;
  disabled?: boolean;
  /** Marks the picker required. Inherited from a surrounding `Field` when omitted. */
  required?: boolean;
  invalid?: boolean;
  size?: Size;
  /** `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. */
  variant?: "outline" | "filled";
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
