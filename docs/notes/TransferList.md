---
component: TransferList
module: patterns/transfer-list
covers: TransferItem, TransferTray
use: A queue of uploads, downloads and background jobs: each row has a file icon, name, progress bar, bytes, speed, time left and a status, with per-row actions and a summary header ("3 active · 1 failed · 12.4 MB/s"). `TransferTray` is the floating, collapsible version pinned to a corner, and `TransferItem` is one row.
instead: FileUpload = pick and validate files before they upload; Progress = one bar; ProgressDialog = a single blocking task in a modal; ProcessTable = running processes with columns; ChatAttachment = one attachment tile in a conversation; Toaster = short notices
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Through each row's action buttons, then "Clear completed" (and, in the tray, the minimize and close buttons) |
| Enter, Space | Press the focused button: pause, resume, cancel, retry, open, remove, minimize, close |

Rows are not focusable themselves, and there are no arrow keys, so RTL changes nothing. The tray is not modal: it does not trap focus or react to Escape.

## Screen readers
- The list is `role="list"` named by `title` (default "Transfers"); a row's status is spelled out as text ("In progress", "Paused", "Completed", "Failed", "Queued", "Canceled"), so it never depends on colour. Icons are `aria-hidden`; the direction badge is an image named "Upload", "Download", "Move" or "Process".
- A progress bar named "<name> progress" shows for active, paused and queued rows that have progress (indeterminate for an active row of unknown size). The percent, bytes, speed and "15s left" are plain text.
- A failed row with an `error` renders it in a `role="alert"`, so it is announced when it appears. Action buttons are named with the file ("Pause photos.zip", "Retry track.flac").
- The summary line is plain text, not a live region. `TransferTray` is a `region` labelled by its heading ("Uploading 3 items"); its toggle is "Minimize transfers" or "Expand transfers" with `aria-expanded`, and the body is `hidden` while minimized.

## Reduced motion
The component has no motion of its own besides the progress fill's transition, which the global net ends within 1 ms.

## Server rendering
Markup is computed from `items`. Speed and time left use `Date.now()` at render when they come from `startedAt` alone, so the server and client can differ by the time between them; give `speed` or `samples`, or pass `now`, to make it deterministic. The tray is fixed to the viewport unless `inline`.

## Gotchas
- It moves no data and does not tick: you update `items` as bytes arrive and the display follows. Speed comes from `speed`, else the last five seconds of `samples`, else `startedAt` with `bytes`; ETA from the speed and the bytes left. A value derived from `startedAt` changes only when you re-render.
- A button appears only when the status allows it and you passed the handler: Pause (active), Resume (paused), Retry (failed, canceled), Open (completed), Cancel (queued, active, paused), Remove (completed, failed, canceled). List handlers receive the item `id`. "Clear completed" shows with `onClearCompleted` when completed or canceled rows exist (failed ones do not count).
- `status` also accepts `pending`, `running`, `succeeded`, `failed`, `canceled` and "cancelled"; `paused` has no TaskStatus equivalent. `progress` (0 to 100) wins over `bytes` and `total`, and a completed row always reads 100%.
- `TransferTray position` is physical (`bottom-right` or `bottom-left`) and does not mirror in RTL; `inline` renders it in the flow for previews, and `minimized` can be controlled with `onMinimizedChange`.

## Example
```tsx
import { TransferList, type TransferItemData } from "@sutra/ui";

const MB = 1024 * 1024;
const transfers: TransferItemData[] = [
  { id: "1", name: "photos.zip", direction: "upload", status: "active", bytes: 20 * MB, total: 80 * MB, speed: 4 * MB },
  { id: "2", name: "report.pdf", direction: "download", status: "failed", error: "Connection lost" },
  { id: "3", name: "notes.txt", direction: "upload", status: "completed", total: MB },
];

type Props = { onCancel: (id: string) => void; onRetry: (id: string) => void; onClear: () => void };

export function Example({ onCancel, onRetry, onClear }: Props) {
  return <TransferList items={transfers} onCancel={onCancel} onRetry={onRetry} onClearCompleted={onClear} />;
}
```
