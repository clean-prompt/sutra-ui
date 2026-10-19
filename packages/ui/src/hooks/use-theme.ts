import * as React from "react";
import { brands, neutrals, radiusModes, themeStyles, type Brand, type Neutral, type RadiusMode, type ThemeStyle } from "../lib/tokens";

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

const defaults: SutraTheme = { mode: "light", brand: "indigo", neutral: "zinc", radius: "rounded" };

const pick = <T extends string>(list: readonly T[], v: string | undefined): T | undefined =>
  v !== undefined && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** The theme already on <html> (set by an inline script or the server), field by field. */
function readRoot(): Partial<SutraTheme> {
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
 * Read and write Sutra theme attributes on <html>. `initial` seeds the state on mount only (like `useState`);
 * fields it leaves out are read from <html> (`.dark`, `data-brand`, `data-neutral`, `data-radius`, `data-style`), so a theme set
 * before hydration is kept, then fall back to the defaults. Change the theme afterwards with `setTheme`.
 * Only attributes that differ are written. They stay on <html> after unmount so the theme persists.
 */
export function useTheme(initial: Partial<SutraTheme> = {}) {
  const [theme, setThemeState] = React.useState<SutraTheme>(() => ({ ...defaults, ...readRoot(), ...initial }));

  React.useEffect(() => {
    const root = document.documentElement;
    const dark = theme.mode === "dark";
    if (root.classList.contains("dark") !== dark) root.classList.toggle("dark", dark);
    if (root.dataset.brand !== theme.brand) root.dataset.brand = theme.brand;
    if (root.dataset.neutral !== theme.neutral) root.dataset.neutral = theme.neutral;
    if (root.dataset.radius !== theme.radius) root.dataset.radius = theme.radius;
    // The stock look has no attribute, so `style: "default"` and an unset style both clear it.
    if (theme.style && theme.style !== "default") {
      if (root.dataset.style !== theme.style) root.dataset.style = theme.style;
    } else if (root.dataset.style !== undefined) {
      delete root.dataset.style;
    }
  }, [theme]);

  const setTheme = React.useCallback(
    (patch: Partial<SutraTheme>) => setThemeState((t) => ({ ...t, ...patch })),
    []
  );
  return { theme, setTheme };
}
