# MessageStatusIcon

> Delivery state glyph: clock, single tick, double tick, blue double tick, or a warning.

- Import: `import { MessageStatusIcon } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/kits/social/messenger-bubble` (kit `social`)
- `data-slot`: `message-status-icon`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `MessageDeliveryStatus` |  | Delivery state (`sending`, `sent`, `delivered`, `read` or `failed`); picks the tick icon and its tone. |
