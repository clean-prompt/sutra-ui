import * as React from "react";
import { cn } from "../../lib/cn";
import { Spinner, type SpinnerProps } from "../../primitives/spinner";
import { TextShimmer } from "../../primitives/text-shimmer";

export type ChatLoaderVariant = "dots" | "shimmer" | "pulse" | "spinner" | "wave" | "glyph";

export interface ChatLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * dots: typing indicator · shimmer: shimmering "Thinking…" · pulse: breathing dot · spinner: ring ·
   * wave: equalizer bars · glyph: cycling text glyph. Every indicator except shimmer is a `Spinner`.
   */
  variant?: ChatLoaderVariant;
  /** Visible text next to the indicator (the shimmer variant uses it as its text). */
  label?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

type Size = NonNullable<ChatLoaderProps["size"]>;

/** Which Spinner each variant renders, with box classes tuned to the reply slot. */
const indicator: Record<Exclude<ChatLoaderVariant, "shimmer">, (size: Size) => SpinnerProps> = {
  dots: (size) => ({ variant: "dots", className: { sm: "h-1.5 w-6", md: "h-2 w-8", lg: "h-2.5 w-10" }[size] }),
  wave: (size) => ({ variant: "bars", className: { sm: "h-3 w-5", md: "h-4 w-6", lg: "h-5 w-7" }[size] }),
  pulse: (size) => ({ variant: "pulse", className: cn("text-foreground", { sm: "size-2.5", md: "size-3", lg: "size-3.5" }[size]) }),
  spinner: (size) => ({ variant: "ring", size: size === "lg" ? "md" : "sm" }),
  glyph: () => ({ variant: "glyph" }),
};

const textSize = { sm: "text-xs", md: "text-sm", lg: "text-base" };

/** Assistant "working" indicator for the reply slot: a `Spinner` (or TextShimmer) plus an optional label. */
export const ChatLoader = React.forwardRef<HTMLDivElement, ChatLoaderProps>(
  ({ variant = "dots", label, size = "md", className, ...props }, ref) => {
    let content: React.ReactNode;
    if (variant === "shimmer") {
      content = <TextShimmer className="font-medium">{label ?? "Thinking…"}</TextShimmer>;
    } else {
      const spinner = (indicator[variant] ?? indicator.dots)(size);
      content = (
        <>
          <Spinner {...spinner} label="" className={cn("text-muted-foreground", spinner.className)} />
          {label ? <span>{label}</span> : <span className="sr-only">Assistant is typing</span>}
        </>
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
        {content}
      </div>
    );
  }
);
ChatLoader.displayName = "ChatLoader";
