# StatusStrip

> Live infrastructure status above the composer: model warm-up, queue position, retry / rate-limit countdown, offline and errors. Live region: `role="status"` (polite); ticking clocks and countdowns are hidden from screen readers so only state changes are announced.

- Import: `import { StatusStrip } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/status-strip` (kit `ai`)
- `data-slot`: `status-line`, `status-progress`
- Also accepts the props of HTMLAttributes

This covers the platform, not the agent: for what the agent itself is doing (thinking, running a tool, waiting for permission) use `AgentStatusLine`, which sits in the same slot. Show one at a time.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `StatusStripStatus \| null \| undefined` |  | What to announce (cold start, retry countdown, error and so on, by `kind`); the strip renders nothing for `null` or `undefined`. |
| `onCancel` | `() => void` |  | Called when the user presses Cancel; the button is hidden when unset. |
| `onRetry` | `() => void` |  | Called when the user presses Retry now; the button is hidden when unset. |
| `tone` | `ToneInput` |  | Override the tone derived from the status kind. |

## Example (live: `#/components/ai-extras/status-strip` in the playground)

```tsx
import * as React from "react";
import { StatusStrip } from "@cleanprompt/sutra-ui/ai";
import { Button } from "@cleanprompt/sutra-ui/core";

function StatusStripDemo() {
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [retryKey, setRetryKey] = React.useState(0);
  const statuses: Array<[string, StatusStripStatus]> = [
    ["Waking (ticking ETA)", { kind: "waking", estimate: 20, startedAt }],
    ["Cold start with model", { kind: "cold-start", model: "llama-3.1-8b", estimate: 40, elapsed: 12 }],
    ["Queued", { kind: "queued", position: 2, model: "qwen3-8b", message: "One request ahead of you" }],
    ["Retrying (countdown)", { kind: "retrying", retryIn: 7, attempt: 2, maxAttempts: 5, message: "The model is at capacity" }],
    ["Rate limited", { kind: "rate-limited", retryIn: 42, message: "20 requests per minute on this key" }],
    ["Offline", { kind: "offline" }],
  ];
  return (
    <>
      {statuses.map(([label, s]) => (
        <div key={`${label}-${retryKey}`} className="space-y-1">
          {/* {label} */}
          <StatusStrip status={s} onCancel={() => {}} onRetry={s.kind === "retrying" || s.kind === "offline" ? () => setRetryKey((k) => k + 1) : undefined} />
        </div>
      ))}
      <div>
        <Button size="xs" variant="outline" onClick={() => setStartedAt(Date.now())}>
          Restart timers
        </Button>
      </div>
    </>
  );
}
```
