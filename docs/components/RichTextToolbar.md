# RichTextToolbar

> Fixed formatting toolbar for a `RichTextEditor` (or any TipTap editor with StarterKit + Link).

- Import: `import { RichTextToolbar } from "@sutra/ui/editor"`
- Source: `packages/ui/src/kits/editor/rich-text-editor` (kit `editor`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `editor` (required) | `Editor \| null` |  | The TipTap editor to control (from `editorRef` or `useEditor`); the toolbar renders nothing while it is `null`. |
| `children` | `React.ReactNode` |  | Extra tools appended after the defaults. |
| `history` | `boolean` | `true` | Undo / redo buttons. Default true; they are left out anyway when the editor has no undo/redo commands (`RichTextEditor history={false}` without a replacement such as TipTap's Collaboration extension). |
