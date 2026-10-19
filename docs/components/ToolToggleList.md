# ToolToggleList

> Tool list with per-tool switches, filters, bulk actions, policy locks and a sticky unsaved-changes footer.

- Import: `import { ToolToggleList } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/tool-toggles` (kit `agent-admin`)
- `data-slot`: `tool-toggle-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tools` (required) | `ToolToggleItem[]` |  | The tools to list, each with its saved enabled state. |
| `defaultShowDeprecated` | `boolean` | `false` | Initial "Show deprecated" state when `showDeprecated` is not controlled. |
| `emptyState` | `React.ReactNode` | `"No tools match"` | Shown when no tool matches the search or filters. Default "No tools match". |
| `hideToolbar` | `boolean` |  | Hide the search + filter toolbar. |
| `label` | `string` | `"Tools"` | Accessible name of the list. Default "Tools". |
| `maxHeight` | `number \| string` |  | Max height of the scrolling list (keeps long lists cheap to lay out). |
| `onDiscard` | `() => void` |  | Called when the user discards the draft changes; the Discard button is hidden when unset. |
| `onDraftChange` | `(enabled: Record<string, boolean>, changed: string[]) => void` |  | Fires on every draft change. |
| `onSave` | `(enabled: Record<string, boolean>, changed: string[]) => void \| Promise<void>` |  | Called with the full enabled map and the ids that changed. May return a promise. |
| `onShowDeprecatedChange` | `(show: boolean) => void` |  | Called with the new state when the user flips the "Show deprecated" switch. |
| `showDeprecated` | `boolean` |  | Controlled "Show deprecated" state; deprecated tools are hidden when false. |

## Example (live: `#/components/capabilities/tool-toggle-list` in the playground)

```tsx
import * as React from "react";
import { ToolToggleList } from "@sutra/ui/agent-admin";

function ToolListDemo() {
  const [tools, setTools] = React.useState(TOOLS);
  const [saved, setSaved] = React.useState<string | null>(null);
  return (
    <div className="w-full max-w-3xl space-y-2">
      <ToolToggleList
        tools={tools}
        maxHeight={420}
        onSave={async (map, changed) => {
          await wait(600);
          setTools((all) => all.map((t) => ({ ...t, enabled: map[t.id] ?? t.enabled })));
          setSaved(`Saved ${changed.length} change${changed.length === 1 ? "" : "s"}: ${changed.join(", ")}`);
        }}
      />
      {saved && <p className="text-xs text-muted-foreground">{saved}</p>}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): TOOLS, wait.
