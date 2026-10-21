# SuggestionDiff

> AI proposal review: word diff of a suggestion with Accept / Discard and per-change accept / reject.

- Import: `import { SuggestionDiff } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/patterns/diff-viewer-suggestion` (patterns)
- `data-slot`: `suggestion-diff`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `original` (required) | `string` |  | Original text. |
| `suggestion` (required) | `string` |  | Suggested replacement text. |
| `acceptLabel` | `string` | `"Accept"` | Text of the accept button. |
| `discardLabel` | `string` | `"Discard"` | Text of the discard button. |
| `granularity` | `"word" \| "char"` | `"word"` | How changes are split: by word or by character. |
| `meta` | `React.ReactNode` |  | e.g. the model name. |
| `onAccept` | `(newText: string) => void` |  | Called with the resulting text (pending changes count as accepted). |
| `onDiscard` | `() => void` |  | Called when the user discards the whole suggestion. |
| `perHunk` | `boolean` | `true` | Per-change accept / reject buttons. Default true. |
| `title` | `React.ReactNode` | `"Suggested edit"` | Header title. Default "Suggested edit". |

## Example (live: `#/components/editor/suggestion-diff` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { SuggestionDiff } from "@sutra/ui/editor";

function SuggestionDemo() {
  const original = "The sync engine batch writes every half second and conflicts is resolved by last writer wins, which loses data sometimes.";
  const proposal = "The sync engine batches writes every 500 ms. Conflicts are resolved with last-writer-wins, which can occasionally lose data.";
  const [result, setResult] = React.useState<string | null>(null);
  const [key, setKey] = React.useState(0);
  return (
    <div className="w-full max-w-2xl space-y-3">
      <SuggestionDiff
        key={key}
        original={original}
        suggestion={proposal}
        meta="Polish · llama-3.1-8b"
        onAccept={setResult}
        onDiscard={() => setResult(original)}
      />
      {result != null && (
        <div className="flex items-start gap-3 rounded-box border border-border bg-subtle p-3 text-sm">
          <p className="flex-1">{result}</p>
          <Button size="xs" variant="ghost" onClick={() => (setResult(null), setKey((k) => k + 1))}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
```
