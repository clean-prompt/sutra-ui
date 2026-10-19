# useComposerHistory

> Shell-style prompt history for composers: ↑/↓ recall previous prompts when the caret is at the start / end.

- Import: `import { useComposerHistory } from "@sutra/ui/agent"`
- Source: `packages/ui/src/kits/agent/agent-composer`

## Signature

```ts
useComposerHistory({ value, onValueChange, initialEntries, max }: UseComposerHistoryOptions): ComposerHistory
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `onValueChange` (required) | `(value: string) => void` |  |  |
| `value` (required) | `string` |  |  |
| `initialEntries` | `string[]` |  | Seed entries, oldest first. |
| `max` | `number` | `100` | Keep at most this many entries. Default 100. |

## Example (live: `#/components/agent-composer/composer-history` in the playground)

```tsx
import * as React from "react";
import { ComposerToolbar, useComposerHistory } from "@sutra/ui/agent";
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from "@sutra/ui/ai";

function HistoryDemo() {
  const [value, setValue] = React.useState("");
  const history = useComposerHistory({
    value,
    onValueChange: setValue,
    initialEntries: ["Summarize the open PR", "Why is the build slow?", "/compact"],
  });
  return (
    <>
      <PromptInput className="mx-auto max-w-xl" value={value} onValueChange={setValue} onSubmit={(v) => history.push(v)}>
        <PromptInputTextarea highlight onKeyDown={history.onKeyDown} placeholder="Press ↑ to recall" />
        <ComposerToolbar submit={<PromptInputSubmit />} />
      </PromptInput>
      <p className="text-center text-xs text-muted-foreground">
        {history.entries.length} entries · {history.index === null ? "editing draft" : `showing #${history.index + 1}`}
      </p>
    </>
  );
}
```
