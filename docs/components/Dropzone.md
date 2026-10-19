# Dropzone

> Drag-and-drop file area that also opens the file picker on click, Enter or Space.

- Import: `import { Dropzone } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/dropzone` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accept` | `string` |  | Accepted types, as for `<input accept>`: extensions (".pdf") and/or MIME types ("image/*"), comma separated. Others are rejected. |
| `compact` | `boolean` |  | **Deprecated.** Use `density="compact"`. Legacy form of `density="compact"`. |
| `currentCount` | `number` | `0` | Files already selected elsewhere, counted against `maxFiles`. |
| `density` | `Density` |  | `compact` is a single-row layout for tight spaces. Default `normal`. |
| `directory` | `boolean` | `false` | Upload whole folders: clicking opens a folder picker (`webkitdirectory`) and dropped folders are walked recursively. Every file is validated on its own and carries its `relativePath` (see `getFileRelativePath`). Where the browser can't pick folders, clicking falls back to the file picker and the hint says why. |
| `disabled` | `boolean` | `false` | Disables dropping and picking. |
| `hint` | `React.ReactNode` |  | Defaults to a description of `accept` / `maxSize`. |
| `icon` | `React.ReactNode` |  | Icon above the title. Defaults to an upload icon. |
| `inputRef` | `React.Ref<HTMLInputElement>` |  | Ref to the hidden `<input type="file">`, e.g. to open the picker from your own button. |
| `maxFiles` | `number` |  | Most files accepted per drop or pick (counted with `currentCount`); extra files are rejected. |
| `maxSize` | `number` |  | Largest accepted file in bytes; larger files are rejected. |
| `multiple` | `boolean` | `true` | Accept more than one file per drop or pick. |
| `name` | `string` |  | Name for the underlying file input. |
| `onDrop` | `(files: File[], rejections: FileRejection[]) => void` |  | Called with accepted files and rejections after a drop or pick. |
| `title` | `React.ReactNode` |  | Headline of the drop target. Defaults to a prompt to drop or choose files. |

## Notes

**When to use:** A drag-and-drop area that also opens the file picker on click, Enter or Space. It checks type, size and count and calls `onDrop(accepted, rejections)`; with `directory` it takes whole folders. It only collects files: you upload them.

**Use instead when:**
- `FileUpload`: a compound uploader that owns the file list and validation (put FileUploadDropzone in it)
- `FileUploadTrigger`: a button that opens the picker, with no drop area
- `Input`: a plain form field

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the zone (one tab stop; a `disabled` zone is skipped) |
| Enter, Space | Open the file picker (a folder picker with `directory`) |

Only a key pressed on the zone itself counts: keys from a `children` control inside it do not open the picker. There are no arrow keys, so RTL changes nothing. Dragging has no keyboard path; the picker is the keyboard way to add files.

### Screen readers

- The zone is a `div role="button"` named by its visible prompt ("Click to upload or drag and drop") or by `aria-label` if you pass one. The hint (for example "Images, PDF · up to 10 MB") is added to `aria-describedby` next to any `aria-describedby` you pass. `disabled` sets `aria-disabled`.
- The real `<input type="file">` is a sibling that is `aria-hidden`, off the tab order and visually hidden, so it is never a second control; `name` and `inputRef` go to it.
- While a dropped folder is being read the zone has `aria-busy`. During a drag the prompt text is swapped for "Drop to upload" or "Some files aren't supported"; that swap is not a live region.
- Rejections are reported only through `onDrop`: nothing is announced for you, so show the messages (each rejection carries `errors[].message`) in your own status or list.
- Where `directory` cannot work, the reason ("This browser can't choose folders. Choose files instead.") is shown and added to the description.

### Reduced motion

The icon lifts and the border, background and ring change with transitions on drag, which the reduced-motion net ends in 1 ms. Nothing loops.

### Server rendering

Server render: part of it fills in after mount. Without `directory` the zone renders the same on both sides. With `directory` the server (and the hydration pass) assumes folders are unsupported, so the HTML says "Click to upload" and shows the "can't choose folders" reason; after hydration a supporting browser switches to "Click to choose a folder" and drops the reason.

### Gotchas

- `onDrop` is `(accepted, rejections)` and runs for every drop or pick, also when everything was rejected or `accepted` is empty. A rejection is `{ file, errors: [{ code, message }] }` with codes `file-invalid-type`, `file-too-large` and `too-many-files`. It does not run while `disabled`.
- The red drag state only reflects what the browser reveals mid-drag: MIME types (and `multiple={false}` with several files). Extension rules such as `accept=".pdf"` and `maxSize` are checked at drop. `multiple={false}` keeps the first file and rejects the rest.
- `currentCount` counts files you already hold against `maxFiles`. The picker input is cleared after each pick, so the same file can be chosen again.
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
