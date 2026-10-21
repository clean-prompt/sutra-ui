# CommentComposer

> Comment input: Markdown text, ⌘/Ctrl+Enter to send, Escape to cancel.

- Import: `import { CommentComposer } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/editor`)
- Source: `packages/ui/src/patterns/comments` (patterns)
- `data-slot`: `comment-composer`
- Also accepts the props of HTMLAttributes, FormHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onSubmit` (required) | `(body: string) => void` |  | Called with the trimmed text when the user submits (button or Enter); the field is then cleared. |
| `autoFocus` | `boolean` |  | Focuses the field on mount. |
| `compact` | `boolean` |  | **Deprecated.** Use `density="compact"`. Legacy form of `density="compact"`. |
| `defaultValue` | `string` | `""` | Initial draft text when uncontrolled. |
| `density` | `Density` |  | `compact` hides the buttons until the field is focused or has text. Default `normal`. |
| `label` | `string` | `"Comment"` | Accessible label of the field. Default "Comment". |
| `onCancel` | `() => void` |  | Called when the user cancels (Cancel button or Escape); setting it shows the Cancel button. |
| `onValueChange` | `(value: string) => void` |  | Called with the draft text as it changes. |
| `placeholder` | `string` | `"Add a comment…"` | Placeholder of the text field. |
| `quote` | `string` |  | Excerpt shown above the field. |
| `submitLabel` | `string` | `"Comment"` | Text of the submit button. |
| `value` | `string` |  | Draft text (controlled). |
