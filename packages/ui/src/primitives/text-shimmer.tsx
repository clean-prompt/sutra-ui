import * as React from "react";
import { cn } from "../lib/cn";
import { clamp } from "../lib/math";

export interface TextShimmerProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to `span`. */
  as?: React.ElementType;
  /** Seconds for one sweep of the highlight. */
  duration?: number;
  /** Half-width of the bright band, as a percentage of the text width. */
  spread?: number;
}

/** Text with an animated light sweep, used for "Thinking…" style status lines. */
export const TextShimmer = React.forwardRef<HTMLElement, TextShimmerProps>(
  ({ as: Comp = "span", duration = 2, spread = 12, className, style, ...props }, ref) => {
    const band = clamp(spread, 1, 50);
    const shimmerStyle = {
      "--shimmer-duration": `${duration}s`,
      "--shimmer-spread": `${band}%`,
      backgroundImage:
        "linear-gradient(90deg, var(--muted-foreground) 0%, var(--muted-foreground) calc(50% - var(--shimmer-spread)), var(--foreground) 50%, var(--muted-foreground) calc(50% + var(--shimmer-spread)), var(--muted-foreground) 100%)",
      animationDuration: "var(--shimmer-duration)",
      ...style,
    } as React.CSSProperties;
    return (
      <Comp
        ref={ref}
        // text-shimmer goes last: twMerge reads it as a text colour, so a text colour in className is dropped instead of the shimmer
        className={cn("inline-block motion-reduce:animate-none", className, "text-shimmer")}
        style={shimmerStyle}
        {...props}
      />
    );
  }
);
TextShimmer.displayName = "TextShimmer";
