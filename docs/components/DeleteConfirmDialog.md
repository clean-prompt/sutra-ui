# DeleteConfirmDialog

> Destructive confirmation with a featured warning icon and type-to-confirm input.

- Import: `import { DeleteConfirmDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-delete` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the dialog panel. |
| `confirmLabel` | `React.ReactNode` | `"Delete workspace"` | Text of the delete button. |
| `confirmText` | `string` | `"northwind-studio"` | Text the user must type to enable the delete button. Pass "" to skip. |
| `consequences` | `React.ReactNode[]` | `["12 projects and 348 tasks", "96 notes and their history", "2.4 GB of files"]` | Bullet points describing what will be lost. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `description` | `React.ReactNode` | `"This will permanently delete the Northwind Studio workspace for everyone. This action cannot be undone."` | Supporting text under the heading; the default is generic, so say what is deleted. |
| `onConfirm` | `() => unknown` |  | Called when the user confirms. A returned promise shows a spinner; throw to show the error message and keep the dialog open. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `title` | `React.ReactNode` | `"Delete workspace"` | Dialog heading. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
