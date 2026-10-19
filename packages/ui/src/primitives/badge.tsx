import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { CloseButton } from "./close-button";
import { normalizeTone, toneClasses, type Tone, type ToneInput } from "../lib/tone";

/**
 * Badge colour. The categorical palette (`gray`, `blue`, `purple`, `pink`, `orange`) lives here;
 * for semantic colour prefer the `tone` prop (`brand` is kept as an alias of `primary`).
 */
export type BadgeColor =
  | "neutral"
  | "primary"
  | "brand"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "gray"
  | "blue"
  | "purple"
  | "pink"
  | "orange";

type BadgeStyleSet = { soft: string; solid: string; outline: string; dot: string };

/** Semantic colours: `toneClasses` soft/solid/dot; the outline border is a touch lighter than `toneClasses.outline`. */
function semantic(tone: Tone, outline: string, soft: string = toneClasses.soft[tone]): BadgeStyleSet {
  return { soft, solid: toneClasses.solid[tone], outline, dot: toneClasses.dot[tone] };
}

const palette: Record<BadgeColor, BadgeStyleSet> = {
  // Neutral text stays full-strength (toneClasses.soft.neutral uses muted text).
  neutral: semantic("neutral", "border-border-strong text-foreground", "bg-muted text-foreground"),
  primary: semantic("primary", toneClasses.outline.primary),
  brand: semantic("primary", toneClasses.outline.primary),
  success: semantic("success", "border-success/45 text-success-soft-foreground"),
  warning: semantic("warning", "border-warning/55 text-warning-soft-foreground"),
  destructive: semantic("destructive", "border-destructive/45 text-destructive-soft-foreground"),
  info: semantic("info", "border-info/45 text-info-soft-foreground"),
  gray: {
    soft: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
    solid: "bg-gray-600 text-white",
    outline: "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300",
    dot: "bg-gray-500",
  },
  blue: {
    soft: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    solid: "bg-blue-600 text-white",
    outline: "border-blue-300 text-blue-700 dark:border-blue-500/50 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  purple: {
    soft: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    solid: "bg-purple-600 text-white",
    outline: "border-purple-300 text-purple-700 dark:border-purple-500/50 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  pink: {
    soft: "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    solid: "bg-pink-600 text-white",
    outline: "border-pink-300 text-pink-700 dark:border-pink-500/50 dark:text-pink-300",
    dot: "bg-pink-500",
  },
  orange: {
    soft: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    solid: "bg-orange-500 text-white",
    outline: "border-orange-300 text-orange-700 dark:border-orange-500/50 dark:text-orange-300",
    dot: "bg-orange-500",
  },
};

const colorKeys = Object.keys(palette) as BadgeColor[];

export const badgeVariants = cva(
  "inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-control border font-medium leading-none transition-colors [&_svg]:shrink-0",
  {
    variants: {
      /**
       * Fill style: `soft` (tinted), `solid` (full colour), `outline` (border only) or `dot` (neutral pill with a coloured dot).
       * @default "soft"
       */
      variant: {
        soft: "border-transparent",
        solid: "border-transparent",
        outline: "bg-transparent",
        dot: "border-border bg-background text-foreground",
      },
      /** Legacy colour name; prefer `tone`. Also accepts the categorical hues (gray, blue, purple, pink, orange). */
      color: {
        neutral: "",
        primary: "",
        brand: "",
        success: "",
        warning: "",
        destructive: "",
        info: "",
        gray: "",
        blue: "",
        purple: "",
        pink: "",
        orange: "",
      },
      /**
       * Badge height and text size.
       * @default "md"
       */
      size: {
        sm: "h-5 gap-1 px-1.5 text-2xs [&_svg]:size-3",
        md: "h-6 gap-1 px-2 text-xs [&_svg]:size-3.5",
        lg: "h-7 gap-1.5 px-2.5 text-sm [&_svg]:size-4",
      },
    },
    compoundVariants: colorKeys.flatMap((color) => [
      { variant: "soft" as const, color, className: palette[color].soft },
      { variant: "solid" as const, color, className: palette[color].solid },
      { variant: "outline" as const, color, className: palette[color].outline },
    ]),
    defaultVariants: { variant: "soft", color: "neutral", size: "md" },
  }
);

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof badgeVariants> {
  /** Semantic colour (`neutral | primary | success | warning | destructive | info`). Wins over `color`. */
  tone?: ToneInput;
  /** Icon before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon after the label. */
  trailingIcon?: React.ReactNode;
  /** Shows a small remove button. */
  onRemove?: () => void;
  /**
   * Accessible name of the remove button.
   * @default "Remove"
   */
  removeLabel?: string;
}

/** Compact label for status, category or count. */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, tone, color, size, leadingIcon, trailingIcon, onRemove, removeLabel, children, ...props },
    ref
  ) => {
    const c: BadgeColor = tone ? normalizeTone(tone) : (color ?? "neutral");
    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, color: c, size }),
          onRemove && (size === "lg" ? "pe-1" : "pe-0.5"),
          className
        )}
        {...props}
      >
        {variant === "dot" ? (
          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", palette[c].dot)} />
        ) : null}
        {leadingIcon}
        <span className="truncate">{children}</span>
        {trailingIcon}
        {onRemove ? (
          <CloseButton
            shape="pill"
            variant="current"
            size={size === "lg" ? "2xs" : "3xs"}
            onClick={onRemove}
            aria-label={removeLabel ?? "Remove"}
            className="outline-none hover:bg-current/15 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        ) : null}
      </span>
    );
  }
);
Badge.displayName = "Badge";
