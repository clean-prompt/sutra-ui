# RunHistory

> Past runs of a job: start, duration, status, cost/tokens, trigger, error snippet and a transcript link.

- Import: `import { RunHistory } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-list` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `runs` (required) | `AgentJobRun[]` |  | Past runs of the job, newest first. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no runs. Default "No runs yet". |
| `hasMore` | `boolean` |  | More runs exist on the server; "Load more" calls `onLoadMore` once local runs are exhausted. |
| `loadingMore` | `boolean` |  | Shows a busy state on the "Load more" button while the next page is fetched. |
| `locale` | `string` |  | BCP 47 locale used to format run times. Default "en-US". |
| `onLoadMore` | `() => void` |  | Called when the user presses "Load more" after the local runs are all shown and `hasMore` is true. |
| `onOpenTranscript` | `(run: AgentJobRun) => void` |  | Called with the run when the user opens its transcript; the link is hidden when unset. |
| `pageSize` | `number` | `5` | Runs revealed per "Load more". Default 5. |
