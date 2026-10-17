import * as React from "react";
import { RiCheckLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";

export interface StepIndicatorStep {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

export type StepIndicatorStatus = "complete" | "current" | "upcoming";

export interface StepsProps extends Omit<React.HTMLAttributes<HTMLOListElement>, "onChange"> {
  steps: StepIndicatorStep[];
  /** Zero-based index of the current step. Use `steps.length` to mark all complete. */
  current: number;
  orientation?: "horizontal" | "vertical";
  variant?: "circles" | "bars" | "dots";
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
}: {
  status: StepIndicatorStatus;
  index: number;
  icon?: React.ReactNode;
  variant: "circles" | "dots";
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
        "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 [&_svg]:size-4",
        status === "complete" && "bg-primary text-primary-foreground shadow-xs shadow-inner-highlight",
        status === "current" && "border-2 border-primary bg-background text-primary ring-4 ring-primary/15",
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
      onStepClick,
      restrictToCompleted = true,
      style,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const vertical = orientation === "vertical";
    const markerSize = variant === "dots" ? 12 : 32;

    return (
      <ol
        ref={ref}
        aria-label={ariaLabel ?? "Progress"}
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
          const status = statusOf(i, current);
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
                key={i}
                aria-current={status === "current" ? "step" : undefined}
                className={cn(vertical ? "flex pb-4 last:pb-0" : "min-w-0")}
              >
                <Comp
                  {...interactiveProps}
                  className={cn(
                    "group flex w-full min-w-0 gap-3 text-left",
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
                        "absolute inset-0 origin-left rounded-full bg-primary transition-transform duration-500 ease-out-quart",
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
              </li>
            );
          }

          const connectorColor = status === "complete" ? "bg-primary" : "bg-border";

          if (vertical) {
            return (
              <li
                key={i}
                aria-current={status === "current" ? "step" : undefined}
                className={cn("relative flex", !last && "pb-8")}
              >
                {!last ? (
                  <span
                    aria-hidden
                    className={cn("absolute w-0.5 -translate-x-1/2 rounded-full transition-colors duration-300", connectorColor)}
                    style={{ left: markerSize / 2, top: markerSize + 6, bottom: 6 }}
                  />
                ) : null}
                <Comp
                  {...interactiveProps}
                  className={cn(
                    "group flex min-w-0 items-start gap-3 text-left",
                    clickable && cn("cursor-pointer rounded-md", focusRing)
                  )}
                >
                  <Marker status={status} index={i} icon={step.icon} variant={variant} />
                  <span style={variant === "dots" ? { marginTop: -4 } : { marginTop: 5 }}>{text}</span>
                </Comp>
              </li>
            );
          }

          return (
            <li
              key={i}
              aria-current={status === "current" ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {!last ? (
                <span
                  aria-hidden
                  className={cn("absolute h-0.5 -translate-y-1/2 rounded-full transition-colors duration-300", connectorColor)}
                  style={{
                    top: markerSize / 2,
                    left: `calc(50% + ${markerSize / 2 + 8}px)`,
                    right: `calc(-50% + ${markerSize / 2 + 8}px)`,
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
                <Marker status={status} index={i} icon={step.icon} variant={variant} />
                {text}
              </Comp>
            </li>
          );
        })}
      </ol>
    );
  }
);
Steps.displayName = "Steps";

/** Alias of `Steps`. */
export const StepIndicator = Steps;
export type StepIndicatorProps = StepsProps;
