# DeviceSessionRow

> One device/session with icon, details, "This device" badge and an inline-confirmed sign out.

- Import: `import { DeviceSessionRow } from "@sutra/ui"` (or from `@sutra/ui/identity`)
- Source: `packages/ui/src/kits/identity/device-sessions` (kit `identity`)
- `data-slot`: `session-row`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `session` (required) | `DeviceSession` |  | The session to show (device, location, last active, current flag). |
| `now` | `number` |  | Reference time for "last active" (handy for tests and SSR). |
| `onRevoke` | `(id: string) => void \| Promise<void>` |  | Sign this session out. May return a promise; the row shows a spinner until it settles. |
| `revokeLabel` | `string` | `"Sign out"` | Label of the sign-out button. Default "Sign out". |
