import * as React from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { normalizeTone, type Tone, type ToneInput } from "../lib/tone";
import { useControllableState } from "../hooks/use-controllable-state";
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

/** @deprecated Use `Tone` (the option's `tone`). */
export type StatusCycleColor = Tone;

export interface StatusCycleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Semantic colour of the pill. Default `neutral`. */
  tone?: ToneInput;
  /** @deprecated Use `tone`. */
  color?: StatusCycleColor;
}

const pillColor: Record<Tone, string> = {
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
    const color = pillColor[normalizeTone(current.tone ?? current.color)];
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

/* Back-compat: RecurrencePicker and the RRULE helpers used to live in this file. */
export * from "./recurrence-picker";
