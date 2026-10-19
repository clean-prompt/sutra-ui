# PlatformConnectorList

> Grid of channel connectors with an "N of M configured" header and gateway status hint.

- Import: `import { PlatformConnectorList } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/channels` (kit `agent-admin`)
- `data-slot`: `connector-count`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `connectors` (required) | `PlatformConnector[]` |  | Connectors to list, one card each. |
| `actions` | `React.ReactNode` |  | Header actions (e.g. restart gateway). |
| `gatewayHint` | `React.ReactNode` |  | Overrides the default gateway hint text. |
| `gatewayStatus` | `GatewayStatus` |  | State of the message gateway; shows a status hint under the heading. |
| `onEnabledChange` | `(id: string, enabled: boolean) => void` |  | Called with the connector id and new state when the user flips a connector's switch. |
| `onSaveConfig` | `(id: string, values: PlatformConfigValues) => void \| Promise<void>` |  | Saves a connector's config form; shows a Configure button on each card when set. |
| `onTest` | `(id: string) => ConnectorTestResult \| Promise<ConnectorTestResult>` |  | Runs a connectivity test for the connector id; shows a Test button on each card when set. |
| `title` | `React.ReactNode` | `"Messaging channels"` | Heading of the list. Default "Messaging channels". |

## Example (live: `#/components/channels/platform-connectors` in the playground)

```tsx
import * as React from "react";
import { PlatformConnectorList } from "@sutra/ui/agent-admin";
import { Button } from "@sutra/ui/core";
import { RiRestartLine } from "@sutra/ui/icons";

function ConnectorsDemo() {
  const [connectors, setConnectors] = React.useState(initialConnectors);
  const patch = (id: string, p: Partial<PlatformConnector>) =>
    setConnectors((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  return (
    <PlatformConnectorList
      className="w-full"
      connectors={connectors}
      gatewayStatus="running"
      onEnabledChange={(id, enabled) => patch(id, { enabled, state: enabled ? "starting" : "stopped" })}
      onTest={async (id) => {
        await new Promise((r) => setTimeout(r, 700));
        return id === "slack" ? { ok: false, message: "invalid_auth" } : { ok: true, latencyMs: 80 + Math.round(Math.random() * 120) };
      }}
      onSaveConfig={async (id, config) => {
        await new Promise((r) => setTimeout(r, 400));
        patch(id, { config, state: "starting", error: undefined });
      }}
      actions={
        <Button size="sm" variant="secondary" leadingIcon={<RiRestartLine />}>
          Restart gateway
        </Button>
      }
    />
  );
}
```

Playground helpers in this snippet (not part of the library): initialConnectors.
