# FilePreviewCard

> Thumbnail tile for a file: image preview or format icon, name and size. Click to open a viewer.

- Import: `import { FilePreviewCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/patterns/file-viewer` (patterns)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `file` (required) | `ViewerFile` |  | The file to preview: its name, type, size and an optional thumbnail URL. |
| `meta` | `React.ReactNode` |  | Extra line under the name (defaults to the formatted size). |
