# RewindButton

> Message-action icon button that opens a `RewindDialog`.

- Import: `import { RewindButton } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/rewind` (kit `agent`)
- `data-slot`: `rewind-button`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `message` (required) | `React.ReactNode` |  | Preview of the target message. |
| `buttonClassName` | `string` |  | Extra classes for the trigger button; `className` goes to the dialog. |
| `className` | `string` |  | Extra classes for the dialog content. |
| `confirmLabel` | `React.ReactNode` |  | Label of the confirm button. Default "Rewind". |
| `defaultOpen` | `boolean` |  | Initial open state when `open` is not controlled. |
| `defaultScope` | `string` |  | Initially selected scope when `scope` is not controlled; defaults to the first enabled one. |
| `disabled` | `boolean` |  | Disables the trigger button. |
| `files` | `RewindFileChange[]` |  | Files that would be restored. |
| `fork` | `boolean` |  | Show the fork notice when the conversation is rewound. Default true. |
| `forkNotice` | `React.ReactNode` |  | Text of the fork notice; shown when `fork` is true. |
| `label` | `string` | `"Rewind to here"` | Accessible label and tooltip. Default "Rewind to here". |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onRewind` | `(request: RewindRequest) => void \| Promise<void>` |  | Called with the chosen scope when the user confirms; may return a promise, and the dialog waits for it. |
| `onScopeChange` | `(scope: string) => void` |  | Called with the scope value when the user picks another one. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `scope` | `string` |  | Controlled value of the selected scope. |
| `scopes` | `RewindScopeOption[]` |  | What can be rewound (conversation, files or both); defaults to the built-in options. Disabled options cannot be chosen. |
| `timestamp` | `TimeInput` |  | When the target message was sent. |
| `title` | `React.ReactNode` |  | Dialog heading. |

## Example (live: `#/components/agent-permissions/rewind` in the playground)

```tsx
import * as React from "react";
import { CheckpointMarker, RewindButton, RewindDialog } from "@sutra/ui/agent";

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
