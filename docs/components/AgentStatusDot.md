# AgentStatusDot

> Session status dot (a `StatusDot` preset): running and waiting pulse, elsewhere is a hollow ring.

- Import: `import { AgentStatusDot } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-sessions` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `AgentSessionStatus` |  | Session status (`running`, `waiting`, `idle`, `unread`, `failed` or `elsewhere`); sets the dot colour and the default accessible label. |
| `decorative` | `boolean` |  | Hide from assistive tech when the status is announced elsewhere. |
| `label` | `string` |  | Accessible label override. |
| `size` | `"sm" \| "md"` | `"md"` | Dot size. |

## Example (live: `#/components/agent-sessions/agent-status-dot` in the playground)

```tsx
import { AgentStatusDot } from "@cleanprompt/sutra-ui/agent";

function StatusDotDemo() {
  return (
    <>
      {(["running", "waiting", "idle", "unread", "failed", "elsewhere"] as const).map((s) => (
        <span key={s} className="inline-flex items-center gap-2 text-sm">
          <AgentStatusDot status={s} decorative />
          {{ running: "Running", waiting: "Needs input", idle: "Idle", unread: "Unread", failed: "Failed", elsewhere: "Running elsewhere" }[s]}
        </span>
      ))}
    </>
  );
}
```
