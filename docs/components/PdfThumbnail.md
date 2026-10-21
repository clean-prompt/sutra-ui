# PdfThumbnail

> One page of a PDF (the first by default) drawn small, for cards and lists. Needs the optional `pdfjs-dist` peer.

- Import: `import { PdfThumbnail } from "@cleanprompt/sutra-ui/pdf"`
- Source: `packages/ui/src/kits/editor/pdf-viewer-thumbnail` (kit `editor`)
- `data-slot`: `pdf-thumbnail`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `alt` | `string` |  | Accessible description. Without it the thumbnail is decorative (hidden from assistive tech). |
| `blob` | `Blob` |  | PDF as a Blob or File, for example from a file input. |
| `data` | `ArrayBuffer \| Uint8Array` |  | Raw bytes. Copied before pdf.js takes ownership, so the app's buffer stays usable. |
| `documentOptions` | `Record<string, unknown>` |  | Extra pdf.js `getDocument` options (`password`, `cMapUrl` and so on); read when the document opens. |
| `fallback` | `React.ReactNode` |  | Shown when the page can't be rendered. Default: a PDF file icon. |
| `lazy` | `boolean` | `true` | Wait until the thumbnail is near the viewport before loading. Default true. |
| `loading` | `boolean` | `false` | Waiting for the source: shows a skeleton. |
| `onError` | `(error: Error) => void` |  | Called with the error when the document or page cannot be loaded. |
| `onLoad` | `(info: { numPages: number }) => void` |  | Called with the page count once the document has opened. |
| `page` | `number` | `1` | Page to show, 1-based. Default 1. |
| `url` | `string` |  | Address of the PDF; fetched by pdf.js and subject to CORS. |
| `width` | `number` | `160` | Width in CSS pixels; the height follows the page. Default 160. |
| `workerPort` | `Worker` |  | A `Worker` already running pdf.js's worker script, e.g. `new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })`. Shared by every document opened with it. Takes precedence over `workerSrc`. With neither option and no global `GlobalWorkerOptions` set, pdf.js runs on the main thread (its "fake worker"): it works, but parsing large files blocks the page. |
| `workerSrc` | `string` |  | URL of pdf.js's **legacy** worker script, from your bundler. With Vite: `import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"`. Sets the global `GlobalWorkerOptions.workerSrc`. The modern `pdfjs-dist/build/pdf.worker.min.mjs` works too, but only in the newest browsers; where it fails on a missing built-in the viewer warns once and parses in the page instead. Serve it from the page's origin under a strict CSP (a cross-origin worker needs `worker-src blob:`). |
