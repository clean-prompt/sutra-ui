# KillButton

> Two-mode kill control (SIGTERM / SIGKILL) with an inline "Kill 1234? Confirm / Cancel" step.

- Import: `import { KillButton } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/process-table-kill` (kit `ops`)
- `data-slot`: `kill-button`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onKill` (required) | `(signal: KillSignal) => void \| Promise<unknown>` |  | Called with the chosen signal after the user confirms; may return a promise, and the button shows "Killing…" until it settles. |
| `pid` (required) | `number` |  | Process id, shown in the confirm step and used in labels. |
| `disabled` | `boolean` |  | Disables the button. |
| `loading` | `boolean` |  | External loading state (e.g. waiting for the process to exit). Shows "Killing…". |
| `name` | `string` |  | Process name, used in labels. |
| `onConfirmingChange` | `(signal: KillSignal \| null) => void` |  | Called when the confirm step opens / closes. |
| `pending` | `boolean` |  | **Deprecated.** Use `loading`. External busy state; shows "Killing…" while true. |
