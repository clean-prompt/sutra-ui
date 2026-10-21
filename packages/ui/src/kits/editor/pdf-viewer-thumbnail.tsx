import * as React from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { FileFormatIcon } from "../../assets/file-format";
import { Skeleton } from "../../primitives/progress";
import type { PdfSource, PdfWorkerOptions } from "./pdf-viewer-model";
import { isCancel, loadDocument, renderPage, toError } from "./pdf-viewer-internal";

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
  /** Extra pdf.js `getDocument` options (`password`, `cMapUrl` and so on); read when the document opens. */
  documentOptions?: Record<string, unknown>;
  /** Called with the page count once the document has opened. */
  onLoad?: (info: { numPages: number }) => void;
  /** Called with the error when the document or page cannot be loaded. */
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
    const setRoot = useMergedRefs<HTMLDivElement>(rootRef, ref);
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
        ref={setRoot}
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
