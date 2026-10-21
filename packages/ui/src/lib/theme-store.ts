import { brands, neutrals, radiusModes, themeStyles, type Brand, type Neutral, type RadiusMode, type ThemeStyle } from "./tokens";

/** The theme settings the document can carry: colour mode, brand, neutral, radius and visual style. */
export interface SutraTheme {
  /** Colour scheme: `light` or `dark`. */
  mode: "light" | "dark";
  /** Brand palette that drives the primary colour. */
  brand: Brand;
  /** Neutral palette used for backgrounds, borders and text. */
  neutral: Neutral;
  /** Corner radius preset applied to controls and cards. */
  radius: RadiusMode;
  /** Visual style (`data-style`). Leave it out for the stock look; `"paper"` also needs `@sutra/ui/paper.css`. */
  style?: ThemeStyle;
}

export const defaultTheme: SutraTheme = { mode: "light", brand: "indigo", neutral: "zinc", radius: "rounded" };

const pick = <T extends string>(list: readonly T[], v: string | undefined): T | undefined =>
  v !== undefined && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** The theme already on <html> (set by an inline script, the server or another writer), field by field. */
export function readRootTheme(): Partial<SutraTheme> {
  if (typeof document === "undefined") return {};
  const root = document.documentElement;
  const { brand, neutral, radius, style } = root.dataset;
  const read: Partial<SutraTheme> = {
    mode: root.classList.contains("dark") ? "dark" : undefined,
    brand: pick(brands, brand),
    neutral: pick(neutrals, neutral),
    radius: pick(radiusModes, radius),
    style: pick(themeStyles, style),
  };
  for (const key of Object.keys(read) as (keyof SutraTheme)[]) if (read[key] === undefined) delete read[key];
  return read;
}

/**
 * Write the fields of `patch` to <html>, and only those: a writer that changes one field never rewrites another from a stale
 * copy, so several `useTheme` callers and a `ThemeToggle` can share the document. Only attributes that differ are touched.
 * The colour mode also sets `color-scheme` (so native controls and scrollbars follow it) unless `colorScheme` is false.
 */
export function writeRootTheme(patch: Partial<SutraTheme>, { colorScheme = true }: { colorScheme?: boolean } = {}): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (patch.mode !== undefined) {
    if (root.classList.contains("dark") !== (patch.mode === "dark")) root.classList.toggle("dark", patch.mode === "dark");
    if (colorScheme && root.style.colorScheme !== patch.mode) root.style.colorScheme = patch.mode;
  }
  if (patch.brand !== undefined && root.dataset.brand !== patch.brand) root.dataset.brand = patch.brand;
  if (patch.neutral !== undefined && root.dataset.neutral !== patch.neutral) root.dataset.neutral = patch.neutral;
  if (patch.radius !== undefined && root.dataset.radius !== patch.radius) root.dataset.radius = patch.radius;
  if ("style" in patch) {
    // The stock look has no attribute, so `style: "default"` and an unset style both clear it.
    if (patch.style && patch.style !== "default") {
      if (root.dataset.style !== patch.style) root.dataset.style = patch.style;
    } else if (root.dataset.style !== undefined) {
      delete root.dataset.style;
    }
  }
  listeners.forEach((l) => l());
}

/** The theme of the document as a tiny external store: one MutationObserver shared by every subscriber. */
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

/** Called after our own writes (at once) and after anyone else's (through the observer). */
export function subscribeRootTheme(listener: () => void): () => void {
  listeners.add(listener);
  if (!observer && typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    observer = new MutationObserver(() => listeners.forEach((l) => l()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-brand", "data-neutral", "data-radius", "data-style"],
    });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}
