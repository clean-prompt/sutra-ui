---
component: ShortcutKeys
module: primitives/shortcut-keys
use: Renders a key spec ("mod+k", "shift+?", "g t") as platform-aware key chips, with "then" between the steps of a sequence. It is display only.
instead: Kbd = a single key chip you write yourself; ShortcutProvider = actually register and handle shortcuts; ShortcutsDialog = a help sheet listing the live shortcuts; CommandShortcut = the hint at the end of a command item
server: mixed
---

## Keyboard
Not focusable, and it does not listen for the keys it shows: pair it with `useShortcut` or `ShortcutProvider` to make the shortcut work.

## Screen readers
The chips are `aria-hidden` and a visually hidden sentence is read instead, spelled out per platform: "Shift Command K" for `mod+shift+k` on a Mac, and a sequence reads "G then T". The glyphs (command, shift, option) are therefore never read aloud. The root is a plain `span` with `data-shortcut` set to the spec.

## Reduced motion
Static: no animation.

## Server rendering
The platform is detected during the first render: the server has no `navigator` and uses the non-Mac labels ("Ctrl", "Shift"), while a Mac browser computes the glyphs (command, option) on its first client render, so hydration can differ there. Pass `platform` (or set it on a `ShortcutProvider`, which `ShortcutKeys` reads) to make server and client agree.

## Gotchas
- `keys` is a spec, not display text: `mod` means Command on a Mac and Ctrl elsewhere, a space separates the steps of a sequence ("g t"), and `+` joins keys that are held together. A string of ready-made glyphs ("⌘K") is not a spec; render it in `Kbd` yourself.
- `platform` is `mac` or `other`; without it the platform comes from the nearest `ShortcutProvider`, else from the browser. `size` is `sm` or `md`, and `kbdClassName` styles each chip.
- Each chip is a `Kbd`, so it renders a real `<kbd>` element; it is hidden from assistive technology here only because the spoken sentence replaces it.

## Example
```tsx
import { ShortcutKeys } from "@sutra/ui";

const shortcuts = [
  { action: "Open command menu", keys: "mod+k" },
  { action: "Save changes", keys: "mod+s" },
  { action: "Go to tasks", keys: "g t" },
];

export function Example() {
  return (
    <ul className="flex max-w-xs flex-col gap-2 text-sm">
      {shortcuts.map((s) => (
        <li key={s.action} className="flex items-center justify-between gap-4">
          {s.action}
          <ShortcutKeys keys={s.keys} />
        </li>
      ))}
    </ul>
  );
}
```
