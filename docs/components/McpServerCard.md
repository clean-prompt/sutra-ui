# McpServerCard

> MCP server summary with transport, status, tool count, last error and Test / Connect / Disable / Remove / Logs actions.

- Import: `import { McpServerCard } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/mcp` (kit `agent-admin`)
- `data-slot`: `mcp-server-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Server name, shown as the card title. |
| `status` (required) | `McpServerStatus` |  | Connection state: `connected`, `connecting`, `failed`, `disabled` or `needs-auth`; sets the status pill and the actions offered. |
| `transport` (required) | `McpTransport` |  | How the server is reached (shown as a transport badge). |
| `endpoint` | `string` |  | Command line or URL. |
| `lastError` | `string` |  | Most recent error message, shown when the server is in an error state. |
| `onConnect` | `() => Promise<void>` |  | Start OAuth. Resolve when signed in; reject to show the retry state. |
| `onEnabledChange` | `(enabled: boolean) => void` |  | Called with the new state when the user presses Enable or Disable; the button is hidden when unset. |
| `onRemove` | `() => void \| Promise<void>` |  | Called after the user confirms removal; may return a promise. |
| `onTest` | `() => Promise<McpTestResult>` |  | Runs a connection test and resolves with its result; shows a Test button when set. |
| `onViewLogs` | `() => void` |  | Called when the user presses View logs; the button is hidden when unset. |
| `toolCount` | `number` |  | Number of tools the server exposes, shown as a count. |

## Example (live: `#/components/capabilities/mcp-servers` in the playground)

```tsx
import * as React from "react";
import { McpServerCard } from "@sutra/ui/agent-admin";

function McpServersDemo() {
  const [servers, setServers] = React.useState(MCP_SERVERS);
  const attempts = React.useRef(0);
  return (
    <div className="grid grid-cols-1 w-full gap-3 lg:grid-cols-2">
      {servers.map((m) => (
        <McpServerCard
          key={m.name}
          name={m.name}
          transport={m.transport}
          status={m.status}
          endpoint={m.endpoint}
          toolCount={m.toolCount}
          lastError={m.lastError}
          onTest={async () => {
            await wait(800);
            return m.test;
          }}
          onConnect={
            m.status === "needs-auth" || m.status === "failed"
              ? async () => {
                  await wait(1500);
                  attempts.current += 1;
                  if (attempts.current === 1) throw new Error("Sign-in window was closed before finishing.");
                  setServers((all) => all.map((s) => (s.name === m.name ? { ...s, status: "connected", toolCount: 18, lastError: undefined } : s)));
                }
              : undefined
          }
          onEnabledChange={(on) => setServers((all) => all.map((s) => (s.name === m.name ? { ...s, status: on ? "connecting" : "disabled" } : s)))}
          onRemove={() => setServers((all) => all.filter((s) => s.name !== m.name))}
          onViewLogs={() => {}}
        />
      ))}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): MCP_SERVERS, wait.
