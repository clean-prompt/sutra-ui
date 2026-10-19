import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { usePrefersReducedMotion } from "../hooks/use-media-query";

const spinnerSize = cva("inline-block shrink-0 text-primary", {
  variants: {
    /**
     * Spinner diameter: `xs` 12px, `sm` 16px, `md` 20px, `lg` 24px or `xl` 32px.
     * @default "md"
     */
    size: { xs: "size-3", sm: "size-4", md: "size-5", lg: "size-6", xl: "size-8" },
  },
  defaultVariants: { size: "md" },
});

/** Glyph variant: font size per spinner size (only applied when `size` is passed). */
const glyphSize = { xs: "text-xs", sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-2xl" } as const;

/** Built-in frame sets for the `glyph` variant (and `GlyphSpinner`). */
export const spinnerGlyphFrames = {
  dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  line: ["-", "\\", "|", "/"],
  arc: ["◜", "◠", "◝", "◞", "◡", "◟"],
  circle: ["◐", "◓", "◑", "◒"],
  bounce: ["⠁", "⠂", "⠄", "⠂"],
  star: ["✶", "✸", "✹", "✺", "✹", "✷"],
  pulse: ["·", "•", "●", "•"],
} as const;

export type SpinnerGlyphFrameSet = keyof typeof spinnerGlyphFrames;

export type SpinnerVariant = "ring" | "dots" | "bars" | "pulse" | "glyph";

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerSize> {
  /**
   * ring: arc spinner · dots: three bouncing dots · bars: equalizer · pulse: breathing dot ·
   * glyph: cycling text glyphs (braille dots, arcs, …; inherits font size and colour unless `size` is set).
   *
   * The box variants scale with their box, so `className="h-1.5 w-6"` gives a compact row of dots.
   */
  variant?: SpinnerVariant;
  /** Accessible label. Default "Loading". Pass `""` to make the spinner decorative (hidden from assistive tech). */
  label?: string;
  /** glyph only: a built-in frame set or custom frames. Default "dots". */
  frames?: SpinnerGlyphFrameSet | readonly string[];
  /** glyph only: milliseconds per frame. Default 80. */
  interval?: number;
  /** glyph only: hold the current frame. */
  paused?: boolean;
}

type GlyphProps = Omit<SpinnerProps, "variant" | "label"> & { label: string };

const SpinnerGlyph = React.forwardRef<HTMLSpanElement, GlyphProps>(
  ({ frames: framesProp = "dots", interval = 80, paused = false, label, size, className, ...props }, ref) => {
    const frames =
      typeof framesProp === "string"
        ? (spinnerGlyphFrames[framesProp] ?? spinnerGlyphFrames.dots)
        : framesProp.length > 0
          ? framesProp
          : spinnerGlyphFrames.dots;
    const reduced = usePrefersReducedMotion();
    const [index, setIndex] = React.useState(0);
    const still = reduced || paused || frames.length < 2;
    React.useEffect(() => {
      if (still) return;
      const t = setInterval(() => setIndex((i) => (i + 1) % frames.length), Math.max(16, interval));
      return () => clearInterval(t);
    }, [still, interval, frames.length]);
    return (
      <span
        ref={ref}
        role={label ? "status" : undefined}
        aria-hidden={label ? undefined : true}
        data-frame={index % frames.length}
        className={cn("inline-flex items-center font-mono leading-none", size && glyphSize[size], className)}
        {...props}
      >
        <span aria-hidden className="inline-block min-w-[1ch] text-center">
          {frames[index % frames.length]}
        </span>
        {label ? <span className="sr-only">{label}</span> : null}
      </span>
    );
  }
);
SpinnerGlyph.displayName = "SpinnerGlyph";

/** Loading indicator. Uses `currentColor`, so set a text color to recolor it. */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, variant = "ring", label = "Loading", frames, interval, paused, ...props }, ref) => {
    if (variant === "glyph") {
      return (
        <SpinnerGlyph
          ref={ref}
          size={size}
          label={label}
          frames={frames}
          interval={interval}
          paused={paused}
          className={className}
          {...props}
        />
      );
    }
    const common = label
      ? { ref, role: "status" as const, "aria-label": label, ...props }
      : { ref, "aria-hidden": true as const, ...props };
    if (variant === "dots") {
      return (
        <span {...common} className={cn(spinnerSize({ size }), "flex items-center justify-between", className)}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="aspect-square w-[26%] rounded-full bg-current animate-dot-bounce"
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
