/** PDF viewer: the viewer and its FileViewer renderer, with the source and zoom types and the thumbnail, one module per family. */
import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine, RiDownloadLine, RiRefreshLine, RiZoomInLine, RiZoomOutLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { isEditableTarget } from "../../lib/shortcuts";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useIsoLayoutEffect, useLatestRef } from "../../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { Button } from "../../primitives/button";
import { Skeleton } from "../../primitives/progress";
import { InlineAlert, InlineAlertActions, InlineAlertDescription, InlineAlertTitle } from "../../primitives/inline-alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../primitives/dropdown-menu";
import type { FileRenderer, FileRendererContext, FilePreviewKind, ViewerFile } from "../../patterns/file-viewer";
import type { PdfSource, PdfWorkerOptions, PdfZoom } from "./pdf-viewer-model";
import { CSS_UNITS, GUTTER, MAX_ZOOM, MIN_ZOOM, type PageSize, PdfPageView, ZOOM_PRESETS, errorText, resolveZoom, roundZoom, stepZoom, useDownloadUrl, usePdfDocument } from "./pdf-viewer-internal";

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
  /** Controlled zoom: `fit-width`, `fit-page` or a scale (1 is 100%). */
  zoom?: PdfZoom;
  /** Default `"fit-width"`. */
  defaultZoom?: PdfZoom;
  /** Called with the zoom when the user changes it. */
  onZoomChange?: (zoom: PdfZoom) => void;
  /** Current page, 1-based (controlled). Setting it scrolls to that page. */
  page?: number;
  /** Default 1. */
  defaultPage?: number;
  /** Called with the 1-based page number as the user scrolls or navigates. */
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
  /** Called with the page count once the document has opened. */
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
          <div data-slot="pdf-toolbar" className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-border px-2 py-0.5">
            {ready ? (
              <>
                <div role="group" aria-label="Page navigation" className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" className={iconButton} aria-label="Previous page" disabled={page <= 1} onClick={() => goTo(page - 1)}>
                    <RiArrowLeftSLine className="rtl:-scale-x-100" aria-hidden />
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
                    <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />
                  </Button>
                </div>
                <div className="flex-1" />
                <div role="group" aria-label="Zoom" className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-sm" className={iconButton} aria-label="Zoom out" disabled={zoomFactor <= MIN_ZOOM} onClick={() => zoomBy(-1)}>
                    <RiZoomOutLine aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label={`Zoom level: ${zoomName}`} className="min-w-12 gap-0.5 px-1.5 tabular-nums">
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
            {actions != null && actions !== false && <div className="ms-1 flex shrink-0 items-center gap-1">{actions}</div>}
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

export * from "./pdf-viewer-model";
export * from "./pdf-viewer-thumbnail";
