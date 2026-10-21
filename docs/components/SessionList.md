# SessionList

> Alias of `DeviceSessionList`.

**Deprecated:** Use `DeviceSessionList`.

- Import: `import { SessionList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/kits/identity/device-sessions` (kit `identity`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `emptyDescription` | `React.ReactNode` |  | Text of the empty state. Default "Devices appear here after they sign in.". |
| `emptyState` | `React.ReactNode` |  | Replaces the whole empty state (overrides `emptyTitle` / `emptyDescription`). |
| `emptyTitle` | `React.ReactNode` |  | Title of the empty state. Default "No active sessions". |
| `loading` | `boolean` |  | Shows skeleton rows. `sessions == null` is treated as loading too. |
| `now` | `number` |  | Reference time for "last active" labels; set it in tests and SSR for stable output. |
| `onRevoke` | `(id: string) => void \| Promise<void>` |  | Called with the session id when the user signs a session out; may return a promise, and the row shows a spinner until it settles. |
| `onRevokeOthers` | `() => void \| Promise<void>` |  | Shows "Sign out all other sessions" (with a confirm dialog) when there are other sessions. |
| `sessions` | `DeviceSession[] \| null` |  | Signed-in sessions; the current one is listed first and cannot be revoked. `null` or unset counts as loading. |
| `title` | `React.ReactNode` |  | Heading of the list. Default "Active sessions". |
