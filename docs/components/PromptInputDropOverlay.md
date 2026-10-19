# PromptInputDropOverlay

> Full-composer overlay shown while files (or `onContextDrop` data) are dragged over the PromptInput; replaces the default hint.

- Import: `import { PromptInputDropOverlay } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-attachments` (kit `ai`)
- `data-slot`: `prompt-input-drop-overlay`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary line (e.g. accepted types). |
| `icon` | `React.ReactNode` |  | Replaces the default drop icon. |
| `label` | `React.ReactNode` | `"Drop to attach as context"` | Main line. Default "Drop to attach as context". |

## Example (live: `#/components/agent-composer/drop-overlay` in the playground)

```tsx
import * as React from "react";
import { PromptInput, PromptInputDropOverlay, PromptInputTextarea } from "@sutra/ui/ai";

function DropOverlayDemo() {
  const [dropped, setDropped] = React.useState<string[]>([]);
  return (
    <>
      <PromptInput
        className="mx-auto max-w-xl"
        onFilesAdded={(files) => setDropped((d) => [...d, ...files.map((f) => f.name)])}
        onContextDrop={(data) => setDropped((d) => [...d, data.getData("text/uri-list") || data.getData("text/plain") || "(data)"])}
      >
        <PromptInputTextarea placeholder="Drop something here…" minRows={2} />
        <PromptInputDropOverlay />
      </PromptInput>
      <p className="text-center text-xs text-muted-foreground">{dropped.length ? `Dropped: ${dropped.join(", ")}` : "Nothing dropped yet."}</p>
    </>
  );
}
```
