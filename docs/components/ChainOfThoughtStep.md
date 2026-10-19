# ChainOfThoughtStep

> One step on the reasoning timeline. Children render under the label (e.g. search results).

- Import: `import { ChainOfThoughtStep } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/chain-of-thought` (kit `ai`)
- Part of [`ChainOfThought`](ChainOfThought.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `React.ReactNode` |  | Step title, shown on the first line. |
| `description` | `React.ReactNode` |  | Detail under the label. |
| `icon` | `React.ReactNode` |  | Icon in the timeline dot (defaults depend on status). |
| `status` | `ChainOfThoughtStepStatusInput` | `"complete"` | Default "succeeded" (legacy "complete"). |

## Example (live: `#/components/agent-timeline/thinking` in the playground)

```tsx
import * as React from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ThinkingExpandAllProvider,
  ThinkingToggle,
} from "@sutra/ui/ai";
import { Button } from "@sutra/ui/core";

function ThinkingDemo() {
  const [streaming, setStreaming] = React.useState(true);
  const [tokens, setTokens] = React.useState(0);
  React.useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setTokens((t) => t + 137), 300);
    const stop = setTimeout(() => setStreaming(false), 6000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [streaming]);

  return (
    <>
      <ThinkingExpandAllProvider>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Transcript */}
          <div className="flex flex-wrap items-center gap-1">
            <ThinkingToggle />
            <Button
              size="xs"
              variant="secondary"
              disabled={streaming}
              onClick={() => {
                setTokens(0);
                setStreaming(true);
              }}
            >
              Replay
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-xl space-y-4">
          <ChainOfThought duration={8} tokenCount={940} summary="Compared a reducer and two useState calls; picked useState">
            <ChainOfThoughtContent>
              <ChainOfThoughtStep label="Two independent values, so a reducer adds ceremony without benefit." />
              <ChainOfThoughtStep label="useState keeps the hook easy to read." />
            </ChainOfThoughtContent>
          </ChainOfThought>
          <ChainOfThought streaming={streaming} tokenCount={tokens} summary="Traced the off-by-one to the increment guard">
            <ChainOfThoughtContent>
              <ChainOfThoughtStep label="The guard compares c < max - 1, so max is never reached." />
              <ChainOfThoughtStep label="Math.min(max, c + 1) states the intent directly." status={streaming ? "running" : "succeeded"} />
            </ChainOfThoughtContent>
          </ChainOfThought>
        </div>
      </ThinkingExpandAllProvider>
    </>
  );
}
```
