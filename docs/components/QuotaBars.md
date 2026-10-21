# QuotaBars

> Compact row of provider icons with thin accent bars, as in a dashboard's Agents tile. Each bar is a meter named after the provider with value text such as "72% left".

- Import: `import { QuotaBars } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/usage-quota` (kit `ai`)
- `data-slot`: `quota-bars`, `quota-bars-skeleton`
- Also accepts the props of HTMLAttributes

The Agents tile is a `StatCard` with this row as its body: ```tsx <StatCard label="Agents" icon={<RiRobot2Line />} accent="violet" href="/agents" caption="Claude · Max 20x · This week" value="72%" unit="left" stats={[{ label: "Resets", value: formatResetsIn(claude.resetsAt) }, { label: "Sessions", value: 2 }, { label: "Tokens today", value: formatTokens(1_780_000) }]}> <QuotaBars quotas={quotas} /> </StatCard> ```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `quotas` (required) | `UsageQuota[]` |  | Quotas to show, one bar each. |
| `loading` | `boolean` |  | Waiting for the quotas: with none yet, `loadingRows` placeholder bars stand in (bars without a reading show an empty track). |
| `loadingRows` | `number` | `3` | Placeholder bars while loading with no quotas. Default 3. |
| `mode` | `UsageQuotaMode` | `"left"` | What each bar shows. Default "left". |

## Example (live: `#/components/system/agents` in the playground)

```tsx
import * as React from "react";
import { AgentProcessList } from "@cleanprompt/sutra-ui/agent";
import { QuotaBars, QuotaStrip } from "@cleanprompt/sutra-ui/ai";

function AgentsDemo() {
  const [sessions, setSessions] = React.useState(initialSessions);
  return (
    <div className="w-full space-y-4">
      <QuotaStrip quotas={quotas} now={NOW} />
      <AgentProcessList
        sessions={sessions}
        now={NOW}
        onQuit={(id) => setSessions((list) => list.filter((s) => s.id !== id))}
        emptyState="No agent sessions running"
      />
      <div className="max-w-sm rounded-box border border-border bg-card p-4">
        <p className="mb-3 text-sm text-muted-foreground">Compact strip for an overview tile</p>
        <QuotaBars quotas={quotas} />
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): NOW, initialSessions, quotas.
