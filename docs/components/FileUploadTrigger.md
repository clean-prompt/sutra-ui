# FileUploadTrigger

> Button that opens the file picker (or, with `directory`, a folder picker).

- Import: `import { FileUploadTrigger } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/patterns/file-upload` (patterns)
- `data-slot`: `file-upload-trigger`
- Part of [`FileUpload`](FileUpload.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

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
