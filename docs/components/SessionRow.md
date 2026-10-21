# SessionRow

> Alias of `DeviceSessionRow`.

**Deprecated:** Use `DeviceSessionRow`.

- Import: `import { SessionRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/kits/identity/device-sessions` (kit `identity`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `session` (required) | `DeviceSession` |  | The session to show (device, location, last active, current flag). |
| `now` | `number` |  | Reference time for "last active" (handy for tests and SSR). |
| `onRevoke` | `(id: string) => void \| Promise<void>` |  | Sign this session out. May return a promise; the row shows a spinner until it settles. |
| `revokeLabel` | `string` |  | Label of the sign-out button. Default "Sign out". |
