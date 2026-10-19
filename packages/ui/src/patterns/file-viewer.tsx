import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiSideBarLine,
  RiZoomInLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { formatBytes, type FormatBytesOptions } from "../lib/format";
import { isEditableTarget } from "../lib/shortcuts";
import { FileFormatIcon, getFileCategory, getFileExtension } from "../assets/file-format";
import { Button } from "../primitives/button";
import { Spinner } from "../primitives/spinner";
import { Skeleton } from "../primitives/progress";
import { Markdown } from "./markdown";
import { SegmentedControl } from "../primitives/segmented-control";
import { ImageWithFallback, Lightbox } from "./lightbox";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export interface ViewerFile {
  name: string;
  /** Where the file can be fetched, shown and downloaded from. */
  url?: string;
  /** Raw content. Used through an object URL when `url` is absent, and handed to custom renderers. */
  blob?: Blob;
  /** Size in bytes. */
  size?: number;
  /** MIME type; takes precedence over the extension when choosing a renderer. */
  mimeType?: string;
  /** Inline text content (skips loading). */
  text?: string;
  /** Thumbnail image for `FilePreviewCard` and the viewer's thumbnail strip. */
  thumbnail?: string;
}

export type FilePreviewKind = "image" | "pdf" | "video" | "audio" | "markdown" | "json" | "code" | "text" | "unknown";

/** Pick the renderer for a file from its MIME type, falling back to the extension. */
export function getFilePreviewKind(file: Pick<ViewerFile, "name" | "mimeType">): FilePreviewKind {
  // Drop parameters: "application/json; charset=utf-8" → "application/json".
  const mime = (file.mimeType ?? "").split(";")[0]!.trim().toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "text/markdown" || mime === "text/x-markdown") return "markdown";
  if (mime === "application/json" || mime.endsWith("+json")) return "json";
  const ext = getFileExtension(file.name);
  if (ext === "pdf") return "pdf";
  if (ext === "md" || ext === "mdx" || ext === "markdown") return "markdown";
  if (ext === "json") return "json";
  const category = getFileCategory(file.name);
  if (category === "image" && ext !== "psd" && ext !== "ai") return "image";
  if (category === "video") return "video";
  if (category === "audio") return "audio";
  if (category === "code") return "code";
  if (category === "text" || category === "data" || mime.startsWith("text/") || ext === "csv" || ext === "tsv") return "text";
  return "unknown";
}

/** File sizes: `"1.4 MB"`, `"12 MB"`, `""` when unknown. */
const FILE_SIZE: FormatBytesOptions = { trimZeros: false, wholeAbove: 10, invalid: "" };

/**
 * Human-readable byte size, e.g. `1.4 MB`.
 * @deprecated Use `formatBytes(bytes, { trimZeros: false, wholeAbove: 10, invalid: "" })`.
 */
export function formatFileSize(bytes: number | undefined) {
  return formatBytes(bytes, FILE_SIZE);
}

const isTextKind = (k: FilePreviewKind) => k === "markdown" || k === "json" || k === "code" || k === "text";

async function defaultLoadText(file: ViewerFile) {
  if (file.blob) return file.blob.text();
  if (!file.url) throw new Error("No URL to load from");
  const res = await fetch(file.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* ------------------------------------------------------------------ */
/* Renderers                                                           */
/* ------------------------------------------------------------------ */

function DownloadCard({ file, message, onDownload }: { file: ViewerFile; message: React.ReactNode; onDownload?: () => void }) {
  const size = formatBytes(file.size, FILE_SIZE);
  return (
    <div data-renderer="unknown" className="flex flex-col items-center justify-center gap-3 rounded-box border border-dashed border-border bg-subtle px-6 py-10 text-center">
      <FileFormatIcon ext={file.name} size="xl" />
      <div className="space-y-1">
        <p className="max-w-xs truncate text-sm font-medium text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {size ? `${size} · ` : ""}
          {message}
        </p>
      </div>
      {file.url && (
        <Button asChild variant="secondary" size="sm">
          <a href={file.url} download={file.name} onClick={onDownload}>
            <RiDownloadLine aria-hidden />
            Download
          </a>
        </Button>
      )}
    </div>
  );
}

function TextPreview({
  file,
  kind,
  text: textProp,
  loadText,
}: {
  file: ViewerFile;
  kind: FilePreviewKind;
  text?: string;
  loadText?: (file: ViewerFile) => Promise<string>;
}) {
  const inline = textProp ?? file.text;
  const [state, setState] = React.useState<{ status: "loading" | "ready" | "error"; text: string }>(
    inline !== undefined ? { status: "ready", text: inline } : { status: "loading", text: "" }
  );
  const [view, setView] = React.useState<"preview" | "source">("preview");
  const loaderRef = React.useRef(loadText);
  loaderRef.current = loadText;

  React.useEffect(() => {
    if (inline !== undefined) {
      setState({ status: "ready", text: inline });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", text: "" });
    (loaderRef.current ?? defaultLoadText)(file).then(
      (text) => !cancelled && setState({ status: "ready", text }),
      () => !cancelled && setState({ status: "error", text: "" })
    );
    return () => {
      cancelled = true;
    };
  }, [inline, file.url, file.name, file.blob]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status === "loading") {
    return (
      <div data-renderer={kind} className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner size="sm" label="Loading preview" />
        <span aria-hidden>Loading preview…</span>
      </div>
    );
  }
  if (state.status === "error") return <DownloadCard file={file} message="Couldn’t load a preview." />;

  let body = state.text;
  if (kind === "json") {
    try {
      body = JSON.stringify(JSON.parse(state.text), null, 2);
    } catch {
      /* show as-is */
    }
  }

  return (
    <div data-renderer={kind} className="flex min-h-0 flex-1 flex-col gap-3">
      {kind === "markdown" && (
        <SegmentedControl
          size="sm"
          aria-label="Markdown view"
          className="self-start"
          value={view}
          onValueChange={(v) => v && setView(v as "preview" | "source")}
          options={[
            { value: "preview", label: "Preview" },
            { value: "source", label: "Source" },
          ]}
        />
      )}
      {kind === "markdown" && view === "preview" ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-box border border-border bg-background px-5 py-4 scrollbar-thin">
          <Markdown>{state.text}</Markdown>
        </div>
      ) : (
        <pre
          tabIndex={0}
          aria-label={`${file.name} contents`}
          className={cn(
            "min-h-0 flex-1 overflow-auto rounded-box border border-border bg-subtle p-4 font-mono text-[13px] leading-relaxed text-foreground scrollbar-thin",
            focusRing
          )}
        >
          <code>{body}</code>
        </pre>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FileViewer                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* FileViewer                                                          */
/* ------------------------------------------------------------------ */

/** What a custom renderer gets besides the file. */
export interface FileRendererContext {
  /** URL to show the file from: `file.url`, or an object URL for `file.blob` (revoked when the viewer moves on). */
  url?: string;
  /** The raw content, when the app supplied `file.blob`. */
  blob?: Blob;
  /** The detected (or `kind`-overridden) built-in kind. */
  kind: FilePreviewKind;
  /** Position of the file in `files` (0 for a single file). */
  index: number;
  /** Number of files the viewer browses (1 for a single file). */
  count: number;
  /**
   * Report that this renderer can't show the file. The viewer moves on to the next matching renderer and then the
   * built-in view (or straight to the download card with `fallback: "download"`). Call it from an effect or handler.
   */
  onError: (error?: unknown) => void;
  /** Show the viewer's loading overlay while the renderer fetches or parses. Call it from an effect or handler. */
  setLoading: (loading: boolean) => void;
  /** The built-in view for this file, to wrap or show alongside the renderer's own UI. */
  renderBuiltin: () => React.ReactNode;
}

/** An app-supplied preview, checked before the built-in kinds (e.g. a pdf.js viewer or an office previewer). */
export interface FileRenderer {
  /** Name for the loading text ("Loading PDF viewer…") and the `data-renderer-label` attribute. */
  label?: string;
  /** Whether this renderer handles the file. A `match` that throws counts as no match. */
  match: (file: ViewerFile, kind: FilePreviewKind) => boolean;
  render: (file: ViewerFile, ctx: FileRendererContext) => React.ReactNode;
  /**
   * Where to go when the renderer throws or calls `ctx.onError`: the next matching renderer and then the built-in view
   * (`"builtin"`, default), or the download card (`"download"`).
   */
  fallback?: "builtin" | "download";
}

/** Content for a header or panel slot: a node, or a function of the file being shown (useful in a gallery). */
export type FileViewerSlot = React.ReactNode | ((file: ViewerFile, index: number) => React.ReactNode);

export interface FileViewerProps {
  /** The file to show. In a gallery, pass `files` instead. */
  file?: ViewerFile;
  /** Files to browse with previous/next buttons, ←/→ and an optional thumbnail strip. Takes precedence over `file`. */
  files?: ViewerFile[];
  /** Position in `files` (controlled). */
  index?: number;
  /** Initial position in `files` (uncontrolled). Default 0. */
  defaultIndex?: number;
  onIndexChange?: (index: number, file: ViewerFile) => void;
  /** Wrap from the last file to the first and back. Default false. */
  loop?: boolean;
  /** Show a thumbnail strip under the content when browsing several files. Default false. */
  thumbnails?: boolean;
  /** Render in place instead of in a modal. */
  inline?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Text content for text/code/markdown/json files (single `file` only; in a gallery set each file's `text`). */
  text?: string;
  /** Load text content (default: `file.blob`, then `fetch(file.url)`). */
  loadText?: (file: ViewerFile) => Promise<string>;
  /** Override the detected renderer. */
  kind?: FilePreviewKind;
  /** App renderers, tried in order before the built-in kinds. */
  renderers?: FileRenderer[];
  onDownload?: () => void;
  /** Show the header download action. Default true when the file has a URL. */
  download?: boolean;
  /** Show the "open in new tab" action. Default true when the file has a URL. */
  openInNewTab?: boolean;
  /** Header title (default: the file name). Also the dialog's accessible name. */
  title?: FileViewerSlot;
  /** Line under the title (default: the formatted size). */
  subtitle?: FileViewerSlot;
  /** App actions in the header (share, rename, delete …), before the built-in download and close actions. */
  actions?: FileViewerSlot;
  /** Side panel (details, metadata, comments). Sits beside the content on wide viewers and below it on narrow ones. */
  panel?: FileViewerSlot;
  /** Name of the side panel and its header toggle. Default "Details". */
  panelLabel?: string;
  panelOpen?: boolean;
  /** Default true. */
  defaultPanelOpen?: boolean;
  onPanelOpenChange?: (open: boolean) => void;
  /** Waiting for the file (or its URL). Shows skeletons until there is something to show. */
  loading?: boolean;
  /** Shown when `files` is empty and nothing is loading. */
  emptyState?: React.ReactNode;
  /** Close action for inline viewers (modal viewers close via `onOpenChange`). */
  onClose?: () => void;
  className?: string;
}

function ViewerBody({
  file,
  kind,
  text,
  loadText,
  onDownload,
}: {
  file: ViewerFile;
  kind: FilePreviewKind;
  text?: string;
  loadText?: (file: ViewerFile) => Promise<string>;
  onDownload?: () => void;
}) {
  const [zoomed, setZoomed] = React.useState(false);
  if (!file.url && !isTextKind(kind)) return <DownloadCard file={file} message="No preview available" onDownload={onDownload} />;

  switch (kind) {
    case "image":
      return (
        <div data-renderer="image" className="flex min-h-0 flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            aria-label={`Zoom ${file.name}`}
            className={cn("group relative max-h-full max-w-full cursor-zoom-in overflow-hidden rounded-box", focusRing)}
          >
            <ImageWithFallback src={file.url} alt={file.name} fit="contain" className="max-h-[70dvh] min-w-48 bg-transparent" imgClassName="max-h-[70dvh] w-auto" />
            <span aria-hidden className="absolute bottom-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <RiZoomInLine aria-hidden className="size-4" />
            </span>
          </button>
          <Lightbox items={[{ src: file.url!, alt: file.name }]} open={zoomed} onOpenChange={setZoomed} thumbnails={false} />
        </div>
      );
    case "pdf":
      return (
        <div data-renderer="pdf" className="flex min-h-[60dvh] flex-1 flex-col">
          <object
            data={`${file.url}#view=FitH`}
            type="application/pdf"
            aria-label={file.name}
            title={file.name}
            className="min-h-[60dvh] w-full flex-1 rounded-box border border-border bg-subtle"
          >
            <DownloadCard file={file} message="This browser can’t show PDFs inline." onDownload={onDownload} />
          </object>
        </div>
      );
    case "video":
      return (
        <div data-renderer="video" className="flex min-h-0 flex-1 items-center justify-center">
          <video src={file.url} controls playsInline aria-label={file.name} className="max-h-[70dvh] max-w-full rounded-box bg-black" />
        </div>
      );
    case "audio":
      return (
        <div data-renderer="audio" className="flex flex-1 flex-col items-center justify-center gap-4 py-8">
          <FileFormatIcon ext={file.name} size="xl" />
          <audio src={file.url} controls aria-label={file.name} className="w-full max-w-md" />
        </div>
      );
    case "markdown":
    case "json":
    case "code":
    case "text":
      return <TextPreview file={file} kind={kind} text={text} loadText={loadText} />;
    default:
      return <DownloadCard file={file} message="No preview available" onDownload={onDownload} />;
  }
}

/** Catches a custom renderer that throws while rendering and reports it, so the viewer can fall back. */
class RendererBoundary extends React.Component<{ onError: (error: unknown) => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function CustomRendererView({
  renderer,
  file,
  base,
}: {
  renderer: FileRenderer;
  file: ViewerFile;
  base: Omit<FileRendererContext, "setLoading">;
}) {
  const [loading, setLoading] = React.useState(false);
  const ctx: FileRendererContext = { ...base, setLoading };
  const name = renderer.label ?? "preview";
  return (
    <div
      data-renderer="custom"
      data-renderer-label={renderer.label}
      aria-busy={loading || undefined}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      {renderer.render(file, ctx)}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm text-muted-foreground">
          <Spinner size="sm" label="" />
          <span>{`Loading ${name}…`}</span>
        </div>
      )}
    </div>
  );
}

/** Object URL for a blob, created in an effect (StrictMode-safe) and revoked when the blob changes. */
function useObjectUrl(blob: Blob | undefined) {
  const [entry, setEntry] = React.useState<{ blob: Blob; url: string | undefined }>();
  React.useEffect(() => {
    if (!blob) return;
    const create = typeof URL !== "undefined" ? URL.createObjectURL : undefined;
    if (typeof create !== "function") {
      setEntry({ blob, url: undefined });
      return;
    }
    const url = URL.createObjectURL(blob);
    setEntry({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  if (!blob) return { url: undefined, pending: false };
  return entry?.blob === blob ? { url: entry.url, pending: false } : { url: undefined, pending: true };
}

const headerAction = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-[18px]",
  focusRing
);

const navAction = cn(headerAction, "aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground");

function ViewerHeader({
  file,
  title,
  subtitle,
  onDownload,
  download,
  openInNewTab,
  close,
  modal,
  nav,
  actions,
  panelToggle,
}: {
  file: ViewerFile;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onDownload?: () => void;
  download: boolean;
  openInNewTab: boolean;
  close?: React.ReactNode;
  modal: boolean;
  nav?: React.ReactNode;
  actions?: React.ReactNode;
  panelToggle?: React.ReactNode;
}) {
  const size = formatBytes(file.size, FILE_SIZE);
  const Title = modal ? DialogPrimitive.Title : "h2";
  const hasSubtitle = subtitle !== undefined && subtitle !== null && subtitle !== false && subtitle !== "";
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
      <FileFormatIcon ext={file.name} size="sm" />
      {/* The title keeps at least 8rem; on narrow widths the controls wrap to a second line instead of squeezing it out. */}
      <div className="min-w-32 flex-1 basis-32 leading-tight">
        <Title className="truncate text-sm font-semibold text-foreground">{title ?? file.name}</Title>
        {hasSubtitle ? (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        ) : size ? (
          <p className="truncate text-xs text-muted-foreground">{size}</p>
        ) : null}
      </div>
      {nav}
      {actions != null && actions !== false ? (
        <div data-slot="file-viewer-actions" className="flex shrink-0 items-center gap-1">
          {actions}
        </div>
      ) : null}
      {panelToggle}
      {file.url && (
        <>
          {download && (
            <a href={file.url} download={file.name} onClick={onDownload} className={headerAction} aria-label={`Download ${file.name}`}>
              <RiDownloadLine aria-hidden />
            </a>
          )}
          {openInNewTab && (
            <a href={file.url} target="_blank" rel="noopener noreferrer" className={headerAction} aria-label="Open in new tab">
              <RiExternalLinkLine aria-hidden />
            </a>
          )}
        </>
      )}
      {close}
    </div>
  );
}

function SkeletonHeader({ modal, close }: { modal: boolean; close?: React.ReactNode }) {
  const Title = modal ? DialogPrimitive.Title : "h2";
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
      <Skeleton aria-hidden className="size-8 shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Title className="sr-only">Loading file…</Title>
        <Skeleton aria-hidden shape="text" className="h-3.5" width="40%" />
        <Skeleton aria-hidden shape="text" className="h-3" width="16%" />
      </div>
      {close}
    </div>
  );
}

function BodySkeleton() {
  return (
    <div data-renderer="skeleton" aria-hidden className="flex min-h-40 flex-1 items-center justify-center">
      <Skeleton className="h-full min-h-40 w-full rounded-box" />
    </div>
  );
}

/** Keys inside these keep their own meaning for ←/→. */
const ARROW_KEY_OWNERS =
  '[role="slider"],[role="radiogroup"],[role="tablist"],[role="menu"],[role="menubar"],[role="listbox"],[role="grid"],[role="tree"],[role="treegrid"],[role="spinbutton"],[data-keep-arrows]';
const ARROW_KEY_TAGS = new Set(["VIDEO", "AUDIO", "PRE", "CODE", "OBJECT", "IFRAME", "EMBED"]);

function ownsArrowKeys(target: HTMLElement) {
  if (isEditableTarget(target)) return true;
  if (ARROW_KEY_TAGS.has(target.tagName)) return true;
  return typeof target.closest === "function" && target.closest(ARROW_KEY_OWNERS) != null;
}

function thumbnailSrc(file: ViewerFile) {
  return file.thumbnail ?? (getFilePreviewKind(file) === "image" ? file.url : undefined);
}

function ViewerThumbnails({ files, index, onSelect }: { files: ViewerFile[]; index: number; onSelect: (index: number) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const shown = React.useRef(index);
  React.useEffect(() => {
    if (shown.current === index) return;
    shown.current = index;
    const strip = ref.current;
    const el = strip?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!strip || !el) return;
    el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (strip.contains(document.activeElement)) el.focus();
  }, [index]);
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Files"
      data-slot="file-viewer-thumbnails"
      className="flex shrink-0 gap-2 overflow-x-auto border-t border-border px-4 py-2 scrollbar-thin"
    >
      {files.map((f, i) => {
        const src = thumbnailSrc(f);
        return (
          <button
            key={`${i}-${f.name}`}
            type="button"
            data-index={i}
            tabIndex={i === index ? 0 : -1}
            onClick={() => onSelect(i)}
            aria-label={`View ${i + 1} of ${files.length}: ${f.name}`}
            aria-current={i === index ? "true" : undefined}
            className={cn(
              "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-subtle opacity-60 transition-[opacity,box-shadow] hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-primary",
              focusRing
            )}
          >
            {src ? (
              <img src={src} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
            ) : (
              <FileFormatIcon ext={f.name} size="sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}

const resolveSlot = (slot: FileViewerSlot, file: ViewerFile | undefined, index: number): React.ReactNode =>
  typeof slot === "function" ? (file ? slot(file, index) : null) : slot;

/**
 * Previews a file by type (image, PDF, video, audio, text/code/markdown/JSON) in a modal or inline. Apps can add their
 * own renderers, browse several `files`, put actions in the header and show a side panel.
 */
export const FileViewer = React.forwardRef<HTMLDivElement, FileViewerProps>(
  (
    {
      file: fileProp,
      files,
      index: indexProp,
      defaultIndex = 0,
      onIndexChange,
      loop = false,
      thumbnails = false,
      inline = false,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      text,
      loadText,
      kind: kindProp,
      renderers,
      onDownload,
      download = true,
      openInNewTab,
      title: titleSlot,
      subtitle: subtitleSlot,
      actions: actionsSlot,
      panel: panelSlot,
      panelLabel = "Details",
      panelOpen: panelOpenProp,
      defaultPanelOpen = true,
      onPanelOpenChange,
      loading = false,
      emptyState,
      onClose,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const [rawIndex, setIndex] = useControllableState({
      value: indexProp,
      defaultValue: defaultIndex,
      onChange:
        onIndexChange && files
          ? (i: number) => {
              const f = files[i];
              if (f) onIndexChange(i, f);
            }
          : undefined,
    });
    const [panelOpen, setPanelOpen] = useControllableState({
      value: panelOpenProp,
      defaultValue: defaultPanelOpen,
      onChange: onPanelOpenChange,
    });
    const panelId = React.useId();

    const gallery = files !== undefined;
    const count = gallery ? files.length : fileProp ? 1 : 0;
    const index = gallery ? Math.min(Math.max(0, Math.floor(rawIndex) || 0), Math.max(0, count - 1)) : 0;
    const current = gallery ? files[index] : fileProp;

    const { url: blobUrl, pending: blobPending } = useObjectUrl(current && !current.url ? current.blob : undefined);
    const resolved = React.useMemo(
      () => (current && !current.url && blobUrl ? { ...current, url: blobUrl } : current),
      [current, blobUrl]
    );

    const kind = current ? (kindProp ?? getFilePreviewKind(current)) : "unknown";
    const showNewTab = openInNewTab ?? Boolean(resolved?.url);
    const fileText = gallery ? undefined : text;
    const hasContent = Boolean(resolved && (resolved.url || resolved.blob || resolved.text !== undefined || fileText !== undefined));
    const skeleton = loading && (!current || !hasContent);

    /* ---------- custom renderers with fallback ---------- */
    const fileKey = current ? `${index}\u0000${current.name}\u0000${current.url ?? ""}` : "";
    const [failure, setFailure] = React.useState<{ key: string; failed: number[]; download: boolean }>();
    const failedHere = failure?.key === fileKey ? failure : undefined;
    let rendererIndex = -1;
    if (resolved && renderers?.length && !failedHere?.download && !skeleton && !blobPending) {
      rendererIndex = renderers.findIndex((r, i) => {
        if (failedHere?.failed.includes(i)) return false;
        try {
          return r.match(resolved, kind);
        } catch {
          return false;
        }
      });
    }
    const reportRendererError = React.useCallback(
      (key: string, i: number, fallback: FileRenderer["fallback"]) => {
        setFailure((prev) => {
          const base = prev?.key === key ? prev : { key, failed: [], download: false };
          if (base.failed.includes(i)) return prev;
          return { key, failed: [...base.failed, i], download: base.download || fallback === "download" };
        });
      },
      []
    );

    /* ---------- navigation ---------- */
    const go = (delta: number) => {
      if (count < 2) return;
      let next = index + delta;
      if (loop) next = (next + count) % count;
      else if (next < 0 || next >= count) return;
      setIndex(next);
    };
    const canPrev = count > 1 && (loop || index > 0);
    const canNext = count > 1 && (loop || index < count - 1);

    const onKeyDown = (event: React.KeyboardEvent) => {
      if (!gallery || count < 2 || event.defaultPrevented) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement;
      // Keys from portaled children (e.g. the zoom lightbox) bubble through React but belong to them.
      if (!(event.currentTarget as HTMLElement).contains(target) || ownsArrowKeys(target)) return;
      if (event.key === "ArrowLeft" ? !canPrev : !canNext) return;
      event.preventDefault();
      go(event.key === "ArrowLeft" ? -1 : 1);
    };

    const neighbour = (delta: number) => {
      if (!gallery || count < 2) return undefined;
      let i = index + delta;
      if (loop) i = (i + count) % count;
      const f = i === index ? undefined : files[i];
      return f?.url && getFilePreviewKind(f) === "image" ? f.url : undefined;
    };
    const prevUrl = neighbour(-1);
    const nextUrl = neighbour(1);
    const visible = inline || open;
    React.useEffect(() => {
      if (!visible || typeof Image === "undefined") return;
      for (const src of [prevUrl, nextUrl]) {
        if (!src) continue;
        const img = new Image();
        img.src = src;
      }
    }, [visible, prevUrl, nextUrl]);

    /* ---------- body ---------- */
    const builtin = (forceDownload = false) =>
      !resolved ? null : forceDownload ? (
        <DownloadCard file={resolved} message="Couldn’t show a preview." onDownload={onDownload} />
      ) : (
        <ViewerBody key={gallery ? fileKey : undefined} file={resolved} kind={kind} text={fileText} loadText={loadText} onDownload={onDownload} />
      );

    let body: React.ReactNode;
    if (skeleton) body = <BodySkeleton />;
    else if (!resolved) {
      body = (
        <div data-renderer="empty" className="flex min-h-40 flex-1 items-center justify-center text-sm text-muted-foreground">
          {emptyState ?? "No file to preview"}
        </div>
      );
    } else if (blobPending) {
      body = (
        <div className="flex min-h-40 flex-1 items-center justify-center">
          <Spinner size="sm" label="Loading preview" />
        </div>
      );
    } else if (rendererIndex >= 0) {
      const renderer = renderers![rendererIndex]!;
      const key = fileKey;
      const i = rendererIndex;
      const onError = () => reportRendererError(key, i, renderer.fallback);
      body = (
        <RendererBoundary key={`${key}\u0000${i}`} onError={onError}>
          <CustomRendererView
            renderer={renderer}
            file={resolved}
            base={{ url: resolved.url, blob: resolved.blob, kind, index, count: Math.max(1, count), onError, renderBuiltin: () => builtin() }}
          />
        </RendererBoundary>
      );
    } else body = builtin(Boolean(failedHere?.download));

    /* ---------- header pieces ---------- */
    const titleNode = resolveSlot(titleSlot, current, index);
    const subtitleNode = resolveSlot(subtitleSlot, current, index);
    const actionsNode = resolveSlot(actionsSlot, current, index);
    const panelNode = resolveSlot(panelSlot, current, index);
    const hasPanel = panelNode !== undefined && panelNode !== null && panelNode !== false;
    const accessibleName = typeof titleNode === "string" && titleNode ? titleNode : (current?.name ?? "File preview");

    const nav =
      gallery && count > 1 ? (
        <div role="group" aria-label="Browse files" data-slot="file-viewer-nav" className="flex shrink-0 items-center gap-0.5">
          <button type="button" className={navAction} aria-label="Previous file" aria-disabled={!canPrev || undefined} onClick={() => go(-1)}>
            <RiArrowLeftSLine aria-hidden />
          </button>
          <span aria-hidden data-slot="file-viewer-position" className="whitespace-nowrap px-1 text-xs tabular-nums text-muted-foreground">
            {`${index + 1} of ${count}`}
          </span>
          <button type="button" className={navAction} aria-label="Next file" aria-disabled={!canNext || undefined} onClick={() => go(1)}>
            <RiArrowRightSLine aria-hidden />
          </button>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {current ? `${current.name}, ${index + 1} of ${count}` : ""}
          </span>
        </div>
      ) : null;

    const panelToggle = hasPanel ? (
      <button
        type="button"
        className={cn(headerAction, "aria-expanded:bg-accent aria-expanded:text-foreground")}
        aria-label={panelLabel}
        aria-expanded={panelOpen}
        aria-controls={panelId}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <RiSideBarLine aria-hidden className="-scale-x-100" />
      </button>
    ) : null;

    const closeNode = (modal: boolean) =>
      modal ? (
        <DialogPrimitive.Close className={headerAction} aria-label="Close preview">
          <RiCloseLine aria-hidden />
        </DialogPrimitive.Close>
      ) : onClose ? (
        <button type="button" onClick={onClose} className={headerAction} aria-label="Close preview">
          <RiCloseLine aria-hidden />
        </button>
      ) : null;

    const header = (modal: boolean) =>
      !current ? (
        loading ? (
          <SkeletonHeader modal={modal} close={closeNode(modal)} />
        ) : (
          <ViewerHeader file={{ name: "" }} title={titleNode ?? "No file"} download={false} openInNewTab={false} modal={modal} close={closeNode(modal)} />
        )
      ) : (
        <ViewerHeader
          file={resolved!}
          title={titleNode ?? undefined}
          subtitle={subtitleNode}
          onDownload={onDownload}
          download={download}
          openInNewTab={showNewTab}
          modal={modal}
          nav={nav}
          actions={actionsNode}
          panelToggle={panelToggle}
          close={closeNode(modal)}
        />
      );

    const strip = gallery && thumbnails && count > 1 ? <ViewerThumbnails files={files} index={index} onSelect={setIndex} /> : null;
    const loadingText = loading ? <span className="sr-only">Loading file…</span> : null;

    const stage = (bodyClass: string) => {
      const main = <div className={cn(bodyClass, hasPanel && "@2xl:overflow-auto")}>{body}</div>;
      if (!hasPanel) {
        return (
          <>
            {main}
            {strip}
          </>
        );
      }
      return (
        <div className="@container flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-thin @2xl:flex-row @2xl:overflow-hidden">
            <div className="flex flex-none flex-col @2xl:min-h-0 @2xl:flex-1">
              {main}
              {strip}
            </div>
            <aside
              id={panelId}
              aria-label={panelLabel}
              hidden={!panelOpen}
              data-slot="file-viewer-panel"
              className="flex-none border-t border-border bg-card p-4 @2xl:w-80 @2xl:overflow-auto @2xl:border-l @2xl:border-t-0 scrollbar-thin"
            >
              {panelNode}
            </aside>
          </div>
        </div>
      );
    };

    if (inline) {
      return (
        <section
          ref={ref}
          aria-label={skeleton && !current ? "Loading file…" : accessibleName}
          aria-busy={loading || undefined}
          data-slot="file-viewer"
          data-kind={kind}
          onKeyDown={gallery ? onKeyDown : undefined}
          className={cn("flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card", className)}
        >
          {current && loadingText}
          {header(false)}
          {stage("flex min-h-0 flex-1 flex-col p-4")}
        </section>
      );
    }

    return (
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            ref={ref}
            aria-describedby={undefined}
            aria-busy={loading || undefined}
            data-slot="file-viewer"
            data-kind={kind}
            onKeyDown={gallery ? onKeyDown : undefined}
            className={cn(
              "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground shadow-2xl outline-none sm:inset-6 sm:mx-auto sm:max-w-5xl sm:rounded-2xl sm:border sm:border-border",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              className
            )}
          >
            {current && loadingText}
            {header(true)}
            {stage("flex min-h-0 flex-1 flex-col overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] scrollbar-thin")}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);
FileViewer.displayName = "FileViewer";


/* ------------------------------------------------------------------ */
/* FilePreviewCard                                                     */
/* ------------------------------------------------------------------ */

export interface FilePreviewCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  file: ViewerFile;
  /** Extra line under the name (defaults to the formatted size). */
  meta?: React.ReactNode;
}

/** Thumbnail tile for a file: image preview or format icon, name and size. Click to open a viewer. */
export const FilePreviewCard = React.forwardRef<HTMLButtonElement, FilePreviewCardProps>(
  ({ file, meta, className, type = "button", ...props }, ref) => {
    const kind = getFilePreviewKind(file);
    const thumb = file.thumbnail ?? (kind === "image" ? file.url : undefined);
    const sub = meta ?? (formatBytes(file.size, FILE_SIZE) || getFileExtension(file.name).toUpperCase());
    return (
      <button
        ref={ref}
        type={type}
        data-kind={kind}
        aria-label={props["aria-label"] ?? `Preview ${file.name}`}
        className={cn(
          "group flex w-44 flex-col overflow-hidden rounded-box border border-border bg-card text-left shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm",
          focusRing,
          className
        )}
        {...props}
      >
        {thumb ? (
          <ImageWithFallback src={thumb} alt="" ratio={4 / 3} className="w-full" />
        ) : (
          <span className="flex aspect-[4/3] w-full items-center justify-center bg-subtle">
            <FileFormatIcon ext={file.name} size="lg" />
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-0.5 border-t border-border px-3 py-2">
          <span className="truncate text-sm font-medium text-foreground">{file.name}</span>
          <span className="truncate text-xs text-muted-foreground">{sub}</span>
        </span>
      </button>
    );
  }
);
FilePreviewCard.displayName = "FilePreviewCard";
