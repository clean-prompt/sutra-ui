import * as React from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { clamp } from "../../lib/math";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { useObjectUrl } from "../../hooks/use-object-url";
import { Skeleton } from "../../primitives/progress";
import { PDF_CSP_SAFE_OPTIONS, type PdfSource, type PdfWorkerOptions, type PdfZoom } from "./pdf-viewer-model";

/*
 * pdfjs-dist (v5) is an optional peer. It is only loaded through dynamic `import()` when a viewer or thumbnail
 * mounts; the type-only import above is erased. Keep this module out of the root barrel.
 */

/* ------------------------------------------------------------------ */
/* Loading pdf.js                                                      */
/* ------------------------------------------------------------------ */

type Pdfjs = typeof import("pdfjs-dist");

/*
 * pdf.js 5's default ("modern") build calls very new built-ins without polyfills (`Map#getOrInsertComputed`,
 * `Uint8Array#toHex`/`toBase64`, `Uint8Array.fromBase64`), so it throws in browsers only a few releases old
 * (e.g. Chromium 130) and in Node 22. The legacy build is the same API with those polyfilled, about 60 kB larger,
 * so that is what loads here, and the in-page worker is the legacy one too.
 */

/** Shared across every viewer and remount (StrictMode); a failed load is forgotten so a later mount can retry. */
let pdfjsModule: Promise<Pdfjs> | null = null;
function loadPdfjs(): Promise<Pdfjs> {
  pdfjsModule ??= (import("pdfjs-dist/legacy/build/pdf.mjs") as unknown as Promise<Pdfjs>).catch((err) => {
    pdfjsModule = null;
    throw err;
  });
  return pdfjsModule;
}

const hasInPageWorker = () => Boolean((globalThis as { pdfjsWorker?: unknown }).pdfjsWorker);

/** In-page copy of the pdf.js worker: used when the app configured no worker, or its worker can't run here. */
let mainThreadWorker: Promise<void> | null = null;
function loadMainThreadWorker(): Promise<void> {
  mainThreadWorker ??= (
    // @ts-ignore pdfjs-dist ships no declarations for the worker entry; it is loaded for its side effect.
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs") as Promise<{ WorkerMessageHandler?: unknown }>
  )
    .then((mod) => {
      // The module sets this itself; set it again in case a bundler wrapped the module.
      const g = globalThis as { pdfjsWorker?: unknown };
      if (!g.pdfjsWorker && mod?.WorkerMessageHandler) g.pdfjsWorker = { WorkerMessageHandler: mod.WorkerMessageHandler };
    })
    .catch((err) => {
      mainThreadWorker = null;
      throw err;
    });
  return mainThreadWorker;
}

/**
 * The app's worker script failed on a missing built-in (typically the modern `pdf.worker.min.mjs` in a browser that
 * lacks `Uint8Array#toHex` or `Map#getOrInsertComputed`). pdf.js wraps worker errors as `UnknownErrorException`.
 */
function isUnsupportedWorkerError(err: unknown) {
  const e = err as { name?: string; message?: string } | null;
  return e?.name === "UnknownErrorException" && /is not a function|is not defined|is not a constructor/.test(e.message ?? "");
}

let warnedInPage = false;


function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read the PDF"));
    reader.readAsArrayBuffer(blob);
  });
}

async function openPdf(
  source: PdfSource,
  worker: PdfWorkerOptions,
  documentOptions: Record<string, unknown> | undefined,
  alive: () => boolean,
  inPage: boolean
): Promise<{ pdfjs: Pdfjs; task: PDFDocumentLoadingTask } | null> {
  const pdfjs = await loadPdfjs();
  const opts = pdfjs.GlobalWorkerOptions;
  let sharedWorker: unknown;
  if (inPage) {
    // With `globalThis.pdfjsWorker` set, pdf.js skips `workerSrc` and runs its worker code in the page.
    await loadMainThreadWorker();
  } else if (worker.workerPort) {
    sharedWorker = pdfjs.PDFWorker.create({ port: worker.workerPort as never });
  } else if (worker.workerSrc) {
    if (opts.workerSrc !== worker.workerSrc) opts.workerSrc = worker.workerSrc;
  } else if (!opts.workerSrc && !opts.workerPort && !hasInPageWorker()) {
    await loadMainThreadWorker();
  }
  let input: { url?: string; data?: Uint8Array };
  if (source.data) {
    const bytes = source.data instanceof Uint8Array ? source.data : new Uint8Array(source.data);
    input = { data: bytes.slice() };
  } else if (source.blob) {
    input = { data: new Uint8Array(await readBlob(source.blob)) };
  } else {
    input = { url: source.url };
  }
  if (!alive()) return null;
  const task = pdfjs.getDocument({
    ...PDF_CSP_SAFE_OPTIONS,
    ...documentOptions,
    ...input,
    ...(sharedWorker ? { worker: sharedWorker } : null),
  } as Parameters<Pdfjs["getDocument"]>[0]);
  return { pdfjs, task };
}

/**
 * Open a document, reporting each loading task through `track` (so the caller's cleanup can destroy it). If the app's
 * worker can't run in this browser, retry once with the in-page worker.
 */
export async function loadDocument(
  source: PdfSource,
  worker: PdfWorkerOptions,
  documentOptions: Record<string, unknown> | undefined,
  alive: () => boolean,
  track: (task: PDFDocumentLoadingTask) => void
): Promise<{ pdfjs: Pdfjs; doc: PDFDocumentProxy } | null> {
  let last: PDFDocumentLoadingTask | null = null;
  const run = async (inPage: boolean) => {
    const opened = await openPdf(source, worker, documentOptions, alive, inPage);
    if (!opened) return null;
    last = opened.task;
    track(opened.task);
    return { pdfjs: opened.pdfjs, doc: await opened.task.promise };
  };
  try {
    return await run(false);
  } catch (err) {
    if (!alive() || !isUnsupportedWorkerError(err) || hasInPageWorker()) throw err;
    void (last as PDFDocumentLoadingTask | null)?.destroy().catch(() => {});
    if (!warnedInPage && typeof console !== "undefined") {
      warnedInPage = true;
      console.warn(
        "PdfViewer: the pdf.js worker can't run in this browser; parsing PDFs in the page instead. " +
          'Use the legacy worker ("pdfjs-dist/legacy/build/pdf.worker.min.mjs") as workerSrc.',
        err
      );
    }
    return run(true);
  }
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(typeof err === "string" ? err : "Failed to load PDF");
}

export function errorText(error: Error): string {
  if (error.name === "PasswordException") return "This PDF is password-protected.";
  if (error.name === "InvalidPDFException") return "This file isn’t a valid PDF.";
  if (error.name === "MissingPDFException" || error.name === "ResponseException") return "The PDF couldn’t be downloaded.";
  return "Something went wrong while opening it.";
}

export function isCancel(err: unknown) {
  const name = (err as { name?: string } | null)?.name;
  return name === "RenderingCancelledException" || name === "AbortException";
}

/** 1 PDF point = 1/72 in, 1 CSS px = 1/96 in: 100% zoom shows the page at its printed size. */
export const CSS_UNITS = 96 / 72;
/** Keep a canvas under ~16.7 MP (the common browser limit); beyond that the bitmap is upscaled. */
const MAX_CANVAS_PIXELS = 4096 * 4096;

function outputScale(cssWidth: number, cssHeight: number) {
  const dpr = typeof window !== "undefined" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const area = cssWidth * cssHeight;
  return area * dpr * dpr > MAX_CANVAS_PIXELS ? Math.max(0.1, Math.sqrt(MAX_CANVAS_PIXELS / area)) : dpr;
}

/** Render one page into a canvas at `cssScale`, sharp on high-DPI screens. Returns the task (cancel it on cleanup). */
export function renderPage(page: PDFPageProxy, canvas: HTMLCanvasElement, cssScale: number): RenderTask {
  const viewport = page.getViewport({ scale: cssScale });
  const ratio = outputScale(viewport.width, viewport.height);
  canvas.width = Math.max(1, Math.floor(viewport.width * ratio));
  canvas.height = Math.max(1, Math.floor(viewport.height * ratio));
  return page.render({
    canvas,
    viewport,
    transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
  });
}

/** URL for a download fallback: the source URL, or an object URL for the bytes (revoked on change/unmount). */
export function useDownloadUrl(enabled: boolean, source: PdfSource) {
  const { url, data, blob } = source;
  const fileBlob = React.useMemo(() => {
    if (!enabled || url || (!blob && !data) || typeof URL.createObjectURL !== "function") return null;
    return blob ?? new Blob([data as BlobPart], { type: "application/pdf" });
  }, [enabled, url, data, blob]);
  const objectUrl = useObjectUrl(fileBlob);
  return url ?? objectUrl;
}

/* ------------------------------------------------------------------ */
/* Document state                                                      */
/* ------------------------------------------------------------------ */

export interface PageSize {
  width: number;
  height: number;
}

type DocState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pdfjs: Pdfjs; doc: PDFDocumentProxy; first: PageSize }
  | { status: "error"; error: Error };

export function usePdfDocument({
  source,
  worker,
  documentOptions,
  onLoad,
  onError,
}: {
  source: PdfSource;
  worker: PdfWorkerOptions;
  documentOptions?: Record<string, unknown>;
  onLoad?: (info: { numPages: number }) => void;
  onError?: (error: Error) => void;
}) {
  const { url, data, blob } = source;
  const { workerSrc, workerPort } = worker;
  const hasSource = Boolean(url || data || blob);
  const [state, setState] = React.useState<DocState>(hasSource ? { status: "loading" } : { status: "idle" });
  const [attempt, setAttempt] = React.useState(0);
  const optionsRef = useLatestRef(documentOptions);
  const onLoadRef = useLatestRef(onLoad);
  const onErrorRef = useLatestRef(onError);

  React.useEffect(() => {
    if (!hasSource) {
      setState({ status: "idle" });
      return;
    }
    let alive = true;
    const held: { task: PDFDocumentLoadingTask | null } = { task: null };
    setState({ status: "loading" });
    (async () => {
      const opened = await loadDocument({ url, data, blob }, { workerSrc, workerPort }, optionsRef.current, () => alive, (t) => {
        held.task = t;
      });
      if (!opened || !alive) return;
      const { doc } = opened;
      const firstPage = await doc.getPage(1);
      if (!alive) return;
      const vp = firstPage.getViewport({ scale: 1 });
      setState({ status: "ready", pdfjs: opened.pdfjs, doc, first: { width: vp.width, height: vp.height } });
      onLoadRef.current?.({ numPages: doc.numPages });
    })().catch((err: unknown) => {
      if (!alive) return;
      const error = toError(err);
      setState({ status: "error", error });
      if (onErrorRef.current) onErrorRef.current(error);
      else if (typeof console !== "undefined") console.warn("PdfViewer: couldn't open the PDF", error);
    });
    return () => {
      alive = false;
      void held.task?.destroy().catch(() => {});
    };
  }, [hasSource, url, data, blob, workerSrc, workerPort, attempt, optionsRef, onLoadRef, onErrorRef]);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}


/* ------------------------------------------------------------------ */
/* Zoom                                                                */
/* ------------------------------------------------------------------ */

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 5;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
/** Padding around the page column (px), matching the scroller's `p-4`. */
export const GUTTER = 16;

export const roundZoom = (z: number) => clamp(Math.round(z * 100) / 100, MIN_ZOOM, MAX_ZOOM);

export function stepZoom(current: number, dir: 1 | -1) {
  if (dir > 0) return ZOOM_STEPS.find((s) => s > current + 0.005) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((s) => s < current - 0.005) ?? MIN_ZOOM;
}

export function resolveZoom(zoom: PdfZoom, first: PageSize | null, avail: PageSize) {
  if (typeof zoom === "number") return Number.isFinite(zoom) ? roundZoom(zoom) : 1;
  if (!first || avail.width <= 0) return 1;
  const byWidth = (avail.width - GUTTER * 2) / (first.width * CSS_UNITS);
  const fit = zoom === "fit-page" && avail.height > 0 ? Math.min(byWidth, (avail.height - GUTTER * 2) / (first.height * CSS_UNITS)) : byWidth;
  return clamp(Math.floor(fit * 100) / 100, MIN_ZOOM, MAX_ZOOM);
}


/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** pdf.js text-layer rules (from its `pdf_viewer.css`) as utilities, so no stylesheet or inline `<style>` is needed. */
const textLayerClass = [
  // rtl-physical x2: pdf.js text layer: absolute spans placed from the page's physical top-left
  "absolute inset-0 z-0 origin-top-left overflow-clip leading-none [text-align:initial] [text-size-adjust:none] [forced-color-adjust:none] [caret-color:CanvasText] selection:bg-primary/25",
  "[&_:is(span,br)]:absolute [&_:is(span,br)]:origin-top-left [&_:is(span,br)]:cursor-text [&_:is(span,br)]:whitespace-pre [&_:is(span,br)]:text-transparent",
  "[&_.markedContent]:contents [&_br::selection]:bg-transparent",
  "[&_span:not(.markedContent)]:z-[1] [&_span:not(.markedContent)]:[font-size:calc(var(--total-scale-factor)*var(--min-font-size,1)*var(--font-height,0px))]",
  "[&_span:not(.markedContent)]:[transform:rotate(var(--rotate,0deg))_scaleX(var(--scale-x,1))_scale(calc(1/var(--min-font-size,1)))]"
].join(" ");

interface PdfPageViewProps {
  pdfjs: Pdfjs;
  doc: PDFDocumentProxy;
  pageNumber: number;
  numPages: number;
  size: PageSize;
  cssScale: number;
  near: boolean;
  textLayer: boolean;
  onSize: (pageNumber: number, size: PageSize) => void;
}

export const PdfPageView = React.memo(function PdfPageView({ pdfjs, doc, pageNumber, numPages, size, cssScale, near, textLayer, onSize }: PdfPageViewProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = React.useState(false);
  const onSizeRef = useLatestRef(onSize);

  React.useEffect(() => {
    setRendered(false);
    if (!near) return;
    let alive = true;
    let task: RenderTask | null = null;
    let text: { cancel: () => void } | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!alive || !canvas) return;
      const base = page.getViewport({ scale: 1 });
      onSizeRef.current(pageNumber, { width: base.width, height: base.height });
      task = renderPage(page, canvas, cssScale);
      await task.promise;
      if (!alive) return;
      setRendered(true);
      const container = textRef.current;
      if (textLayer && container && pdfjs.TextLayer) {
        container.replaceChildren();
        const layer = new pdfjs.TextLayer({
          textContentSource: page.streamTextContent(),
          container,
          viewport: page.getViewport({ scale: cssScale }),
        });
        text = layer;
        await layer.render();
      }
    })().catch((err: unknown) => {
      if (alive && !isCancel(err) && typeof console !== "undefined") console.warn(`PdfViewer: page ${pageNumber} failed to render`, err);
    });
    return () => {
      alive = false;
      task?.cancel();
      text?.cancel();
    };
  }, [pdfjs, doc, pageNumber, cssScale, near, textLayer, onSizeRef]);

  const width = Math.floor(size.width * cssScale);
  const height = Math.floor(size.height * cssScale);
  return (
    <div
      role="group"
      aria-label={`Page ${pageNumber} of ${numPages}`}
      data-pdf-page={pageNumber}
      data-rendered={rendered || undefined}
      className="relative shrink-0 overflow-hidden bg-white shadow-sm ring-1 ring-border"
      style={{ width, height }}
    >
      {near && <canvas ref={canvasRef} aria-hidden className="block size-full" />}
      {near && textLayer && (
        <div
          ref={textRef}
          data-slot="pdf-text-layer"
          className={textLayerClass}
          style={{ "--total-scale-factor": cssScale, "--scale-round-x": "1px", "--scale-round-y": "1px" } as React.CSSProperties}
        />
      )}
      {!rendered && <Skeleton aria-hidden shimmer={near} className="absolute inset-0 bg-white" />}
    </div>
  );
});
