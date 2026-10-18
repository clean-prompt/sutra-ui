import * as React from "react";
import type { Brand, Neutral, RadiusMode } from "../lib/tokens";

export interface SutraTheme {
  mode: "light" | "dark";
  brand: Brand;
  neutral: Neutral;
  radius: RadiusMode;
}

/**
 * Read and write Sutra theme attributes on <html>. `initial` seeds the state on mount only (like `useState`);
 * change the theme afterwards with `setTheme`. The attributes stay on <html> after unmount so the theme persists.
 */
export function useTheme(initial: Partial<SutraTheme> = {}) {
  const [theme, setThemeState] = React.useState<SutraTheme>({
    mode: "light",
    brand: "indigo",
    neutral: "zinc",
    radius: "rounded",
    ...initial,
  });

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme.mode === "dark");
    root.dataset.brand = theme.brand;
    root.dataset.neutral = theme.neutral;
    root.dataset.radius = theme.radius;
  }, [theme]);

  const setTheme = React.useCallback(
    (patch: Partial<SutraTheme>) => setThemeState((t) => ({ ...t, ...patch })),
    []
  );
  return { theme, setTheme };
}
