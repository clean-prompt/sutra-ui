/** File viewer: FileViewer (modal or inline preview with gallery and custom renderers) and FilePreviewCard, with re-exports of the file model, one module per family. */
import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiSideBarLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { logicalArrow } from "../lib/direction";
import { useControllableState } from "../hooks/use-controllable-state";
import { useObjectUrlState } from "../hooks/use-object-url";
import { formatBytes } from "../lib/format";
import { clamp } from "../lib/math";
import { FileFormatIcon, getFileExtension } from "../assets/file-format";
import { Spinner } from "../primitives/spinner";
import { ImageWithFallback } from "./lightbox";
import { FILE_SIZE } from "./file-viewer-internal";
import { getFilePreviewKind, type FilePreviewKind, type FileRenderer, type FileViewerSlot, type ViewerFile } from "./file-viewer-model";
import { CustomRendererView, DownloadCard, RendererBoundary, ViewerBody } from "./file-viewer-body-internal";
import { BodySkeleton, SkeletonHeader, ViewerHeader, ViewerThumbnails, headerAction, navAction, ownsArrowKeys, resolveSlot } from "./file-viewer-chrome-internal";

export * from "./file-viewer-model";

export interface FileViewerProps {
  /** The file to show. In a gallery, pass `files` instead. */
  file?: ViewerFile;
  /** Files to browse with previous/next buttons, ←/→ and an optional thumbnail strip. Takes precedence over `file`. */
  files?: ViewerFile[];
  /** Position in `files` (controlled). */
  index?: number;
  /** Initial position in `files` (uncontrolled). Default 0. */
  defaultIndex?: number;
  /** Called with the new index and the file when the user browses to another file. */
  onIndexChange?: (index: number, file: ViewerFile) => void;
  /** Wrap from the last file to the first and back. Default false. */
  loop?: boolean;
  /** Show a thumbnail strip under the content when browsing several files. Default false. */
  thumbnails?: boolean;
  /** Render in place instead of in a modal. */
  inline?: boolean;
  /** Controlled open state of the modal viewer. Use with `onOpenChange`. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the modal viewer opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Text content for text/code/markdown/json files (single `file` only; in a gallery set each file's `text`). */
  text?: string;
  /** Load text content (default: `file.blob`, then `fetch(file.url)`). */
  loadText?: (file: ViewerFile) => Promise<string>;
  /** Override the detected renderer. */
  kind?: FilePreviewKind;
  /** App renderers, tried in order before the built-in kinds. */
  renderers?: FileRenderer[];
  /** Called when the download button is clicked; setting it shows the button. */
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
  /** Controlled open state of the details side panel. Use with `onPanelOpenChange`. */
  panelOpen?: boolean;
  /** Default true. */
  defaultPanelOpen?: boolean;
  /** Called when the side panel opens or closes. */
  onPanelOpenChange?: (open: boolean) => void;
  /** Waiting for the file (or its URL). Shows skeletons until there is something to show. */
  loading?: boolean;
  /** Shown when `files` is empty and nothing is loading. */
  emptyState?: React.ReactNode;
  /** Close action for inline viewers (modal viewers close via `onOpenChange`). */
  onClose?: () => void;
  /** Classes for the viewer root. */
  className?: string;
}

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
    const index = gallery ? clamp(Math.floor(rawIndex) || 0, 0, Math.max(0, count - 1)) : 0;
    const current = gallery ? files[index] : fileProp;

    const { url: blobUrl, pending: blobPending } = useObjectUrlState(current && !current.url ? current.blob : undefined);
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
      if (logicalArrow(event) !== "ArrowLeft" && logicalArrow(event) !== "ArrowRight") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement;
      // Keys from portaled children (e.g. the zoom lightbox) bubble through React but belong to them.
      if (!(event.currentTarget as HTMLElement).contains(target) || ownsArrowKeys(target)) return;
      if (logicalArrow(event) === "ArrowLeft" ? !canPrev : !canNext) return;
      event.preventDefault();
      go(logicalArrow(event) === "ArrowLeft" ? -1 : 1);
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
            <RiArrowLeftSLine className="rtl:-scale-x-100" aria-hidden />
          </button>
          <span aria-hidden data-slot="file-viewer-position" className="whitespace-nowrap px-1 text-xs tabular-nums text-muted-foreground">
            <bdi dir="ltr">{`${index + 1} of ${count}`}</bdi>
          </span>
          <button type="button" className={navAction} aria-label="Next file" aria-disabled={!canNext || undefined} onClick={() => go(1)}>
            <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />
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
              className="flex-none border-t border-border bg-card p-4 @2xl:w-80 @2xl:overflow-auto @2xl:border-s @2xl:border-t-0 scrollbar-thin"
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
  /** The file to preview: its name, type, size and an optional thumbnail URL. */
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
          "group flex w-44 flex-col overflow-hidden rounded-box border border-border bg-card text-start shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm",
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
