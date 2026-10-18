import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiCloseLine, RiDownloadLine, RiExternalLinkLine, RiZoomInLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { formatBytes } from "../lib/format";
import { FileFormatIcon, getFileCategory, getFileExtension } from "../assets/file-format";
import { Button } from "../primitives/button";
import { Spinner } from "../primitives/spinner";
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
  /** Size in bytes. */
  size?: number;
  /** MIME type; takes precedence over the extension when choosing a renderer. */
  mimeType?: string;
  /** Inline text content (skips loading). */
  text?: string;
  /** Thumbnail image for `FilePreviewCard`. */
  thumbnail?: string;
}

export type FilePreviewKind = "image" | "pdf" | "video" | "audio" | "markdown" | "json" | "code" | "text" | "unknown";

/** Pick the renderer for a file from its MIME type, falling back to the extension. */
export function getFilePreviewKind(file: Pick<ViewerFile, "name" | "mimeType">): FilePreviewKind {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const ext = getFileExtension(file.name);
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "text/markdown" || ext === "md" || ext === "mdx" || ext === "markdown") return "markdown";
  if (mime === "application/json" || ext === "json") return "json";
  const category = getFileCategory(file.name);
  if (category === "image" && ext !== "psd" && ext !== "ai") return "image";
  if (category === "video") return "video";
  if (category === "audio") return "audio";
  if (category === "code") return "code";
  if (category === "text" || category === "data" || mime.startsWith("text/") || ext === "csv" || ext === "tsv") return "text";
  return "unknown";
}

/** Human-readable byte size, e.g. `1.4 MB`. */
export function formatFileSize(bytes: number | undefined) {
  return formatBytes(bytes, { trimZeros: false, wholeAbove: 10, invalid: "" });
}

const isTextKind = (k: FilePreviewKind) => k === "markdown" || k === "json" || k === "code" || k === "text";

async function defaultLoadText(file: ViewerFile) {
  if (!file.url) throw new Error("No URL to load from");
  const res = await fetch(file.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* ------------------------------------------------------------------ */
/* Renderers                                                           */
/* ------------------------------------------------------------------ */

function DownloadCard({ file, message, onDownload }: { file: ViewerFile; message: React.ReactNode; onDownload?: () => void }) {
  const size = formatFileSize(file.size);
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
  }, [inline, file.url, file.name]); // eslint-disable-line react-hooks/exhaustive-deps

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

export interface FileViewerProps {
  file: ViewerFile;
  /** Render in place instead of in a modal. */
  inline?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Text content for text/code/markdown/json files. */
  text?: string;
  /** Load text content (default: `fetch(file.url)`). */
  loadText?: (file: ViewerFile) => Promise<string>;
  /** Override the detected renderer. */
  kind?: FilePreviewKind;
  onDownload?: () => void;
  /** Show the "open in new tab" action. Default true when the file has a URL. */
  openInNewTab?: boolean;
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

const headerAction = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-[18px]",
  focusRing
);

function ViewerHeader({
  file,
  onDownload,
  openInNewTab,
  close,
  modal,
}: {
  file: ViewerFile;
  onDownload?: () => void;
  openInNewTab: boolean;
  close?: React.ReactNode;
  modal: boolean;
}) {
  const size = formatFileSize(file.size);
  const Title = modal ? DialogPrimitive.Title : "h2";
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
      <FileFormatIcon ext={file.name} size="sm" />
      <div className="min-w-0 flex-1 leading-tight">
        <Title className="truncate text-sm font-semibold text-foreground">{file.name}</Title>
        {size ? <p className="text-xs text-muted-foreground">{size}</p> : null}
      </div>
      {file.url && (
        <>
          <a href={file.url} download={file.name} onClick={onDownload} className={headerAction} aria-label={`Download ${file.name}`}>
            <RiDownloadLine aria-hidden />
          </a>
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

/** Previews a file by type (image, PDF, video, audio, text/code/markdown/JSON) in a modal or inline. */
export const FileViewer = React.forwardRef<HTMLDivElement, FileViewerProps>(
  (
    {
      file,
      inline = false,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      text,
      loadText,
      kind: kindProp,
      onDownload,
      openInNewTab,
      onClose,
      className,
    },
    ref
  ) => {
    const [open, setOpen] = useControllableState({ value: openProp, defaultValue: defaultOpen, onChange: onOpenChange });
    const kind = kindProp ?? getFilePreviewKind(file);
    const showNewTab = openInNewTab ?? Boolean(file.url);
    const body = <ViewerBody file={file} kind={kind} text={text} loadText={loadText} onDownload={onDownload} />;

    if (inline) {
      return (
        <section
          ref={ref}
          aria-label={file.name}
          data-slot="file-viewer"
          data-kind={kind}
          className={cn("flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card", className)}
        >
          <ViewerHeader
            file={file}
            onDownload={onDownload}
            openInNewTab={showNewTab}
            modal={false}
            close={
              onClose ? (
                <button type="button" onClick={onClose} className={headerAction} aria-label="Close preview">
                  <RiCloseLine aria-hidden />
                </button>
              ) : null
            }
          />
          <div className="flex min-h-0 flex-1 flex-col p-4">{body}</div>
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
            data-slot="file-viewer"
            data-kind={kind}
            className={cn(
              "fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground shadow-2xl outline-none sm:inset-6 sm:mx-auto sm:max-w-5xl sm:rounded-2xl sm:border sm:border-border",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              className
            )}
          >
            <ViewerHeader
              file={file}
              onDownload={onDownload}
              openInNewTab={showNewTab}
              modal
              close={
                <DialogPrimitive.Close className={headerAction} aria-label="Close preview">
                  <RiCloseLine aria-hidden />
                </DialogPrimitive.Close>
              }
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] scrollbar-thin">{body}</div>
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
    const sub = meta ?? (formatFileSize(file.size) || getFileExtension(file.name).toUpperCase());
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
