# DeviceSessionList

> Devices & sessions manager: list, per-session sign out, and "sign out everywhere else".

- Import: `import { DeviceSessionList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/kits/identity/device-sessions` (kit `identity`)
- `data-slot`: `session-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `emptyDescription` | `React.ReactNode` | `"Devices appear here after they sign in."` | Text of the empty state. Default "Devices appear here after they sign in.". |
| `emptyState` | `React.ReactNode` |  | Replaces the whole empty state (overrides `emptyTitle` / `emptyDescription`). |
| `emptyTitle` | `React.ReactNode` | `"No active sessions"` | Title of the empty state. Default "No active sessions". |
| `loading` | `boolean` |  | Shows skeleton rows. `sessions == null` is treated as loading too. |
| `now` | `number` |  | Reference time for "last active" labels; set it in tests and SSR for stable output. |
| `onRevoke` | `(id: string) => void \| Promise<void>` |  | Called with the session id when the user signs a session out; may return a promise, and the row shows a spinner until it settles. |
| `onRevokeOthers` | `() => void \| Promise<void>` |  | Shows "Sign out all other sessions" (with a confirm dialog) when there are other sessions. |
| `sessions` | `DeviceSession[] \| null` |  | Signed-in sessions; the current one is listed first and cannot be revoked. `null` or unset counts as loading. |
| `title` | `React.ReactNode` | `"Active sessions"` | Heading of the list. Default "Active sessions". |

## Example (live: `#/components/identity/sessions` in the playground)

```tsx
import { Button } from "@cleanprompt/sutra-ui/core";
import { DeviceSessionList } from "@cleanprompt/sutra-ui/identity";

<DeviceSessionList
  title="Devices"
  description="Sign out any device you don't recognise."
  sessions={sessions}
  onRevoke={async (id) => {
    await new Promise((r) => setTimeout(r, 500));
    setSessions((list) => list.filter((s) => s.id !== id));
  }}
  onRevokeOthers={async () => {
    await new Promise((r) => setTimeout(r, 600));
    setSessions((list) => list.filter((s) => s.current));
  }}
/>
<div className="flex gap-2">
  <Button size="sm" variant="secondary" onClick={() => setSessions(initialSessions)}>
    Reset devices
  </Button>
</div>
{/* Loading */}
<DeviceSessionList sessions={null} />
```

Playground helpers in this snippet (not part of the library): initialSessions.
