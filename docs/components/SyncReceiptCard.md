# SyncReceiptCard

> Post-sync summary: updated, failed rebuilds, disabled by dependency conflict and available updates.

- Import: `import { SyncReceiptCard } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/extensions-catalog` (kit `agent-admin`)
- `data-slot`: `sync-receipt-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `availableUpdates` | `SyncReceiptUpdated[]` | `[]` | Items with updates still available after the sync. |
| `disabled` | `SyncReceiptIssue[]` | `[]` | Items disabled by a dependency conflict, each with the reason. |
| `failed` | `SyncReceiptIssue[]` | `[]` | Items that failed to sync, each with the reason. |
| `onRetry` | `() => void` |  | Called when the user presses Retry on the failures; the button is hidden when unset. |
| `onUpdateAll` | `() => void` |  | Called when the user presses Update all for `availableUpdates`; the button is hidden when unset. |
| `syncedAt` | `string` |  | Preformatted time of the sync. |
| `title` | `React.ReactNode` | `"Sync complete"` | Heading of the receipt; defaults to a generic "Sync complete" style title. |
| `updated` | `SyncReceiptUpdated[]` | `[]` | Items that were updated by the sync, with old and new versions. |

## Example (live: `#/components/capabilities/sync-receipt` in the playground)

```tsx
import { SyncReceiptCard } from "@sutra/ui/agent-admin";

<SyncReceiptCard
  syncedAt="just now"
  updated={[
    { name: "web-search", from: "1.0.2", to: "1.1.0" },
    { name: "daily-standup", from: "2.0.0", to: "2.0.1" },
  ]}
  failed={[{ name: "pdf-tables", reason: "camelot wheel failed to build (ghostscript missing)" }]}
  disabled={[{ name: "ocr", reason: "requires numpy<2, found 2.1.0" }]}
  availableUpdates={[{ name: "kanban-board", to: "0.5.0" }]}
  onRetry={() => {}}
  onUpdateAll={() => {}}
/>
<SyncReceiptCard title="Nightly sync" syncedAt="03:00" />
```
