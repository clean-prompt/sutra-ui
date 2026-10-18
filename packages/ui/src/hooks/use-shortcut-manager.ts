import * as React from "react";
import { detectShortcutPlatform, type ShortcutManager, type ShortcutPlatform } from "../lib/shortcuts";

/** The `ShortcutManager` provided by `ShortcutProvider` (null outside one). */
export const ShortcutManagerContext = React.createContext<ShortcutManager | null>(null);
ShortcutManagerContext.displayName = "ShortcutManagerContext";

/** Scope name set by `<ShortcutScope>`; `useShortcut` calls inside default to it. */
export const ShortcutScopeNameContext = React.createContext<string | undefined>(undefined);
ShortcutScopeNameContext.displayName = "ShortcutScopeNameContext";

/** The nearest `ShortcutManager`, or null outside a `ShortcutProvider`. */
export function useShortcutManager() {
  return React.useContext(ShortcutManagerContext);
}

/** True when rendered inside a `ShortcutProvider`. */
export function useHasShortcutProvider() {
  return React.useContext(ShortcutManagerContext) != null;
}

/** Platform used for `mod` and glyphs (from the provider, else detected). */
export function useShortcutPlatform(): ShortcutPlatform {
  const manager = React.useContext(ShortcutManagerContext);
  const [detected] = React.useState(detectShortcutPlatform);
  return manager?.platform ?? detected;
}
