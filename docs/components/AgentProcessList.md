# AgentProcessList

> Running agent sessions and the processes each one started, separated by rules; "Quit Session…" confirms first. A session that starts waiting for the user is announced once (politely); durations never sit in a live region.

- Import: `import { AgentProcessList } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-processes` (kit `agent`)
- `data-slot`: `agent-process-list-skeleton`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sessions` (required) | `AgentProcessSession[]` |  | Sessions to list, one card each. |
| `accent` | `Accent` | `"violet"` | Default violet. |
| `collapsible` | `boolean` |  | Lets the process list collapse behind the "Started · N" toggle. |
| `defaultExpanded` | `string[]` |  | Initially expanded session ids when `expanded` is not controlled. |
| `emptyState` | `React.ReactNode` | `"No agent sessions"` | Shown when there are no sessions. |
| `expanded` | `string[]` |  | Ids of the sessions whose process list is open (with `collapsible`). Default: all. |
| `label` | `string` | `"Agent sessions"` | Accessible name of the list. Default "Agent sessions". |
| `loading` | `boolean` |  | Waiting for sessions: with none yet, `loadingRows` placeholder sessions stand in; sessions without `processes` show placeholder rows. |
| `loadingRows` | `number` | `3` | Placeholder sessions while loading with none. Default 3. |
| `now` | `TimeInput` |  | Reference time for durations. Default: the clock, refreshed every 30 s. |
| `onExpandedChange` | `(expanded: string[]) => void` |  | Called with the expanded session ids when the user expands or collapses a card. |
| `onOpen` | `(sessionId: string) => void` |  | Makes the title a button. |
| `onQuit` | `(sessionId: string) => void \| Promise<void>` |  | Called after the "Quit Session…" confirmation. May return a promise (the dialog waits). |
| `onStopProcess` | `(sessionId: string, process: AgentProcess) => void` |  | Adds a stop button to each process row. |

## Example (live: `#/components/system/loading` in the playground)

```tsx
import { AgentProcessList } from "@sutra/ui/agent";
import { QuotaStrip } from "@sutra/ui/ai";
import { ProcessTable } from "@sutra/ui/ops";
import {
  ContainerSummary,
  DevServerList,
  MetricReadout,
  MetricReadoutGroup,
  VolumeMixer,
} from "@sutra/ui/system";

<div className="grid w-full grid-cols-1 gap-4">
  <MetricReadoutGroup label="Menu bar (loading)" className="w-fit rounded-control border border-border bg-card px-3 py-1.5">
    <MetricReadout label="CPU" value={null} unit="%" loading />
    <MetricReadout label="MEM" value={null} unit="%" loading />
    <MetricReadout label="GPU" value={null} unit="%" loading />
  </MetricReadoutGroup>
  <QuotaStrip quotas={[]} loading />
  <VolumeMixer apps={[]} loading />
  <DevServerList projects={[]} loading />
  <ContainerSummary containers={[]} loading />
  <AgentProcessList sessions={[]} loading loadingRows={1} />
  <ProcessTable processes={[]} loading loadingRows={4} />
</div>
```
