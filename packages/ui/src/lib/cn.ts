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
      text: ["2xs", "display-xs", "display-sm", "display-md", "display-lg", "display-xl", "display-2xl", "display-3xl"],
      radius: ["control", "box", "action"],
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

/**
 * Minimum hit area (WCAG 2.5.8, 24 x 24 css px) for a control that is visually smaller: an invisible `::after` centred on
 * the element, as large as the element and never under 24px, so the look is unchanged. Pass it through `cn()` first, so a
 * later `absolute`/`fixed`/`sticky` replaces its `relative`; do not put it on an element that clips its overflow.
 */
export const hitArea =
  "relative after:absolute after:start-1/2 after:top-1/2 after:h-[max(100%,1.5rem)] after:w-[max(100%,1.5rem)] after:-translate-x-1/2 rtl:after:translate-x-1/2 after:-translate-y-1/2 after:content-['']";

/** `hitArea`, and 44px under a coarse pointer (touch) for primary icon buttons. */
export const hitAreaTouch = `${hitArea} pointer-coarse:after:h-[max(100%,2.75rem)] pointer-coarse:after:w-[max(100%,2.75rem)]`;

/** Shared invalid state, driven by aria-invalid. */
export const invalidRing =
  "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20";

/** The shared three-step control size scale. */
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
