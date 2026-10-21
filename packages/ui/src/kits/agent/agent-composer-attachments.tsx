import * as React from "react";
import { cn } from "../../lib/cn";
import { Lightbox, useLightbox, type LightboxItem } from "../../patterns/lightbox";
import { FileFormatIcon } from "../../assets/file-format";
import { ChatAttachment } from "../ai/chat-attachment";
import { formatBytes, pluralize } from "../../lib/format";

/* ------------------------------------------------------------------ */
/* AttachmentThumbnails                                                */
/* ------------------------------------------------------------------ */

export interface AttachmentThumbnailItem {
  id: string;
  name: string;
  /** Image URL (object URL, data URI or remote) for previews. */
  url?: string;
  mimeType?: string;
  /** Size in bytes. */
  size?: number;
  /** Page count (PDFs, documents). */
  pages?: number;
  status?: "ready" | "uploading" | "failed";
  /** Upload progress 0–100 while uploading. */
  progress?: number;
  error?: string;
  alt?: string;
}

export interface AttachmentThumbnailsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Attachments to show as thumbnails, each with a name, kind and upload status. */
  items: AttachmentThumbnailItem[];
  /** Called with the item id when the user removes an attachment; the remove button is hidden when unset. */
  onRemove?: (id: string) => void;
  /** Shows a retry action on failed items. */
  onRetry?: (id: string) => void;
  /** Click images to open them in a Lightbox. Default true. */
  preview?: boolean;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp|heic)$/i;

function isImageAttachment(item: AttachmentThumbnailItem) {
  return !!item.url && (item.mimeType?.startsWith("image/") || IMAGE_EXT.test(item.name) || item.url.startsWith("data:image/"));
}

function attachmentMeta(item: AttachmentThumbnailItem) {
  if (item.status === "failed") return item.error ?? "Upload failed";
  if (item.status === "uploading") return item.progress != null ? `Uploading… ${Math.round(item.progress)}%` : "Uploading…";
  return [item.pages != null ? `${item.pages} ${pluralize(item.pages, "page")}` : null, item.size != null ? formatBytes(item.size, { decimals: 1, wholeAbove: 10, trimZeros: false, negative: "invalid", invalid: "" }) : null]
    .filter(Boolean)
    .join(" · ");
}

/** Data-driven row of `ChatAttachment`s: image tiles (click to preview in a Lightbox) and file cards with pages / size, upload progress, failed + retry and remove on hover. */
export const AttachmentThumbnails = React.forwardRef<HTMLDivElement, AttachmentThumbnailsProps>(
  ({ items, onRemove, onRetry, preview = true, className, ...props }, ref) => {
    const lightbox = useLightbox();
    const images = items.filter(isImageAttachment);
    const lightboxItems = React.useMemo<LightboxItem[]>(
      () => images.map((i) => ({ src: i.url!, alt: i.alt ?? i.name, caption: i.name })),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [images.map((i) => `${i.id}:${i.url}`).join("|")]
    );
    if (items.length === 0) return null;

    return (
      <div
        ref={ref}
        role="list"
        aria-label="Attachments"
        data-prompt-input-ignore=""
        className={cn("scrollbar-none -m-1.5 flex items-center gap-2 overflow-x-auto p-1.5 [&>*]:shrink-0", className)}
        {...props}
      >
        {items.map((item) => {
          const state = item.status ?? "ready";
          const image = isImageAttachment(item);
          const imageIndex = image ? images.indexOf(item) : -1;
          return (
            <ChatAttachment
              key={item.id}
              role="listitem"
              data-state={state}
              variant={image ? "image" : "card"}
              name={item.name}
              mimeType={item.mimeType}
              previewUrl={image ? item.url : undefined}
              alt={item.alt ?? item.name}
              fileSize={item.size}
              pages={item.pages}
              status={state}
              progress={item.progress}
              error={state === "failed" ? (item.error ?? true) : undefined}
              meta={state === "ready" ? attachmentMeta(item) : undefined}
              icon={image ? undefined : <FileFormatIcon ext={item.name} size={32} aria-hidden />}
              onRemove={onRemove ? () => onRemove(item.id) : undefined}
              onRetry={onRetry ? () => onRetry(item.id) : undefined}
              onPreview={image && preview ? () => lightbox.openAt(imageIndex) : undefined}
              className={image ? "size-14" : "w-auto max-w-60"}
            />
          );
        })}
        {preview && lightboxItems.length > 0 && <Lightbox items={lightboxItems} {...lightbox.props} />}
      </div>
    );
  }
);
AttachmentThumbnails.displayName = "AttachmentThumbnails";

