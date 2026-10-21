# CheckpointMarker

> Thin transcript divider ("Checkpoint · 3 files changed") with a rewind action.

- Import: `import { CheckpointMarker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/rewind` (kit `agent`)
- `data-slot`: `checkpoint-rewind`, `checkpoint-marker`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `dialog` | `Omit<RewindDialogProps, "trigger" \| "files">` |  | Wire the action to a `RewindDialog` instead; `files` are passed through. |
| `files` | `RewindFileChange[] \| number` |  | Changed files (count derived) or a plain count. |
| `label` | `React.ReactNode` | `"Checkpoint"` | Default "Checkpoint". |
| `onRewind` | `() => void` |  | Rewind action (button click). |
| `rewindLabel` | `string` | `"Rewind"` | Label of the rewind button. Default "Rewind". |
| `timestamp` | `TimeInput` |  | When the checkpoint was taken, shown beside the label. |

## Example (live: `#/components/agent-permissions/rewind` in the playground)

```tsx
import * as React from "react";
import { CheckpointMarker, RewindButton, RewindDialog } from "@cleanprompt/sutra-ui/agent";

function RewindDemo() {
  const [open, setOpen] = React.useState(false);
  const [log, setLog] = React.useState<string | null>(null);
  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-3 rounded-box border border-border bg-card p-4">
        <div className="group flex items-start gap-2">
          <div className="ml-auto max-w-[80%] rounded-box bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
            Add dark mode to the settings page
          </div>
          <RewindButton
            message="Add dark mode to the settings page"
            timestamp={Date.now() - 1000 * 60 * 18}
            files={changedFiles}
            onRewind={(r) => setLog(`onRewind(${JSON.stringify(r)})`)}
          />
        </div>
        <p className="text-sm text-muted-foreground">Created ThemeProvider, wired it into the app and added an Appearance section.</p>
        <CheckpointMarker files={changedFiles} timestamp={Date.now() - 1000 * 60 * 12} onRewind={() => setOpen(true)} />
        <div className="ml-auto max-w-[80%] rounded-box bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">Also add tests</div>
        <p className="text-sm text-muted-foreground">Added provider and settings tests.</p>
        <CheckpointMarker files={2} dialog={{ message: "Also add tests", onRewind: (r) => setLog(`onRewind(${JSON.stringify(r)})`) }} />
      </div>
      <RewindDialog
        open={open}
        onOpenChange={setOpen}
        message="Add dark mode to the settings page"
        timestamp={Date.now() - 1000 * 60 * 12}
        files={changedFiles}
        onRewind={(r) => setLog(`onRewind(${JSON.stringify(r)})`)}
      />
      {log && <code className="mx-auto rounded-xs bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{log}</code>}
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): changedFiles.
