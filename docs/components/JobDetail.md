# JobDetail

> Detail pane for one job: actions, schedule and next runs, configuration and run history.

- Import: `import { JobDetail } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-list` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `job` (required) | `AgentJob` |  | The job to show (schedule, prompt, model, delivery, state). |
| `deliveryStatus` | `Partial<Record<DeliveryPlatform, DeliveryPlatformStatus>>` |  | Delivery state per target platform, shown next to each delivery target. |
| `hasMoreRuns` | `boolean` |  | More runs exist on the server; enables "Load more" in the history. |
| `loadingMoreRuns` | `boolean` |  | Shows a busy state on "Load more" while the next page is fetched. |
| `modelLabel` | `React.ReactNode` |  | Display label for the job's model id. |
| `now` | `Date \| number` |  | Reference time for relative labels; set it in tests and SSR for stable output. |
| `onDelete` | `(job: AgentJob) => void \| Promise<void>` |  | Called after the user confirms. |
| `onEdit` | `(job: AgentJob) => void` |  | Called with the job when the user presses Edit; the action is hidden when unset. |
| `onLoadMoreRuns` | `() => void` |  | Called when the user asks for the next page of runs. |
| `onOpenTranscript` | `(run: AgentJobRun) => void` |  | Called with the run when the user opens its transcript. |
| `onPause` | `(job: AgentJob) => void` |  | Called with the job when the user presses Pause; the action is hidden when unset. |
| `onResume` | `(job: AgentJob) => void` |  | Called with the job when the user presses Resume on a paused job; the action is hidden when unset. |
| `onRunNow` | `(job: AgentJob) => void` |  | Called with the job when the user presses Run now; the action is hidden when unset. |
| `runs` | `AgentJobRun[]` | `[]` | Past runs, shown in the history list and the timeline. |
| `runsPageSize` | `number` |  | Runs revealed per "Load more" in the history. |
| `showTimeline` | `boolean` |  | Show a timeline of recent runs. |
| `timeZone` | `string` |  | IANA time zone used to describe the schedule and format times (for example `Europe/Berlin`); the viewer's zone when unset. |
