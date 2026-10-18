import * as React from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiRefreshLine,
  RiZoomInLine,
  RiZoomOutLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { assignRef } from "../../lib/refs";
import { isEditableTarget } from "../../lib/shortcuts";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useIsoLayoutEffect, useLatestRef } from "../../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { FileFormatIcon } from "../../assets/file-format";
import { Button } from "../../primitives/button";
import { Skeleton } from "../../primitives/progress";
import { InlineAlert, InlineAlertActions, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../primitives/dropdown-menu";
import type { FileRenderer, FileRendererContext, FilePreviewKind, ViewerFile } from "../../patterns/file-viewer";

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
  url?: string;
  /** Raw bytes. Copied before pdf.js takes ownership, so the app's buffer stays usable. */
  data?: ArrayBuffer | Uint8Array;
  blob?: Blob;
}

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
async function loadDocument(
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

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(typeof err === "string" ? err : "Failed to load PDF");
}

function errorText(error: Error): string {
  if (error.name === "PasswordException") return "This PDF is password-protected.";
  if (error.name === "InvalidPDFException") return "This file isn’t a valid PDF.";
  if (error.name === "MissingPDFException" || error.name === "ResponseException") return "The PDF couldn’t be downloaded.";
  return "Something went wrong while opening it.";
}

function isCancel(err: unknown) {
  const name = (err as { name?: string } | null)?.name;
  return name === "RenderingCancelledException" || name === "AbortException";
}

/** 1 PDF point = 1/72 in, 1 CSS px = 1/96 in: 100% zoom shows the page at its printed size. */
const CSS_UNITS = 96 / 72;
/** Keep a canvas under ~16.7 MP (the common browser limit); beyond that the bitmap is upscaled. */
const MAX_CANVAS_PIXELS = 4096 * 4096;

function outputScale(cssWidth: number, cssHeight: number) {
  const dpr = typeof window !== "undefined" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const area = cssWidth * cssHeight;
  return area * dpr * dpr > MAX_CANVAS_PIXELS ? Math.max(0.1, Math.sqrt(MAX_CANVAS_PIXELS / area)) : dpr;
}

/** Render one page into a canvas at `cssScale`, sharp on high-DPI screens. Returns the task (cancel it on cleanup). */
function renderPage(page: PDFPageProxy, canvas: HTMLCanvasElement, cssScale: number): RenderTask {
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

/** Object URL for a download fallback, created in an effect (StrictMode-safe) and revoked on change. */
function useDownloadUrl(enabled: boolean, source: PdfSource) {
  const [objectUrl, setObjectUrl] = React.useState<string>();
  const { url, data, blob } = source;
  React.useEffect(() => {
    if (!enabled || url || (!blob && !data) || typeof URL.createObjectURL !== "function") {
      setObjectUrl(undefined);
      return;
    }
    const href = URL.createObjectURL(blob ?? new Blob([data as BlobPart], { type: "application/pdf" }));
    setObjectUrl(href);
    return () => URL.revokeObjectURL(href);
  }, [enabled, url, data, blob]);
  return url ?? objectUrl;
}

/* ------------------------------------------------------------------ */
/* Document state                                                      */
/* ------------------------------------------------------------------ */

interface PageSize {
  width: number;
  height: number;
}

type DocState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pdfjs: Pdfjs; doc: PDFDocumentProxy; first: PageSize }
  | { status: "error"; error: Error };

function usePdfDocument({
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

/** `"fit-width"`, `"fit-page"`, or a factor where 1 is 100% (the printed size). */
export type PdfZoom = "fit-width" | "fit-page" | number;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
/** Padding around the page column (px), matching the scroller's `p-4`. */
const GUTTER = 16;

const roundZoom = (z: number) => clamp(Math.round(z * 100) / 100, MIN_ZOOM, MAX_ZOOM);

function stepZoom(current: number, dir: 1 | -1) {
  if (dir > 0) return ZOOM_STEPS.find((s) => s > current + 0.005) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((s) => s < current - 0.005) ?? MIN_ZOOM;
}

function resolveZoom(zoom: PdfZoom, first: PageSize | null, avail: PageSize) {
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

const PdfPageView = React.memo(function PdfPageView({ pdfjs, doc, pageNumber, numPages, size, cssScale, near, textLayer, onSize }: PdfPageViewProps) {
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

/* ------------------------------------------------------------------ */
/* PdfViewer                                                           */
/* ------------------------------------------------------------------ */

export interface PdfViewerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onLoad" | "onError" | "children">,
    PdfSource,
    PdfWorkerOptions {
  /** File name for the download fallback and the accessible name. Default "document.pdf". */
  fileName?: string;
  /** Extra pdf.js `getDocument` options (`password`, `cMapUrl`, `standardFontDataUrl`, `wasmUrl`, `httpHeaders` …). Read when a document opens. */
  documentOptions?: Record<string, unknown>;
  zoom?: PdfZoom;
  /** Default `"fit-width"`. */
  defaultZoom?: PdfZoom;
  onZoomChange?: (zoom: PdfZoom) => void;
  /** Current page, 1-based (controlled). Setting it scrolls to that page. */
  page?: number;
  /** Default 1. */
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** Selectable, searchable text over each page (pdf.js `TextLayer`). Default true. */
  textLayer?: boolean;
  /** Show the toolbar (page navigation and zoom). Default true. */
  toolbar?: boolean;
  /** App controls at the end of the toolbar. */
  actions?: React.ReactNode;
  /** How far beyond the visible area pages are rendered, in viewport heights. Default 1. */
  overscan?: number;
  /** Waiting for the source. Shows page skeletons until a document is ready. */
  loading?: boolean;
  onLoad?: (info: { numPages: number }) => void;
  /** The document couldn't be loaded. The viewer shows an error with a download link. */
  onError?: (error: Error) => void;
  /** Replaces the built-in error view. */
  errorState?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);
  /** Shown when there is no source and nothing is loading. */
  emptyState?: React.ReactNode;
  /** Height of the viewer. Default `70dvh` (set a height or a `className` like `h-full`). */
  height?: number | string;
}

/**
 * pdf.js document viewer: lazily rendered canvas pages (only those near the viewport), selectable text, zoom
 * (fit width, fit page, presets; Ctrl/Cmd+wheel, pinch, + and - keys, 0 to fit the width) and page navigation. Needs the optional `pdfjs-dist` peer.
 */
export const PdfViewer = React.forwardRef<HTMLDivElement, PdfViewerProps>(
  (
    {
      url,
      data,
      blob,
      workerSrc,
      workerPort,
      fileName = "document.pdf",
      documentOptions,
      zoom: zoomProp,
      defaultZoom = "fit-width",
      onZoomChange,
      page: pageProp,
      defaultPage = 1,
      onPageChange,
      textLayer = true,
      toolbar = true,
      actions,
      overscan = 1,
      loading = false,
      onLoad,
      onError,
      errorState,
      emptyState,
      height,
      className,
      style,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const { state, retry } = usePdfDocument({
      source: { url, data, blob },
      worker: { workerSrc, workerPort },
      documentOptions,
      onLoad,
      onError,
    });
    const ready = state.status === "ready" ? state : null;
    const numPages = ready?.doc.numPages ?? 0;
    const downloadUrl = useDownloadUrl(state.status === "error", { url, data, blob });

    const [zoom, setZoom] = useControllableState<PdfZoom>({ value: zoomProp, defaultValue: defaultZoom, onChange: onZoomChange });
    const [rawPage, setPage] = useControllableState<number>({ value: pageProp, defaultValue: defaultPage, onChange: onPageChange });
    const page = numPages ? clamp(Math.round(rawPage) || 1, 1, numPages) : 1;

    /* ---------- sizes ---------- */
    const scrollerRef = React.useRef<HTMLDivElement>(null);
    const innerRef = React.useRef<HTMLDivElement>(null);
    const [avail, setAvail] = React.useState<PageSize>({ width: 0, height: 0 });
    const measure = React.useCallback(() => {
      const el = scrollerRef.current;
      if (!el) return;
      setAvail((prev) => (prev.width === el.clientWidth && prev.height === el.clientHeight ? prev : { width: el.clientWidth, height: el.clientHeight }));
    }, []);
    useIsoLayoutEffect(measure, [measure, ready]);
    useResizeObserver(scrollerRef, measure);

    const [sizes, setSizes] = React.useState<{ doc: PDFDocumentProxy | null; map: Record<number, PageSize> }>({ doc: null, map: {} });
    const sizeMap = ready && sizes.doc === ready.doc ? sizes.map : {};
    const onSize = React.useCallback(
      (n: number, size: PageSize) => {
        if (!ready) return;
        setSizes((prev) => {
          const map = prev.doc === ready.doc ? prev.map : {};
          const old = map[n] ?? ready.first;
          if (old.width === size.width && old.height === size.height) return prev.doc === ready.doc ? prev : { doc: ready.doc, map };
          return { doc: ready.doc, map: { ...map, [n]: size } };
        });
      },
      [ready]
    );

    const zoomFactor = resolveZoom(zoom, ready?.first ?? null, avail);
    const cssScale = zoomFactor * CSS_UNITS;

    /* ---------- which pages are near the viewport ---------- */
    const [near, setNear] = React.useState<{ doc: PDFDocumentProxy | null; pages: Set<number> }>({ doc: null, pages: new Set() });
    const ioSupported = typeof IntersectionObserver !== "undefined";
    React.useEffect(() => {
      const scroller = scrollerRef.current;
      if (!ready || !scroller || !ioSupported) return;
      const doc = ready.doc;
      setNear({ doc, pages: new Set() });
      const io = new IntersectionObserver(
        (entries) => {
          setNear((prev) => {
            const pages = new Set(prev.doc === doc ? prev.pages : []);
            let changed = prev.doc !== doc;
            for (const entry of entries) {
              const n = Number((entry.target as HTMLElement).dataset.pdfPage);
              if (entry.isIntersecting ? !pages.has(n) : pages.has(n)) {
                if (entry.isIntersecting) pages.add(n);
                else pages.delete(n);
                changed = true;
              }
            }
            return changed ? { doc, pages } : prev;
          });
        },
        { root: scroller, rootMargin: `${Math.max(0, overscan) * 100}% 0px` }
      );
      scroller.querySelectorAll("[data-pdf-page]").forEach((el) => io.observe(el));
      return () => io.disconnect();
    }, [ready, numPages, overscan, ioSupported]);
    const isNear = (n: number) => (ioSupported ? near.doc === ready?.doc && near.pages.has(n) : Math.abs(n - page) <= 2);

    /* ---------- scroll position ↔ current page ---------- */
    const pageEl = (n: number) => scrollerRef.current?.querySelector<HTMLElement>(`[data-pdf-page="${n}"]`) ?? null;
    const scrollPageRef = React.useRef(1);
    const jumpRef = React.useRef<number | null>(null);
    const anchorRef = React.useRef<{ page: number; ratio: number; offset: number } | null>(null);

    React.useEffect(() => {
      scrollPageRef.current = 1;
      jumpRef.current = null;
      anchorRef.current = null;
    }, [ready?.doc]);

    React.useEffect(() => {
      if (!numPages || page === scrollPageRef.current) return;
      const scroller = scrollerRef.current;
      const el = pageEl(page);
      scrollPageRef.current = page;
      if (!scroller || !el) return;
      jumpRef.current = page;
      scroller.scrollTop = Math.max(0, el.offsetTop - GUTTER / 2);
    }, [page, numPages, ready?.doc]);

    const onScroll = () => {
      const scroller = scrollerRef.current;
      if (!scroller || !numPages) return;
      const probe = scroller.scrollTop + Math.min(scroller.clientHeight * 0.3, 240);
      let lo = 1;
      let hi = numPages;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        const el = pageEl(mid);
        if (el && el.offsetTop <= probe) lo = mid;
        else hi = mid - 1;
      }
      const el = pageEl(lo);
      if (el && el.offsetHeight) anchorRef.current = { page: lo, ratio: (probe - el.offsetTop) / el.offsetHeight, offset: probe - scroller.scrollTop };
      const jump = jumpRef.current;
      if (jump !== null && lo !== jump) {
        const target = pageEl(jump);
        const visible = target && target.offsetTop < scroller.scrollTop + scroller.clientHeight && target.offsetTop + target.offsetHeight > scroller.scrollTop;
        if (visible) return;
      }
      jumpRef.current = null;
      if (lo !== scrollPageRef.current) {
        scrollPageRef.current = lo;
        setPage(lo);
      }
    };

    // Keep the same spot of the document in view when the scale changes.
    useIsoLayoutEffect(() => {
      const anchor = anchorRef.current;
      const scroller = scrollerRef.current;
      const el = anchor ? pageEl(anchor.page) : null;
      if (!anchor || !scroller || !el) return;
      scroller.scrollTop = Math.max(0, el.offsetTop + anchor.ratio * el.offsetHeight - anchor.offset);
    }, [cssScale]);

    /* ---------- zoom input ---------- */
    const zoomBy = React.useCallback((dir: 1 | -1) => setZoom(stepZoom(zoomFactor, dir)), [setZoom, zoomFactor]);
    const zoomRef = useLatestRef({ zoomFactor, setZoom });

    React.useEffect(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const onWheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const { zoomFactor: z, setZoom: set } = zoomRef.current;
        const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        set(roundZoom(z * Math.exp(-clamp(delta, -100, 100) * 0.003)));
      };
      let pinch: { dist: number; zoom: number; ratio: number } | null = null;
      const distance = (t: TouchList) => Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY);
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 2) return;
        pinch = { dist: distance(e.touches) || 1, zoom: zoomRef.current.zoomFactor, ratio: 1 };
      };
      const onTouchMove = (e: TouchEvent) => {
        const inner = innerRef.current;
        if (!pinch || e.touches.length !== 2 || !inner) return;
        e.preventDefault();
        pinch.ratio = clamp(distance(e.touches) / pinch.dist, MIN_ZOOM / pinch.zoom, MAX_ZOOM / pinch.zoom);
        const rect = inner.getBoundingClientRect();
        const midX = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2 - rect.left;
        const midY = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2 - rect.top;
        inner.style.transformOrigin = `${midX}px ${midY}px`;
        inner.style.transform = `scale(${pinch.ratio})`;
      };
      const onTouchEnd = (e: TouchEvent) => {
        if (!pinch || e.touches.length >= 2) return;
        const inner = innerRef.current;
        if (inner) inner.style.transform = "";
        const next = roundZoom(pinch.zoom * pinch.ratio);
        pinch = null;
        if (next !== zoomRef.current.zoomFactor) zoomRef.current.setZoom(next);
      };
      scroller.addEventListener("wheel", onWheel, { passive: false });
      scroller.addEventListener("touchstart", onTouchStart, { passive: true });
      scroller.addEventListener("touchmove", onTouchMove, { passive: false });
      scroller.addEventListener("touchend", onTouchEnd);
      scroller.addEventListener("touchcancel", onTouchEnd);
      return () => {
        scroller.removeEventListener("wheel", onWheel);
        scroller.removeEventListener("touchstart", onTouchStart);
        scroller.removeEventListener("touchmove", onTouchMove);
        scroller.removeEventListener("touchend", onTouchEnd);
        scroller.removeEventListener("touchcancel", onTouchEnd);
      };
    }, [zoomRef]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || !ready || e.altKey || isEditableTarget(e.target)) return;
      if (e.key === "+" || e.key === "=") zoomBy(1);
      else if (e.key === "-" || e.key === "_") zoomBy(-1);
      else if (e.key === "0") setZoom("fit-width");
      else return;
      e.preventDefault();
    };

    /* ---------- page input ---------- */
    const [draft, setDraft] = React.useState<string | null>(null);
    const commitDraft = () => {
      if (draft === null) return;
      const n = parseInt(draft, 10);
      setDraft(null);
      if (Number.isFinite(n) && numPages) setPage(clamp(n, 1, numPages));
    };
    const goTo = (n: number) => numPages && setPage(clamp(n, 1, numPages));

    /* ---------- render ---------- */
    const skeleton = state.status === "loading" || (loading && !ready);
    const zoomValue = typeof zoom === "number" ? String(roundZoom(zoom)) : zoom;
    const zoomPercent = `${Math.round(zoomFactor * 100)}%`;
    const zoomName = zoom === "fit-width" ? `Fit width (${zoomPercent})` : zoom === "fit-page" ? `Fit page (${zoomPercent})` : zoomPercent;

    let body: React.ReactNode;
    if (state.status === "error") {
      body =
        typeof errorState === "function" ? (
          errorState(state.error, retry)
        ) : errorState !== undefined ? (
          errorState
        ) : (
          <div className="flex flex-1 items-center justify-center p-4">
            <InlineAlert tone="destructive" className="w-full max-w-md">
              <InlineAlertTitle>Couldn’t display this PDF</InlineAlertTitle>
              <InlineAlertDescription>
                {errorText(state.error)}
                {state.error.message && (
                  <details className="mt-1 text-xs">
                    <summary className={cn("w-fit cursor-pointer rounded-xs", focusRing)}>Details</summary>
                    <p data-slot="pdf-error-message" className="mt-1 break-words font-mono">
                      {state.error.name && state.error.name !== "Error" ? `${state.error.name}: ` : ""}
                      {state.error.message}
                    </p>
                  </details>
                )}
              </InlineAlertDescription>
              <InlineAlertActions>
                {downloadUrl && (
                  <Button asChild variant="secondary" size="sm" leadingIcon={<RiDownloadLine aria-hidden />}>
                    <a href={downloadUrl} download={fileName}>
                      Download
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" leadingIcon={<RiRefreshLine aria-hidden />} onClick={retry}>
                  Try again
                </Button>
              </InlineAlertActions>
            </InlineAlert>
          </div>
        );
    } else if (skeleton) {
      body = (
        <div className="flex flex-col items-center gap-4 p-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="aspect-[1/1.294] w-full max-w-2xl rounded-xs" />
          ))}
        </div>
      );
    } else if (ready) {
      body = (
        <div ref={innerRef} data-slot="pdf-pages" className="flex w-max min-w-full flex-col items-center gap-4 p-4">
          {Array.from({ length: numPages }, (_, i) => {
            const n = i + 1;
            return (
              <PdfPageView
                key={n}
                pdfjs={ready.pdfjs}
                doc={ready.doc}
                pageNumber={n}
                numPages={numPages}
                size={sizeMap[n] ?? ready.first}
                cssScale={cssScale}
                near={isNear(n)}
                textLayer={textLayer}
                onSize={onSize}
              />
            );
          })}
        </div>
      );
    } else {
      body = <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">{emptyState ?? "No document"}</div>;
    }

    const iconButton = "shrink-0";
    return (
      <div
        ref={ref}
        data-slot="pdf-viewer"
        data-state={state.status}
        aria-busy={skeleton || undefined}
        onKeyDown={handleKeyDown}
        className={cn("flex h-[70dvh] min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card", className)}
        style={height !== undefined ? { height, ...style } : style}
        {...props}
      >
        {skeleton && <span className="sr-only">Loading PDF…</span>}
        {toolbar && (
          <div data-slot="pdf-toolbar" className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2">
            {ready ? (
              <>
                <div role="group" aria-label="Page navigation" className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" className={iconButton} aria-label="Previous page" disabled={page <= 1} onClick={() => goTo(page - 1)}>
                    <RiArrowLeftSLine aria-hidden />
                  </Button>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Page number, of ${numPages}`}
                    value={draft ?? String(page)}
                    onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={commitDraft}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitDraft();
                      } else if (e.key === "Escape" && draft !== null) {
                        e.preventDefault();
                        setDraft(null);
                      }
                    }}
                    className={cn(
                      "h-7 w-10 rounded-control border border-input bg-background px-1 text-center text-sm tabular-nums text-foreground shadow-xs",
                      focusRing
                    )}
                  />
                  <span aria-hidden className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                    / {numPages}
                  </span>
                  <Button variant="ghost" size="icon-sm" className={iconButton} aria-label="Next page" disabled={page >= numPages} onClick={() => goTo(page + 1)}>
                    <RiArrowRightSLine aria-hidden />
                  </Button>
                </div>
                <div className="flex-1" />
                <div role="group" aria-label="Zoom" className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-sm" className={iconButton} aria-label="Zoom out" disabled={zoomFactor <= MIN_ZOOM} onClick={() => zoomBy(-1)}>
                    <RiZoomOutLine aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label={`Zoom level: ${zoomName}`} className="min-w-16 gap-0.5 px-2 tabular-nums">
                        {zoomPercent}
                        <RiArrowDownSLine aria-hidden className="size-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-36">
                      <DropdownMenuRadioGroup
                        value={zoomValue}
                        onValueChange={(v) => setZoom(v === "fit-width" || v === "fit-page" ? v : Number(v))}
                      >
                        <DropdownMenuRadioItem value="fit-width">Fit width</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="fit-page">Fit page</DropdownMenuRadioItem>
                        <DropdownMenuSeparator />
                        {ZOOM_PRESETS.map((z) => (
                          <DropdownMenuRadioItem key={z} value={String(z)}>
                            {`${Math.round(z * 100)}%`}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon-sm" className={iconButton} aria-label="Zoom in" disabled={zoomFactor >= MAX_ZOOM} onClick={() => zoomBy(1)}>
                    <RiZoomInLine aria-hidden />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1">
                {skeleton && <Skeleton aria-hidden className="h-5 w-28 rounded-xs" />}
              </div>
            )}
            {actions != null && actions !== false && <div className="ml-1 flex shrink-0 items-center gap-1">{actions}</div>}
          </div>
        )}
        <div
          ref={scrollerRef}
          role="region"
          aria-label={`${fileName} pages`}
          tabIndex={ready ? 0 : undefined}
          onScroll={onScroll}
          className={cn("relative flex min-h-0 flex-1 flex-col overflow-auto bg-subtle scrollbar-thin touch-pan-x touch-pan-y [scrollbar-gutter:stable]", focusRing)}
        >
          {body}
        </div>
      </div>
    );
  }
);
PdfViewer.displayName = "PdfViewer";

/* ------------------------------------------------------------------ */
/* FileViewer renderer                                                 */
/* ------------------------------------------------------------------ */

export interface PdfRendererOptions
  extends PdfWorkerOptions,
    Pick<PdfViewerProps, "documentOptions" | "defaultZoom" | "textLayer" | "overscan" | "height" | "className"> {
  /** Loading text and `data-renderer-label`. Default "PDF viewer". */
  label?: string;
  /** Which files to handle. Default: the `pdf` kind (by MIME type, then extension). */
  match?: (file: ViewerFile, kind: FilePreviewKind) => boolean;
  /** Where `FileViewer` goes when the document can't be loaded. Default `"builtin"` (the browser's own PDF view). */
  fallback?: FileRenderer["fallback"];
}

function PdfRendererView({ file, ctx, options }: { file: ViewerFile; ctx: FileRendererContext; options: PdfRendererOptions }) {
  const blob = ctx.blob ?? file.blob;
  return (
    <PdfViewer
      blob={blob}
      url={blob ? undefined : (ctx.url ?? file.url)}
      fileName={file.name}
      workerSrc={options.workerSrc}
      workerPort={options.workerPort}
      documentOptions={options.documentOptions}
      defaultZoom={options.defaultZoom}
      textLayer={options.textLayer}
      overscan={options.overscan}
      height={options.height}
      className={cn("min-h-[60dvh] flex-1", options.className)}
      onError={ctx.onError}
    />
  );
}

/**
 * A `FileRenderer` that shows PDFs in `PdfViewer`: `<FileViewer renderers={[pdfRenderer({ workerSrc })]} />`.
 * Load errors go to `ctx.onError`, so `FileViewer` falls back to its built-in view.
 */
export function pdfRenderer(options: PdfRendererOptions = {}): FileRenderer {
  return {
    label: options.label ?? "PDF viewer",
    match: options.match ?? ((_file, kind) => kind === "pdf"),
    fallback: options.fallback,
    render: (file, ctx) => <PdfRendererView file={file} ctx={ctx} options={options} />,
  };
}

/* ------------------------------------------------------------------ */
/* PdfThumbnail                                                        */
/* ------------------------------------------------------------------ */

export interface PdfThumbnailProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onLoad" | "onError" | "children">,
    PdfSource,
    PdfWorkerOptions {
  /** Page to show, 1-based. Default 1. */
  page?: number;
  /** Width in CSS pixels; the height follows the page. Default 160. */
  width?: number;
  /** Accessible description. Without it the thumbnail is decorative (hidden from assistive tech). */
  alt?: string;
  /** Wait until the thumbnail is near the viewport before loading. Default true. */
  lazy?: boolean;
  /** Waiting for the source: shows a skeleton. */
  loading?: boolean;
  /** Shown when the page can't be rendered. Default: a PDF file icon. */
  fallback?: React.ReactNode;
  documentOptions?: Record<string, unknown>;
  onLoad?: (info: { numPages: number }) => void;
  onError?: (error: Error) => void;
}

/** One page of a PDF (the first by default) drawn small, for cards and lists. Needs the optional `pdfjs-dist` peer. */
export const PdfThumbnail = React.forwardRef<HTMLDivElement, PdfThumbnailProps>(
  (
    {
      url,
      data,
      blob,
      workerSrc,
      workerPort,
      page = 1,
      width = 160,
      alt,
      lazy = true,
      loading = false,
      fallback,
      documentOptions,
      onLoad,
      onError,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const hasSource = Boolean(url || data || blob);
    const [visible, setVisible] = React.useState(!lazy || typeof IntersectionObserver === "undefined");
    const [state, setState] = React.useState<{ status: "idle" | "loading" | "ready" | "error"; ratio?: number }>({ status: "idle" });
    const optionsRef = useLatestRef(documentOptions);
    const onLoadRef = useLatestRef(onLoad);
    const onErrorRef = useLatestRef(onError);

    React.useEffect(() => {
      if (visible) return;
      const el = rootRef.current;
      if (!el || typeof IntersectionObserver === "undefined") {
        setVisible(true);
        return;
      }
      const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "200px" });
      io.observe(el);
      return () => io.disconnect();
    }, [visible]);

    React.useEffect(() => {
      if (!hasSource || !visible) {
        setState({ status: "idle" });
        return;
      }
      let alive = true;
      const held: { task: PDFDocumentLoadingTask | null } = { task: null };
      let render: RenderTask | null = null;
      setState({ status: "loading" });
      (async () => {
        const opened = await loadDocument({ url, data, blob }, { workerSrc, workerPort }, optionsRef.current, () => alive, (t) => {
          held.task = t;
        });
        if (!opened || !alive) return;
        const { doc } = opened;
        const pdfPage = await doc.getPage(clamp(Math.round(page) || 1, 1, doc.numPages));
        const canvas = canvasRef.current;
        if (!alive || !canvas) return;
        const base = pdfPage.getViewport({ scale: 1 });
        render = renderPage(pdfPage, canvas, width / base.width);
        await render.promise;
        if (!alive) return;
        setState({ status: "ready", ratio: base.width / base.height });
        onLoadRef.current?.({ numPages: doc.numPages });
        void held.task?.destroy().catch(() => {});
        held.task = null;
      })().catch((err: unknown) => {
        if (!alive || isCancel(err)) return;
        setState({ status: "error" });
        onErrorRef.current?.(toError(err));
      });
      return () => {
        alive = false;
        render?.cancel();
        void held.task?.destroy().catch(() => {});
      };
    }, [hasSource, visible, url, data, blob, workerSrc, workerPort, page, width, optionsRef, onLoadRef, onErrorRef]);

    const busy = loading || state.status === "loading" || (hasSource && state.status === "idle");
    const failed = state.status === "error" || (!hasSource && !loading);
    return (
      <div
        ref={(node) => {
          rootRef.current = node;
          assignRef(ref, node);
        }}
        data-slot="pdf-thumbnail"
        data-state={failed ? "error" : state.status}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        aria-busy={alt && busy ? true : undefined}
        className={cn("relative overflow-hidden rounded-xs bg-white ring-1 ring-border", className)}
        style={{ width, aspectRatio: state.ratio ?? 3 / 4, ...style }}
        {...props}
      >
        {!failed && <canvas ref={canvasRef} aria-hidden className={cn("block size-full", state.status !== "ready" && "invisible")} />}
        {busy && !failed && <Skeleton aria-hidden className="absolute inset-0" />}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-subtle">
            {fallback ?? <FileFormatIcon ext="pdf" size="lg" aria-hidden />}
          </div>
        )}
      </div>
    );
  }
);
PdfThumbnail.displayName = "PdfThumbnail";
