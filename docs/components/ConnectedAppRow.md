# ConnectedAppRow

> One connected app/agent: icon, granted scope count, last activity and expiry.

- Import: `import { ConnectedAppRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/connected-apps` (kit `identity`)
- `data-slot`: `connected-app-row`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `app` (required) | `ConnectedApp` |  | The connected app to show (name, scopes, last used, devices). |
| `now` | `number` |  | Reference time for relative labels; set it in tests and SSR for stable output. |
| `onOpen` | `(app: ConnectedApp) => void` |  | Called with the app when the row is pressed to open its detail. |
