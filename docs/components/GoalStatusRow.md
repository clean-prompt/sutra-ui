# GoalStatusRow

> "⊙ Goal · 3/20 turns · title" with a turn-budget bar and pause / clear.

- Import: `import { GoalStatusRow } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/status-stack` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `maxTurns` (required) | `number` |  | Turn budget. |
| `title` (required) | `React.ReactNode` |  | Goal text, truncated to one line. |
| `turns` (required) | `number` |  | Turns used so far, shown against `maxTurns`. |
| `actions` | `React.ReactNode` |  | Buttons on the right. |
| `dismissLabel` | `string` |  | Accessible name of the dismiss button. |
| `onClear` | `() => void` |  | Called when the user clears the goal; the button is hidden when unset. |
| `onDismiss` | `() => void` |  | Shows a dismiss button. Inside a `StatusStack` the row is also removed from the stack. |
| `onPause` | `() => void` |  | Called when the user presses Pause; the button is hidden when unset. |
| `onResume` | `() => void` |  | Called when the user presses Resume on a paused goal; the button is hidden when unset. |
| `paused` | `boolean` |  | Shows the goal as paused (neutral tone) and swaps Pause for Resume. |
| `priority` | `number` |  | Higher rows sort first inside a `StatusStack`. Default 0. |
| `tone` | `StatusStackTone` |  | Colour of the row and its progress bar (a `Tone`); the specialised rows pick one from their state when omitted. |
