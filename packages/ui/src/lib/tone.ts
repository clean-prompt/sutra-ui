/**
 * Canonical semantic tone vocabulary.
 *
 * Every component that colours something by meaning takes a `tone` prop with these values.
 * Legacy spellings are accepted through `ToneInput` and mapped by `normalizeTone`, so older
 * call sites keep working while the docs and new code use the canonical names.
 */

export const TONES = ["neutral", "primary", "success", "warning", "destructive", "info"] as const;

/** Canonical semantic tone. */
export type Tone = (typeof TONES)[number];

/** Deprecated spellings accepted for backward compatibility. Prefer `Tone`. */
export type LegacyTone =
  | "brand"
  | "default"
  | "muted"
  | "warn"
  | "danger"
  | "error"
  | "critical"
  | "failure";

/** What tone props accept: the canonical names plus deprecated aliases. */
export type ToneInput = Tone | LegacyTone;

const ALIASES: Record<LegacyTone, Tone> = {
  brand: "primary",
  default: "neutral",
  muted: "neutral",
  warn: "warning",
  danger: "destructive",
  error: "destructive",
  critical: "destructive",
  failure: "destructive",
};

/** Map any accepted tone spelling to its canonical `Tone` (unknown or missing → `fallback`). */
export function normalizeTone(tone: ToneInput | string | null | undefined, fallback: Tone = "neutral"): Tone {
  if (!tone) return fallback;
  if ((TONES as readonly string[]).includes(tone)) return tone as Tone;
  return Object.hasOwn(ALIASES, tone) ? ALIASES[tone as LegacyTone] : fallback;
}

/** Shared tone → class maps, so components don't each hand-write their own. */
export const toneClasses: Record<"soft" | "solid" | "outline" | "dot" | "text" | "border", Record<Tone, string>> = {
  soft: {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary-soft-foreground",
    success: "bg-success-soft text-success-soft-foreground",
    warning: "bg-warning-soft text-warning-soft-foreground",
    destructive: "bg-destructive-soft text-destructive-soft-foreground",
    info: "bg-info-soft text-info-soft-foreground",
  },
  solid: {
    neutral: "bg-inverse text-inverse-foreground",
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    info: "bg-info text-info-foreground",
  },
  outline: {
    neutral: "border-border text-foreground",
    primary: "border-primary/50 text-primary-soft-foreground",
    success: "border-success/50 text-success-soft-foreground",
    warning: "border-warning/60 text-warning-soft-foreground",
    destructive: "border-destructive/50 text-destructive-soft-foreground",
    info: "border-info/50 text-info-soft-foreground",
  },
  dot: {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-info",
  },
  text: {
    neutral: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning-soft-foreground",
    destructive: "text-destructive",
    info: "text-info",
  },
  border: {
    neutral: "border-border",
    primary: "border-primary",
    success: "border-success",
    warning: "border-warning",
    destructive: "border-destructive",
    info: "border-info",
  },
};

/** Convenience: classes for a tone in one style, accepting legacy spellings. */
export function toneClass(style: keyof typeof toneClasses, tone: ToneInput | null | undefined, fallback: Tone = "neutral") {
  return toneClasses[style][normalizeTone(tone, fallback)];
}

/**
 * Colour tokens that colour props accept in place of a CSS colour (charts, sparklines, meters, gauges), as CSS
 * variables. `neutral` and `muted` are the muted foreground (as in `resolveAccent`); `foreground` is full contrast.
 */
export const COLOR_TOKENS: Readonly<Record<Tone | "muted" | "foreground", string>> = {
  neutral: "var(--muted-foreground)",
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  info: "var(--info)",
  muted: "var(--muted-foreground)",
  foreground: "var(--foreground)",
};

/** A colour token (`primary`, `success`, `muted`, …) as its CSS variable; any other string (a CSS colour) is returned as is. */
export function resolveColorToken(color: string): string {
  return Object.hasOwn(COLOR_TOKENS, color) ? COLOR_TOKENS[color as keyof typeof COLOR_TOKENS] : color;
}
