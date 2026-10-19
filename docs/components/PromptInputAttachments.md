# PromptInputAttachments

> Slot above the textarea for attachment previews. Renders nothing when empty.

- Import: `import { PromptInputAttachments } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-attachments` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Example (live: `#/components/chat-extras/large-paste` in the playground)

```tsx
import * as React from "react";
import {
  PromptInput,
  PromptInputAttachments,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@sutra/ui/ai";
import { Button } from "@sutra/ui/core";
import { RiCloseLine, RiFileTextLine } from "@sutra/ui/icons";

function LargePasteDemo() {
  const [files, setFiles] = React.useState<File[]>([]);
  const copyBig = () => {
    const text = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}: lorem ipsum dolor sit amet, consectetur adipiscing elit.`).join("\n");
    void navigator.clipboard?.writeText(text);
  };
  return (
    <>
      <Button size="sm" variant="secondary" className="h-auto min-h-8 w-fit max-w-full whitespace-normal py-1.5 text-left" leadingIcon={<RiFileTextLine />} onClick={copyBig}>
        Copy ~8,000 characters, then paste below
      </Button>
      <PromptInput
        largePasteThreshold={3000}
        onFilesAdded={(f) => setFiles((xs) => [...xs, ...f])}
        onLargePasteUndo={(_, file) => setFiles((xs) => xs.filter((x) => x !== file))}
      >
        <PromptInputAttachments>
          {files.map((f, i) => (
            <span key={i} className="inline-flex h-7 items-center gap-1.5 rounded-control border border-border bg-subtle pl-2 pr-1 text-xs">
              <RiFileTextLine className="size-3.5" />
              {f.name} · {(f.size / 1024).toFixed(1)} KB
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((xs) => xs.filter((x) => x !== f))} className="inline-flex size-5 items-center justify-center rounded-xs hover:bg-accent">
                <RiCloseLine className="size-3.5" />
              </button>
            </span>
          ))}
        </PromptInputAttachments>
        <PromptInputTextarea placeholder="Paste something long…" />
        <PromptInputToolbar>
          <PromptInputTools />
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    </>
  );
}
```
