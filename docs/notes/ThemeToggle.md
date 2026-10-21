---
component: ThemeToggle
module: patterns/theme-toggle
use: A light, dark and system theme switch, as one icon button that cycles through the modes or as a segmented control showing them all. It toggles the `dark` class and `color-scheme` on `<html>` and remembers the choice in `localStorage`.
instead: SegmentedControl = any choice between a few options; Switch = a plain on or off setting; Select = a long list of options (such as a palette); SearchTrigger = another header control, a search field button; DropdownMenu = theme and other preferences in one menu
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the button (`icon`), or the selected segment (`segmented`, one tab stop) |
| Enter, Space | `icon`: switch to the next mode. `segmented`: select the focused segment |
| Arrow keys, Home, End | `segmented` only: move focus between the segments (Radix roving focus) |

The `segmented` variant is a `SegmentedControl`, so in RTL its horizontal arrows swap the same way. The icon button has no direction-dependent keys.

## Screen readers
- `icon` is one button named "Theme: Light. Switch to Dark" (the current mode and the next one), which changes after each press. There is no live region, so a screen reader may not announce the new name until focus returns to it. The three icons are `aria-hidden` and `title` shows the current mode.
- `segmented` is a `radiogroup` named "Theme" with a `radio` per mode ("Light", "Dark", "System"). With `showLabels={false}` each radio keeps its name through `aria-label`.

## Reduced motion
The sun, moon and computer icons turn and fade into each other over 500 ms; `motion-reduce:transition-none` makes them switch at once under `prefers-reduced-motion`. The segmented thumb follows `SegmentedControl` (jumps).

## Server rendering
The server and the hydrating client render `defaultValue` or "system" (or "light" when `modes` has no system), so the markup matches. Right after hydration, before paint, an uncontrolled toggle reads the saved mode from `localStorage` (or a dark `<html>` when `modes` has no system and there is no `defaultValue`) and switches to it: that restore does not call `onValueChange`, and nothing is written to storage or `<html>` until it is done. The `dark` class on `<html>` is set in an effect after mount, so the first paint shows the page's own theme: set the class early with a small inline script that reads the same key.

## Gotchas
- Uncontrolled, it stores the mode under `storageKey` (default `"sutra-theme"`; `null` turns it off) and a saved value that is in `modes` wins over `defaultValue`. Controlled with `value` and `onValueChange`, it stores nothing: you persist.
- `applyToDocument` (default true) toggles `dark` on `<html>` and sets `color-scheme`; set it to false when the app applies the theme itself. It writes only the mode, through the same store as `useTheme`, so a `useTheme` caller follows the toggle at once and the toggle never rewrites the brand, neutral, radius or style. Two toggles do not sync with each other.
- `modes` is the cycle order (default `light`, `dark`, `system`); `["light", "dark"]` makes a two-state toggle. With no saved or default value the start is `system` when offered, else whatever `<html>` shows.
- `system` follows the operating system live and resolves to light or dark (exposed as `data-resolved` on the icon button); its icon is always the computer, not the resolved sun or moon.

## Example
```tsx
import { ThemeToggle } from "@sutra/ui";

export function Example() {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-2">
      <span className="font-semibold">Acme</span>
      <ThemeToggle />
    </header>
  );
}
```
