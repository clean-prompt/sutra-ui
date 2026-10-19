# McpTransportBadge

> stdio / HTTP / SSE badge with a distinct tone each.

- Import: `import { McpTransportBadge } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/mcp` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `transport` (required) | `McpTransport` |  | Transport to label (for example stdio or HTTP); sets the badge text and icon. |
