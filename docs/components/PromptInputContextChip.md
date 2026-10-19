# PromptInputContextChip

> Removable chip for attached context such as the editor selection or the open file, with an include/exclude eye toggle.

- Import: `import { PromptInputContextChip } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-attachments` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `path` (required) | `string` |  | File path, shown as its base name (full path in the tooltip). |
| `defaultIncluded` | `boolean` | `true` | Initial state of the eye toggle when `included` is not controlled. |
| `icon` | `React.ReactNode` |  | Replaces the default file icon. |
| `included` | `boolean` |  | Whether the context is sent with the prompt (eye toggle). |
| `label` | `React.ReactNode` |  | Overrides the visible label. |
| `lines` | `PromptInputLineRange` |  | Line range the context covers; shown after the file name. |
| `onIncludedChange` | `(included: boolean) => void` |  | Called with the new state when the user flips the eye toggle. |
| `onOpen` | `() => void` |  | Makes the label a button (e.g. open the file). |
| `onRemove` | `() => void` |  | Called when the user removes the chip; the remove button is hidden when unset. |
| `toggleable` | `boolean` | `true` | Show the eye toggle. Default true. |

## Example (live: `#/components/agent-composer/context-chip` in the playground)

```tsx
import * as React from "react";
import { PromptInputContextChip } from "@sutra/ui/ai";

function ContextChipDemo() {
  const [chips, setChips] = React.useState([
    { id: "sel", path: "src/app.tsx", lines: [10, 20] as const, included: true },
    { id: "open", path: "src/routes/settings/profile.tsx", lines: undefined, included: false },
    { id: "line", path: "packages/ui/src/index.ts", lines: 42, included: true },
  ]);
  return (
    <>
      {chips.map((c) => (
        <PromptInputContextChip
          key={c.id}
          path={c.path}
          lines={c.lines}
          included={c.included}
          onIncludedChange={(included) => setChips((cs) => cs.map((x) => (x.id === c.id ? { ...x, included } : x)))}
          onRemove={() => setChips((cs) => cs.filter((x) => x.id !== c.id))}
        />
      ))}
      {chips.length === 0 && <span className="text-sm text-muted-foreground">All removed.</span>}
    </>
  );
}
```
