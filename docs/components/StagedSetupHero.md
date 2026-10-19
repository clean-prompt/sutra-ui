# StagedSetupHero

> One-click local-model quickstart: stage rail with statuses, per-stage CTA, download progress and retry.

- Import: `import { StagedSetupHero } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/local-models` (kit `agent-admin`)
- `data-slot`: `staged-setup-hero`, `setup-current-stage`, `setup-download`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `stages` (required) | `SetupStage[]` |  | Setup stages in order, each with an id, title, status and optional action. |
| `description` | `React.ReactNode` | `"Private, offline and free. We'll set everything up in a few steps."` | Helper text under the heading. |
| `download` | `SetupDownloadProgress` |  | Progress for the stage with id `download` (or `downloadStageId`). |
| `downloadStageId` | `string` | `"download"` | Id of the stage that `download` progress belongs to. Default "download". |
| `onAction` | `(stageId: string) => void` |  | Called with the stage id when the user presses the current stage's action button (its `actionLabel`). |
| `onCancelDownload` | `() => void` |  | Called when the user cancels the running download; the Cancel button is hidden when unset. |
| `onRetry` | `(stageId: string) => void` |  | Called with the stage id when the user retries a failed stage. |
| `readyContent` | `React.ReactNode` |  | Content shown once every stage is done. |
| `title` | `React.ReactNode` | `"Run models on this machine"` | Heading of the hero. Default "Run models on this machine". |

## Example (live: `#/components/providers/local-setup-hero` in the playground)

```tsx
import * as React from "react";
import { StagedSetupHero } from "@sutra/ui/agent-admin";
import { Button } from "@sutra/ui/core";

function SetupHeroDemo() {
  const [stages, setStages] = React.useState(initialStages);
  const [received, setReceived] = React.useState(0);
  const [failedOnce, setFailedOnce] = React.useState(false);
  const total = 4.9 * GB;
  const rate = 180 * 1024 ** 2;
  const downloading = stages.find((s) => s.id === "download")?.status === "active";

  const advance = (id: string, extra?: Partial<SetupStage>) =>
    setStages((s) => {
      const i = s.findIndex((x) => x.id === id);
      return s.map((x, j) => (j === i ? { ...x, status: "done", error: undefined, ...extra } : j === i + 1 ? { ...x, status: "active" } : x));
    });

  React.useEffect(() => {
    if (!downloading) return;
    const t = setInterval(() => {
      setReceived((r) => {
        const next = Math.min(total, r + rate / 5);
        if (!failedOnce && next > total * 0.4) {
          setFailedOnce(true);
          setStages((s) => s.map((x) => (x.id === "download" ? { ...x, status: "error", error: "Connection reset at 40%. Your progress is kept." } : x)));
        } else if (next >= total) {
          advance("download");
        }
        return next;
      });
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloading, failedOnce]);

  return (
    <div className="w-full max-w-2xl space-y-2">
      <StagedSetupHero
        stages={stages}
        onAction={(id) => (id === "ready" ? undefined : id === "engine" ? void sleep(800).then(() => advance("engine")) : advance(id))}
        onRetry={(id) => setStages((s) => s.map((x) => (x.id === id ? { ...x, status: "active", error: undefined } : x)))}
        download={downloading ? { receivedBytes: received, totalBytes: total, bytesPerSecond: rate, label: "Wren 8B" } : undefined}
        onCancelDownload={() => setStages((s) => s.map((x) => (x.id === "download" ? { ...x, status: "error", error: "Download cancelled." } : x)))}
        readyContent={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-success">Wren 8B is ready on this machine.</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStages(initialStages);
                setReceived(0);
                setFailedOnce(false);
              }}
            >
              Restart demo
            </Button>
          </div>
        }
      />
      {/* The download fails once at 40% so you can try Retry. */}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): GB, initialStages, sleep.
