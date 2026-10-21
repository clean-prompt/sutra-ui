# LoopStatusRow

> "↻ Loop · every 45m · 2 runs · next in 44:12" with a live countdown, run now and stop.

- Import: `import { LoopStatusRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/status-stack` (kit `agent-admin`)
- `data-slot`: `loop-next`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `every` (required) | `string \| number \| CronInterval` |  | "45m", "every 2h", an interval object or milliseconds. |
| `runs` (required) | `number` |  | Number of runs completed so far. |
| `actions` | `React.ReactNode` |  | Buttons on the right. |
| `dismissLabel` | `string` |  | Accessible name of the dismiss button. |
| `nextDueAt` | `TimeLike \| null` |  | When the next run is due; drives a live "next in" countdown, hidden when `null` or unset. |
| `onDismiss` | `() => void` |  | Shows a dismiss button. Inside a `StatusStack` the row is also removed from the stack. |
| `onRunNow` | `() => void` |  | Called when the user presses Run now; the button is hidden when unset. |
| `onStop` | `() => void` |  | Called when the user stops the loop; the button is hidden when unset. |
| `paused` | `boolean` |  | Shows the loop as paused (neutral tone) and stops the countdown. |
| `priority` | `number` |  | Higher rows sort first inside a `StatusStack`. Default 0. |
| `progress` | `{ value: number; max: number; label: string }` |  | Thin bar under the row. |
| `title` | `React.ReactNode` |  | Trailing, truncated description. |
| `tone` | `StatusStackTone` |  | Colour of the row and its progress bar (a `Tone`); the specialised rows pick one from their state when omitted. |
