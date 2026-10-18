import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge taught about Sutra's custom theme tokens. Without this,
 * `text-display-*` / `text-2xs` are mistaken for text colours (and dropped next
 * to `text-foreground`), and `rounded-control` / `rounded-box` can't be overridden.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs", "display-xs", "display-sm", "display-md", "display-lg", "display-xl", "display-2xl"],
      radius: ["control", "box"],
    },
  },
});

/** Merge class names, resolving conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared focus ring for every interactive element. */
export const focusRing =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:border-ring";

/** Shared invalid state, driven by aria-invalid. */
export const invalidRing =
  "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20";

export type Size = "sm" | "md" | "lg";

/** Spacing density for lists, tables and timelines. */
export type Density = "compact" | "normal" | "relaxed";

/** Map legacy density inputs (`compact` boolean, "comfortable") to a `Density`. */
export function normalizeDensity(density: Density | "comfortable" | boolean | null | undefined, fallback: Density = "normal"): Density {
  if (density === true) return "compact";
  if (density === false || density == null) return fallback;
  if (density === "comfortable") return "relaxed";
  return density;
}
