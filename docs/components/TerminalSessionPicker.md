# TerminalSessionPicker

> tmux-style session list: name, windows, attached / active badges and "New session".

- Import: `import { TerminalSessionPicker } from "@sutra/ui/terminal"`
- Source: `packages/ui/src/kits/terminal/terminal` (kit `terminal`)
- Part of [`Terminal`](Terminal.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sessions` (required) | `TerminalSession[]` |  | Terminal sessions to choose from, each with an id, title and state. |
| `creating` | `boolean` |  | Shows a busy state on the new-session button while a session is being created. |
| `defaultValue` | `string \| null` | `null` | Initially active session id when `value` is not controlled. |
| `emptyState` | `React.ReactNode` | `"No sessions"` | Shown when there are no sessions. Default "No sessions". |
| `label` | `string` | `"Terminal sessions"` | Accessible name of the session list. Default "Terminal sessions". |
| `loading` | `boolean` |  | Shows placeholder rows while the sessions load. |
| `onCreate` | `() => void` |  | Shows a "New session" button. |
| `onValueChange` | `(id: string) => void` |  | Called with the session id when the user picks a session. |
| `value` | `string \| null` |  | Selected (active) session id. |
