# JobBanner

> Banner for a long-running background job with phase dots, elapsed time and done actions.

- Import: `import { JobBanner } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/job-banner` (kit `ai`)
- `data-slot`: `job-step`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Name of the job, shown in the banner header. |
| `detail` | `React.ReactNode` |  | Extra detail, e.g. the current query. |
| `elapsed` | `number` |  | Elapsed seconds (when not using startedAt). |
| `onAskAgain` | `() => void` |  | Called when the user presses Ask again after the job ends; the button is hidden when unset. |
| `onCancel` | `() => void` |  | Called when the user cancels a running job; the Cancel button is hidden when unset. |
| `onOpenResult` | `() => void` |  | Called when the user opens the finished result; the button is hidden when unset. |
| `phase` | `string` |  | Current phase id. |
| `phases` | `JobBannerPhase[]` | `defaultJobPhases` | Ordered phases of the job (id and label), drawn as a step trail; defaults to planning, searching, reading and writing. |
| `startedAt` | `number` |  | Epoch ms the job started; elapsed time ticks itself. |
| `status` | `TaskStatusInput` | `"running"` | Lifecycle status (`running \| succeeded \| failed \| canceled`; legacy `done` / `cancelled` still work). |

## Example (live: `#/components/ai-extras/job-banner` in the playground)

```tsx
import * as React from "react";
import { JobBanner } from "@sutra/ui/ai";

function JobBannerDemo() {
  const [phase, setPhase] = React.useState(0);
  const [status, setStatus] = React.useState<"running" | "done" | "cancelled">("running");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => {
      setPhase((p) => {
        if (p >= jobPhases.length - 1) {
          setStatus("done");
          return p;
        }
        return p + 1;
      });
    }, 2500);
    return () => clearInterval(t);
  }, [status]);
  const restart = () => {
    setPhase(0);
    setStatus("running");
    setStartedAt(Date.now());
  };
  return (
    <>
      <JobBanner
        title="Compare local vector databases for a 10M-row corpus"
        phase={jobPhases[phase]}
        status={status}
        startedAt={startedAt}
        detail={status === "running" && phase === 1 ? "“sqlite-vec vs lancedb benchmark 2026”" : undefined}
        onCancel={() => setStatus("cancelled")}
        onAskAgain={restart}
        onOpenResult={() => {}}
      />
      {/* Failed */}
      <JobBanner title="Summarize every PDF in /papers" phase="reading" status="failed" elapsed={312} detail="3 of 41 files could not be read" onAskAgain={() => {}} />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): jobPhases.
