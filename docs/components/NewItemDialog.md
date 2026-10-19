# NewItemDialog

> Quick create form for a task or note: title, description, due date, priority and labels.

- Import: `import { NewItemDialog } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-new-item` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the dialog panel. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `defaultType` | `"task" \| "note"` | `"task"` | Item type selected when the dialog opens. |
| `labelSuggestions` | `string[]` | `["Design", "Engineering", "Marketing", "Personal", "Health", "Finance", "Reading"]` | Suggested labels shown as quick-pick chips. |
| `onCreate` | `(values: NewItemValues) => unknown` |  | Called with the new item's values when the form is submitted. A returned promise shows a spinner; throw to show the error message. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
