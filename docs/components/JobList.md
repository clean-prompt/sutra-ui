# JobList

> Master list of scheduled jobs.

- Import: `import { JobList } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-list` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `jobs` (required) | `AgentJob[]` |  | Jobs to list, one row each. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no jobs. Default "No scheduled jobs yet". |
| `modelLabels` | `Record<string, React.ReactNode>` |  | Map model ids to labels. |
| `onDelete` | `(job: AgentJob) => void \| Promise<void>` |  | Called after the user confirms. |
| `onEdit` | `(job: AgentJob) => void` |  | Called with the job when the user presses Edit; the action is hidden when unset. |
| `onPause` | `(job: AgentJob) => void` |  | Called with the job when the user presses Pause; the action is hidden when unset. |
| `onResume` | `(job: AgentJob) => void` |  | Called with the job when the user presses Resume on a paused job; the action is hidden when unset. |
| `onRunNow` | `(job: AgentJob) => void` |  | Called with the job when the user presses Run now; the action is hidden when unset. |
| `onSelect` | `(job: AgentJob) => void` |  | Called with the job when a row is pressed. |
| `selectedId` | `string \| null` |  | Id of the selected job; `null` or unset selects none. |
