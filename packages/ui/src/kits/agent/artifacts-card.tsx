import * as React from "react";
import { RiDownloadLine, RiExternalLinkLine, RiEyeLine, RiShareLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { TextShimmer } from "../../primitives/text-shimmer";
import { type ArtifactKind, type ArtifactVersion } from "./artifacts-model";
import { kindMeta, defaultDownload, useVersion, VersionSwitcher, CopyAction } from "./artifacts-internal";
import { ArtifactKindIcon, ArtifactPreview } from "./artifacts-preview";

/* ------------------------------------------------------------------ */
/* ArtifactCard                                                        */
/* ------------------------------------------------------------------ */

export interface ArtifactCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "content" | "onCopy"> {
  /** Artifact name, shown as the card title. */
  title: string;
  /**
   * Artifact kind (`code`, `html`, `markdown`, `svg`, `image`, `diagram`, `document` or `data`); picks the icon and
   * preview.
   */
  kind: ArtifactKind;
  /** Code language for syntax highlighting (for example `tsx`). */
  language?: string;
  /** All versions, oldest first. Alternatively pass `content` for a single version. */
  versions?: ArtifactVersion[];
  /** Body of a single-version artifact; use `versions` for several. */
  content?: string;
  /** Selected version index (0-based). Defaults to the latest. */
  version?: number;
  /** Initially shown version index when `version` is not controlled. Defaults to the latest. */
  defaultVersion?: number;
  /** Called with the version index when the user switches versions. */
  onVersionChange?: (index: number) => void;
  /** Still being generated: shimmer + "Generating…", download/share disabled. */
  streaming?: boolean;
  /** Show the compact preview. Default true. */
  preview?: boolean;
  /** HTML artifacts: render in the sandboxed iframe instead of source (opt-in). */
  renderHtml?: boolean;
  /** Initial value of `renderHtml` when it is not controlled. */
  defaultRenderHtml?: boolean;
  /** Called with the new state when the user toggles between rendered HTML and source. */
  onRenderHtmlChange?: (render: boolean) => void;
  /** Maximum height of the preview before it scrolls; a number is px. */
  previewMaxHeight?: number | string;
  /**
   * Called when the user opens the artifact (for example in the full viewer); the Open button is hidden when unset.
   */
  onOpen?: () => void;
  /** Defaults to copying the content to the clipboard. */
  onCopy?: (content: string) => void;
  /** Defaults to saving a file locally. */
  onDownload?: (content: string) => void;
  /** Shown only when provided. */
  onShare?: () => void;
  /** Secondary line under the title. */
  description?: React.ReactNode;
}

/** Promoted artifact from a code fence or tool: kind, versions, streaming state, actions and a safe preview. */
export const ArtifactCard = React.forwardRef<HTMLDivElement, ArtifactCardProps>(
  (
    {
      title,
      kind,
      language,
      versions: versionsProp,
      content: contentProp,
      version,
      defaultVersion,
      onVersionChange,
      streaming = false,
      preview = true,
      renderHtml: renderHtmlProp,
      defaultRenderHtml = false,
      onRenderHtmlChange,
      previewMaxHeight = 220,
      onOpen,
      onCopy,
      onDownload,
      onShare,
      description,
      className,
      ...props
    },
    ref
  ) => {
    const versions = React.useMemo(
      () => versionsProp ?? [{ id: "v1", content: contentProp ?? "" }],
      [versionsProp, contentProp]
    );
    const [index, setIndex] = useVersion(versions, version, defaultVersion, onVersionChange);
    const [renderHtml, setRenderHtml] = useControllableState({
      value: renderHtmlProp,
      defaultValue: defaultRenderHtml,
      onChange: onRenderHtmlChange,
    });
    const current = versions[index];
    const content = current?.content ?? "";
    const titleId = React.useId();

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        aria-busy={streaming || undefined}
        data-slot="artifact-card"
        data-kind={kind}
        data-streaming={streaming || undefined}
        className={cn("overflow-hidden rounded-box border border-border bg-card text-card-foreground shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <ArtifactKindIcon kind={kind} className={cn(streaming && "animate-pulse motion-reduce:animate-none")} />
          <div className="min-w-0 flex-1">
            {onOpen ? (
              <button
                type="button"
                id={titleId}
                onClick={onOpen}
                className={cn("block max-w-full truncate rounded-xs text-start text-sm font-medium hover:underline", focusRing)}
              >
                {title}
              </button>
            ) : (
              <div id={titleId} className="truncate text-sm font-medium">
                {title}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {streaming ? (
                <TextShimmer role="status">Generating…</TextShimmer>
              ) : (
                <span className="truncate">
                  {description ?? (
                    <>
                      {kindMeta[kind].label}
                      {language && kind === "code" ? ` · ${language}` : ""}
                      {current?.note ? ` · ${current.note}` : ""}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
          <VersionSwitcher index={index} total={versions.length} onChange={setIndex} />
          <div className="flex items-center">
            {kind === "html" && preview && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Render preview"
                title={renderHtml ? "Show source" : "Render preview (sandboxed)"}
                aria-pressed={renderHtml}
                disabled={streaming}
                onClick={() => setRenderHtml(!renderHtml)}
              >
                <RiEyeLine aria-hidden />
              </Button>
            )}
            <CopyAction content={content} onCopy={onCopy ? () => onCopy(content) : undefined} />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Download"
              title="Download"
              disabled={streaming}
              onClick={() => (onDownload ? onDownload(content) : defaultDownload(title, kind, content))}
            >
              <RiDownloadLine aria-hidden />
            </Button>
            {onShare && (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Share" title="Share" disabled={streaming} onClick={onShare}>
                <RiShareLine aria-hidden />
              </Button>
            )}
            {onOpen && (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Open" title="Open" onClick={onOpen}>
                <RiExternalLinkLine aria-hidden />
              </Button>
            )}
          </div>
        </div>
        {preview && (
          <div className="relative border-t border-border">
            {streaming && !content ? (
              <div className="space-y-2 p-4" aria-hidden>
                {[80, 64, 72, 40].map((w, i) => (
                  <div key={i} className="h-2.5 animate-pulse rounded-xs bg-muted motion-reduce:animate-none" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <ArtifactPreview
                kind={kind}
                content={content}
                title={title}
                language={language}
                renderHtml={renderHtml && !streaming}
                maxHeight={previewMaxHeight}
              />
            )}
            {streaming && content && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
            )}
          </div>
        )}
      </div>
    );
  }
);
ArtifactCard.displayName = "ArtifactCard";
