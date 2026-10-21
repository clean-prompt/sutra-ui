/* Private helpers shared by the artifacts modules (kind table, download, version switching, copy action). Not public. */

import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCodeSSlashLine, RiDatabase2Line, RiFileTextLine, RiFlowChart, RiHtml5Line, RiImageLine, RiMarkdownLine, RiShapesLine } from "@remixicon/react";
import { slugify } from "../../lib/text";
import { clamp } from "../../lib/math";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { type ArtifactKind, type ArtifactVersion } from "./artifacts-model";

export const kindMeta: Record<ArtifactKind, { label: string; icon: React.ReactNode; ext: string; mime: string }> = {
  code: { label: "Code", icon: <RiCodeSSlashLine aria-hidden />, ext: "txt", mime: "text/plain" },
  html: { label: "HTML", icon: <RiHtml5Line aria-hidden />, ext: "html", mime: "text/html" },
  markdown: { label: "Markdown", icon: <RiMarkdownLine aria-hidden />, ext: "md", mime: "text/markdown" },
  svg: { label: "SVG", icon: <RiShapesLine aria-hidden />, ext: "svg", mime: "image/svg+xml" },
  image: { label: "Image", icon: <RiImageLine aria-hidden />, ext: "png", mime: "image/png" },
  diagram: { label: "Diagram", icon: <RiFlowChart aria-hidden />, ext: "mmd", mime: "text/plain" },
  document: { label: "Document", icon: <RiFileTextLine aria-hidden />, ext: "md", mime: "text/markdown" },
  data: { label: "Data", icon: <RiDatabase2Line aria-hidden />, ext: "json", mime: "application/json" },
};

export function defaultDownload(title: string, kind: ArtifactKind, content: string) {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
  const blob = new Blob([content], { type: kindMeta[kind].mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `${slugify(title, { fallback: "artifact" })}.${kindMeta[kind].ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

/* ------------------------------------------------------------------ */
/* Shared header bits                                                  */
/* ------------------------------------------------------------------ */

export function useVersion(
  versions: ArtifactVersion[],
  value: number | undefined,
  defaultValue: number | undefined,
  onChange: ((i: number) => void) | undefined
) {
  const last = Math.max(0, versions.length - 1);
  // Uncontrolled: `null` follows the latest version, so new versions show up as they arrive.
  const [picked, setPicked] = React.useState<number | null>(defaultValue ?? null);
  const index = clamp(value ?? picked ?? last, 0, last);
  const setIndex = (i: number) => {
    if (value === undefined) setPicked(i >= last ? null : i);
    if (i !== index) onChange?.(i);
  };
  return [index, setIndex] as const;
}

export function VersionSwitcher({ index, total, onChange }: { index: number; total: number; onChange: (i: number) => void }) {
  if (total <= 0) return null;
  return (
    <div role="group" aria-label="Versions" className="inline-flex items-center gap-0.5">
      {total > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Previous version"
          disabled={index <= 0}
          onClick={() => onChange(index - 1)}
        >
          <RiArrowLeftSLine className="rtl:-scale-x-100" aria-hidden />
        </Button>
      )}
      <Badge size="sm" variant="outline" title={`Version ${index + 1} of ${total}`} aria-label={`Version ${index + 1} of ${total}`}>
        v{index + 1}
      </Badge>
      {total > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Next version"
          disabled={index >= total - 1}
          onClick={() => onChange(index + 1)}
        >
          <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />
        </Button>
      )}
    </div>
  );
}

export function CopyAction({ onCopy, content, disabled }: { onCopy?: () => void; content: string; disabled?: boolean }) {
  return (
    <CopyButton
      value={content}
      disabled={disabled}
      onClick={
        onCopy
          ? (e) => {
              e.preventDefault();
              onCopy();
            }
          : undefined
      }
    />
  );
}
