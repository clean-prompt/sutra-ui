# DevicePairingFlow

> Wallet "link a new device": QR + 8-digit code with a 2-minute TTL, then a "Do these match?" SAS check on both devices.

- Import: `import { DevicePairingFlow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/kunji`)
- Source: `packages/ui/src/blocks/kunji-blocks-pairing` (blocks)
- `data-slot`: `pairing-code`, `pairing-sas`, `device-pairing-flow`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `adapter` (required) | `DevicePairingAdapter` |  | Adapter that performs the pairing (create, show or enter the code, confirm); the flow only drives the UI. |
| `headingLevel` | `AuthHeadingLevel` | `1` | Element of the card title (`1` is an `h1`). |
| `onCancel` | `() => void` |  | Called when the user cancels the pairing. |
| `onDone` | `(peer: DevicePairingPeer) => void` |  | Called with the peer when pairing finishes. |
| `side` | `"existing" \| "new"` | `"existing"` | `existing` shows the QR + code; `new` types the code. |
| `variant` | `"card" \| "plain"` | `"card"` | `card` draws the bordered card; `plain` drops the chrome. |

## Example (live: `#/components/kunji/device-pairing` in the playground)

```tsx
import { DevicePairingFlow } from "@cleanprompt/sutra-ui/kunji";

<div className="flex flex-col items-center gap-2">
  {/* Existing device */}
  <DevicePairingFlow adapter={pairing} />
</div>
<div className="flex flex-col items-center gap-2">
  {/* New device */}
  <DevicePairingFlow adapter={pairingNew} side="new" />
</div>
```
