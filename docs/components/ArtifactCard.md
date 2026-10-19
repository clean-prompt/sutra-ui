# ArtifactCard

> Promoted artifact from a code fence or tool: kind, versions, streaming state, actions and a safe preview.

- Import: `import { ArtifactCard } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/artifacts` (kit `agent`)
- `data-slot`: `artifact-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` (required) | `ArtifactKind` |  | Artifact kind (`code`, `html`, `markdown`, `svg`, `image`, `diagram`, `document` or `data`); picks the icon and preview. |
| `title` (required) | `string` |  | Artifact name, shown as the card title. |
| `content` | `string` |  | Body of a single-version artifact; use `versions` for several. |
| `defaultRenderHtml` | `boolean` | `false` | Initial value of `renderHtml` when it is not controlled. |
| `defaultVersion` | `number` |  | Initially shown version index when `version` is not controlled. Defaults to the latest. |
| `description` | `React.ReactNode` |  | Secondary line under the title. |
| `language` | `string` |  | Code language for syntax highlighting (for example `tsx`). |
| `onCopy` | `(content: string) => void` |  | Defaults to copying the content to the clipboard. |
| `onDownload` | `(content: string) => void` |  | Defaults to saving a file locally. |
| `onOpen` | `() => void` |  | Called when the user opens the artifact (for example in the full viewer); the Open button is hidden when unset. |
| `onRenderHtmlChange` | `(render: boolean) => void` |  | Called with the new state when the user toggles between rendered HTML and source. |
| `onShare` | `() => void` |  | Shown only when provided. |
| `onVersionChange` | `(index: number) => void` |  | Called with the version index when the user switches versions. |
| `preview` | `boolean` | `true` | Show the compact preview. Default true. |
| `previewMaxHeight` | `number \| string` | `220` | Maximum height of the preview before it scrolls; a number is px. |
| `renderHtml` | `boolean` |  | HTML artifacts: render in the sandboxed iframe instead of source (opt-in). |
| `streaming` | `boolean` | `false` | Still being generated: shimmer + "Generating…", download/share disabled. |
| `version` | `number` |  | Selected version index (0-based). Defaults to the latest. |
| `versions` | `ArtifactVersion[]` |  | All versions, oldest first. Alternatively pass `content` for a single version. |

## Example (live: `#/components/browser-review/artifact-streaming` in the playground)

```tsx
import * as React from "react";
import { ArtifactCard } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";

function StreamingCard() {
  const full = "# Release notes\n\nThis release adds the **agent browser**, artifact cards and a git review set.\n\n- Annotate pages for the agent\n- Version history for artifacts\n- Ship bar with split actions";
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    if (n >= full.length) return;
    const t = window.setTimeout(() => setN((v) => Math.min(full.length, v + 6)), 60);
    return () => window.clearTimeout(t);
  }, [n, full.length]);
  return (
    <div className="w-full space-y-2">
      <ArtifactCard title="Release notes" kind="markdown" content={full.slice(0, n)} streaming={n < full.length} />
      <Button size="xs" variant="ghost" onClick={() => setN(0)}>
        Replay stream
      </Button>
    </div>
  );
}
```
