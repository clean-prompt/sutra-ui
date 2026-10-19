# JobRow

> One scheduled job: name, schedule, state, next/last run, model and mode, with row actions.

- Import: `import { JobRow } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-list` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `job` (required) | `AgentJob` |  | The job to show (name, schedule, state, model, next and last run). |
| `modelLabel` | `React.ReactNode` |  | Label for the model id. |
| `onDelete` | `(job: AgentJob) => void \| Promise<void>` |  | Called after the user confirms. |
| `onEdit` | `(job: AgentJob) => void` |  | Called with the job when the user presses Edit; the action is hidden when unset. |
| `onPause` | `(job: AgentJob) => void` |  | Called with the job when the user presses Pause; the action is hidden when unset. |
| `onResume` | `(job: AgentJob) => void` |  | Called with the job when the user presses Resume on a paused job; the action is hidden when unset. |
| `onRunNow` | `(job: AgentJob) => void` |  | Called with the job when the user presses Run now; the action is hidden when unset. |
| `onSelect` | `(job: AgentJob) => void` |  | Called with the job when the row is pressed. |
| `selected` | `boolean` |  | Marks the row as the selected one in the list. |
