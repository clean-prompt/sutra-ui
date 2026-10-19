# SaveStatus

> Autosave indicator: saved (with relative time), unsaved, saving, error with retry, conflict with actions.

- Import: `import { SaveStatus } from "@sutra/ui"` (or from `@sutra/ui/editor`)
- Source: `packages/ui/src/kits/editor/editor-status` (kit `editor`)
- `data-slot`: `save-status`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `SaveState` |  | Save state (`saved`, `dirty`, `saving`, `error` or `conflict`); sets the icon, label and tone. |
| `error` | `React.ReactNode` |  | Error detail shown in the tooltip. |
| `labels` | `Partial<Record<SaveState, string>>` |  | Override the default labels. |
| `now` | `Date \| number` |  | Reference time (tests / SSR); disables the refresh timer. |
| `onKeepMine` | `() => void` |  | Conflict: overwrite the server copy with this one. |
| `onLoadTheirs` | `() => void` |  | Conflict: load the other copy. |
| `onResolve` | `() => void` |  | Conflict: open a resolver (e.g. `ConflictResolver`). |
| `onRetry` | `() => void` |  | Shows a Retry button in the error state. |
| `savedAt` | `Date \| number \| string` |  | Last successful save; renders "Saved 2m ago" (refreshed every 30 s). |
| `size` | `"sm" \| "md"` | `"sm"` | Text and icon size. |

## Example (live: `#/components/editor/save-status` in the playground)

```tsx
import { SaveStatus } from "@sutra/ui/editor";

function SaveStatusDemo() {
  const now = Date.now();
  return (
    <div className="flex flex-col items-start gap-3">
      <SaveStatus status="saved" savedAt={now - 2 * 60_000} />
      <SaveStatus status="dirty" />
      <SaveStatus status="saving" />
      <SaveStatus status="error" error="Network unreachable" onRetry={() => {}} />
      <SaveStatus status="conflict" onKeepMine={() => {}} onLoadTheirs={() => {}} onResolve={() => {}} />
    </div>
  );
}
```
