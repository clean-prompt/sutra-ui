import * as React from "react";
import { RiCheckLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";

export type StepIndicatorStatus = "complete" | "current" | "upcoming";

export interface StepIndicatorStep {
  /** Stable key for the step. Defaults to its index. */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Overrides the status derived from `current` (for checklists where steps finish out of order). */
  status?: StepIndicatorStatus;
  /** Extra content under the title and description (inputs, links, checks). Rendered outside the clickable area. */
  content?: React.ReactNode;
  /** Trailing control on the step row (vertical circles/dots only), e.g. a "Show me" button. */
  action?: React.ReactNode;
  /** Extra attributes for the step's `<li>` (data attributes, a highlight class). */
  itemProps?: React.LiHTMLAttributes<HTMLLIElement> & { [key: `data-${string}`]: string | number | boolean | undefined };
}

export interface StepsProps extends Omit<React.HTMLAttributes<HTMLOListElement>, "onChange"> {
  /** Steps in order; each has a `title` and optional description. */
  steps: StepIndicatorStep[];
  /** Zero-based index of the current step. Use `steps.length` to mark all complete. */
  current: number;
  /**
   * Lays the steps out in a row or a column.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Marker style: numbered `circles`, thin progress `bars` or small `dots`.
   * @default "circles"
   */
  variant?: "circles" | "bars" | "dots";
  /** Marker size for circles: `md` (32px, default) or `sm` (24px, tighter spacing). */
  size?: "sm" | "md";
  /** Draw the line between markers (circles/dots). Default true. */
  connector?: boolean;
  /** Makes steps clickable. */
  onStepClick?: (index: number) => void;
  /** Only allow clicking completed steps (and the current one). Default true. */
  restrictToCompleted?: boolean;
}

function statusOf(index: number, current: number): StepIndicatorStatus {
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
}

function Marker({
  status,
  index,
  icon,
  variant,
  size,
}: {
  status: StepIndicatorStatus;
  index: number;
  icon?: React.ReactNode;
  variant: "circles" | "dots";
  size: "sm" | "md";
}) {
  if (variant === "dots") {
    return (
      <span
        className={cn(
          "relative z-[1] flex size-3 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          status === "complete" && "bg-primary",
          status === "current" && "bg-primary ring-4 ring-primary/20",
          status === "upcoming" && "border-2 border-border-strong bg-background"
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "relative z-[1] flex shrink-0 items-center justify-center rounded-full font-semibold transition-all duration-300",
        size === "sm" ? "size-6 text-xs [&_svg]:size-3.5" : "size-8 text-sm [&_svg]:size-4",
        status === "complete" && "bg-primary text-primary-foreground shadow-xs shadow-inner-highlight",
        status === "current" && "border-2 border-primary bg-background text-primary ring-primary/15",
        status === "current" && (size === "sm" ? "ring-2" : "ring-4"),
        status === "upcoming" && "border border-border bg-background text-muted-foreground"
      )}
    >
      {status === "complete" ? (
        <RiCheckLine aria-hidden className="animate-in zoom-in-50 fade-in-0 duration-200" />
      ) : (
        icon ?? index + 1
      )}
    </span>
  );
}

/** Progress through a multi-step flow. */
export const Steps = React.forwardRef<HTMLOListElement, StepsProps>(
  (
    {
      className,
      steps,
      current,
      orientation = "horizontal",
      variant = "circles",
      size = "md",
      connector = true,
      onStepClick,
      restrictToCompleted = true,
      style,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    const vertical = orientation === "vertical";
    const markerSize = variant === "dots" ? 12 : size === "sm" ? 24 : 32;
    const gap = size === "sm" ? "pb-5" : "pb-8";

    return (
      <ol
        ref={ref}
        aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Progress")}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "w-full",
          vertical ? "flex flex-col" : variant === "bars" ? "grid gap-3" : "flex",
          className
        )}
        style={
          !vertical && variant === "bars"
            ? { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, ...style }
            : style
        }
        {...props}
      >
        {steps.map((step, i) => {
          const status = step.status ?? statusOf(i, current);
          const key = step.id ?? i;
          const item = step.itemProps;
          const content = step.content != null && step.content !== false ? step.content : null;
          const last = i === steps.length - 1;
          const clickable =
            !!onStepClick && (!restrictToCompleted || status !== "upcoming");
          const Comp: React.ElementType = clickable ? "button" : "div";
          const interactiveProps = clickable
            ? { type: "button" as const, onClick: () => onStepClick?.(i) }
            : {};

          const text = (
            <span className={cn("flex min-w-0 flex-col gap-0.5", !vertical && variant !== "bars" && "items-center text-center")}>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  status === "upcoming" ? "text-muted-foreground" : "text-foreground",
                  status === "current" && variant === "bars" && "text-primary"
                )}
              >
                {step.title}
              </span>
              {status === "complete" ? <span className="sr-only">(completed)</span> : null}
              {step.description ? (
                <span className="text-xs text-muted-foreground">{step.description}</span>
              ) : null}
            </span>
          );

          if (variant === "bars") {
            return (
              <li
                key={key}
                aria-current={status === "current" ? "step" : undefined}
                data-status={status}
                {...item}
                className={cn(vertical ? "flex pb-4 last:pb-0" : "min-w-0", item?.className)}
              >
                <Comp
                  {...interactiveProps}
                  className={cn(
                    "group flex w-full min-w-0 gap-3 text-start",
                    vertical ? "flex-row" : "flex-col",
                    clickable && cn("cursor-pointer rounded-xs", focusRing)
                  )}
                >
                  <span
                    className={cn(
                      "relative shrink-0 overflow-hidden rounded-full bg-border",
                      vertical ? "w-1 self-stretch" : "h-1 w-full"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 origin-left rtl:origin-right rounded-full bg-primary transition-transform duration-500 ease-out-quart",
                        vertical && "origin-top",
                        status === "upcoming" && (vertical ? "scale-y-0" : "scale-x-0")
                      )}
                    />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                    {text}
                  </span>
                </Comp>
                {content}
              </li>
            );
          }

          const connectorColor = status === "complete" ? "bg-primary" : "bg-border";

          if (vertical) {
            const comp = (
              <Comp
                {...interactiveProps}
                className={cn(
                  "group flex min-w-0 items-start gap-3 text-start",
                  step.action != null && "flex-1",
                  clickable && cn("cursor-pointer rounded-md", focusRing)
                )}
              >
                <Marker status={status} index={i} icon={step.icon} variant={variant} size={size} />
                <span style={variant === "dots" ? { marginTop: -4 } : { marginTop: size === "sm" ? 2 : 5 }}>{text}</span>
              </Comp>
            );
            const row =
              step.action != null ? (
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {comp}
                  <div className="flex shrink-0 items-center gap-2">{step.action}</div>
                </div>
              ) : (
                comp
              );
            return (
              <li
                key={key}
                aria-current={status === "current" ? "step" : undefined}
                data-status={status}
                {...item}
                className={cn("relative flex", !last && gap, item?.className)}
              >
                {connector && !last ? (
                  <span
                    aria-hidden
                    className={cn("absolute w-0.5 -translate-x-1/2 rtl:translate-x-1/2 rounded-full transition-colors duration-300", connectorColor)}
                    style={{ insetInlineStart: markerSize / 2, top: markerSize + 6, bottom: 6 }}
                  />
                ) : null}
                {content ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {row}
                    <div className="min-w-0" style={{ paddingInlineStart: markerSize + 12 }}>
                      {content}
                    </div>
                  </div>
                ) : (
                  row
                )}
              </li>
            );
          }

          return (
            <li
              key={key}
              aria-current={status === "current" ? "step" : undefined}
              data-status={status}
              {...item}
              className={cn("relative flex min-w-0 flex-1 flex-col items-center", item?.className)}
            >
              {connector && !last ? (
                <span
                  aria-hidden
                  className={cn("absolute h-0.5 -translate-y-1/2 rounded-full transition-colors duration-300", connectorColor)}
                  style={{
                    top: markerSize / 2,
                    insetInlineStart: `calc(50% + ${markerSize / 2 + 8}px)`,
                    insetInlineEnd: `calc(-50% + ${markerSize / 2 + 8}px)`,
                  }}
                />
              ) : null}
              <Comp
                {...interactiveProps}
                className={cn(
                  "group flex min-w-0 flex-col items-center gap-2.5 px-2",
                  clickable && cn("cursor-pointer rounded-md", focusRing)
                )}
              >
                <Marker status={status} index={i} icon={step.icon} variant={variant} size={size} />
                {text}
              </Comp>
              {content}
            </li>
          );
        })}
      </ol>
    );
  }
);
Steps.displayName = "Steps";

/** Alias of `Steps`. @deprecated Use `Steps` (this is a plain alias). */
export const StepIndicator = Steps;
/** @deprecated Use `StepsProps`. */
export type StepIndicatorProps = StepsProps;
