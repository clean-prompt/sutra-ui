# LocalModelBrowser

> Searchable list of downloadable local models with quant variants, fit hints and download progress.

- Import: `import { LocalModelBrowser } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/local-models` (kit `agent-admin`)
- `data-slot`: `local-model-browser`, `local-model-item`, `local-model-progress`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `models` (required) | `LocalModelListing[]` |  | Models available to download, each with its quantisation options. |
| `downloads` | `Record<string, LocalModelDownloadState>` | `{}` | Per-model download state, keyed by model id. |
| `hardware` | `HardwareProfile` |  | Machine profile; when set, each model shows a hardware-fit hint. |
| `onCancelDownload` | `(modelId: string) => void` |  | Called with the model id when the user cancels a running download. |
| `onDownload` | `(modelId: string, quant: string) => void` |  | Called with the model id and the chosen quantisation when the user starts a download. |
| `onQueryChange` | `(q: string) => void` |  | Called with the search text when the user types in the search field. |
| `query` | `string` |  | Search text that filters the list; controlled by the parent when set. |

## Example (live: `#/components/providers/local-model-browser` in the playground)

```tsx
import * as React from "react";
import { LocalModelBrowser } from "@sutra/ui/agent-admin";

function BrowserDemo() {
  const [downloads, setDownloads] = React.useState<Record<string, LocalModelDownloadState>>({ "kestrel-14b": { status: "done" } });
  const timers = React.useRef<Record<string, ReturnType<typeof setInterval>>>({});
  React.useEffect(() => () => Object.values(timers.current).forEach(clearInterval), []);
  const start = (id: string, quant: string) => {
    const size = (localModels.find((m) => m.id === id)?.variants.find((v) => v.quant === quant)?.sizeGB ?? 1) * GB;
    const rate = (90 + Math.random() * 120) * 1024 ** 2;
    setDownloads((d) => ({ ...d, [id]: { status: "downloading", receivedBytes: 0, totalBytes: size, bytesPerSecond: rate, quant } }));
    timers.current[id] = setInterval(() => {
      setDownloads((d) => {
        const cur = d[id];
        if (!cur || cur.status !== "downloading") return d;
        const next = Math.min(size, (cur.receivedBytes ?? 0) + rate * 2);
        if (next >= size) {
          clearInterval(timers.current[id]);
          return { ...d, [id]: { status: "done", quant } };
        }
        return { ...d, [id]: { ...cur, receivedBytes: next } };
      });
    }, 250);
  };
  return (
    <div className="w-full max-w-3xl">
      <LocalModelBrowser
        models={localModels}
        hardware={hardware}
        downloads={downloads}
        onDownload={start}
        onCancelDownload={(id) => {
          clearInterval(timers.current[id]);
          setDownloads((d) => {
            const { [id]: _removed, ...rest } = d;
            return rest;
          });
        }}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): GB, hardware, localModels.
