

/** How pdf.js should parse documents. Pass one of these (or set `GlobalWorkerOptions` yourself before mounting). */
export interface PdfWorkerOptions {
  /**
   * URL of pdf.js's **legacy** worker script, from your bundler. With Vite:
   * `import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"`. Sets the global
   * `GlobalWorkerOptions.workerSrc`. The modern `pdfjs-dist/build/pdf.worker.min.mjs` works too, but only in the
   * newest browsers; where it fails on a missing built-in the viewer warns once and parses in the page instead.
   * Serve it from the page's origin under a strict CSP (a cross-origin worker needs `worker-src blob:`).
   */
  workerSrc?: string;
  /**
   * A `Worker` already running pdf.js's worker script, e.g.
   * `new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })`.
   * Shared by every document opened with it. Takes precedence over `workerSrc`.
   *
   * With neither option and no global `GlobalWorkerOptions` set, pdf.js runs on the main thread (its "fake worker"):
   * it works, but parsing large files blocks the page.
   */
  workerPort?: Worker;
}

/**
 * Options pdf.js gets on top of the source. They keep it within a strict CSP: no `eval` (only pre-5.x builds still
 * read `isEvalSupported`), no WebAssembly (needs `'wasm-unsafe-eval'`; opt in with `documentOptions: { useWasm: true,
 * wasmUrl }`) and no XFA forms. `documentOptions` override them.
 */
export const PDF_CSP_SAFE_OPTIONS: Readonly<Record<string, unknown>> = Object.freeze({
  isEvalSupported: false,
  useWasm: false,
  enableXfa: false,
});

/** A PDF to open: a URL, raw bytes or a Blob (a Blob is read in place, so CSP `connect-src` needn't allow `blob:`). */
export interface PdfSource {
  /** Address of the PDF; fetched by pdf.js and subject to CORS. */
  url?: string;
  /** Raw bytes. Copied before pdf.js takes ownership, so the app's buffer stays usable. */
  data?: ArrayBuffer | Uint8Array;
  /** PDF as a Blob or File, for example from a file input. */
  blob?: Blob;
}

/** `"fit-width"`, `"fit-page"`, or a factor where 1 is 100% (the printed size). */
export type PdfZoom = "fit-width" | "fit-page" | number;
