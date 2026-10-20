import * as React from "react";
import {
  RiCloseLine,
  RiErrorWarningLine,
  RiFileCodeLine,
  RiFileExcel2Line,
  RiFileMusicLine,
  RiFilePdf2Line,
  RiFilePpt2Line,
  RiFileTextLine,
  RiFileVideoLine,
  RiFileWord2Line,
  RiFileZipLine,
  RiImageLine,
  RiRefreshLine,
} from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { formatBytes, pluralize, type FormatBytesOptions } from "../../lib/format";
import { ProgressCircle } from "../../primitives/progress";
import { Spinner } from "../../primitives/spinner";

type FileKind = "image" | "pdf" | "doc" | "sheet" | "slides" | "archive" | "code" | "audio" | "video" | "text";

const kindStyles: Record<FileKind, { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  image: { icon: RiImageLine, className: "bg-info-soft text-info-soft-foreground" },
  pdf: { icon: RiFilePdf2Line, className: "bg-destructive-soft text-destructive-soft-foreground" },
  doc: { icon: RiFileWord2Line, className: "bg-primary-soft text-primary-soft-foreground" },
  sheet: { icon: RiFileExcel2Line, className: "bg-success-soft text-success-soft-foreground" },
  slides: { icon: RiFilePpt2Line, className: "bg-warning-soft text-warning-soft-foreground" },
  archive: { icon: RiFileZipLine, className: "bg-warning-soft text-warning-soft-foreground" },
  code: { icon: RiFileCodeLine, className: "bg-secondary text-secondary-foreground" },
  audio: { icon: RiFileMusicLine, className: "bg-primary-soft text-primary-soft-foreground" },
  video: { icon: RiFileVideoLine, className: "bg-primary-soft text-primary-soft-foreground" },
  text: { icon: RiFileTextLine, className: "bg-muted text-muted-foreground" },
};

const extKinds: Record<string, FileKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", avif: "image", heic: "image",
  pdf: "pdf",
  doc: "doc", docx: "doc", rtf: "doc", odt: "doc", pages: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet", tsv: "sheet", numbers: "sheet", ods: "sheet",
  ppt: "slides", pptx: "slides", key: "slides", odp: "slides",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  js: "code", jsx: "code", ts: "code", tsx: "code", py: "code", rb: "code", go: "code", rs: "code", java: "code",
  c: "code", cpp: "code", h: "code", cs: "code", php: "code", swift: "code", kt: "code", html: "code", css: "code",
  json: "code", yaml: "code", yml: "code", sh: "code", sql: "code", xml: "code",
  mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio", flac: "audio",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video",
};

function extensionOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

function kindOf(name: string, mimeType?: string): FileKind {
  const ext = extensionOf(name);
  if (extKinds[ext]) return extKinds[ext];
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "application/pdf") return "pdf";
    if (/zip|compressed|tar/.test(mimeType)) return "archive";
  }
  return "text";
}

const ATTACHMENT_SIZE: FormatBytesOptions = { decimals: 1, wholeAbove: 10, trimZeros: false, negative: "invalid", invalid: "" };

/**
 * Format bytes as "12 KB", "1.4 MB" (one decimal below 10, `""` for bad input).
 * @deprecated Use `formatBytes(bytes, { decimals: 1, wholeAbove: 10, trimZeros: false, negative: "invalid", invalid: "" })`.
 */
export function formatAttachmentSize(bytes: number) {
  return formatBytes(bytes, ATTACHMENT_SIZE);
}

export interface ChatAttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** File name, shown in the card, chip or tooltip. */
  name: string;
  /** Size in bytes. */
  fileSize?: number;
  /** MIME type (for example `application/pdf`); picks the file-kind icon. */
  mimeType?: string;
  /** Image thumbnail (object URL or remote URL). */
  previewUrl?: string;
  /** Alt text for the thumbnail when it is not inside a preview button. Default "" (decorative). */
  alt?: string;
  /** Page count (PDFs, documents), shown in the meta line. */
  pages?: number;
  /** Upload progress 0–100; shows a progress ring while set and below 100. */
  progress?: number;
  /** Error message (or `true`) for a failed upload. */
  error?: string | boolean;
  /** Explicit upload state. `uploading` without `progress` shows a spinner; `ready` hides progress. Default: derived from `progress` / `error`. */
  status?: "ready" | "uploading" | "failed";
  /** Overrides the secondary line (card variant). */
  meta?: React.ReactNode;
  /** Replaces the file-kind icon tile (e.g. a `FileFormatIcon`). */
  icon?: React.ReactNode;
  /** Shows a remove button on hover. */
  onRemove?: () => void;
  /** Shows a retry action while failed. */
  onRetry?: () => void;
  /** Makes the thumbnail a "Preview {name}" button (e.g. to open a Lightbox). */
  onPreview?: () => void;
  /** card: file tile · chip: compact pill · image: square thumbnail */
  variant?: "card" | "chip" | "image";
}

/** File attachment preview for prompts and messages: card, chip or image tile, with upload progress, failed / retry and preview. */
export const ChatAttachment = React.forwardRef<HTMLDivElement, ChatAttachmentProps>(
  (
    {
      name,
      fileSize,
      mimeType,
      previewUrl,
      alt = "",
      pages,
      progress,
      error,
      status,
      meta: metaProp,
      icon,
      onRemove,
      onRetry,
      onPreview,
      variant = "card",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const kind = kindOf(name, mimeType);
    const { icon: Icon, className: kindClass } = kindStyles[kind];
    const ext = extensionOf(name);
    const hasError = !!error || status === "failed";
    const uploading = !hasError && status !== "ready" && (status === "uploading" || (progress !== undefined && progress < 100));
    const determinate = uploading && progress !== undefined;
    const errorText = typeof error === "string" && error ? error : "Upload failed";
    const meta =
      metaProp !== undefined
        ? metaProp
        : hasError
          ? errorText
          : uploading
            ? determinate
              ? `Uploading… ${Math.round(progress ?? 0)}%`
              : "Uploading…"
            : [
                ext ? ext.toUpperCase() : kind === "text" ? "File" : kind,
                pages != null ? `${pages} ${pluralize(pages, "page")}` : null,
                fileSize != null ? formatBytes(fileSize, ATTACHMENT_SIZE) : null,
              ]
                .filter(Boolean)
                .join(" · ");
    const showThumb = !!previewUrl && (kind === "image" || mimeType?.startsWith("image/"));
    const small = variant === "chip";

    const roundButton =
      "flex items-center justify-center rounded-full border border-border bg-background shadow-sm transition-[opacity,background-color,color]";

    const removeButton = onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        title="Remove"
        className={cn(
          hitArea,
          "flex items-center justify-center rounded-full transition-[opacity,background-color,color]",
          small
            ? "size-5 text-muted-foreground hover:bg-accent hover:text-foreground"
            : cn(
                roundButton,
                "absolute -end-1.5 -top-1.5 z-10 size-5 text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover/attachment:opacity-100 [@media(hover:none)]:opacity-100"
              ),
          focusRing
        )}
      >
        <RiCloseLine aria-hidden className="size-3.5" />
      </button>
    );

    const retryLabel = `Retry ${name}`;
    const retryIcon = hasError && onRetry && variant !== "card" && (
      <button
        type="button"
        onClick={onRetry}
        aria-label={retryLabel}
        title="Retry"
        className={cn(
          small
            ? "flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            : cn(roundButton, "absolute -bottom-1.5 -end-1.5 z-10 size-5 text-foreground"),
          focusRing
        )}
      >
        <RiRefreshLine aria-hidden className="size-3" />
      </button>
    );

    const uploadLabel = `Uploading ${name}`;
    const overlay = uploading && (
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-background/60 text-foreground backdrop-blur-[1px]">
        {determinate ? (
          <ProgressCircle value={progress ?? 0} size={small ? 16 : 24} strokeWidth={small ? 2 : 2.5} tone="neutral" showValue={false} label={uploadLabel} />
        ) : (
          <Spinner size="xs" label={uploadLabel} />
        )}
      </span>
    );

    const errorOverlay = hasError && variant === "image" && (
      <span
        role="img"
        aria-label={errorText}
        className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[inherit] bg-destructive/20 text-destructive"
      >
        <RiErrorWarningLine aria-hidden className="size-5" />
      </span>
    );

    const thumb = (box: string) => {
      const content = showThumb ? (
        <img src={previewUrl} alt={onPreview ? "" : alt} className="size-full object-cover" draggable={false} />
      ) : hasError && !icon ? (
        <RiErrorWarningLine aria-hidden className="size-1/2 max-h-5 max-w-5 text-destructive" />
      ) : (
        (icon ?? <Icon className="size-1/2 max-h-5 max-w-5" />)
      );
      const boxClass = cn("relative flex shrink-0 items-center justify-center overflow-hidden", box, !showThumb && !icon && kindClass);
      return onPreview ? (
        <button
          type="button"
          aria-label={`Preview ${name}`}
          onClick={onPreview}
          className={cn(boxClass, "cursor-zoom-in", focusRing)}
        >
          {content}
          {overlay}
          {errorOverlay}
        </button>
      ) : (
        <span className={boxClass}>
          {content}
          {overlay}
          {errorOverlay}
        </span>
      );
    };

    const common = {
      ref,
      "data-variant": variant,
      "data-state": hasError ? "error" : uploading ? "uploading" : "done",
      title: name,
      ...props,
    };

    if (variant === "image") {
      return (
        <div
          {...common}
          className={cn(
            "group/attachment relative size-16 shrink-0 rounded-box border border-border bg-muted shadow-xs",
            hasError && "border-destructive",
            className
          )}
        >
          {thumb("size-full rounded-[inherit]")}
          {retryIcon}
          {removeButton}
          {children}
        </div>
      );
    }

    if (variant === "chip") {
      return (
        <div
          {...common}
          className={cn(
            "group/attachment inline-flex h-8 max-w-56 shrink-0 items-center gap-1.5 rounded-control border border-border bg-background ps-1 pe-1.5 text-sm shadow-xs",
            !onRemove && !retryIcon && "pe-2.5",
            hasError && "border-destructive/60",
            className
          )}
        >
          {thumb("size-6 rounded-xs")}
          <span className="truncate font-medium text-foreground">{name}</span>
          {hasError ? <span className="sr-only">{errorText}</span> : null}
          {retryIcon}
          {removeButton}
          {children}
        </div>
      );
    }

    return (
      <div
        {...common}
        className={cn(
          "group/attachment relative flex h-14 w-60 shrink-0 items-center gap-2.5 rounded-box border border-border bg-card p-2 pe-3 shadow-xs",
          hasError && "border-destructive/60",
          className
        )}
      >
        {thumb("size-10 rounded-md")}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium leading-5 text-foreground">{name}</span>
          <span className={cn("flex min-w-0 items-center gap-1.5 text-xs leading-4", hasError ? "text-destructive" : "text-muted-foreground")}>
            <span className="truncate">{meta}</span>
            {hasError && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                aria-label={retryLabel}
                className={cn(hitArea, "shrink-0 rounded-xs font-medium text-foreground underline-offset-2 hover:underline", focusRing)}
              >
                Retry
              </button>
            ) : null}
          </span>
        </span>
        {removeButton}
        {children}
      </div>
    );
  }
);
ChatAttachment.displayName = "ChatAttachment";

/** Horizontally scrolling row of attachments. */
export const ChatAttachmentList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("scrollbar-none -m-1.5 flex items-center gap-2 overflow-x-auto p-1.5 [&>*]:shrink-0", className)}
      {...props}
    />
  )
);
ChatAttachmentList.displayName = "ChatAttachmentList";
