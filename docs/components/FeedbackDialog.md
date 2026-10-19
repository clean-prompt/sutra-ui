# FeedbackDialog

> Collect a star rating, a category and a written message; shows a thank-you state.

- Import: `import { FeedbackDialog } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-feedback` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `categories` | `{ value: string; label: string }[]` | `[ { value: "idea", label: "Idea" }, { value: "bug", label: "Bug" }, { value: "praise", label: "Praise" }, { value: "other", label: "Other" }, ]` | Feedback categories offered in the select; each has a `value` and a `label`. |
| `className` | `string` |  | Classes for the dialog panel. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onSubmit` | `(values: FeedbackValues) => unknown` |  | Called with the rating, category, message and contact choice when the form is submitted. A returned promise shows a spinner; throw to show the error message. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `title` | `React.ReactNode` | `"Share your feedback"` | Dialog heading. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
