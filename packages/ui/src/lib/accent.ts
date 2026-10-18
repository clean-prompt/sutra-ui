/* Categorical accent colour: one colour per section or metric (CPU blue, Memory purple, …), applied to an
 * icon chip, title, chart and active tab. Unlike `tone`, an accent carries no meaning (good / bad). Pure. */
import type * as React from "react";

/** Named accents. Hex values match Tailwind v4's 500 shades, so they read on light and dark surfaces alike. */
export const ACCENT_COLORS = {
  blue: "#2b7fff",
  indigo: "#615fff",
  violet: "#8e51ff",
  purple: "#ad46ff",
  pink: "#f6339a",
  rose: "#ff2056",
  red: "#fb2c36",
  orange: "#ff6900",
  amber: "#fe9a00",
  yellow: "#f0b100",
  lime: "#7ccf00",
  green: "#00c950",
  emerald: "#00bc7d",
  teal: "#00bba7",
  cyan: "#00b8db",
  sky: "#00a6f4",
  slate: "#62748e",
} as const;

export type AccentName = keyof typeof ACCENT_COLORS;

/** Semantic tokens are accepted too, so an accent can follow the theme's primary colour. */
const TOKEN_ACCENTS: Record<string, string> = {
  primary: "var(--primary)",
  neutral: "var(--muted-foreground)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
};

/** A named accent, a semantic token (`primary`, `success`, …) or any CSS colour. */
export type Accent = AccentName | "primary" | "neutral" | "success" | "warning" | "destructive" | "info" | (string & {});

/** The CSS custom property components read the accent from. */
export const ACCENT_VAR = "--sutra-accent";

/** Resolve an accent to a CSS colour (undefined when no accent is set). */
export function resolveAccent(accent: Accent | null | undefined): string | undefined {
  if (!accent) return undefined;
  if (Object.hasOwn(ACCENT_COLORS, accent)) return ACCENT_COLORS[accent as AccentName];
  if (Object.hasOwn(TOKEN_ACCENTS, accent)) return TOKEN_ACCENTS[accent];
  return accent;
}

/**
 * Inline style that sets `--sutra-accent` (merged over `style`). Returns `style` unchanged when no accent is set,
 * so the `accentClasses` utilities fall back to the primary colour.
 */
export function accentStyle(accent: Accent | null | undefined, style?: React.CSSProperties): React.CSSProperties | undefined {
  const color = resolveAccent(accent);
  if (!color) return style;
  return { ...style, [ACCENT_VAR]: color } as React.CSSProperties;
}

/** Utility classes that read `--sutra-accent`, falling back to `--primary` when no accent is set. */
export const accentClasses = {
  /** Accent-coloured text (titles, icons). */
  text: "text-[var(--sutra-accent,var(--primary))]",
  /** Tinted background with accent text: icon chips, active pills. */
  soft: "bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_14%,transparent)] text-[var(--sutra-accent,var(--primary))]",
  /** Solid accent fill: bars, slider ranges. */
  solid: "bg-[var(--sutra-accent,var(--primary))]",
  /** Faint accent wash: chart tracks, the strip behind a footer sparkline. */
  track: "bg-[color-mix(in_oklab,var(--sutra-accent,var(--primary))_8%,transparent)]",
  /** Accent border. */
  border: "border-[var(--sutra-accent,var(--primary))]",
} as const;

/** The CSS colour value components can pass to SVG or chart props (`var(--sutra-accent, var(--primary))`). */
export const accentColorValue = "var(--sutra-accent, var(--primary))";
