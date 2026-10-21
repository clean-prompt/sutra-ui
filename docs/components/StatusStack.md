# StatusStack

> Stack of status rows above a composer; collapsed it shows the top row plus "+N more".

- Import: `import { StatusStack } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/status-stack` (kit `agent-admin`)
- Parts: [`StatusStackRow`](StatusStackRow.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `collapsed` | `boolean` |  | Controlled collapsed state; collapsed shows only the top row. |
| `defaultCollapsed` | `boolean` | `true` | Initial collapsed state when `collapsed` is not controlled. |
| `label` | `string` | `"Session status"` | Accessible name. Default "Session status". |
| `onCollapsedChange` | `(collapsed: boolean) => void` |  | Called with the new state when the user expands or collapses the stack. |

## Part props

### StatusStackRow

Generic status row: glyph, label, "·"-separated facts, title, actions and an optional progress bar.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `React.ReactNode` |  | Bold kind label, e.g. "Goal". |
| `actions` | `React.ReactNode` |  | Buttons on the right. |
| `dismissLabel` | `string` |  | Accessible name of the dismiss button. |
| `icon` | `React.ReactNode` |  | Leading glyph (decorative). |
| `meta` | `React.ReactNode[]` |  | Short facts joined with "·". |
| `onDismiss` | `() => void` |  | Shows a dismiss button. Inside a `StatusStack` the row is also removed from the stack. |
| `priority` | `number` |  | Higher rows sort first inside a `StatusStack`. Default 0. |
| `progress` | `{ value: number; max: number; label: string }` |  | Thin bar under the row. |
| `title` | `React.ReactNode` |  | Trailing, truncated description. |
| `tone` | `StatusStackTone` |  | Colour of the row and its progress bar (a `Tone`); the specialised rows pick one from their state when omitted. |

## Example (live: `#/components/automation/status-stack` in the playground)

```tsx
import * as React from "react";
import {
  GoalStatusRow,
  HeartbeatStatusRow,
  LoopStatusRow,
  StatusStack,
} from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiSendPlane2Line } from "@cleanprompt/sutra-ui/icons";

function StatusStackDemo() {
  const [goal, setGoal] = React.useState({ turns: 3, paused: false, visible: true });
  const [loop, setLoop] = React.useState({ runs: 2, nextDueAt: Date.now() + 44 * MIN + 12_000, visible: true });
  const [beat, setBeat] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setBeat(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      <StatusStack className="rounded-b-none border-b-0">
        {goal.visible ? (
          <GoalStatusRow
            key="goal"
            priority={2}
            title="Ship the automation set and write release notes"
            turns={goal.turns}
            maxTurns={20}
            paused={goal.paused}
            onPause={() => setGoal((g) => ({ ...g, paused: true }))}
            onResume={() => setGoal((g) => ({ ...g, paused: false, turns: g.turns + 1 }))}
            onClear={() => setGoal((g) => ({ ...g, visible: false }))}
          />
        ) : null}
        {loop.visible ? (
          <LoopStatusRow
            key="loop"
            priority={1}
            every="45m"
            runs={loop.runs}
            nextDueAt={loop.nextDueAt}
            onRunNow={() => setLoop((l) => ({ ...l, runs: l.runs + 1, nextDueAt: Date.now() + 45 * MIN }))}
            onStop={() => setLoop((l) => ({ ...l, visible: false }))}
          />
        ) : null}
        <HeartbeatStatusRow key="hb" lastBeatAt={beat} intervalMs={15_000} onDismiss={() => {}} />
      </StatusStack>
      <div className="flex min-h-24 flex-col justify-between rounded-b-box border border-border bg-background p-3 shadow-xs">
        <p className="text-sm text-muted-foreground">Ask the agent anything…</p>
        <div className="flex justify-end">
          <Button size="icon-sm" aria-label="Send">
            <RiSendPlane2Line />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): MIN.
