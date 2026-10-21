# AgentMessageNotice

> Transcript row for an agent-to-agent message ("Messaged Researcher: …" / "Message from Planner") with an expandable payload.

- Import: `import { AgentMessageNotice } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-room` (kit `agent-admin`)
- `data-slot`: `agent-message-notice`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `agent` (required) | `string` |  | The other agent. |
| `direction` (required) | `"outgoing" \| "incoming"` |  | `outgoing` for a message this agent sent, `incoming` for one it received. |
| `payload` (required) | `string` |  | Full message body, revealed on expand. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state of the payload when `expanded` is not controlled. |
| `expanded` | `boolean` |  | Controlled expanded state of the payload. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the payload. |

## Example (live: `#/components/channels/agent-message-notice` in the playground)

```tsx
import { AgentMessageNotice } from "@cleanprompt/sutra-ui/agent-admin";

<div className="w-full max-w-lg">
  <AgentMessageNotice direction="outgoing" agent="Researcher" payload={"Find three competitors with public pricing.\nReturn a table: name, tiers, price per seat."} />
  <AgentMessageNotice direction="incoming" agent="Planner" payload="Plan approved. Start with the pricing table, then draft positioning." />
</div>
```
