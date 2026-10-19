# FileUploadList

> List of selected files. Renders a `FileUploadItem` per file when no children are given.

- Import: `import { FileUploadList } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/patterns/file-upload` (patterns)
- Part of [`FileUpload`](FileUpload.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

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
