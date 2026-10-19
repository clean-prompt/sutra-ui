# MessageStatusIcon

> Delivery state glyph: clock, single tick, double tick, blue double tick, or a warning.

- Import: `import { MessageStatusIcon } from "@sutra/ui"` (or from `@sutra/ui/social`)
- Source: `packages/ui/src/kits/social/messenger` (kit `social`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `MessageDeliveryStatus` |  | Delivery state (`sending`, `sent`, `delivered`, `read` or `failed`); picks the tick icon and its tone. |
