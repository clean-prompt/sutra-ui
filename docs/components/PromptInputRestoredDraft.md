# PromptInputRestoredDraft

> Notice shown when an unsent draft was restored into the composer, with Discard / Keep.

- Import: `import { PromptInputRestoredDraft } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input` (kit `ai`)
- `data-slot`: `prompt-input-restored-draft`
- Part of [`PromptInput`](PromptInput.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `clearOnDiscard` | `boolean` | `true` | Clears the prompt text when Discard is pressed inside a `PromptInput`. Default true. |
| `defaultOpen` | `boolean` | `true` | Initial visibility when uncontrolled. Default true. |
| `discardLabel` | `string` | `"Discard"` | Label of the discard button. Default "Discard". |
| `keepLabel` | `string` | `"Keep"` | Label of the keep button. Default "Keep". |
| `message` | `React.ReactNode` | `"Restored your unsent draft"` | Main line. Default "Restored your unsent draft". |
| `onDiscard` | `() => void` |  | Discard the draft. Inside a PromptInput the text is also cleared unless `clearOnDiscard={false}`. |
| `onKeep` | `() => void` |  | Keep the draft (just dismisses the notice). |
| `onOpenChange` | `(open: boolean) => void` |  | Called when Discard or Keep hides the notice. |
| `open` | `boolean` |  | Controlled visibility. Uncontrolled notices hide themselves after either choice. |
| `savedAt` | `React.ReactNode` |  | When the draft was saved, shown muted after the message (e.g. "2h ago"). |

## Example (live: `#/components/chat-extras/restored-draft` in the playground)

```tsx
import * as React from "react";
import {
  PromptInput,
  PromptInputRestoredDraft,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@cleanprompt/sutra-ui/ai";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiDraftLine } from "@cleanprompt/sutra-ui/icons";

function RestoredDraftDemo() {
  const [key, setKey] = React.useState(0);
  return (
    <>
      <PromptInput key={key} defaultValue="Can you refactor the auth middleware so that">
        <PromptInputRestoredDraft savedAt="2h ago" />
        <PromptInputTextarea />
        <PromptInputToolbar>
          <PromptInputTools />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
      <Button size="xs" variant="ghost" className="w-fit" leadingIcon={<RiDraftLine />} onClick={() => setKey((k) => k + 1)}>
        Simulate reload
      </Button>
    </>
  );
}
```
