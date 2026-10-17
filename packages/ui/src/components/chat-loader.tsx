import * as React from "react";
import { cn } from "../lib/cn";
import { Spinner } from "./spinner";
import { TextShimmer } from "./text-shimmer";

export type ChatLoaderVariant = "dots" | "shimmer" | "pulse" | "spinner" | "wave";

export interface ChatLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** dots: typing indicator · shimmer: shimmering "Thinking…" · pulse: breathing dot · spinner: ring · wave: equalizer bars */
  variant?: ChatLoaderVariant;
  /** Visible text next to the indicator (the shimmer variant uses it as its text). */
  label?: string;
  size?: "sm" | "md" | "lg";
}

const dotSize = { sm: "size-1.5", md: "size-2", lg: "size-2.5" };
const barHeight = { sm: "h-3", md: "h-4", lg: "h-5" };
const pulseSize = { sm: "size-2.5", md: "size-3", lg: "size-3.5" };
const textSize = { sm: "text-xs", md: "text-sm", lg: "text-base" };

/** Assistant "working" indicator for the reply slot. */
export const ChatLoader = React.forwardRef<HTMLDivElement, ChatLoaderProps>(
  ({ variant = "dots", label, size = "md", className, ...props }, ref) => {
    const srLabel = label ?? (variant === "shimmer" ? "Thinking…" : "Assistant is typing");
    let indicator: React.ReactNode = null;

    if (variant === "dots") {
      indicator = (
        <span aria-hidden className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn("rounded-full bg-muted-foreground animate-dot-bounce", dotSize[size])}
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </span>
      );
    } else if (variant === "pulse") {
      indicator = (
        <span aria-hidden className={cn("relative inline-flex", pulseSize[size])}>
          <span className="absolute inset-0 rounded-full bg-foreground/30 animate-ping [animation-duration:1.6s]" />
          <span className="relative inline-flex size-full rounded-full bg-foreground animate-pulse" />
        </span>
      );
    } else if (variant === "spinner") {
      indicator = (
        <Spinner aria-hidden role="presentation" size={size === "lg" ? "md" : "sm"} className="text-muted-foreground" />
      );
    } else if (variant === "wave") {
      indicator = (
        <span aria-hidden className={cn("flex items-center gap-[3px]", barHeight[size])}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-full w-[3px] rounded-full bg-muted-foreground animate-bar-scale"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </span>
      );
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn("inline-flex min-h-7 items-center gap-2.5 text-muted-foreground", textSize[size], className)}
        {...props}
      >
        {variant === "shimmer" ? (
          <TextShimmer className="font-medium">{label ?? "Thinking…"}</TextShimmer>
        ) : (
          <>
            {indicator}
            {label ? <span>{label}</span> : <span className="sr-only">{srLabel}</span>}
          </>
        )}
      </div>
    );
  }
);
ChatLoader.displayName = "ChatLoader";
