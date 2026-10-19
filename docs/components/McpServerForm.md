# McpServerForm

> Add/edit an MCP server: stdio (command, args, env) or HTTP/SSE (url, headers, auth), with JSON paste + validation.

- Import: `import { McpServerForm } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/mcp` (kit `agent-admin`)
- `data-slot`: `mcp-server-form`
- Also accepts the props of HTMLAttributes, FormHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowPaste` | `boolean` | `true` | Show the "Paste JSON config" box. Default true. |
| `defaultValue` | `McpServerConfig` | `emptyMcpServerConfig` | Initial configuration when `value` is not controlled. |
| `existingNames` | `string[]` |  | Names already in use (for the uniqueness check). |
| `onCancel` | `() => void` |  | Called when the user presses Cancel; the button is hidden when unset. |
| `onSubmit` | `(config: McpServerConfig) => void \| Promise<void>` |  | Called with the valid configuration; may return a promise, and the submit button shows a spinner until it settles. |
| `onValueChange` | `(config: McpServerConfig) => void` |  | Called with the configuration on every edit. |
| `submitLabel` | `React.ReactNode` | `"Add server"` | Label of the submit button. |
| `value` | `McpServerConfig` |  | Controlled server configuration (name, transport, command or URL, env, headers). |

## Example (live: `#/components/capabilities/mcp-server-form` in the playground)

```tsx
import * as React from "react";
import { McpServerForm } from "@sutra/ui/agent-admin";

function McpFormDemo() {
  const [last, setLast] = React.useState<McpServerConfig | null>(null);
  return (
    <div className="grid grid-cols-1 w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <McpServerForm existingNames={MCP_SERVERS.map((m) => m.name)} onSubmit={async (c) => { await wait(500); setLast(c); }} onCancel={() => setLast(null)} />
      <div className="space-y-2">
        {/* Submitted config */}
        <pre className="max-h-96 overflow-auto rounded-box border border-border bg-subtle p-3 font-mono text-xs">{last ? JSON.stringify(last, null, 2) : "Submit the form, or paste:\n\n" + JSON.stringify({ mcpServers: { notion: { url: "https://mcp.notion.com/mcp", headers: { Authorization: "Bearer ntn_xxx" } } } }, null, 2)}</pre>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): MCP_SERVERS, wait.
