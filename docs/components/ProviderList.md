# ProviderList

> Providers grouped into "Connected" and "Available" sections.

- Import: `import { ProviderList } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/llm-providers` (kit `agent-admin`)
- `data-slot`: `provider-list`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `ProviderEntry[]` |  | Providers to list, grouped into connected and available. |
| `availableLabel` | `string` | `"Available"` | Heading of the group of providers that are not configured. |
| `connectedLabel` | `string` | `"Connected"` | Heading of the group of configured providers. |
| `now` | `number` |  | Reference time for relative quota labels; set it in tests and SSR for stable output. |
| `onConnect` | `(provider: ProviderEntry) => void` |  | Called with the provider when the user presses Connect on an unconfigured provider. |
| `onDisconnect` | `(provider: ProviderEntry) => void` |  | Called with the provider when the user disconnects a connected provider. |
| `onManage` | `(provider: ProviderEntry) => void` |  | Called with the provider when the user presses Manage on a connected provider. |

## Example (live: `#/components/providers/provider-list` in the playground)

```tsx
import * as React from "react";
import { ProviderConnectDialog, ProviderList } from "@sutra/ui/agent-admin";

function ProviderListDemo() {
  const [providers, setProviders] = React.useState(providerEntries);
  const [connecting, setConnecting] = React.useState<ProviderEntry | null>(null);
  return (
    <>
      <ProviderList
        className="max-w-3xl"
        providers={providers}
        onConnect={setConnecting}
        onManage={() => undefined}
        onDisconnect={(p) => setProviders((list) => list.map((x) => (x.id === p.id ? { ...x, status: "not-configured", account: undefined, quota: undefined } : x)))}
      />
      {connecting && (
        <ProviderConnectDialog
          open
          onOpenChange={(o) => !o && setConnecting(null)}
          provider={connecting}
          methods={connecting.auth === "oauth" ? ["device", "pkce", "api-key"] : ["api-key"]}
          {...simulatedConnect}
          onConnected={() => setProviders((list) => list.map((x) => (x.id === connecting.id ? { ...x, status: "connected", tokenExpiresAt: Date.now() + 30 * DAY } : x)))}
        />
      )}
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): DAY, providerEntries, simulatedConnect.
