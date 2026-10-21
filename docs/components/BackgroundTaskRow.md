# BackgroundTaskRow

> Background shell job: command, status, elapsed time, output tail and a kill action.

- Import: `import { BackgroundTaskRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-tasks` (kit `agent`)
- `data-slot`: `task-elapsed`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `command` (required) | `string` |  | Command line that was started; shown in mono. |
| `startedAt` (required) | `TimeInput` |  | When the task started; the elapsed time counts from here. |
| `status` (required) | `BackgroundTaskStatusInput` |  | Status of the task (running, completed, failed, killed and so on); sets the glyph and tone. |
| `endedAt` | `TimeInput` |  | When the task ended; freezes the elapsed time. |
| `exitCode` | `number` |  | Exit code, shown once the task has ended. |
| `now` | `number` |  | Reference time for elapsed labels; the row ticks on its own when omitted. |
| `onKill` | `() => void` |  | Called when the user stops a running task; the button is hidden when unset. |
| `onOpen` | `() => void` |  | Called when the user opens the task's full output; the button is hidden when unset. |
| `output` | `string` |  | Full or partial output; only the last `tailLines` lines are shown. |
| `tailLines` | `number` | `3` | Default 3. |

## Example (live: `#/components/agent-sessions/background-task` in the playground)

```tsx
import * as React from "react";
import { BackgroundTaskRow } from "@cleanprompt/sutra-ui/agent";

function BackgroundTaskDemo() {
  const [start] = React.useState(() => Date.now() - 37_000);
  const [lines, setLines] = React.useState<string[]>(["> vite", "  VITE v6 ready in 412 ms"]);
  const [status, setStatus] = React.useState<"running" | "killed">("running");
  const [ended, setEnded] = React.useState<number | undefined>();
  React.useEffect(() => {
    if (status !== "running") return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setLines((l) => [...l, `  [hmr] update /src/app/layout.tsx (${n})`]);
    }, 1800);
    return () => clearInterval(id);
  }, [status]);
  return (
    <>
      <BackgroundTaskRow
        command="npm run dev -- --port 5173"
        status={status}
        startedAt={start}
        endedAt={ended}
        output={lines.join("\n")}
        onKill={() => {
          setStatus("killed");
          setEnded(Date.now());
        }}
      />
      <BackgroundTaskRow command="pytest -x tests/billing" status="failed" exitCode={1} startedAt={0} endedAt={84_000} output={"FAILED tests/billing/test_refunds.py::test_partial\n1 failed, 211 passed in 83.9s"} />
    </>
  );
}
```
