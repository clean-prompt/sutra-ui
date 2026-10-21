# AgentRosterRow

> One subagent: status, name, description, live elapsed time, tokens and actions.

- Import: `import { AgentRosterRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-tasks` (kit `agent`)
- `data-slot`: `agent-elapsed`
- Part of [`AgentRoster`](AgentRoster.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `agent` (required) | `AgentRosterAgent` |  | The agent to show (name, status, current activity, start time). |
| `now` | `number` |  | Reference time; the row ticks on its own when omitted. |
| `onOpenTranscript` | `(id: string) => void` |  | Called with the agent id when the user opens its transcript; the button is hidden when unset. |
| `onStop` | `(id: string) => void` |  | Called with the agent id when the user stops a running agent; the button is hidden when unset. |

## Example (live: `#/components/agent-sessions/agent-roster` in the playground)

```tsx
import * as React from "react";
import { AgentRoster, AgentRosterPanel } from "@cleanprompt/sutra-ui/agent";

function RosterDemo() {
  const [start] = React.useState(() => Date.now());
  const [agents, setAgents] = React.useState<AgentRosterAgent[]>([
    { id: "a", name: "Map the auth module", type: "Explore", description: "Find every place that reads the session cookie", status: "running", startedAt: start - 48_000, tokens: 18_200, toolUses: 14 },
    { id: "b", name: "Draft migration", type: "general-purpose", description: "Write the SQL migration for the new sessions table", status: "running", startedAt: start - 95_000, tokens: 9_400, toolUses: 6 },
    { id: "c", name: "Check test coverage", type: "Explore", description: "List untested branches in src/billing", status: "running", startedAt: start - 12_000, tokens: 2_100, toolUses: 3 },
    { id: "d", name: "Lint pass", type: "general-purpose", status: "done", startedAt: start - 300_000, endedAt: start - 240_000, tokens: 4_000, toolUses: 2 },
  ]);
  const [opened, setOpened] = React.useState<string | null>(null);
  const stop = (id: string) =>
    setAgents((list) => list.map((a) => (a.id === id ? { ...a, status: "failed", endedAt: Date.now(), description: "Stopped by user" } : a)));
  return (
    <>
      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-2">
          {/* Pill + popover */}
          <AgentRoster agents={agents} onStop={stop} onOpenTranscript={setOpened} />
        </div>
        <div className="w-full max-w-md space-y-2">
          {/* Inline panel */}
          <div className="rounded-box border border-border bg-card p-1.5">
            <AgentRosterPanel agents={agents} onStop={stop} onOpenTranscript={setOpened} />
          </div>
          {opened && <p className="text-xs text-muted-foreground">Opened transcript: {agents.find((a) => a.id === opened)?.name}</p>}
        </div>
      </div>
    </>
  );
}
```
