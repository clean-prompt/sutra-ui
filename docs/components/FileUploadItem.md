# FileUploadItem

> A single file row: type badge, name, size, progress and status.

- Import: `import { FileUploadItem } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/patterns/file-upload` (patterns)
- Part of [`FileUpload`](FileUpload.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `file` (required) | `UploadFile` |  | The file to show: its name, size, upload `status`, `progress` and any error. |
| `hideRemove` | `boolean` |  | Hide the remove button. |
| `onRemove` | `(file: UploadFile) => void` |  | Overrides the default remove behaviour (removing from `FileUpload` state). |

## Notes

See the notes in [`FileUpload`](FileUpload.md#notes).

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
