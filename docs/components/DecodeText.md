# DecodeText

> Scramble-then-decode text reveal. Exposed as `role="img"` labelled with the final text, so screen readers never hear the scramble; reduced motion shows it instantly.

- Import: `import { DecodeText } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/decode-text` (patterns)
- `data-slot`: `decode-text`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` (required) | `string` |  | Final text. Also the accessible name. |
| `charset` | `string` | `DEFAULT_CHARSET` | Characters used for the scramble. |
| `duration` | `number` | `900` | Total duration, ms. Default 900. |
| `interval` | `number` | `40` | Frame interval, ms. Default 40. |
| `onComplete` | `() => void` |  | Called once when the text has fully resolved. |
| `play` | `number \| boolean` |  | Bump to replay when `trigger="manual"`. |
| `trigger` | `"mount" \| "hover" \| "manual"` | `"mount"` | When to play: on mount, on hover/focus, or only when `play` changes. Default "mount". |

## Example (live: `#/components/chat-extras/decode-text` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { DecodeText } from "@cleanprompt/sutra-ui/motion";

function DecodeTextDemo() {
  const [run, setRun] = React.useState(0);
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <DecodeText text="AGENT ONLINE" className="font-mono text-2xl font-semibold tracking-widest" trigger="manual" play={run} />
        <DecodeText text="Hover to decode me" trigger="hover" className="text-sm text-muted-foreground" />
        <Button size="xs" variant="secondary" onClick={() => setRun((r) => r + 1)}>
          Replay
        </Button>
      </div>
    </>
  );
}
```
