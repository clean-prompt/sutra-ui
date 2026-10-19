# JobStatePill

> Pill for a scheduled job's state (a StatusBadge preset); `running` shows a spinner.

- Import: `import { JobStatePill } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-list` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` (required) | `AgentJobState` |  | Job state (`scheduled`, `running`, `paused`, `error`, `completed` or `disabled`); sets the pill text, icon and tone. |
| `label` | `React.ReactNode` |  | Replaces the default text of the state. |
| `size` | `"sm" \| "md"` | `"md"` | Badge size of the pill. |

## Example (live: `#/components/automation/job-state` in the playground)

```tsx
import { JobStatePill } from "@sutra/ui/agent-admin";

{(["scheduled", "running", "paused", "error", "completed", "disabled"] as AgentJobState[]).map((s) => (
  <JobStatePill key={s} state={s} />
))}
```
