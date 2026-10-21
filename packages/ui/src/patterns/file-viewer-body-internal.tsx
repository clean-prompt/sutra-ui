/** Private pieces of the file viewer: the download card, text preview, per-kind body and custom renderer host. */
import * as React from "react";
import { RiDownloadLine, RiZoomInLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useLatestRef } from "../hooks/use-iso-layout-effect";
import { formatBytes } from "../lib/format";
import { FileFormatIcon } from "../assets/file-format";
import { Button } from "../primitives/button";
import { Spinner } from "../primitives/spinner";
import { Markdown } from "./markdown";
import { SegmentedControl } from "../primitives/segmented-control";
import { ImageWithFallback, Lightbox } from "./lightbox";
import { FILE_SIZE } from "./file-viewer-internal";
import type { FilePreviewKind, FileRenderer, FileRendererContext, ViewerFile } from "./file-viewer-model";

export const isTextKind = (k: FilePreviewKind) => k === "markdown" || k === "json" || k === "code" || k === "text";

export async function defaultLoadText(file: ViewerFile) {
  if (file.blob) return file.blob.text();
  if (!file.url) throw new Error("No URL to load from");
  const res = await fetch(file.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function DownloadCard({ file, message, onDownload }: { file: ViewerFile; message: React.ReactNode; onDownload?: () => void }) {
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

export function TextPreview({
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
  const loaderRef = useLatestRef(loadText);

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


export function ViewerBody({
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
            <span aria-hidden className="absolute bottom-2 end-2 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
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
export class RendererBoundary extends React.Component<{ onError: (error: unknown) => void; children: React.ReactNode }, { failed: boolean }> {
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

export function CustomRendererView({
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
