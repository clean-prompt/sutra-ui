import { formatRelative } from "../../lib/time";

export type ArtifactKind = "code" | "html" | "markdown" | "svg" | "image" | "diagram" | "document" | "data";

export const ARTIFACT_KINDS: ArtifactKind[] = ["code", "html", "markdown", "svg", "image", "diagram", "document", "data"];

export interface ArtifactVersion {
  id: string;
  /** Source text (code, HTML, markdown, SVG markup, JSON…) or, for `image`, a data:/blob: URL. */
  content: string;
  createdAt?: string | number | Date;
  /** Short change note, e.g. "Added dark mode". */
  note?: string;
}

export interface ArtifactData {
  id: string;
  title: string;
  kind: ArtifactKind;
  /** Code language for highlighting. */
  language?: string;
  versions: ArtifactVersion[];
  updatedAt?: string | number | Date;
  description?: string;
}

/** `data:` URL for SVG markup. Rendered through `<img>`, so scripts inside never run. */
export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** "just now", "5m ago", "3h ago", "2d ago" or a short date. */
export function formatArtifactTime(v: string | number | Date | undefined, now = Date.now()) {
  return formatRelative(v, { now, maxRelativeDays: 6, invalid: "" });
}
