# PdfViewer

> pdf.js document viewer: lazily rendered canvas pages (only those near the viewport), selectable text, zoom (fit width, fit page, presets; Ctrl/Cmd+wheel, pinch, + and - keys, 0 to fit the width) and page navigation. Needs the optional `pdfjs-dist` peer.

- Import: `import { PdfViewer } from "@cleanprompt/sutra-ui/pdf"`
- Source: `packages/ui/src/kits/editor/pdf-viewer` (kit `editor`)
- `data-slot`: `pdf-error-message`, `pdf-pages`, `pdf-viewer`, `pdf-toolbar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | App controls at the end of the toolbar. |
| `blob` | `Blob` |  | PDF as a Blob or File, for example from a file input. |
| `data` | `ArrayBuffer \| Uint8Array` |  | Raw bytes. Copied before pdf.js takes ownership, so the app's buffer stays usable. |
| `defaultPage` | `number` | `1` | Default 1. |
| `defaultZoom` | `PdfZoom` | `"fit-width"` | Default `"fit-width"`. |
| `documentOptions` | `Record<string, unknown>` |  | Extra pdf.js `getDocument` options (`password`, `cMapUrl`, `standardFontDataUrl`, `wasmUrl`, `httpHeaders` …). Read when a document opens. |
| `emptyState` | `React.ReactNode` |  | Shown when there is no source and nothing is loading. |
| `errorState` | `React.ReactNode \| ((error: Error, retry: () => void) => React.ReactNode)` |  | Replaces the built-in error view. |
| `fileName` | `string` | `"document.pdf"` | File name for the download fallback and the accessible name. Default "document.pdf". |
| `height` | `number \| string` |  | Height of the viewer. Default `70dvh` (set a height or a `className` like `h-full`). |
| `loading` | `boolean` | `false` | Waiting for the source. Shows page skeletons until a document is ready. |
| `onError` | `(error: Error) => void` |  | The document couldn't be loaded. The viewer shows an error with a download link. |
| `onLoad` | `(info: { numPages: number }) => void` |  | Called with the page count once the document has opened. |
| `onPageChange` | `(page: number) => void` |  | Called with the 1-based page number as the user scrolls or navigates. |
| `onZoomChange` | `(zoom: PdfZoom) => void` |  | Called with the zoom when the user changes it. |
| `overscan` | `number` | `1` | How far beyond the visible area pages are rendered, in viewport heights. Default 1. |
| `page` | `number` |  | Current page, 1-based (controlled). Setting it scrolls to that page. |
| `textLayer` | `boolean` | `true` | Selectable, searchable text over each page (pdf.js `TextLayer`). Default true. |
| `toolbar` | `boolean` | `true` | Show the toolbar (page navigation and zoom). Default true. |
| `url` | `string` |  | Address of the PDF; fetched by pdf.js and subject to CORS. |
| `workerPort` | `Worker` |  | A `Worker` already running pdf.js's worker script, e.g. `new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })`. Shared by every document opened with it. Takes precedence over `workerSrc`. With neither option and no global `GlobalWorkerOptions` set, pdf.js runs on the main thread (its "fake worker"): it works, but parsing large files blocks the page. |
| `workerSrc` | `string` |  | URL of pdf.js's **legacy** worker script, from your bundler. With Vite: `import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"`. Sets the global `GlobalWorkerOptions.workerSrc`. The modern `pdfjs-dist/build/pdf.worker.min.mjs` works too, but only in the newest browsers; where it fails on a missing built-in the viewer warns once and parses in the page instead. Serve it from the page's origin under a strict CSP (a cross-origin worker needs `worker-src blob:`). |
| `zoom` | `PdfZoom` |  | Controlled zoom: `fit-width`, `fit-page` or a scale (1 is 100%). |

## Example (live: `#/components/files/pdf-viewer` in the playground)

```tsx
import * as React from "react";
import { FileViewer } from "@cleanprompt/sutra-ui/mobile";
import { PdfThumbnail, PdfViewer, pdfRenderer } from "@cleanprompt/sutra-ui/pdf";

function PdfDemo() {
  const blob = React.useMemo(samplePdf, []);
  const viewerFiles: ViewerFile[] = React.useMemo(
    () => [
      { name: "Quarterly report.pdf", blob, mimeType: "application/pdf", size: blob.size },
      { name: "Harbor.svg", url: gradient("#615fff", "#00b8db", "Harbor"), mimeType: "image/svg+xml" },
    ],
    [blob]
  );
  const renderers = React.useMemo(() => [pdfRenderer({ workerSrc })], []);
  return (
    <div className="grid w-full grid-cols-1 gap-4">
      <PdfViewer blob={blob} fileName="Quarterly report.pdf" workerSrc={workerSrc} height={420} />
      <div className="flex flex-wrap items-start gap-4">
        <PdfThumbnail blob={blob} workerSrc={workerSrc} width={120} alt="Quarterly report, first page" />
        <p className="max-w-sm text-sm text-muted-foreground">
          PdfThumbnail draws the first page for file cards. Below, FileViewer uses the same pdf.js viewer through{" "}
          <code>renderers=[pdfRenderer()]</code>, with gallery navigation to the next file.
        </p>
      </div>
      <FileViewer inline files={viewerFiles} renderers={renderers} className="h-[30rem]" />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): gradient, samplePdf.
