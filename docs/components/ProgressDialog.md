# ProgressDialog

> Modal for long-running or streaming operations: phase, progress, live log, cancel/retry, guarded close.

- Import: `import { ProgressDialog } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/progress-dialog` (kit `ops`)
- `data-slot`: `progress-dialog`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Dialog heading. |
| `children` | `React.ReactNode` |  | Content shown before start (e.g. a target selector). Visible only while idle. |
| `className` | `string` |  | Extra classes for the dialog content. |
| `confirmClose` | `boolean` | `true` | Ask before closing while running. Default true. |
| `confirmDescription` | `React.ReactNode` | `"It is still running. Closing will cancel it."` | Text of the confirm-close dialog. |
| `confirmTitle` | `React.ReactNode` | `"Stop this operation?"` | Heading of the confirm-close dialog. Default "Stop this operation?". |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `error` | `React.ReactNode` |  | Failure message shown when the state is `failed`. |
| `logHeight` | `number \| string` | `200` | Height of the log panel; a number is px. Default 200. |
| `logs` | `readonly LogLine[]` |  | Streamed log lines; shows an embedded LogViewer. |
| `onCancel` | `() => void` |  | Called when the user stops the running operation (after confirmation); the Cancel button is hidden when unset. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onRetry` | `() => void` |  | Called when the user presses Retry after a failure; the button is hidden when unset. |
| `onStart` | `() => void` |  | Shows a Start button while idle. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `phase` | `React.ReactNode` |  | Current phase, e.g. "Downloading…". |
| `progress` | `number \| null` |  | 0–100, or `null` for indeterminate. |
| `showLogs` | `boolean` |  | Show the log panel (defaults to true when logs exist). |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Dialog width: `sm`, `md`, `lg` or `xl`. Default "md". |
| `startDisabled` | `boolean` |  | Disables the start button, for example until a required choice is made. |
| `startLabel` | `React.ReactNode` | `"Start"` | Label of the start button. Default "Start". |
| `state` | `StreamingTaskState \| TaskStatusInput` |  | Lifecycle state. Accepts canonical `TaskStatus` spellings too ("pending" = idle, "cancelled", "done", "error"…). |
| `successMessage` | `React.ReactNode` |  | Shown when succeeded. |
| `task` | `UseStreamingTaskResult` |  | Pull state, progress, phase, logs, error, cancel and retry from `useStreamingTask`. Explicit props win. |

## Example (live: `#/components/ops/progress-dialog` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { SimpleSelect } from "@sutra/ui/forms";
import { RiDatabase2Line } from "@sutra/ui/icons";
import { ProgressDialog, useStreamingTask } from "@sutra/ui/ops";

function ProgressDialogDemo() {
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState("gpu-node-1");
  const [fail, setFail] = React.useState(false);
  const task = useStreamingTask();
  const start = () => void task.start((signal) => syncDataset(target, fail, signal));
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        leadingIcon={<RiDatabase2Line />}
        onClick={() => {
          task.reset();
          setFail(false);
          setOpen(true);
        }}
      >
        Sync dataset
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          task.reset();
          setFail(true);
          setOpen(true);
        }}
      >
        Sync (fails midway)
      </Button>
      <ProgressDialog
        open={open}
        onOpenChange={setOpen}
        title="Sync imagenet-mini"
        description="Copies the dataset to the selected node."
        task={task}
        onStart={start}
        startLabel="Start sync"
        successMessage="48 files synced and verified."
        size="lg"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Target node</p>
          <SimpleSelect
            aria-label="Target node"
            value={target}
            onValueChange={setTarget}
            options={["gpu-node-1", "gpu-node-2", "cpu-pool"].map((v) => ({ value: v, label: v }))}
          />
        </div>
      </ProgressDialog>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): syncDataset.
