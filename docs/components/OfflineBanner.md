# OfflineBanner

> Banner shown while offline: reassures that changes are saved locally. A preset over `InlineAlert layout="strip"`.

- Import: `import { OfflineBanner } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/suite`)
- Source: `packages/ui/src/kits/workspace/sync-status` (kit `workspace`)
- `data-slot`: `offline-banner`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `dismissible` | `boolean` |  | Shows a dismiss button. |
| `offline` | `boolean` |  | Force the offline state; defaults to `navigator.onLine`. |
| `onDismiss` | `() => void` |  | Called when the user dismisses the banner (with `dismissible`). |
| `onRetry` | `() => void` |  | Called when the user presses Retry; the button is hidden when unset. |
| `pendingChanges` | `number` | `0` | Local changes waiting to upload, shown in the message. |
