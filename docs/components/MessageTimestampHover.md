# MessageTimestampHover

> Relative message time revealed on hover/focus, with the full date in a tooltip.

- Import: `import { MessageTimestampHover } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/chat-message-actions` (kit `ai`)
- `data-slot`: `message-timestamp`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `date` (required) | `Date \| number \| string` |  | Time of the message (Date, epoch ms or ISO string); shown relative, with the full date on hover. |
| `alwaysVisible` | `boolean` | `false` | Keep visible instead of revealing on message hover/focus. |
| `formatFull` | `(date: Date) => string` |  | Custom formatter for the full date shown in the tooltip. |
| `formatRelative` | `(date: Date, now: number) => string` |  | Custom formatter for the relative label, given the date and the reference time in ms. |
| `now` | `Date \| number` |  | Reference "now" (mostly for tests). Defaults to the current time, refreshed every minute. |
