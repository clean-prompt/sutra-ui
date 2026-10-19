# ArtifactViewer

> Full artifact panel: Preview / Code tabs, version history and fullscreen.

- Import: `import { ArtifactViewer } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/artifacts` (kit `agent`)
- `data-slot`: `artifact-viewer`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` (required) | `ArtifactKind` |  | Artifact kind (`code`, `html`, `markdown`, `svg`, `image`, `diagram`, `document` or `data`); decides which tabs apply. |
| `title` (required) | `string` |  | Artifact name, shown in the viewer header. |
| `versions` (required) | `ArtifactVersion[]` |  | All versions, oldest first. |
| `defaultFullscreen` | `boolean` | `false` | Initial fullscreen state when `fullscreen` is not controlled. |
| `defaultTab` | `ArtifactViewerTab` | `"preview"` | Initially active tab when `tab` is not controlled. |
| `defaultVersion` | `number` |  | Initially selected version index when `version` is not controlled. |
| `fullscreen` | `boolean` |  | Controlled fullscreen state. |
| `language` | `string` |  | Code language for syntax highlighting (for example `tsx`). |
| `onClose` | `() => void` |  | Called when the user closes the viewer; the close button is hidden when unset. |
| `onCopy` | `(content: string) => void` |  | Called with the content when the user presses Copy; defaults to copying to the clipboard. |
| `onDownload` | `(content: string) => void` |  | Called with the content when the user presses Download; defaults to saving a file locally. |
| `onFullscreenChange` | `(fullscreen: boolean) => void` |  | Called with the new state when the user enters or leaves fullscreen. |
| `onShare` | `() => void` |  | Called when the user presses Share; the button is shown only when set. |
| `onTabChange` | `(tab: ArtifactViewerTab) => void` |  | Called with the tab when the user switches between preview and code. |
| `onVersionChange` | `(index: number) => void` |  | Called with the version index when the user picks a version. |
| `showHistory` | `boolean` | `true` | Version history sidebar. Default true. |
| `streaming` | `boolean` | `false` | Still being generated: shows a generating state and disables download and share. |
| `tab` | `ArtifactViewerTab` |  | Controlled active tab: `preview` or `code`. |
| `version` | `number` |  | Controlled selected version index (0-based). Defaults to the latest. |

## Example (live: `#/components/browser-review/artifact-viewer` in the playground)

```tsx
import * as React from "react";
import { ArtifactViewer } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";

function ViewerDemo() {
  const [open, setOpen] = React.useState(true);
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open viewer
      </Button>
    );
  return <ArtifactViewer className="h-[520px] w-full" title="Pricing page" kind="html" versions={htmlVersions} onClose={() => setOpen(false)} onShare={() => {}} />;
}
```

Playground helpers in this snippet (not part of the library): htmlVersions.
