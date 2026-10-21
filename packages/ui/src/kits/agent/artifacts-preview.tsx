import * as React from "react";
import { cn } from "../../lib/cn";
import { CodeBlock } from "../../patterns/code-block";
import { Markdown } from "../../patterns/markdown";
import { type ArtifactKind, svgToDataUrl } from "./artifacts-model";
import { kindMeta } from "./artifacts-internal";

/** Human label for an artifact kind. */
export function artifactKindLabel(kind: ArtifactKind) {
  return kindMeta[kind].label;
}

export interface ArtifactKindIconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Artifact kind (`code`, `html`, `markdown`, `svg`, `image`, `diagram`, `document` or `data`); picks the icon. */
  kind: ArtifactKind;
}

/** Icon for an artifact kind, in a tinted tile. */
export const ArtifactKindIcon = React.forwardRef<HTMLSpanElement, ArtifactKindIconProps>(function ArtifactKindIcon(
  { kind, className, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      data-kind={kind}
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-soft-foreground [&_svg]:size-4",
        className
      )}
      {...props}
    >
      {kindMeta[kind].icon}
    </span>
  );
});
ArtifactKindIcon.displayName = "ArtifactKindIcon";

const safeImageSrc = (src: string) => (/^(data:image\/|blob:)/i.test(src.trim()) ? src.trim() : null);

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

export interface ArtifactPreviewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Artifact kind; decides how `content` is rendered (source, Markdown, SVG, image and so on). */
  kind: ArtifactKind;
  /** The artifact body: source text, Markdown, SVG markup or an image URL, depending on `kind`. */
  content: string;
  /** Artifact name; used for the code header filename and the accessible name. */
  title: string;
  /**
   * Code language for syntax highlighting (for example `tsx`); html, data and diagram artifacts default to `html`,
   * `json` and `mermaid`.
   */
  language?: string;
  /** Render HTML in a sandboxed iframe (scripts, forms, same-origin all blocked). Otherwise show source. */
  renderHtml?: boolean;
  /** Maximum height of the preview before it scrolls; a number is px. */
  maxHeight?: number | string;
  /** Code fallback shows the header (filename / copy). */
  codeHeader?: boolean;
}

/** Renders artifact content safely: code, markdown, SVG/image via `<img>`, HTML in a `sandbox=""` iframe. */
export const ArtifactPreview = React.forwardRef<HTMLDivElement, ArtifactPreviewProps>(
  ({ kind, content, title, language, renderHtml = false, maxHeight = 240, codeHeader = false, className, ...props }, ref) => {
    let body: React.ReactNode;
    if (kind === "markdown" || kind === "document") {
      body = (
        <div className="scrollbar-thin overflow-auto p-4" style={{ maxHeight }}>
          <Markdown>{content}</Markdown>
        </div>
      );
    } else if (kind === "svg" || kind === "image") {
      const src = kind === "svg" ? svgToDataUrl(content) : safeImageSrc(content);
      body = src ? (
        <div className="flex items-center justify-center bg-dots p-4" style={{ maxHeight, height: maxHeight }}>
          <img src={src} alt={title} className="max-h-full max-w-full object-contain" draggable={false} />
        </div>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">External image not shown.</div>
      );
    } else if (kind === "html" && renderHtml) {
      body = (
        <iframe
          title={`${title} preview`}
          sandbox=""
          srcDoc={content}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="block w-full border-0 bg-white"
          style={{ height: maxHeight }}
        />
      );
    } else {
      body = (
        <CodeBlock
          code={content}
          language={language ?? (kind === "html" ? "html" : kind === "data" ? "json" : kind === "diagram" ? "mermaid" : undefined)}
          hideHeader={!codeHeader}
          maxHeight={maxHeight}
          className="rounded-none border-0"
        />
      );
    }
    return (
      <div ref={ref} data-slot="artifact-preview" data-kind={kind} className={cn("overflow-hidden", className)} {...props}>
        {body}
      </div>
    );
  }
);
ArtifactPreview.displayName = "ArtifactPreview";
