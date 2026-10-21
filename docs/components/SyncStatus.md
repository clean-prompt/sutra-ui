# SyncStatus

> Local-first sync indicator with a tooltip explaining the state and last sync time.

- Import: `import { SyncStatus } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/suite`)
- Source: `packages/ui/src/kits/workspace/sync-status` (kit `workspace`)
- `data-slot`: `sync-status`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `SyncState` |  | Sync state (`synced`, `syncing`, `offline`, `error` or `conflict`); sets the icon, label and tone. |
| `lastSyncedAt` | `Date \| number` |  | Time of the last successful sync; shown as a relative label. |
| `now` | `Date` |  | Reference time for the relative label. |
| `onResolve` | `() => void` |  | Called on click in the conflict state. |
| `onRetry` | `() => void` |  | Called on click in the error / offline state. |
| `pendingChanges` | `number` | `0` | Local changes waiting to upload. |
| `showLabel` | `boolean` | `true` | Show the text label (otherwise icon only, label in the tooltip). Default true. |

## Example (live: `#/components/suite/sync-status` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { ConflictResolver, OfflineBanner, SyncStatus } from "@cleanprompt/sutra-ui/suite";

function SyncDemo() {
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const states: SyncState[] = ["synced", "syncing", "offline", "error", "conflict"];
  const lastSynced = React.useMemo(() => Date.now() - 4 * 60_000, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {states.map((s) => (
          <SyncStatus
            key={s}
            status={s}
            lastSyncedAt={lastSynced}
            pendingChanges={s === "syncing" || s === "offline" ? 3 : 0}
            onRetry={() => {}}
            onResolve={() => setConflictOpen(true)}
          />
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        {states.map((s) => (
          <SyncStatus key={`icon-${s}`} status={s} showLabel={false} lastSyncedAt={lastSynced} />
        ))}
      </div>
      <OfflineBanner offline pendingChanges={3} onRetry={() => {}} dismissible className="rounded-box border" />
      <Button variant="outline" onClick={() => setConflictOpen(true)}>
        Open conflict resolver
      </Button>
      <ConflictResolver
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        yours={{
          content: "Groceries\n- Milk\n- Eggs\n- Sourdough",
          source: "This Mac",
          updatedAt: Date.now() - 2 * 60_000,
        }}
        theirs={{
          content: "Groceries\n- Milk\n- Oat milk\n- Sourdough",
          source: "iPhone",
          updatedAt: Date.now() - 6 * 60_000,
        }}
        onKeepMine={() => {}}
        onKeepTheirs={() => {}}
        onMerge={() => {}}
      />
    </div>
  );
}
```
