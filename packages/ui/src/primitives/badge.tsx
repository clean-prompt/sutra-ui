import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { RiCloseLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { normalizeTone, type ToneInput } from "../lib/tone";

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

const palette: Record<BadgeColor, BadgeStyleSet> = {
  neutral: {
    soft: "bg-muted text-foreground",
    solid: "bg-inverse text-inverse-foreground",
    outline: "border-border-strong text-foreground",
    dot: "bg-muted-foreground",
  },
  primary: {
    soft: "bg-primary-soft text-primary-soft-foreground",
    solid: "bg-primary text-primary-foreground",
    outline: "border-primary/50 text-primary-soft-foreground",
    dot: "bg-primary",
  },
  brand: {
    soft: "bg-primary-soft text-primary-soft-foreground",
    solid: "bg-primary text-primary-foreground",
    outline: "border-primary/50 text-primary-soft-foreground",
    dot: "bg-primary",
  },
  success: {
    soft: "bg-success-soft text-success-soft-foreground",
    solid: "bg-success text-success-foreground",
    outline: "border-success/45 text-success-soft-foreground",
    dot: "bg-success",
  },
  warning: {
    soft: "bg-warning-soft text-warning-soft-foreground",
    solid: "bg-warning text-warning-foreground",
    outline: "border-warning/55 text-warning-soft-foreground",
    dot: "bg-warning",
  },
  destructive: {
    soft: "bg-destructive-soft text-destructive-soft-foreground",
    solid: "bg-destructive text-destructive-foreground",
    outline: "border-destructive/45 text-destructive-soft-foreground",
    dot: "bg-destructive",
  },
  info: {
    soft: "bg-info-soft text-info-soft-foreground",
    solid: "bg-info text-info-foreground",
    outline: "border-info/45 text-info-soft-foreground",
    dot: "bg-info",
  },
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
      variant: {
        soft: "border-transparent",
        solid: "border-transparent",
        outline: "bg-transparent",
        dot: "border-border bg-background text-foreground",
      },
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
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Shows a small remove button. */
  onRemove?: () => void;
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
          onRemove && (size === "lg" ? "pr-1" : "pr-0.5"),
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
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel ?? "Remove"}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full opacity-60 outline-none transition-[opacity,background-color] hover:bg-current/15 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50",
              size === "lg" ? "size-5 [&_svg]:size-3.5" : "size-4 [&_svg]:size-3"
            )}
          >
            <RiCloseLine aria-hidden />
          </button>
        ) : null}
      </span>
    );
  }
);
Badge.displayName = "Badge";
