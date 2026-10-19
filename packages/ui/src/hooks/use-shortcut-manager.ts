import * as React from "react";
import { detectShortcutPlatform, type ShortcutManager, type ShortcutPlatform } from "../lib/shortcuts";

/** The `ShortcutManager` provided by `ShortcutProvider` (null outside one). */
export const ShortcutManagerContext = React.createContext<ShortcutManager | null>(null);
ShortcutManagerContext.displayName = "ShortcutManagerContext";

/** The `platform` a `ShortcutProvider` was given explicitly (undefined when it detects the platform itself). */
export const ShortcutPlatformContext = React.createContext<ShortcutPlatform | undefined>(undefined);
ShortcutPlatformContext.displayName = "ShortcutPlatformContext";

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

const subscribeNever = () => () => {};
const serverPlatform = (): ShortcutPlatform => "other";

/**
 * Platform used for `mod` and glyphs: the `platform` given to the `ShortcutProvider`, else detected. Detection is not read
 * during the hydrating render: the server and the first client render use the non-Mac default and a Mac browser settles on its
 * own platform right after hydration, so the markup never mismatches. (A client-only render detects at once.)
 */
export function useShortcutPlatform(): ShortcutPlatform {
  const explicit = React.useContext(ShortcutPlatformContext);
  const detected = React.useSyncExternalStore(subscribeNever, detectShortcutPlatform, serverPlatform);
  return explicit ?? detected;
}
