# PresenceIndicator

> Connection-mode chip for collaborative editors: pulsing "Live", "Offline · saved locally", "Reconnecting…".

- Import: `import { PresenceIndicator } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/kits/social/presence` (kit `social`)
- `data-slot`: `presence-indicator`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `PresenceConnection` |  | Connection state (`live`, `offline`, `reconnecting` or `connecting`); sets the dot, label and tone. |
| `label` | `React.ReactNode` |  | Override the label for the current status. |
| `pending` | `number` |  | Local changes waiting to sync (shown when offline/reconnecting). |
