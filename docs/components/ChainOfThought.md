# ChainOfThought

> Collapsible reasoning panel with a "Thinking… / Thought for Ns" header.

- Import: `import { ChainOfThought } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chain-of-thought` (kit `ai`)
- `data-slot`: `thinking-elapsed`, `thinking-tokens`, `thinking-summary`
- Parts: [`ChainOfThoughtContent`](ChainOfThoughtContent.md), [`ChainOfThoughtSearchResult`](ChainOfThoughtSearchResult.md), [`ChainOfThoughtSearchResults`](ChainOfThoughtSearchResults.md), [`ChainOfThoughtStep`](ChainOfThoughtStep.md)
- Also accepts the props of HTMLAttributes, CollapsibleProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoCollapse` | `boolean` | `true` | Open while streaming and collapse when done (default true, uncontrolled only). |
| `duration` | `number` |  | Seconds spent thinking. Measured automatically from `streaming` when omitted. |
| `icon` | `React.ReactNode` |  | Replaces the default header icon. |
| `streaming` | `boolean` | `false` | While true the header shimmers "Thinking…" and the elapsed time is measured. |
| `summary` | `React.ReactNode` |  | Faint one-line summary shown under the header while collapsed. |
| `title` | `React.ReactNode` |  | Custom header text (overrides "Thinking…" / "Thought for 12s"). |
| `tokenCount` | `number` |  | Live reasoning token count, shown as "1.2k tokens". |

## Part props

### ChainOfThoughtSearchResult

Small source chip with favicon.

| Prop | Type | Default | Description |
|---|---|---|---|
| `href` (required) | `string` |  | Address of the source; unsafe schemes are not linked. |
| `favicon` | `string` |  | Icon URL; falls back to the FaviconProvider or a local monogram. |
| `title` | `string` |  | Text in the chip; defaults to the domain. |

### ChainOfThoughtSearchResults

Wrapping row of source chips under a search step.

| Prop | Type | Default | Description |
|---|---|---|---|
| `results` | `{ href: string; title?: string; favicon?: string }[]` |  | Data-driven chips; alternatively pass ChainOfThoughtSearchResult children. |

### ChainOfThoughtStep

One step on the reasoning timeline. Children render under the label (e.g. search results).

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
} from "@cleanprompt/sutra-ui/ai";
import { Button } from "@cleanprompt/sutra-ui/core";

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
