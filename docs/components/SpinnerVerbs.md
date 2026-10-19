# SpinnerVerbs

> Loader that rotates through whimsical verbs with a shimmer, elapsed time and token count.

**Deprecated:** Use `<AgentStatusLine state="thinking" verbs={…} layout="inline" tokensPrefix="↓" />`; this is now a preset of it.

- Import: `import { SpinnerVerbs } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `hint` | `React.ReactNode` |  | Optional hint after the stats, e.g. "esc to interrupt". |
| `icon` | `React.ReactNode` |  | Replaces the default spinner glyph. |
| `interval` | `number` | `3000` | Ms between verbs. Default 3000. |
| `label` | `string` | `"Working"` | Accessible status label. Default "Working". |
| `order` | `"random" \| "sequential"` | `"random"` | Default "random". |
| `startedAt` | `TimeInput` |  | Shows elapsed time when set. |
| `tokens` | `number` |  | Token count shown beside the elapsed time. |
| `verbs` | `string[]` | `defaultSpinnerVerbs` | Words cycled while working (for example "Pondering"); defaults to a built-in list. |

## Example (live: `#/components/agent-sessions/spinner-verbs` in the playground)

```tsx
import * as React from "react";
import { SpinnerVerbs } from "@sutra/ui/agent";

function SpinnerVerbsDemo() {
  const [start] = React.useState(() => Date.now());
  const [tokens, setTokens] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTokens((t) => t + 137), 700);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <SpinnerVerbs startedAt={start} tokens={tokens} hint="esc to interrupt" />
      <SpinnerVerbs verbs={["Indexing", "Embedding", "Ranking"]} order="sequential" interval={1500} />
    </>
  );
}
```
