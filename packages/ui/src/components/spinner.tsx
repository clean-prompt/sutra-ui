import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const spinnerSize = cva("inline-block shrink-0 text-primary", {
  variants: {
    size: { xs: "size-3", sm: "size-4", md: "size-5", lg: "size-6", xl: "size-8" },
  },
  defaultVariants: { size: "md" },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerSize> {
  /** ring: arc spinner · dots: three pulsing dots · bars: equalizer · pulse: breathing dot */
  variant?: "ring" | "dots" | "bars" | "pulse";
  label?: string;
}

/** Loading indicator. Uses `currentColor`, so set a text color to recolor it. */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, variant = "ring", label = "Loading", ...props }, ref) => {
    const common = {
      ref,
      role: "status" as const,
      "aria-label": label,
      ...props,
    };
    if (variant === "dots") {
      return (
        <span {...common} className={cn(spinnerSize({ size }), "flex items-center justify-between", className)}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-[26%] rounded-full bg-current animate-dot-bounce"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
      );
    }
    if (variant === "bars") {
      return (
        <span {...common} className={cn(spinnerSize({ size }), "flex items-center justify-between", className)}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-full w-[16%] rounded-full bg-current animate-bar-scale"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </span>
      );
    }
    if (variant === "pulse") {
      return (
        <span {...common} className={cn(spinnerSize({ size }), "relative", className)}>
          <span className="absolute inset-0 rounded-full bg-current opacity-60 animate-ping" />
          <span className="absolute inset-[25%] rounded-full bg-current" />
        </span>
      );
    }
    return (
      <span {...common} className={cn(spinnerSize({ size }), className)}>
        <svg viewBox="0 0 24 24" fill="none" className="size-full animate-spin">
          <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" opacity="0.2" />
          <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
);
Spinner.displayName = "Spinner";
