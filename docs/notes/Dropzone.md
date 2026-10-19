---
component: Dropzone
module: primitives/dropzone
use: A drag-and-drop area that also opens the file picker on click, Enter or Space. It checks type, size and count and calls `onDrop(accepted, rejections)`; with `directory` it takes whole folders. It only collects files: you upload them.
instead: FileUpload = a compound uploader that owns the file list and validation (put FileUploadDropzone in it); FileUploadTrigger = a button that opens the picker, with no drop area; Input = a plain form field
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the zone (one tab stop; a `disabled` zone is skipped) |
| Enter, Space | Open the file picker (a folder picker with `directory`) |

Only a key pressed on the zone itself counts: keys from a `children` control inside it do not open the picker. There are no arrow keys, so RTL changes nothing. Dragging has no keyboard path; the picker is the keyboard way to add files.

## Screen readers
- The zone is a `div role="button"` named by its visible prompt ("Click to upload or drag and drop") or by `aria-label` if you pass one. The hint (for example "Images, PDF · up to 10 MB") is added to `aria-describedby` next to any `aria-describedby` you pass. `disabled` sets `aria-disabled`.
- The real `<input type="file">` is a sibling that is `aria-hidden`, off the tab order and visually hidden, so it is never a second control; `name` and `inputRef` go to it.
- While a dropped folder is being read the zone has `aria-busy`. During a drag the prompt text is swapped for "Drop to upload" or "Some files aren't supported"; that swap is not a live region.
- Rejections are reported only through `onDrop`: nothing is announced for you, so show the messages (each rejection carries `errors[].message`) in your own status or list.
- Where `directory` cannot work, the reason ("This browser can't choose folders. Choose files instead.") is shown and added to the description.

## Reduced motion
The icon lifts and the border, background and ring change with transitions on drag, which the reduced-motion net ends in 1 ms. Nothing loops.

## Server rendering
Without `directory` the zone renders the same on both sides. With `directory` the server (and the hydration pass) assumes folders are unsupported, so the HTML says "Click to upload" and shows the "can't choose folders" reason; after hydration a supporting browser switches to "Click to choose a folder" and drops the reason.

## Gotchas
- `onDrop` is `(accepted, rejections)` and runs for every drop or pick, also when everything was rejected or `accepted` is empty. A rejection is `{ file, errors: [{ code, message }] }` with codes `file-invalid-type`, `file-too-large` and `too-many-files`. It does not run while `disabled`.
- The red drag state only reflects what the browser reveals mid-drag: MIME types (and `multiple={false}` with several files). Extension rules such as `accept=".pdf"` and `maxSize` are checked at drop. `multiple={false}` keeps the first file and rejects the rest.
- `currentCount` counts files you already hold against `maxFiles`. Without `name` the picker input is cleared after each pick, so the same file can be chosen again. With `name` the accepted files stay on the input through `DataTransfer` (picks and drops; a rejected pick is not kept), so a native form post sends them: the earlier ones are kept while `currentCount` is above 0 and the input is emptied when it returns to 0. Where `input.files` cannot be set it is cleared as before.
- `directory` walks dropped folders and sets each file's `relativePath` (read it with `getFileRelativePath`); every file is validated on its own and counts toward `maxFiles`. `compact` is a deprecated alias of `density="compact"`. The helpers `validateFiles`, `isFileAccepted` and `describeFileConstraints` are exported for your own checks.

## Example
```tsx
import * as React from "react";
import { Dropzone } from "@sutra/ui";

export function Example() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState("");
  return (
    <div className="grid max-w-md gap-3">
      <Dropzone
        accept="image/*,.pdf"
        maxSize={5 * 1024 * 1024}
        maxFiles={3}
        currentCount={files.length}
        onDrop={(accepted, rejections) => {
          setFiles((current) => [...current, ...accepted]);
          setError(rejections[0]?.errors[0]?.message ?? "");
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="text-sm text-muted-foreground">
        {files.map((file) => (
          <li key={file.name}>{file.name}</li>
        ))}
      </ul>
    </div>
  );
}
```
