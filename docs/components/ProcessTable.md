# ProcessTable

> Live process list: sortable columns, totals, animated add/remove, hover-revealed kill control, optional app grouping.

- Import: `import { ProcessTable } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/process-table` (kit `ops`)
- `data-slot`: `process-group-count`, `process-table-skeleton`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `processes` (required) | `ProcessInfo[]` |  | Processes to list, each with a pid, name, CPU, memory and start time. |
| `canKill` | `(process: ProcessInfo) => boolean` |  | Whether a given process can be killed (default all). |
| `canQuitGroup` | `(group: ProcessTableGroup) => boolean` |  | Whether a given group can be quit (default all). |
| `caption` | `string` | `"Processes"` | Accessible table caption. |
| `columns` | `ProcessColumn[]` | `["pid", "name", "user", "cpu", "memory", "vram", "state", "started"]` | Visible columns, in order. |
| `commandMaxLength` | `number` | `60` | Command column truncation in characters for the visible text. Default 60. |
| `defaultExpandedGroups` | `string[]` | `[]` | Initially expanded group keys. Default none. |
| `defaultSort` | `ProcessSort \| null` | `{ key: "cpu", direction: "desc" }` | Initial sort when `sort` is not controlled. |
| `density` | `Density` | `"compact"` | Row density. Default "compact". |
| `emptyState` | `React.ReactNode` | `"No processes"` | Shown when there are no processes. Default "No processes". |
| `exitDuration` | `number` | `250` | Row exit animation duration ms. Default 250. |
| `expandedGroups` | `string[]` |  | Expanded group keys (controlled). |
| `groupBy` | `"app" \| ((process: ProcessInfo) => string \| undefined)` |  | Show apps instead of processes ("Google Chrome · 96 processes"). `"app"` groups by `ProcessInfo.app`, falling back to the process name; a function returns a group key, or `undefined` to leave a process ungrouped. |
| `groupName` | `(key: string, processes: ProcessInfo[]) => string` |  | Display name for a group. Default: its key. |
| `loading` | `boolean` |  | Waiting for the first sample: with no processes the header stays and the body is `loadingRows` placeholder rows (no totals). |
| `loadingRows` | `number` | `5` | Placeholder rows while loading with no processes. Default 5. |
| `maxHeight` | `number \| string` |  | Maximum height of the scrolling body; a number is px. |
| `now` | `number` |  | "now" for the started column. |
| `onExpandedGroupsChange` | `(keys: string[]) => void` |  | Called with the expanded group keys when the user expands or collapses a group. |
| `onKill` | `(process: ProcessInfo, signal: KillSignal) => void \| Promise<unknown>` |  | Enables the kill column. |
| `onQuitGroup` | `(group: ProcessTableGroup, options: ProcessQuitOptions) => void \| Promise<unknown>` |  | Enables Quit… and Force Quit… on group rows; each asks for confirmation first. |
| `onSortChange` | `(sort: ProcessSort \| null) => void` |  | Called with the sort (or `null`) when the user clicks a column header. |
| `pendingPids` | `number[]` |  | PIDs with a kill in flight. |
| `showTotals` | `boolean` | `true` | Shows the totals row with summed CPU and memory. Default true. |
| `sort` | `ProcessSort \| null` |  | Controlled sort column and direction; `null` keeps the given order. |

## Example (live: `#/components/monitoring/process-table` in the playground)

```tsx
import * as React from "react";
import { ProcessTable } from "@sutra/ui/ops";

function ProcessTableDemo() {
  const [procs, setProcs] = React.useState<ProcessInfo[]>(() => Array.from({ length: 8 }, makeProc));
  const [pending, setPending] = React.useState<number[]>([]);
  const [log, setLog] = React.useState<string[]>([]);
  useInterval(() => {
    setProcs((prev) => {
      let next: ProcessInfo[] = prev.map((p) => ({ ...p, cpu: jitter(p.cpu ?? 0, 12), memory: Math.max(MB, (p.memory ?? 0) + (Math.random() - 0.5) * 200 * MB) }));
      if (Math.random() < 0.3 && next.length < 12) next = [...next, makeProc()];
      if (Math.random() < 0.15 && next.length > 5) next = next.filter((_, i) => i !== Math.floor(Math.random() * next.length));
      return next;
    });
  }, 2500);
  const kill = async (p: ProcessInfo, signal: KillSignal) => {
    setPending((s) => [...s, p.pid]);
    await new Promise((r) => setTimeout(r, signal === "SIGKILL" ? 400 : 1200));
    setPending((s) => s.filter((x) => x !== p.pid));
    setProcs((s) => s.filter((x) => x.pid !== p.pid));
    setLog((l) => [`${signal} → ${p.pid} (${p.name})`, ...l].slice(0, 3));
  };
  return (
    <div className="flex w-full flex-col gap-2">
      <ProcessTable processes={procs} onKill={kill} pendingPids={pending} canKill={(p) => p.user !== "root"} maxHeight={420} />
      {log.length ? <p className="font-mono text-xs text-muted-foreground">{log.join("  ·  ")}</p> : null}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): MB, jitter, makeProc, useInterval.
