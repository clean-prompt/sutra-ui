import * as React from "react";
import { cva } from "class-variance-authority";
import type { DateRange, Matcher } from "react-day-picker";
import { RiCloseCircleFill } from "@remixicon/react";
import { cn, focusRing, hitArea, type Size } from "../lib/cn";
import { addDays, calendarDayDiff, startOfDay } from "../lib/time";
import { inputShellVariants } from "./input";
import { filledTrigger } from "./input-internal";
import type { CalendarProps } from "./calendar";

// Private parts shared by DatePicker, DateRangePicker and DateTimePicker (date-picker.tsx re-exports the public names).

/* ---------------------------------------------------------------- */
/* Calendar language                                                 */
/* ---------------------------------------------------------------- */

type CalendarLocaleProps = Pick<CalendarProps, "formatters" | "weekStartsOn">;
type WeekInfoLocale = Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };

/**
 * DayPicker takes a date-fns `Locale` object, but the pickers take a BCP 47 string (like `Intl`). This turns the string into the
 * DayPicker props that matter: the visible month and weekday names and the digits through `Intl`, and the first day of the week
 * from `Intl.Locale` where the runtime knows it. Without a locale (or with one `Intl` rejects) it returns {} and DayPicker keeps
 * its defaults. The aria labels ("Go to the Next Month", "Tuesday, October 20th, 2026") stay DayPicker's English: they are not
 * derived from the locale, so pass `labels` to a `Calendar` where they must be translated.
 */
export function calendarLocaleProps(locale: string | undefined): CalendarLocaleProps {
  if (!locale) return {};
  try {
    const dtf = (options: Intl.DateTimeFormatOptions, tz?: string) =>
      new Intl.DateTimeFormat(locale, tz ? { ...options, timeZone: tz } : options);
    const nf = new Intl.NumberFormat(locale);
    let weekStartsOn: CalendarProps["weekStartsOn"];
    try {
      const info = new Intl.Locale(locale) as WeekInfoLocale;
      const first = (info.getWeekInfo?.() ?? info.weekInfo)?.firstDay;
      // Intl counts Monday as 1 and Sunday as 7; DayPicker counts Sunday as 0.
      if (typeof first === "number" && first >= 1 && first <= 7) weekStartsOn = (first % 7) as CalendarProps["weekStartsOn"];
    } catch {
      /* no week info in this runtime: DayPicker keeps its default */
    }
    // DayPicker hands either its options or its DateLib to a formatter.
    const zone = (o?: { timeZone?: string; options?: { timeZone?: string } }) => o?.timeZone ?? o?.options?.timeZone;
    return {
      weekStartsOn,
      formatters: {
        formatCaption: (month, options) => dtf({ month: "long", year: "numeric" }, zone(options)).format(month),
        formatMonthDropdown: (month, lib) => dtf({ month: "long" }, zone(lib)).format(month),
        formatYearDropdown: (year, lib) => dtf({ year: "numeric" }, zone(lib)).format(year),
        formatWeekdayName: (weekday, options) => dtf({ weekday: "short" }, zone(options)).format(weekday),
        formatDay: (date, options) => dtf({ day: "numeric" }, zone(options)).format(date),
        formatWeekNumber: (week) => nf.format(week),
      },
    };
  } catch {
    return {};
  }
}

/** `calendarLocaleProps`, computed once per locale. */
export const useCalendarLocale = (locale: string | undefined) => React.useMemo(() => calendarLocaleProps(locale), [locale]);

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
    "group/date-trigger flex w-full items-center gap-2 text-start text-sm",
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
        hitArea,
        "absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
        size === "sm" ? "end-2" : size === "lg" ? "end-3" : "end-2.5",
        focusRing
      )}
    >
      <RiCloseCircleFill aria-hidden className="size-4" />
    </button>
  );
}

export interface BasePickerProps {
  /** Trigger text while no date is selected (each picker has its own default, e.g. "Pick a date"). */
  placeholder?: string;
  /** Show an inline button that resets the value. */
  clearable?: boolean;
  /** Disables the trigger so the calendar cannot be opened. */
  disabled?: boolean;
  /** Marks the picker required. Inherited from a surrounding `Field` when omitted. */
  required?: boolean;
  /** Marks the picker invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. */
  invalid?: boolean;
  /** Trigger height and text size; match the neighbouring inputs. */
  size?: Size;
  /** `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. */
  variant?: "outline" | "filled";
  /** BCP 47 locale for the trigger text (`Intl.DateTimeFormat`) and the calendar's month and weekday names, digits and first weekday. */
  locale?: string;
  /** Options passed to `Intl.DateTimeFormat`. Defaults to `{ dateStyle: "medium" }`. */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Dates that can't be picked (react-day-picker matchers). */
  disabledDates?: Matcher | Matcher[];
  /** Earliest month the calendar can navigate to (days before it are not reachable). */
  startMonth?: Date;
  /** Latest month the calendar can navigate to. */
  endMonth?: Date;
  /**
   * Alignment of the calendar popover against the trigger.
   * @default "start"
   */
  align?: "start" | "center" | "end";
  /** Controlled open state of the calendar popover. Use with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the popover opens or closes (selection, Escape, outside click). */
  onOpenChange?: (open: boolean) => void;
  /** Classes for the wrapper around the trigger button (the button itself takes no class). */
  className?: string;
  /** Classes for the calendar popover. */
  contentClassName?: string;
  /** `id` of the trigger, so a `<label htmlFor>` or `Field` can point at it. */
  id?: string;
  /** Name of the hidden input that submits the value with a surrounding form. */
  name?: string;
  /** Accessible name of the trigger when there is no visible label. */
  "aria-label"?: string;
  /** Id(s) of the element(s) that label the trigger. */
  "aria-labelledby"?: string;
  /** Id(s) of the element(s) that describe the trigger (hint, error text). */
  "aria-describedby"?: string;
  /** Overrides the invalid state announced to assistive technology; normally set `invalid` instead. */
  "aria-invalid"?: boolean;
}
