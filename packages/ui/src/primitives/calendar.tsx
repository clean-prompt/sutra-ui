import * as React from "react";
import { DayPicker, type ClassNames } from "react-day-picker";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { assignRef } from "../lib/refs";
import { useDirection } from "../hooks/use-direction";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

interface CalendarChevronProps {
  className?: string;
  size?: number;
  disabled?: boolean;
  orientation?: "up" | "down" | "left" | "right";
}

function CalendarChevron({ className, orientation = "left" }: CalendarChevronProps) {
  const Icon =
    orientation === "left"
      ? RiArrowLeftSLine
      : orientation === "right"
        ? RiArrowRightSLine
        : orientation === "up"
          ? RiArrowUpSLine
          : RiArrowDownSLine;
  // Previous and next point along the reading direction.
  const mirrored = orientation === "left" || orientation === "right";
  return <Icon aria-hidden className={cn("size-4", mirrored && "rtl:-scale-x-100", className)} />;
}

const navButton = cn(
  "pointer-events-auto inline-flex size-8 items-center justify-center rounded-control text-muted-foreground",
  "transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
  focusRing
);

const baseClassNames: Partial<ClassNames> = {
  root: "w-fit p-3",
  // Months sit side by side when the calendar is wide enough and stack when it is not (a column width, not the viewport).
  months: "relative flex flex-wrap gap-6",
  month: "flex flex-[1_1_15.75rem] flex-col gap-3",
  month_caption: "flex h-8 items-center justify-center px-10",
  caption_label: "inline-flex items-center gap-1 text-sm font-medium text-foreground select-none",
  dropdowns: "flex items-center gap-1.5 text-sm font-medium",
  dropdown_root: cn(
    "relative inline-flex items-center rounded-control border border-input bg-background px-2 py-1 shadow-xs",
    "has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/35",
    "[&_svg]:size-3.5 [&_svg]:text-muted-foreground"
  ),
  dropdown: "absolute inset-0 cursor-pointer opacity-0",
  nav: "pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between",
  button_previous: navButton,
  button_next: navButton,
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "flex size-9 items-center justify-center text-xs font-normal text-muted-foreground select-none",
  week: "mt-1 flex w-full",
  week_number: "flex size-9 items-center justify-center text-xs text-muted-foreground",
  week_number_header: "size-9",
  day: "group/day relative size-9 p-0 text-center text-sm select-none",
  day_button: cn(
    "relative inline-flex size-9 items-center justify-center rounded-control font-normal text-foreground tabular-nums",
    "transition-[background-color,color,box-shadow] duration-150 hover:bg-accent",
    "disabled:pointer-events-none",
    focusRing
  ),
  selected: cn(
    "[&>button]:bg-primary [&>button]:font-medium [&>button]:text-primary-foreground [&>button]:shadow-xs",
    "[&>button]:hover:bg-primary-hover [&>button]:after:bg-primary-foreground!"
  ),
  today: cn(
    "[&>button]:font-semibold",
    "[&>button]:after:pointer-events-none [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:start-1/2",
    "[&>button]:after:size-1 [&>button]:after:-translate-x-1/2 rtl:[&>button]:after:translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-primary [&>button]:after:content-['']"
  ),
  outside: "[&>button]:text-muted-foreground/60",
  disabled: "[&>button]:text-muted-foreground/50 [&>button]:line-through [&>button]:decoration-muted-foreground/40",
  range_start: "rounded-s-control bg-primary-soft",
  range_end: "rounded-e-control bg-primary-soft",
  range_middle: cn(
    "rounded-none bg-primary-soft",
    "[&>button]:rounded-none! [&>button]:bg-transparent! [&>button]:font-normal! [&>button]:text-primary-soft-foreground! [&>button]:shadow-none!",
    "[&>button]:hover:bg-primary/10! [&>button]:after:bg-primary!"
  ),
  hidden: "invisible",
  footer: "pt-3 text-sm text-muted-foreground",
};

type CalendarRootProps = React.HTMLAttributes<HTMLDivElement> & { rootRef?: React.Ref<HTMLDivElement> };

/** Date calendar built on react-day-picker v9. Supports single, multiple and range modes. The ref goes to the root element. */
export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  { className, classNames, showOutsideDays = true, components, ...props },
  ref
) {
  const dir = useDirection();
  const forwardedRef = React.useRef(ref);
  forwardedRef.current = ref;
  // A stable Root that hands the element to both DayPicker's own ref (used for animation) and ours.
  const Root = React.useMemo(
    () =>
      function CalendarRoot({ rootRef, ...rest }: CalendarRootProps) {
        const setNode = React.useCallback(
          (node: HTMLDivElement | null) => {
            assignRef(rootRef, node);
            assignRef(forwardedRef.current, node);
          },
          [rootRef]
        );
        return <div {...rest} ref={setNode} />;
      },
    []
  );
  const merged = React.useMemo(() => {
    const result: Partial<ClassNames> = { ...baseClassNames };
    if (classNames) {
      for (const key of Object.keys(classNames) as (keyof ClassNames)[]) {
        result[key] = cn(baseClassNames[key], classNames[key]);
      }
    }
    return result;
  }, [classNames]);

  const usesDropdown = typeof props.captionLayout === "string" && props.captionLayout.startsWith("dropdown");
  const thisYear = new Date().getFullYear();

  return (
    <DayPicker
      dir={dir}
      showOutsideDays={showOutsideDays}
      className={cn("rdp-sutra", className)}
      {...props}
      startMonth={props.startMonth ?? (usesDropdown ? new Date(thisYear - 100, 0) : undefined)}
      endMonth={props.endMonth ?? (usesDropdown ? new Date(thisYear + 10, 11) : undefined)}
      classNames={merged}
      components={{ Chevron: CalendarChevron, Root, ...components }}
    />
  );
});
Calendar.displayName = "Calendar";
