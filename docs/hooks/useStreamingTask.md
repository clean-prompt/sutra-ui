# useStreamingTask

> Consume an async iterator or EventSource-like emitter of `{ progress, phase, log }` events into state.

- Import: `import { useStreamingTask } from "@cleanprompt/sutra-ui/ops"`
- Source: `packages/ui/src/kits/ops/progress-dialog`

## Signature

```ts
useStreamingTask(options?: UseStreamingTaskOptions): UseStreamingTaskResult
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `maxLogLines` | `number` |  | Cap on retained log lines. Default 2000. |
| `onError` | `(error: string) => void` |  |  |
| `onSuccess` | `() => void` |  |  |
| `task` | `StreamingTaskStarter` |  | Default starter used by `start()` / `retry()` when none is passed. |
