# ShortcutKeys

> Renders a keys spec as platform-aware Kbd chips, with "then" between sequence steps.

- Import: `import { ShortcutKeys } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/suite`)
- Source: `packages/ui/src/primitives/shortcut-keys` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `keys` (required) | `string` |  | Keys spec: "mod+k", "shift+?", "g t". |
| `kbdClassName` | `string` |  | Classes for each Kbd chip. |
| `platform` | `ShortcutPlatform` |  | Platform whose key glyphs are shown (`mac` shows ⌘ and ⌥). Defaults to the detected or provided platform. |
| `size` | `"sm" \| "md"` | `"sm"` | Key chip size. |

## Notes

**When to use:** Renders a key spec ("mod+k", "shift+?", "g t") as platform-aware key chips, with "then" between the steps of a sequence. It is display only.

**Use instead when:**
- `Kbd`: a single key chip you write yourself
- `ShortcutProvider`: actually register and handle shortcuts
- `ShortcutsDialog`: a help sheet listing the live shortcuts
- `CommandShortcut`: the hint at the end of a command item

### Keyboard

Not focusable, and it does not listen for the keys it shows: pair it with `useShortcut` or `ShortcutProvider` to make the shortcut work.

### Screen readers

The chips are `aria-hidden` and a visually hidden sentence is read instead, spelled out per platform: "Shift Command K" for `mod+shift+k` on a Mac, and a sequence reads "G then T". The glyphs (command, shift, option) are therefore never read aloud. The root is a plain `span` with `data-shortcut` set to the spec.

### Reduced motion

Static: no animation.

### Server rendering

Server render: part of it fills in after mount. The server has no `navigator` and uses the non-Mac labels ("Ctrl", "Shift"). The hydrating client render uses the same default, so the markup matches, and a Mac browser switches to the glyphs (command, option) right after hydration, before paint. A client-only render detects the platform at once. Pass `platform` (or set it on a `ShortcutProvider`, which `ShortcutKeys` reads) to make the first render already right.

### Gotchas

- `keys` is a spec, not display text: `mod` means Command on a Mac and Ctrl elsewhere, a space separates the steps of a sequence ("g t"), and `+` joins keys that are held together. A string of ready-made glyphs ("⌘K") is not a spec; render it in `Kbd` yourself.
- `platform` is `mac` or `other`; without it the platform comes from the nearest `ShortcutProvider`, else from the browser. `size` is `sm` or `md`, and `kbdClassName` styles each chip.
- Each chip is a `Kbd`, so it renders a real `<kbd>` element; it is hidden from assistive technology here only because the spoken sentence replaces it.

## Example

```tsx
import { ShortcutKeys } from "@cleanprompt/sutra-ui";

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
