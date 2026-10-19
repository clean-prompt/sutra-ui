# SubagentTree

> Nested delegation tree with rails, live activity, rollups, heat, sort / filter, steering and WAI-ARIA keyboard navigation.

- Import: `import { SubagentTree } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/subagents` (kit `agent-admin`)
- `data-slot`: `subagent-activity`, `subagent-tree`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` (required) | `SubagentNode[]` |  | Root subagents, each with its children, status, elapsed time and cost. |
| `defaultExpanded` | `string[]` |  | Initially expanded node ids when `expanded` is not controlled. |
| `defaultRunningOnly` | `boolean` | `false` | Initial filter state when `runningOnly` is not controlled. |
| `defaultSort` | `SubagentSort` | `"none"` | Initial sort order when `sort` is not controlled. |
| `expanded` | `string[]` |  | Expanded node ids. Default: every node with children. |
| `hideToolbar` | `boolean` |  | Hide sort / filter controls. |
| `label` | `string` | `"Subagents"` | Accessible name of the tree. Default "Subagents". |
| `now` | `number` |  | Reference time for elapsed. When omitted the tree ticks every second while anything runs. |
| `onExpandedChange` | `(ids: string[]) => void` |  | Called with the expanded node ids when the user expands or collapses a node. |
| `onOpen` | `(id: string) => void` |  | Opens the subagent's transcript (Enter on a node without children, or the open button). |
| `onRunningOnlyChange` | `(on: boolean) => void` |  | Called with the new state when the user flips the filter. |
| `onSortChange` | `(sort: SubagentSort) => void` |  | Called with the sort order when the user changes it. |
| `onSteer` | `(id: string, text: string) => void` |  | Sends steering text into a running subagent. Shows a Steer button on running nodes. |
| `onStop` | `(id: string) => void` |  | Stops a running subagent. |
| `runningOnly` | `boolean` |  | Controlled "running only" filter; hides finished subagents when true. |
| `sort` | `SubagentSort` |  | Controlled sort order of siblings: `none`, `status`, `elapsed` or `cost`. |

## Example (live: `#/components/channels/subagent-tree` in the playground)

```tsx
import * as React from "react";
import { RunTicker, SubagentTree } from "@sutra/ui/agent-admin";

function SubagentsDemo() {
  const { tree, activities } = useSimulatedRun();
  const [log, setLog] = React.useState<string[]>([]);
  return (
    <div className="flex w-full flex-col gap-4">
      <RunTicker activities={activities} label="Implementer" />
      <SubagentTree
        nodes={tree}
        onSteer={(id, text) => setLog((l) => [`→ ${id}: ${text}`, ...l].slice(0, 4))}
        onStop={(id) => setLog((l) => [`■ stop ${id}`, ...l].slice(0, 4))}
        onOpen={(id) => setLog((l) => [`open ${id}`, ...l].slice(0, 4))}
      />
      {log.length > 0 && <pre className="rounded-lg bg-muted p-2 font-mono text-xs">{log.join("\n")}</pre>}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): useSimulatedRun.
