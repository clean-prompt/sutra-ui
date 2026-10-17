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
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";

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

/** Format bytes as "12 KB", "1.4 MB". */
export function formatAttachmentSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function ProgressRing({ value, className }: { value: number; className?: string }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <svg viewBox="0 0 24 24" className={cn("-rotate-90", className)} aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (clamped / 100) * c}
        className="transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}

export interface ChatAttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  /** Size in bytes. */
  fileSize?: number;
  mimeType?: string;
  /** Image thumbnail (object URL or remote URL). */
  previewUrl?: string;
  /** Upload progress 0–100; shows a progress ring while set and below 100. */
  progress?: number;
  /** Error message (or `true`) for a failed upload. */
  error?: string | boolean;
  /** Shows a remove button on hover. */
  onRemove?: () => void;
  /** card: file tile · chip: compact pill · image: square thumbnail */
  variant?: "card" | "chip" | "image";
}

/** File attachment preview for prompts and messages. */
export const ChatAttachment = React.forwardRef<HTMLDivElement, ChatAttachmentProps>(
  (
    { name, fileSize, mimeType, previewUrl, progress, error, onRemove, variant = "card", className, children, ...props },
    ref
  ) => {
    const kind = kindOf(name, mimeType);
    const { icon: Icon, className: kindClass } = kindStyles[kind];
    const ext = extensionOf(name);
    const uploading = progress !== undefined && progress < 100 && !error;
    const hasError = !!error;
    const meta = hasError
      ? typeof error === "string"
        ? error
        : "Upload failed"
      : uploading
        ? `Uploading… ${Math.round(progress ?? 0)}%`
        : [ext ? ext.toUpperCase() : kind === "text" ? "File" : kind, fileSize != null ? formatAttachmentSize(fileSize) : null]
            .filter(Boolean)
            .join(" · ");
    const showThumb = !!previewUrl && (kind === "image" || mimeType?.startsWith("image/"));

    const removeButton = onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        title="Remove"
        className={cn(
          "flex items-center justify-center rounded-full transition-[opacity,background-color,color]",
          variant === "chip"
            ? "size-5 text-muted-foreground hover:bg-accent hover:text-foreground"
            : "absolute -right-1.5 -top-1.5 z-10 size-5 border border-border bg-background text-muted-foreground opacity-0 shadow-sm hover:text-foreground focus-visible:opacity-100 group-hover/attachment:opacity-100 [@media(hover:none)]:opacity-100",
          focusRing
        )}
      >
        <RiCloseLine className="size-3.5" />
      </button>
    );

    const overlay = uploading && (
      <span className="absolute inset-0 flex items-center justify-center bg-background/60 text-foreground backdrop-blur-[1px]">
        <ProgressRing value={progress ?? 0} className="size-6" />
      </span>
    );

    const thumb = (box: string) => (
      <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden", box, !showThumb && kindClass)}>
        {showThumb ? (
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : hasError ? (
          <RiErrorWarningLine className="size-1/2 max-h-5 max-w-5 text-destructive" />
        ) : (
          <Icon className="size-1/2 max-h-5 max-w-5" />
        )}
        {overlay}
      </span>
    );

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
            "group/attachment inline-flex h-8 max-w-56 shrink-0 items-center gap-1.5 rounded-control border border-border bg-background pl-1 pr-1.5 text-sm shadow-xs",
            !onRemove && "pr-2.5",
            hasError && "border-destructive/60",
            className
          )}
        >
          {thumb("size-6 rounded-xs")}
          <span className="truncate font-medium text-foreground">{name}</span>
          {removeButton}
          {children}
        </div>
      );
    }

    return (
      <div
        {...common}
        className={cn(
          "group/attachment relative flex h-14 w-60 shrink-0 items-center gap-2.5 rounded-box border border-border bg-card p-2 pr-3 shadow-xs",
          hasError && "border-destructive/60",
          className
        )}
      >
        {thumb("size-10 rounded-md")}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium leading-5 text-foreground">{name}</span>
          <span className={cn("truncate text-xs leading-4", hasError ? "text-destructive" : "text-muted-foreground")}>
            {meta}
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
