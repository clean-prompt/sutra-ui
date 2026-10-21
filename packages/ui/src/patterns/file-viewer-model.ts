/** File viewer model: the file and renderer types, the preview kind detection and the size formatter. */
import { formatBytes } from "../lib/format";
import { getFileCategory, getFileExtension } from "../assets/file-format";
import type * as React from "react";
import { FILE_SIZE } from "./file-viewer-internal";

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


/**
 * Human-readable byte size, e.g. `1.4 MB`.
 * @deprecated Use `formatBytes(bytes, { trimZeros: false, wholeAbove: 10, invalid: "" })`.
 */
export function formatFileSize(bytes: number | undefined) {
  return formatBytes(bytes, FILE_SIZE);
}

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
