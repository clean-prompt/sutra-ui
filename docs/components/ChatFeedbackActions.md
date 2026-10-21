# ChatFeedbackActions

> Thumbs up / down toggle pair.

- Import: `import { ChatFeedbackActions } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message-actions` (kit `ai`)
- `data-slot`: `chat-feedback-actions`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `ChatFeedback` | `null` | Initial rating when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables both thumb buttons. |
| `onFeedback` | `(value: ChatFeedback) => void` |  | **Deprecated.** Use `onValueChange`. Called with the new rating when the user presses a thumb. |
| `onValueChange` | `(value: ChatFeedback) => void` |  | Called with the new rating; clicking the active thumb again clears it (null). |
| `value` | `ChatFeedback` |  | Controlled rating: `"up"`, `"down"` or `null` for none. |
