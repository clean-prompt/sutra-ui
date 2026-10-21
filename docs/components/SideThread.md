# SideThread

> Docked mini-chat for quick side questions that don't interrupt the main conversation. Resizable from its top edge.

- Import: `import { SideThread } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-composer-side-thread` (kit `agent`)
- `data-slot`: `side-thread`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `exchanges` (required) | `SideThreadExchange[]` |  | Question and answer pairs, oldest first; an exchange without an answer is pending. |
| `busy` | `boolean` |  | **Deprecated.** Use `loading`. Disables asking while an answer is pending. |
| `defaultHeight` | `number` | `280` | Initial height in px when `height` is not controlled. |
| `emptyState` | `React.ReactNode` | `"Ask a quick side question without interrupting the main conversation."` | Shown when there are no exchanges yet. |
| `height` | `number` |  | Controlled height of the thread in px. |
| `loading` | `boolean` |  | Disables asking while an answer is pending. Default: any exchange is pending. |
| `maxHeight` | `number` | `640` | Largest height in px the user can resize to. Default 640. |
| `minHeight` | `number` | `140` | Smallest height in px the user can resize to. Default 140. |
| `onAsk` | `(text: string) => void` |  | Called with the question text from the side composer. |
| `onClose` | `() => void` |  | Called when the user closes the thread; the close button is hidden when unset. |
| `onHeightChange` | `(height: number) => void` |  | Called with the height in px (rounded and clamped) when the user resizes the thread. |
| `placeholder` | `string` | `"Ask a quick side question…"` | Placeholder of the side composer. Default "Ask a quick side question…". |
| `resizable` | `boolean` | `true` | Show the top resize handle (pointer drag, ↑/↓, PageUp/PageDown, Home/End). Default true. |
| `step` | `number` | `16` | Keyboard resize step in px. Default 16. |
| `title` | `React.ReactNode` | `"Side question"` | Header title. Default "Side question". |

## Example (live: `#/components/agent-composer/side-thread` in the playground)

```tsx
import * as React from "react";
import { SideThread } from "@cleanprompt/sutra-ui/agent";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiQuestionAnswerLine } from "@cleanprompt/sutra-ui/icons";

function SideThreadDemo() {
  const side = useSideThread();
  const [open, setOpen] = React.useState(true);
  const [height, setHeight] = React.useState(260);
  return (
    <>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
        {open ? (
          <SideThread exchanges={side.exchanges} onAsk={side.ask} onClose={() => setOpen(false)} height={height} onHeightChange={setHeight} />
        ) : (
          <Button size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)} leadingIcon={<RiQuestionAnswerLine />}>
            Ask a side question
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Height: {height}px</p>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): useSideThread.
