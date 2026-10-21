# KeybindEditor

> Searchable, grouped shortcut list with a key recorder, conflict detection and reset.

- Import: `import { KeybindEditor } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/workspace`)
- Source: `packages/ui/src/patterns/keybind-editor` (patterns)
- `data-slot`: `keybind-editor`, `keybind-editor-row`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `Record<string, string>` | `{}` | Initial overrides when uncontrolled: an object of id to keys. |
| `labels` | `KeybindEditorLabels` |  | Texts and accessible names (English by default); pass them to translate the editor. |
| `onChange` | `(id: string, keys: string) => void` |  | **Deprecated.** Use `onValueChange` (the overrides object) when the whole value is enough. Fired for every binding change (including the cleared side of a replace and resets). |
| `onResetAll` | `() => void` |  | Called after the user resets every binding to its default. |
| `onValueChange` | `(overrides: Record<string, string>) => void` |  | Called with the full overrides object after a binding changes or is reset. |
| `platform` | `ShortcutPlatform` |  | Platform whose key glyphs are shown. Defaults to the detected platform. |
| `searchPlaceholder` | `string` | `"Search shortcuts…"` | Placeholder of the search field. |
| `shortcuts` | `KeybindItem[]` |  | Shortcut list. Falls back to `useShortcutRegistry()` inside a `ShortcutProvider`. |
| `value` | `Record<string, string>` |  | Controlled overrides: id → keys ("" = cleared). |

## Example (live: `#/components/workspace/keybind-editor` in the playground)

```tsx
import * as React from "react";
import { ShortcutKeys, ShortcutProvider } from "@cleanprompt/sutra-ui/suite";
import { KeybindEditor } from "@cleanprompt/sutra-ui/workspace";

function KeybindDemo() {
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [fired, setFired] = React.useState<string | null>(null);
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <ShortcutProvider>
      <LiveBindings overrides={overrides} onFire={setFired} />
      <div className="flex w-full max-w-2xl flex-col gap-3">
        <KeybindEditor
          shortcuts={keybindDefaults}
          value={overrides}
          onValueChange={setOverrides}
          onChange={(id, keys) => setLast(`${id} → ${keys || "(cleared)"}`)}
        />
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Bindings are live: try <ShortcutKeys keys={overrides["toggle-sidebar"] ?? "mod+b"} />. Last fired: {fired ?? "—"} · Last change: {last ?? "—"}
        </p>
      </div>
    </ShortcutProvider>
  );
}
```

Playground helpers in this snippet (not part of the library): LiveBindings, keybindDefaults.
