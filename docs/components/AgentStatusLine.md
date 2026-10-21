# AgentStatusLine

> Live agent activity above the composer: what the agent is doing (thinking, running a tool, waiting for permission or an answer) with elapsed time and token count. Renders nothing when idle.

- Import: `import { AgentStatusLine } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-status-line` (kit `agent`)
- `data-slot`: `agent-status-line`, `spinner-verb`, `agent-status-meta`
- Also accepts the props of HTMLAttributes

For infrastructure phases (cold start, queue, retry/rate-limit countdown, offline) use `StatusStrip`, which sits in the same slot. Live region: `role="status"` (polite); the ticking clock, token count and rotating verbs are hidden from screen readers so only state changes are announced.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `AgentStatusState` |  | What the agent is doing: `idle`, `thinking`, `running`, `permission` or `question`; sets the icon, tone and default label. |
| `elapsed` | `number` |  | Controlled elapsed seconds (disables the internal clock). |
| `hint` | `React.ReactNode` |  | Right-side hint, e.g. <Kbd>Esc</Kbd> to interrupt. |
| `icon` | `React.ReactNode` |  | Replaces the per-state icon. |
| `label` | `React.ReactNode` |  | Overrides the default label. With `verbs`, the visible text rotates and this label is what screen readers get instead (default "Thinking…"). |
| `layout` | `"bar" \| "inline"` | `"bar"` | `bar` (default): full-width row, stats after the label and the hint pushed right. `inline`: compact inline loader with "(3s · 1.2k tokens · hint)" after the label. |
| `showElapsed` | `boolean` | `true` | Show the elapsed time. Default true. |
| `startedAt` | `TimeInput` |  | When the current state began (Date, epoch ms or ISO string). Defaults to when `state` / `tool` last changed. |
| `tokenCount` | `number` |  | **Deprecated.** Use `tokens`. Tokens used so far, shown as "1.2k tokens". |
| `tokens` | `number` |  | Tokens used so far, shown as "1.2k tokens". |
| `tokensPrefix` | `string` |  | Text before the token count, e.g. "↓" for streamed output tokens. |
| `tool` | `string` |  | Tool name for the "running" state. |
| `verbInterval` | `number` | `3000` | Ms between verbs. Default 3000. Rotation pauses with reduced motion. |
| `verbOrder` | `"random" \| "sequential"` | `"random"` | Rotation order for `verbs`. Default "random" (never repeats the current verb). |
| `verbs` | `string[]` |  | Words rotated as the visible label while `state` is "thinking" ("Pondering…", "Brewing…"). |

## Example (live: `#/components/agent-timeline/agent-status-line` in the playground)

```tsx
import * as React from "react";
import { AgentStatusLine } from "@sutra/ui/agent";
import { Kbd } from "@sutra/ui/core";
import { SegmentedControl } from "@sutra/ui/forms";

function StatusLineDemo() {
  const [state, setState] = React.useState<AgentStatusState>("thinking");
  return (
    <>
      <SegmentedControl
        size="sm"
        className="max-w-full overflow-x-auto scrollbar-none"
        aria-label="Agent state"
        value={state}
        onValueChange={(v) => v && setState(v as AgentStatusState)}
        options={[
          { value: "thinking", label: "Thinking" },
          { value: "running", label: "Running" },
          { value: "permission", label: "Permission" },
          { value: "question", label: "Question" },
          { value: "idle", label: "Idle" },
        ]}
      />
      <div className="mx-auto w-full max-w-xl rounded-box border border-border bg-card px-3 py-2">
        <AgentStatusLine
          state={state}
          tool="Bash"
          tokens={state === "thinking" ? 3420 : undefined}
          hint={<><Kbd>Esc</Kbd> to interrupt</>}
        />
        {state === "idle" && <p className="px-1 py-1 text-sm text-muted-foreground">Idle renders nothing.</p>}
        <div className="mt-2 h-16 rounded-control border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
          Ask the agent…
        </div>
      </div>
    </>
  );
}
```
