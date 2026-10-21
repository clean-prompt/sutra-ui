# SlotOutlet

> Renders every contribution registered for `name`, in order, each isolated by an error boundary.

- Import: `import { SlotOutlet } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/slot-outlet` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Slot name, e.g. "sidebar.footer". |
| `fallback` | `React.ReactNode` | `null` | Rendered when nothing is registered. |
| `onContributionError` | `(error: Error, contribution: SlotContribution) => void` |  | Called when a contribution throws while rendering. |
| `unwrapped` | `boolean` |  | Render contributions without the wrapper div. |

## Example (live: `#/components/capabilities/slot-outlet` in the playground)

```tsx
import * as React from "react";
import {
  SlotFill,
  SlotOutlet,
  SlotProvider,
  createSlotRegistry,
} from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiTimeLine } from "@cleanprompt/sutra-ui/icons";

function SlotDemo() {
  const [registry] = React.useState(() =>
    createSlotRegistry([
      { id: "kanban.badge", slot: "sidebar.footer", order: 10, source: "Kanban Board", render: <span className="rounded-control bg-primary-soft px-2 py-1 text-xs text-primary-soft-foreground">3 tasks in progress</span> },
      {
        id: "memory-graph.widget",
        slot: "sidebar.footer",
        order: 20,
        source: "Memory Graph",
        render: function MemoryWidget(): React.ReactElement {
          throw new Error("Cannot read properties of undefined (reading 'nodes')");
        },
      },
    ])
  );
  const [pomodoro, setPomodoro] = React.useState(true);
  return (
    <SlotProvider registry={registry}>
      <div className="flex w-full flex-col gap-4 md:flex-row">
        <aside className="flex w-full flex-col justify-between gap-6 rounded-box border border-border bg-subtle p-3 md:w-64">
          <div className="space-y-1 text-sm">
            <p className="font-medium">Sidebar</p>
            <p className="text-muted-foreground">Chats · Tasks · Memory</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-mono text-2xs text-muted-foreground">slot: sidebar.footer</p>
            <SlotOutlet name="sidebar.footer" className="flex flex-col gap-2" fallback={<p className="text-xs text-muted-foreground">No contributions</p>} />
          </div>
        </aside>
        <div className="flex-1 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Kanban registers first (order 10), the Memory Graph widget throws and is isolated, and the Pomodoro <code>SlotFill</code> contributes at order 5 while mounted.
          </p>
          <Button size="sm" variant="outline" onClick={() => setPomodoro((p) => !p)}>
            {pomodoro ? "Unmount Pomodoro fill" : "Mount Pomodoro fill"}
          </Button>
          {pomodoro && (
            <SlotFill slot="sidebar.footer" id="pomodoro.timer" order={5} source="Pomodoro">
              <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-background px-2 py-1 text-xs">
                <RiTimeLine className="size-3.5" /> Focus 18:42
              </span>
            </SlotFill>
          )}
        </div>
      </div>
    </SlotProvider>
  );
}
```
