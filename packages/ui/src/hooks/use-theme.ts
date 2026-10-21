import * as React from "react";
import { defaultTheme, readRootTheme, subscribeRootTheme, writeRootTheme, type SutraTheme } from "../lib/theme-store";

export type { SutraTheme };

/**
 * Read and write Sutra theme attributes on <html>. `initial` seeds the theme on mount only (like `useState`);
 * fields it leaves out are read from <html> (`.dark`, `data-brand`, `data-neutral`, `data-radius`, `data-style`), so a theme set
 * before hydration is kept, then fall back to the defaults. The document is the source of truth: the value follows <html> live,
 * so every `useTheme` caller (and a `ThemeToggle`) sees a change made by any other, and `setTheme` writes only the fields
 * it is given. Only attributes that differ are written. They stay on <html> after unmount so the theme persists.
 * The server and hydration render the defaults (plus `initial`); the document's own theme settles right after.
 */
export function useTheme(initial: Partial<SutraTheme> = {}) {
  const [seed] = React.useState(initial);
  const [seeded, setSeeded] = React.useState(false);

  // A string snapshot keeps the store's identity check cheap: the object below changes only when a field does.
  const key = React.useSyncExternalStore(
    subscribeRootTheme,
    () => JSON.stringify({ ...defaultTheme, ...readRootTheme(), ...(seeded ? null : seed) }),
    () => JSON.stringify({ ...defaultTheme, ...seed })
  );
  const theme = React.useMemo(() => JSON.parse(key) as SutraTheme, [key]);

  // Put the resolved theme (defaults, the page's, then `initial`) on <html> once, then follow the document. Mounting does not
  // touch `color-scheme`; a change made through `setTheme` does.
  React.useEffect(() => {
    writeRootTheme({ ...defaultTheme, ...readRootTheme(), ...seed }, { colorScheme: false });
    setSeeded(true);
  }, [seed]);

  const setTheme = React.useCallback((patch: Partial<SutraTheme>) => writeRootTheme(patch), []);
  return { theme, setTheme };
}
