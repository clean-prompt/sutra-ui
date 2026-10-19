# HeartbeatStatusRow

> Periodic heartbeat: pulse dot, period and time since the last beat; turns amber when beats are missed.

- Import: `import { HeartbeatStatusRow } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/status-stack` (kit `agent-admin`)
- `data-slot`: `heartbeat-last`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Buttons on the right. |
| `dismissLabel` | `string` |  | Accessible name of the dismiss button. |
| `intervalMs` | `number` |  | Expected beat period; the row turns stale after two missed beats. |
| `label` | `React.ReactNode` | `"Heartbeat"` | Kind label of the row. Default "Heartbeat". |
| `lastBeatAt` | `TimeLike \| null` |  | Time of the last heartbeat; `null` or unset counts as stale. |
| `onDismiss` | `() => void` |  | Shows a dismiss button. Inside a `StatusStack` the row is also removed from the stack. |
| `priority` | `number` |  | Higher rows sort first inside a `StatusStack`. Default 0. |
| `progress` | `{ value: number; max: number; label: string }` |  | Thin bar under the row. |
| `title` | `React.ReactNode` |  | Trailing, truncated description. |
| `tone` | `StatusStackTone` |  | Colour of the row and its progress bar (a `Tone`); the specialised rows pick one from their state when omitted. |
