# RotatingQRPairing

> Live pairing QR: polls a rotating payload, crossfades on change, counts down and walks through pairing phases. Built on `QRCodeCard`.

- Import: `import { RotatingQRPairing } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/channels-pairing` (kit `agent-admin`)
- `data-slot`: `rotating-qr-pairing`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `getPayload` (required) | `() => RotatingQRPollResult \| Promise<RotatingQRPollResult>` |  | Polled while waiting for a scan. Return the current pairing payload (or `{ connected: true }`). |
| `caption` | `React.ReactNode` |  | Instructions under the QR code, shown only while waiting for a scan. |
| `connectedLabel` | `React.ReactNode` | `"Device linked"` | Text shown in the `connected` phase. Default "Device linked". |
| `defaultPhase` | `QRPairingPhase` | `"waiting"` | Initial phase when `phase` is not controlled. |
| `error` | `React.ReactNode` |  | Error detail shown in the `error` phase. |
| `expiresAt` | `number` |  | Absolute deadline (ms epoch) for the whole pairing session. |
| `installingLabel` | `React.ReactNode` | `"Installing the bridge…"` | Text shown in the `installing` phase. Default "Installing the bridge…". |
| `onConnected` | `() => void` |  | Called once when the device links and the phase becomes `connected`. |
| `onPhaseChange` | `(phase: QRPairingPhase) => void` |  | Called with the new phase when polling or the timer moves the flow on. |
| `onRefresh` | `() => void` |  | Called by the Refresh / Retry button, after the phase returns to waiting. |
| `phase` | `QRPairingPhase` |  | Controlled phase of the pairing flow: `installing`, `waiting`, `connected`, `expired` or `error`. |
| `pollInterval` | `number` | `2000` | Poll interval in ms. Default 2000. |
| `size` | `number` | `192` | QR code width and height in px. |
| `title` | `React.ReactNode` | `"Scan to link"` | Heading above the QR code. |
| `ttl` | `number` |  | Session lifetime in seconds, restarted on refresh. Ignored when `expiresAt` is set. |

## Example (live: `#/components/channels/rotating-qr-pairing` in the playground)

```tsx
import * as React from "react";
import { RotatingQRPairing } from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";

function QRPairingDemo() {
  const [phase, setPhase] = React.useState<QRPairingPhase>("installing");
  const [session, setSession] = React.useState(0);
  React.useEffect(() => {
    if (phase !== "installing") return;
    const t = setTimeout(() => setPhase("waiting"), 2000);
    return () => clearTimeout(t);
  }, [phase, session]);
  return (
    <div className="flex flex-col items-center gap-3">
      <RotatingQRPairing
        title="Link WhatsApp"
        caption="WhatsApp → Settings → Linked devices → Link a device"
        phase={phase}
        onPhaseChange={setPhase}
        ttl={120}
        pollInterval={2000}
        getPayload={() => `wa-pair:${session}:${Math.floor(Date.now() / 20_000).toString(36)}`}
        error="The bridge exited with code 1."
        connectedLabel="Linked to +1 415 555 0123"
      />
      <div className="flex flex-wrap justify-center gap-1.5">
        <Button size="xs" variant="ghost" onClick={() => { setSession((s) => s + 1); setPhase("installing"); }}>
          Restart
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setPhase("connected")}>
          Simulate scan
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setPhase("expired")}>
          Expire
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setPhase("error")}>
          Fail
        </Button>
      </div>
    </div>
  );
}
```
