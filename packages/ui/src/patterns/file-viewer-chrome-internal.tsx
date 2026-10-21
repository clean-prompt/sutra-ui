/** Private pieces of the file viewer chrome: header, skeletons, thumbnail strip, action classes, arrow-key ownership and slot resolution. */
import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiDownloadLine, RiExternalLinkLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { formatBytes } from "../lib/format";
import { isEditableTarget } from "../lib/shortcuts";
import { FileFormatIcon } from "../assets/file-format";
import { Skeleton } from "../primitives/progress";
import { FILE_SIZE } from "./file-viewer-internal";
import { getFilePreviewKind, type FileViewerSlot, ViewerFile } from "./file-viewer-model";

export const headerAction = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-[18px]",
  focusRing
);

export const navAction = cn(headerAction, "aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground");

export function ViewerHeader({
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

export function SkeletonHeader({ modal, close }: { modal: boolean; close?: React.ReactNode }) {
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

export function BodySkeleton() {
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

export function ownsArrowKeys(target: HTMLElement) {
  if (isEditableTarget(target)) return true;
  if (ARROW_KEY_TAGS.has(target.tagName)) return true;
  return typeof target.closest === "function" && target.closest(ARROW_KEY_OWNERS) != null;
}

function thumbnailSrc(file: ViewerFile) {
  return file.thumbnail ?? (getFilePreviewKind(file) === "image" ? file.url : undefined);
}

export function ViewerThumbnails({ files, index, onSelect }: { files: ViewerFile[]; index: number; onSelect: (index: number) => void }) {
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

export const resolveSlot = (slot: FileViewerSlot, file: ViewerFile | undefined, index: number): React.ReactNode =>
  typeof slot === "function" ? (file ? slot(file, index) : null) : slot;
