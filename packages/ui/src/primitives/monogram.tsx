import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../lib/cn";
import { colorForSeed } from "../lib/hash";
import { initials, type InitialsOptions } from "../lib/text";
import { seedColorStyle } from "./avatar";

export type MonogramSize = "xs" | "sm" | "md" | "lg" | "xl";
/** `solid`: seed colour with white letters · `soft`: tinted seed colour · `brand`: brand gradient (no seed colour). */
export type MonogramVariant = "solid" | "soft" | "brand";

/**
 * Monogram letters for an app, provider or tool name: words split on anything that is not a letter or digit,
 * the first two words, two letters from a single word, `"?"` when empty.
 * `"Nimbus AI"` → `"NA"`, `"github-mcp"` → `"GM"`, `"corvid"` → `"CO"`.
 */
export function monogramInitials(name: string | null | undefined, options: InitialsOptions = {}): string {
  return initials(String(name ?? "").replace(/[^\p{L}\p{N}]+/gu, " "), {
    mode: "first-two",
    singleWord: 2,
    fallback: "?",
    ...options,
  });
}

export const monogramVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center rounded-md font-semibold leading-none tracking-tight [&_svg]:size-[1.25em]",
  {
    variants: {
      size: {
        xs: "size-5 text-[9px]",
        sm: "size-6 text-2xs",
        md: "size-8 text-xs",
        lg: "size-10 text-sm",
        xl: "size-12 text-base",
      },
      variant: {
        solid: "text-white shadow-inner-highlight",
        soft: "",
        brand:
          "border border-border bg-gradient-to-br from-[color:light-dark(var(--b-50),var(--b-900))] to-[color:light-dark(var(--b-100),var(--b-950))] text-[color:light-dark(var(--b-700),var(--b-200))]",
      },
    },
    defaultVariants: { size: "md", variant: "solid" },
  }
);

export interface MonogramProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Name the letters and the seed colour are derived from. */
  name: string;
  /** Override the generated letters (1–2 characters). */
  letters?: string;
  /** Tile colour (any CSS colour); defaults to `colorForSeed(name)`. Ignored by the `brand` variant. */
  color?: string;
  /** Tile size from `xs` to `xl`. */
  size?: MonogramSize;
  /**
   * Look: `solid` (tinted tile, white letters), `soft` (light tile) or `brand` (brand-colour tile).
   * @default "solid"
   */
  variant?: MonogramVariant;
  /** Options for the generated letters. */
  initialsOptions?: InitialsOptions;
  /** Accessible name. Without it the tile is decorative (`aria-hidden`), which suits a tile next to a visible name. */
  label?: string;
}

/**
 * Square letter tile for things that are not people: apps, providers, tools, workspaces.
 * Same initials and seed colour as `Avatar`; use `Avatar` for users.
 */
export const Monogram = React.forwardRef<HTMLSpanElement, MonogramProps>(
  ({ name, letters, color, size, variant = "solid", initialsOptions, label, className, style, children, ...props }, ref) => {
    const seedStyle = variant === "brand" ? undefined : seedColorStyle(color ?? colorForSeed(name), variant);
    return (
      <span
        ref={ref}
        role={label ? "img" : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
        data-slot="monogram"
        className={cn(monogramVariants({ size, variant }), className)}
        style={seedStyle || style ? { ...seedStyle, ...style } : undefined}
        {...props}
      >
        {children ?? letters ?? monogramInitials(name, initialsOptions)}
      </span>
    );
  }
);
Monogram.displayName = "Monogram";
