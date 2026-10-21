# FileViewer

> Previews a file by type (image, PDF, video, audio, text/code/markdown/JSON) in a modal or inline. Apps can add their own renderers, browse several `files`, put actions in the header and show a side panel.

- Import: `import { FileViewer } from "@sutra/ui"` (or from `@sutra/ui/mobile`)
- Source: `packages/ui/src/patterns/file-viewer` (patterns)
- `data-slot`: `file-viewer-nav`, `file-viewer-position`, `file-viewer-panel`, `file-viewer`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `FileViewerSlot` |  | App actions in the header (share, rename, delete …), before the built-in download and close actions. |
| `className` | `string` |  | Classes for the viewer root. |
| `defaultIndex` | `number` | `0` | Initial position in `files` (uncontrolled). Default 0. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultPanelOpen` | `boolean` | `true` | Default true. |
| `download` | `boolean` | `true` | Show the header download action. Default true when the file has a URL. |
| `emptyState` | `React.ReactNode` |  | Shown when `files` is empty and nothing is loading. |
| `file` | `ViewerFile` |  | The file to show. In a gallery, pass `files` instead. |
| `files` | `ViewerFile[]` |  | Files to browse with previous/next buttons, ←/→ and an optional thumbnail strip. Takes precedence over `file`. |
| `index` | `number` |  | Position in `files` (controlled). |
| `inline` | `boolean` | `false` | Render in place instead of in a modal. |
| `kind` | `FilePreviewKind` |  | Override the detected renderer. |
| `loading` | `boolean` | `false` | Waiting for the file (or its URL). Shows skeletons until there is something to show. |
| `loadText` | `(file: ViewerFile) => Promise<string>` |  | Load text content (default: `file.blob`, then `fetch(file.url)`). |
| `loop` | `boolean` | `false` | Wrap from the last file to the first and back. Default false. |
| `onClose` | `() => void` |  | Close action for inline viewers (modal viewers close via `onOpenChange`). |
| `onDownload` | `() => void` |  | Called when the download button is clicked; setting it shows the button. |
| `onIndexChange` | `(index: number, file: ViewerFile) => void` |  | Called with the new index and the file when the user browses to another file. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the modal viewer opens or closes. |
| `onPanelOpenChange` | `(open: boolean) => void` |  | Called when the side panel opens or closes. |
| `open` | `boolean` |  | Controlled open state of the modal viewer. Use with `onOpenChange`. |
| `openInNewTab` | `boolean` |  | Show the "open in new tab" action. Default true when the file has a URL. |
| `panel` | `FileViewerSlot` |  | Side panel (details, metadata, comments). Sits beside the content on wide viewers and below it on narrow ones. |
| `panelLabel` | `string` | `"Details"` | Name of the side panel and its header toggle. Default "Details". |
| `panelOpen` | `boolean` |  | Controlled open state of the details side panel. Use with `onPanelOpenChange`. |
| `renderers` | `FileRenderer[]` |  | App renderers, tried in order before the built-in kinds. |
| `subtitle` | `FileViewerSlot` |  | Line under the title (default: the formatted size). |
| `text` | `string` |  | Text content for text/code/markdown/json files (single `file` only; in a gallery set each file's `text`). |
| `thumbnails` | `boolean` | `false` | Show a thumbnail strip under the content when browsing several files. Default false. |
| `title` | `FileViewerSlot` |  | Header title (default: the file name). Also the dialog's accessible name. |

## Example (live: `#/components/mobile/file-viewer` in the playground)

```tsx
import * as React from "react";
import { Button } from "@sutra/ui/core";
import { FilePreviewCard, FileViewer } from "@sutra/ui/mobile";

function FileViewerDemo() {
  const pdfUrl = React.useMemo(() => URL.createObjectURL(new Blob([PDF_SOURCE], { type: "application/pdf" })), []);
  React.useEffect(() => () => URL.revokeObjectURL(pdfUrl), [pdfUrl]);
  const files: Array<ViewerFile & { textContent?: string }> = [
    { name: "harbor.svg", url: gallery[0]!.src, size: 284_000, mimeType: "image/svg+xml" },
    { name: "Quarterly report.pdf", url: pdfUrl, size: PDF_SOURCE.length },
    { name: "RELEASE_NOTES.md", size: markdownSample.length, textContent: markdownSample },
    { name: "document.json", size: jsonSample.length, textContent: jsonSample },
    { name: "backup-2026-10.zip", size: 48_200_000, url: "data:application/zip;base64,UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==" },
  ];
  const viewerFiles: ViewerFile[] = files.map(({ textContent, ...f }) => ({ ...f, text: textContent }));
  const [active, setActive] = React.useState<number | null>(null);
  const current = active === null ? null : files[active]!;
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        {files.map((f, i) => (
          <FilePreviewCard key={f.name} file={f} onClick={() => setActive(i)} />
        ))}
      </div>
      {current && (
        <FileViewer
          files={viewerFiles}
          index={active ?? 0}
          onIndexChange={(i) => setActive(i)}
          thumbnails
          actions={<Button size="xs" variant="ghost">Share</Button>}
          panel={(file) => <FileDetails file={file} />}
          defaultPanelOpen={false}
          open={active !== null}
          onOpenChange={(o) => !o && setActive(null)}
        />
      )}
      {/* Inline gallery with a details panel (arrow keys move between files) */}
      <FileViewer inline files={viewerFiles} defaultIndex={0} panel={(file) => <FileDetails file={file} />} className="h-[28rem]" />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): FileDetails, PDF_SOURCE, gallery, jsonSample, markdownSample.
