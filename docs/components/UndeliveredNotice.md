# UndeliveredNotice

> Inline notice when an answer or message couldn't be delivered, with Retry.

- Import: `import { UndeliveredNotice } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/undelivered-notice` (kit `ai`)
- `data-slot`: `undelivered-notice`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Explanation under the heading, for example why delivery failed. |
| `onDismiss` | `() => void` |  | Called when the user dismisses the notice; the dismiss button is hidden when unset. |
| `onRetry` | `() => void` |  | Called when the user presses Retry; the button is hidden when unset. |
| `retrying` | `boolean` | `false` | Shows a busy state on the retry button while a retry is in flight. |
| `retryLabel` | `string` | `"Retry"` | Label of the retry button. Default "Retry". |
| `title` | `React.ReactNode` | `"Your answer couldn't be delivered"` | Heading of the notice. Default "Your answer couldn't be delivered". |
