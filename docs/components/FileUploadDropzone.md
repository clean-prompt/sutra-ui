# FileUploadDropzone

> `Dropzone` wired to the surrounding `FileUpload` state and limits.

- Import: `import { FileUploadDropzone } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/patterns/file-upload` (patterns)
- Part of [`FileUpload`](FileUpload.md)
- Also accepts the props of HTMLAttributes

## Props

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
