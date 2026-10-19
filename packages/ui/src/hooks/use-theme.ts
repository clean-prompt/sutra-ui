import * as React from "react";
import { brands, neutrals, radiusModes, type Brand, type Neutral, type RadiusMode } from "../lib/tokens";

export interface SutraTheme {
  mode: "light" | "dark";
  brand: Brand;
  neutral: Neutral;
  radius: RadiusMode;
}

const defaults: SutraTheme = { mode: "light", brand: "indigo", neutral: "zinc", radius: "rounded" };

const pick = <T extends string>(list: readonly T[], v: string | undefined): T | undefined =>
  v !== undefined && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** The theme already on <html> (set by an inline script or the server), field by field. */
function readRoot(): Partial<SutraTheme> {
  if (typeof document === "undefined") return {};
  const root = document.documentElement;
  const { brand, neutral, radius } = root.dataset;
  const read: Partial<SutraTheme> = {
    mode: root.classList.contains("dark") ? "dark" : undefined,
    brand: pick(brands, brand),
    neutral: pick(neutrals, neutral),
    radius: pick(radiusModes, radius),
  };
  for (const key of Object.keys(read) as (keyof SutraTheme)[]) if (read[key] === undefined) delete read[key];
  return read;
}

/**
 * Read and write Sutra theme attributes on <html>. `initial` seeds the state on mount only (like `useState`);
 * fields it leaves out are read from <html> (`.dark`, `data-brand`, `data-neutral`, `data-radius`), so a theme set
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
  }, [theme]);

  const setTheme = React.useCallback(
    (patch: Partial<SutraTheme>) => setThemeState((t) => ({ ...t, ...patch })),
    []
  );
  return { theme, setTheme };
}
