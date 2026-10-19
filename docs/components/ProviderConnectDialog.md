# ProviderConnectDialog

> Connect a provider via OAuth device code, PKCE paste-code or an API key.

- Import: `import { ProviderConnectDialog } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/llm-providers` (kit `agent-admin`)
- `data-slot`: `device-approved`, `device-waiting`, `device-user-code`, `device-countdown`, `api-key-result`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `provider` (required) | `Pick<ProviderEntry, "name" \| "monogram" \| "color">` |  | Provider being connected (name, monogram, colour), shown in the dialog header. |
| `authorizeUrl` | `string` |  | PKCE: sign-in page URL the user opens to obtain a code. |
| `defaultMethod` | `ProviderConnectMethod` |  | Tab shown first; defaults to the first of `methods`. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `getKeyUrl` | `string` |  | API key: "Get a key" link. |
| `methods` | `ProviderConnectMethod[]` | `["device", "pkce", "api-key"]` | Tabs to show, in order. Default all three. |
| `onConnected` | `(method: ProviderConnectMethod) => void` |  | Called once any flow completes. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onPollDeviceFlow` | `() => Promise<DeviceCodePollResult>` |  | Device flow: called every `interval` seconds until approved, denied or expired. |
| `onSaveKey` | `(key: string) => void` |  | API key flow: called with the key when the user saves it. |
| `onStartDeviceFlow` | `() => Promise<DeviceCodeGrant>` |  | Device flow: request a user code. |
| `onSubmitCode` | `(code: string) => Promise<void> \| void` |  | PKCE: exchange the pasted code. Throw to show an error. |
| `onValidateKey` | `(key: string) => Promise<ApiKeyValidation \| boolean>` |  | API key flow: checks the typed key before saving; resolve `true`, `false` or a result with a message. |
| `open` | `boolean` |  | Controlled open state of the dialog. |

## Example (live: `#/components/providers/provider-connect-dialog` in the playground)

```tsx
import * as React from "react";
import { ProviderConnectDialog } from "@sutra/ui/agent-admin";
import { Button } from "@sutra/ui/core";
import { RiShieldKeyholeLine } from "@sutra/ui/icons";

function ConnectDialogDemo() {
  const [open, setOpen] = React.useState<null | "oauth" | "short">(null);
  const [log, setLog] = React.useState<string[]>([]);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        <Button leadingIcon={<RiShieldKeyholeLine />} onClick={() => setOpen("oauth")}>
          Connect Nimbus AI
        </Button>
        <Button variant="secondary" onClick={() => setOpen("short")}>
          Device code that expires in 8s
        </Button>
      </div>
      {/* Device code approves after ~4 polls. Paste-code accepts 6+ characters. API keys need 12+ characters. */}
      {log.length > 0 && {/* {log.join(" · ")} */}}
      <ProviderConnectDialog
        open={open === "oauth"}
        onOpenChange={(o) => !o && setOpen(null)}
        provider={{ name: "Nimbus AI" }}
        {...simulatedConnect}
        onPollDeviceFlow={makeDevicePoller(4)}
        onSaveKey={() => setLog((l) => [...l, "key saved"])}
        onConnected={(m) => setLog((l) => [...l, `connected via ${m}`])}
      />
      <ProviderConnectDialog
        open={open === "short"}
        onOpenChange={(o) => !o && setOpen(null)}
        provider={{ name: "Aster Labs" }}
        methods={["device"]}
        onStartDeviceFlow={async () => {
          await sleep(400);
          return { userCode: "ZX81-PLMN", verificationUrl: "https://login.example.com/device", expiresIn: 8, interval: 2 };
        }}
        onPollDeviceFlow={async () => "pending"}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): makeDevicePoller, simulatedConnect, sleep.
