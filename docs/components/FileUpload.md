# FileUpload

> Compound file uploader root: owns file state, validation and the hidden input.

- Import: `import { FileUpload } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/patterns/file-upload` (patterns)
- `data-slot`: `file-upload`
- Parts: [`FileUploadDropzone`](FileUploadDropzone.md), [`FileUploadItem`](FileUploadItem.md), [`FileUploadList`](FileUploadList.md), [`FileUploadTrigger`](FileUploadTrigger.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accept` | `string` |  | Accepted types, as for `<input accept>`: extensions (".pdf") and/or MIME types ("image/*"), comma separated. |
| `defaultFiles` | `UploadFile[]` | `[]` | Initial list of files when uncontrolled. |
| `disabled` | `boolean` | `false` | Disables dropping and picking files. |
| `files` | `UploadFile[]` |  | Controlled list of files. |
| `maxFiles` | `number` |  | Most files accepted in total; extra files are rejected. |
| `maxSize` | `number` |  | Largest accepted file in bytes; larger files are rejected. |
| `multiple` | `boolean` | `true` | Accepts more than one file. |
| `name` | `string` |  | Name of the hidden file input, for native form submission. |
| `onFilesAdded` | `(files: UploadFile[]) => void` |  | Called with newly added files only — a good place to start uploads. |
| `onFilesChange` | `(files: UploadFile[]) => void` |  | Called with the full file list after files are added, removed or updated. |
| `onFilesRejected` | `(rejections: FileRejection[]) => void` |  | Called with the files that failed validation (type, size or count) and the reasons. |
| `showErrors` | `boolean` | `true` | Render validation errors under the children. |

## Part props

### FileUploadDropzone

`Dropzone` wired to the surrounding `FileUpload` state and limits.

| Prop | Type | Default | Description |
|---|---|---|---|
| `compact` | `boolean` |  | **Deprecated.** Use `density="compact"`. Legacy form of `density="compact"`. |
| `density` | `Density` |  | `compact` is a single-row layout for tight spaces. Default `normal`. |
| `directory` | `boolean` |  | Upload whole folders: clicking opens a folder picker (`webkitdirectory`) and dropped folders are walked recursively. Every file is validated on its own and carries its `relativePath` (see `getFileRelativePath`). Where the browser can't pick folders, clicking falls back to the file picker and the hint says why. |
| `disabled` | `boolean` |  | Disables dropping and picking. |
| `hint` | `React.ReactNode` |  | Defaults to a description of `accept` / `maxSize`. |
| `icon` | `React.ReactNode` |  | Icon above the title. Defaults to an upload icon. |
| `inputRef` | `React.Ref<HTMLInputElement>` |  | Ref to the hidden `<input type="file">`, e.g. to open the picker from your own button. |
| `name` | `string` |  | Name for the underlying file input. With it, the accepted files stay on the input so a native form post sends them. |
| `title` | `React.ReactNode` |  | Headline of the drop target. Defaults to a prompt to drop or choose files. |

### FileUploadItem

A single file row: type badge, name, size, progress and status.

| Prop | Type | Default | Description |
|---|---|---|---|
| `file` (required) | `UploadFile` |  | The file to show: its name, size, upload `status`, `progress` and any error. |
| `hideRemove` | `boolean` |  | Hide the remove button. |
| `onRemove` | `(file: UploadFile) => void` |  | Overrides the default remove behaviour (removing from `FileUpload` state). |

### FileUploadTrigger

Button that opens the file picker (or, with `directory`, a folder picker).

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `directory` | `boolean` |  | Open a folder picker instead of the file picker: every file inside is validated on its own and keeps its `relativePath` (see `getFileRelativePath`). Where the browser can't pick folders the button stays focusable but inert (`aria-disabled`) and describes why; set `hideWhenUnsupported` to drop it instead. Pair it with a plain trigger for "Upload files" / "Upload folder". |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `hideWhenUnsupported` | `boolean` |  | With `directory`, render nothing where folder picking is unsupported (instead of an inert button). |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

## Notes

**When to use:** A compound file uploader. `FileUpload` owns the file list, the type, size and count checks and a hidden input; `FileUploadDropzone` and `FileUploadTrigger` (files or a folder) add files, `FileUploadList` and `FileUploadItem` show them with progress, status and remove. It manages the list: you do the upload.

**Use instead when:**
- `Dropzone`: just a drop area with no list or state
- `CopyButton`: copy rather than upload
- `ChatAttachment`: one attachment tile in a conversation
- `FileViewer`: preview a file
- `Progress`: just a bar

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | The dropzone, each trigger and each row's remove button are tab stops |
| Enter, Space | On the dropzone or a trigger: open the file (or folder) picker. On a remove button: remove the file |

Dragging has no keyboard form, so the dropzone and the triggers are the keyboard route. There are no arrow keys, so RTL changes nothing.

### Screen readers

- `FileUploadDropzone` is a `role="button"` named by its text ("Click to upload or drag and drop") and described by its hint (types, size and count limits); it has `aria-disabled` when disabled and `aria-busy` while a dropped folder is read. The real file input is a hidden sibling (`aria-hidden`, not focusable).
- Rejected files show in a `role="alert"` list, one message per file (the first problem only, such as "n.txt isn't a supported file type."), until the next add.
- The list is a `ul` named "Files". Each row shows the name (the folder path for folder files) and size, a "Complete" or error text with an icon labelled "Uploaded" or "Failed", and a `progressbar` named "Uploading <name>" (indeterminate when `progress` is undefined). The remove button is "Remove <name>".
- Where the browser cannot pick folders, `FileUploadTrigger directory` is `aria-disabled` and described by "This browser can't choose folders. Choose files instead."

### Reduced motion

Drag feedback (border, tint, icon lift) and the progress fill use transitions that the global net ends in 1 ms. The tick pops with `animate-pop` when a file finishes, which the net stops.

### Server rendering

Server render: part of it fills in after mount. Without `directory` the markup is the same on both sides. The folder trigger and folder dropzone ask the browser for `webkitdirectory` support with `useSyncExternalStore`: the server and hydration render the "unsupported" state, and the real answer appears after hydration.

### Gotchas

- Nothing is uploaded for you. `onFilesAdded` gives the new `UploadFile`s (`status: "idle"`): start your request there and feed `progress` and `status` back through controlled `files` (or `onFilesChange`). `status` also takes `pending`, `running`, `succeeded`, `failed` and `canceled`.
- `accept`, `maxSize` (bytes) and `maxFiles` (in total, counting files already listed) are checked on every add; rejections go to `onFilesRejected` and the alert. `multiple={false}` makes each new file replace the previous one.
- With `name` the hidden input carries the whole file list (picked, dropped and `defaultFiles`; removing a file removes it) through `DataTransfer`, so a native form post sends the files. Without `name`, or in a browser that cannot set `input.files`, the input is emptied after each pick: read the files from the list or `onFilesAdded`. Picking a file that is already on the input again may fire no change event.
- `FileUploadList` renders nothing for an empty list; `FileUploadItem` outside a `FileUpload` needs its own `onRemove`. Read the state anywhere inside with the `useFileUpload` hook.

## Example

```tsx
import { FileUpload, FileUploadDropzone, FileUploadList, FileUploadTrigger, type UploadFile } from "@sutra/ui";

export function Example({ upload }: { upload: (files: UploadFile[]) => void }) {
  return (
    <FileUpload accept="image/*,.pdf" maxSize={5 * 1024 * 1024} maxFiles={4} onFilesAdded={upload}>
      <FileUploadDropzone />
      <div>
        <FileUploadTrigger>Choose files</FileUploadTrigger>
      </div>
      <FileUploadList />
    </FileUpload>
  );
}
```
