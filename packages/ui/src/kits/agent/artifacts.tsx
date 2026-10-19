import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiDownloadLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiFileTextLine,
  RiFlowChart,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiHtml5Line,
  RiImageLine,
  RiLayoutGridLine,
  RiListUnordered,
  RiMarkdownLine,
  RiShapesLine,
  RiShareLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { formatRelative, toMs } from "../../lib/time";
import { slugify } from "../../lib/text";
import { clamp } from "../../lib/math";
import { CopyButton } from "../../primitives/copy-button";
import { Button } from "../../primitives/button";
import { Badge } from "../../primitives/badge";
import { CodeBlock } from "../../patterns/code-block";
import { Markdown } from "../../patterns/markdown";
import { TextShimmer } from "../../primitives/text-shimmer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { SearchInput } from "../../primitives/input";
import { SegmentedControl } from "../../primitives/segmented-control";
import { SimpleSelect } from "../../primitives/select";
import { EmptyState } from "../../primitives/empty-state";
import { Dialog, DialogPortal } from "../../primitives/dialog";

/* ------------------------------------------------------------------ */
/* Types & helpers                                                     */
/* ------------------------------------------------------------------ */

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

const kindMeta: Record<ArtifactKind, { label: string; icon: React.ReactNode; ext: string; mime: string }> = {
  code: { label: "Code", icon: <RiCodeSSlashLine aria-hidden />, ext: "txt", mime: "text/plain" },
  html: { label: "HTML", icon: <RiHtml5Line aria-hidden />, ext: "html", mime: "text/html" },
  markdown: { label: "Markdown", icon: <RiMarkdownLine aria-hidden />, ext: "md", mime: "text/markdown" },
  svg: { label: "SVG", icon: <RiShapesLine aria-hidden />, ext: "svg", mime: "image/svg+xml" },
  image: { label: "Image", icon: <RiImageLine aria-hidden />, ext: "png", mime: "image/png" },
  diagram: { label: "Diagram", icon: <RiFlowChart aria-hidden />, ext: "mmd", mime: "text/plain" },
  document: { label: "Document", icon: <RiFileTextLine aria-hidden />, ext: "md", mime: "text/markdown" },
  data: { label: "Data", icon: <RiDatabase2Line aria-hidden />, ext: "json", mime: "application/json" },
};

/** Human label for an artifact kind. */
export function artifactKindLabel(kind: ArtifactKind) {
  return kindMeta[kind].label;
}

export interface ArtifactKindIconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
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

/** `data:` URL for SVG markup. Rendered through `<img>`, so scripts inside never run. */
export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const safeImageSrc = (src: string) => (/^(data:image\/|blob:)/i.test(src.trim()) ? src.trim() : null);

/** "just now", "5m ago", "3h ago", "2d ago" or a short date. */
export function formatArtifactTime(v: string | number | Date | undefined, now = Date.now()) {
  return formatRelative(v, { now, maxRelativeDays: 6, invalid: "" });
}

function defaultDownload(title: string, kind: ArtifactKind, content: string) {
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
/* Preview                                                             */
/* ------------------------------------------------------------------ */

export interface ArtifactPreviewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  kind: ArtifactKind;
  content: string;
  title: string;
  language?: string;
  /** Render HTML in a sandboxed iframe (scripts, forms, same-origin all blocked). Otherwise show source. */
  renderHtml?: boolean;
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

/* ------------------------------------------------------------------ */
/* Shared header bits                                                  */
/* ------------------------------------------------------------------ */

function useVersion(
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

function VersionSwitcher({ index, total, onChange }: { index: number; total: number; onChange: (i: number) => void }) {
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
          <RiArrowLeftSLine aria-hidden />
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
          <RiArrowRightSLine aria-hidden />
        </Button>
      )}
    </div>
  );
}

function CopyAction({ onCopy, content, disabled }: { onCopy?: () => void; content: string; disabled?: boolean }) {
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

/* ------------------------------------------------------------------ */
/* ArtifactCard                                                        */
/* ------------------------------------------------------------------ */

export interface ArtifactCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "content" | "onCopy"> {
  title: string;
  kind: ArtifactKind;
  language?: string;
  /** All versions, oldest first. Alternatively pass `content` for a single version. */
  versions?: ArtifactVersion[];
  content?: string;
  /** Selected version index (0-based). Defaults to the latest. */
  version?: number;
  defaultVersion?: number;
  onVersionChange?: (index: number) => void;
  /** Still being generated: shimmer + "Generating…", download/share disabled. */
  streaming?: boolean;
  /** Show the compact preview. Default true. */
  preview?: boolean;
  /** HTML artifacts: render in the sandboxed iframe instead of source (opt-in). */
  renderHtml?: boolean;
  defaultRenderHtml?: boolean;
  onRenderHtmlChange?: (render: boolean) => void;
  previewMaxHeight?: number | string;
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
                className={cn("block max-w-full truncate rounded-xs text-left text-sm font-medium hover:underline", focusRing)}
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

/* ------------------------------------------------------------------ */
/* ArtifactViewer                                                      */
/* ------------------------------------------------------------------ */

export type ArtifactViewerTab = "preview" | "code";

export interface ArtifactViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "content" | "onCopy"> {
  title: string;
  kind: ArtifactKind;
  language?: string;
  versions: ArtifactVersion[];
  version?: number;
  defaultVersion?: number;
  onVersionChange?: (index: number) => void;
  tab?: ArtifactViewerTab;
  defaultTab?: ArtifactViewerTab;
  onTabChange?: (tab: ArtifactViewerTab) => void;
  fullscreen?: boolean;
  defaultFullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** Version history sidebar. Default true. */
  showHistory?: boolean;
  streaming?: boolean;
  onClose?: () => void;
  onCopy?: (content: string) => void;
  onDownload?: (content: string) => void;
  onShare?: () => void;
}

/** Full artifact panel: Preview / Code tabs, version history and fullscreen. */
export const ArtifactViewer = React.forwardRef<HTMLDivElement, ArtifactViewerProps>(
  (
    {
      title,
      kind,
      language,
      versions,
      version,
      defaultVersion,
      onVersionChange,
      tab: tabProp,
      defaultTab = "preview",
      onTabChange,
      fullscreen: fullscreenProp,
      defaultFullscreen = false,
      onFullscreenChange,
      showHistory = true,
      streaming = false,
      onClose,
      onCopy,
      onDownload,
      onShare,
      className,
      ...props
    },
    ref
  ) => {
    const [index, setIndex] = useVersion(versions, version, defaultVersion, onVersionChange);
    const [tab, setTab] = useControllableState<ArtifactViewerTab>({ value: tabProp, defaultValue: defaultTab, onChange: onTabChange });
    const [fullscreen, setFullscreen] = useControllableState({
      value: fullscreenProp,
      defaultValue: defaultFullscreen,
      onChange: onFullscreenChange,
    });
    const current = versions[index];
    const content = current?.content ?? "";
    const titleId = React.useId();
    const toggleRef = React.useRef<HTMLButtonElement>(null);

    const codeLang = language ?? (kind === "html" ? "html" : kind === "svg" ? "xml" : kind === "data" ? "json" : kind === "markdown" || kind === "document" ? "markdown" : undefined);

    const panel = (
      <section
        ref={ref}
        aria-labelledby={titleId}
        data-slot="artifact-viewer"
        data-fullscreen={fullscreen || undefined}
        className={cn(
          "@container flex min-h-0 flex-col overflow-hidden border border-border bg-card text-card-foreground",
          fullscreen ? undefined : "rounded-box shadow-xs",
          className,
          // Fullscreen wins over any size the caller set for the inline panel (e.g. a fixed height).
          fullscreen && "fixed inset-0 z-50 m-0 h-dvh max-h-none w-screen max-w-none rounded-none border-0"
        )}
        {...props}
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as ArtifactViewerTab)} variant="underline" size="sm" className="flex min-h-0 flex-1 flex-col gap-0">
          <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-3 py-2 @xl:flex-nowrap">
            <ArtifactKindIcon kind={kind} className="size-7" />
            <h2 id={titleId} className="min-w-0 max-w-full flex-1 basis-24 truncate text-sm font-semibold @xl:flex-none @xl:basis-auto">
              {title}
            </h2>
            {streaming && <TextShimmer className="text-xs">Generating…</TextShimmer>}
            <VersionSwitcher index={index} total={versions.length} onChange={setIndex} />
            <TabsList className="ml-auto">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <div className="flex items-center">
              <CopyAction content={content} onCopy={onCopy ? () => onCopy(content) : undefined} />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Download"
                disabled={streaming}
                onClick={() => (onDownload ? onDownload(content) : defaultDownload(title, kind, content))}
              >
                <RiDownloadLine aria-hidden />
              </Button>
              {onShare && (
                <Button type="button" variant="ghost" size="icon-xs" aria-label="Share" onClick={onShare}>
                  <RiShareLine aria-hidden />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                ref={toggleRef}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                aria-pressed={fullscreen}
                onClick={() => setFullscreen(!fullscreen)}
              >
                {fullscreen ? <RiFullscreenExitLine aria-hidden /> : <RiFullscreenLine aria-hidden />}
              </Button>
              {onClose && (
                <Button type="button" variant="ghost" size="icon-xs" aria-label="Close artifact" onClick={onClose}>
                  <RiCloseLine aria-hidden />
                </Button>
              )}
            </div>
          </header>
          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 overflow-auto">
              <TabsContent value="preview" className="rounded-none">
                <ArtifactPreview
                  kind={kind}
                  content={content}
                  title={title}
                  language={language}
                  renderHtml
                  maxHeight={fullscreen ? "calc(100vh - 56px)" : 420}
                />
              </TabsContent>
              <TabsContent value="code" className="rounded-none">
                <CodeBlock code={content} language={codeLang} showLineNumbers maxHeight={fullscreen ? "calc(100vh - 56px)" : 420} className="rounded-none border-0" />
              </TabsContent>
            </div>
            {showHistory && versions.length > 0 && (
              <aside aria-label="Version history" className="hidden w-52 shrink-0 border-l border-border bg-subtle sm:block">
                <div className="px-3 pt-3 pb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">History</div>
                <ol className="space-y-0.5 p-1.5">
                  {versions
                    .map((v, i) => ({ v, i }))
                    .reverse()
                    .map(({ v, i }) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          aria-current={i === index ? "true" : undefined}
                          onClick={() => setIndex(i)}
                          className={cn(
                            "flex w-full flex-col items-start gap-0.5 rounded-control px-2 py-1.5 text-left text-xs hover:bg-accent",
                            i === index && "bg-accent",
                            focusRing
                          )}
                        >
                          <span className="flex w-full items-center gap-1.5">
                            <span className="font-medium">v{i + 1}</span>
                            {i === versions.length - 1 && <span className="text-2xs text-muted-foreground">latest</span>}
                            <span className="ml-auto text-2xs text-muted-foreground">{formatArtifactTime(v.createdAt)}</span>
                          </span>
                          {v.note && <span className="line-clamp-2 text-muted-foreground">{v.note}</span>}
                        </button>
                      </li>
                    ))}
                </ol>
              </aside>
            )}
          </div>
        </Tabs>
      </section>
    );

    if (!fullscreen) return panel;
    // Fullscreen is a real modal: focus is trapped, the page behind is hidden from assistive tech,
    // Escape exits, and focus goes back to the toggle afterwards.
    return (
      <Dialog open onOpenChange={setFullscreen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background" />
          <DialogPrimitive.Content
            asChild
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              toggleRef.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              toggleRef.current?.focus();
            }}
          >
            {panel}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }
);
ArtifactViewer.displayName = "ArtifactViewer";

/* ------------------------------------------------------------------ */
/* ArtifactLibrary                                                     */
/* ------------------------------------------------------------------ */

export type ArtifactLibrarySort = "newest" | "oldest" | "title";
export type ArtifactLibraryLayout = "grid" | "list";

export interface ArtifactLibraryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  artifacts: ArtifactData[];
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Kind filter; "all" shows everything. */
  kind?: ArtifactKind | "all";
  defaultKind?: ArtifactKind | "all";
  onKindChange?: (kind: ArtifactKind | "all") => void;
  sort?: ArtifactLibrarySort;
  defaultSort?: ArtifactLibrarySort;
  onSortChange?: (sort: ArtifactLibrarySort) => void;
  layout?: ArtifactLibraryLayout;
  defaultLayout?: ArtifactLibraryLayout;
  onLayoutChange?: (layout: ArtifactLibraryLayout) => void;
  onOpenArtifact?: (artifact: ArtifactData) => void;
  /** Shown when there are no artifacts at all. */
  emptyState?: React.ReactNode;
  /** Reference time for relative dates (tests). */
  now?: number;
}

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title" },
];

const updatedMs = (a: ArtifactData) =>
  toMs(a.updatedAt ?? a.versions[a.versions.length - 1]?.createdAt) ?? 0;

/** Searchable grid / list of artifacts with kind filter chips and sorting. */
export const ArtifactLibrary = React.forwardRef<HTMLDivElement, ArtifactLibraryProps>(
  (
    {
      artifacts,
      query: queryProp,
      defaultQuery = "",
      onQueryChange,
      kind: kindProp,
      defaultKind = "all",
      onKindChange,
      sort: sortProp,
      defaultSort = "newest",
      onSortChange,
      layout: layoutProp,
      defaultLayout = "grid",
      onLayoutChange,
      onOpenArtifact,
      emptyState,
      now,
      className,
      ...props
    },
    ref
  ) => {
    const [query, setQuery] = useControllableState({ value: queryProp, defaultValue: defaultQuery, onChange: onQueryChange });
    const [kind, setKind] = useControllableState<ArtifactKind | "all">({ value: kindProp, defaultValue: defaultKind, onChange: onKindChange });
    const [sort, setSort] = useControllableState<ArtifactLibrarySort>({ value: sortProp, defaultValue: defaultSort, onChange: onSortChange });
    const [layout, setLayout] = useControllableState<ArtifactLibraryLayout>({
      value: layoutProp,
      defaultValue: defaultLayout,
      onChange: onLayoutChange,
    });

    const kindCounts = React.useMemo(() => {
      const m = new Map<ArtifactKind, number>();
      for (const a of artifacts) m.set(a.kind, (m.get(a.kind) ?? 0) + 1);
      return m;
    }, [artifacts]);

    const q = query.trim().toLowerCase();
    const shown = artifacts
      .filter((a) => kind === "all" || a.kind === kind)
      .filter(
        (a) =>
          !q ||
          a.title.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q) ||
          (a.language ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) =>
        sort === "title" ? a.title.localeCompare(b.title) : sort === "oldest" ? updatedMs(a) - updatedMs(b) : updatedMs(b) - updatedMs(a)
      );

    const chip = (value: ArtifactKind | "all", label: string, count: number) => (
      <button
        key={value}
        type="button"
        aria-pressed={kind === value}
        onClick={() => setKind(value)}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-control border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent",
          "aria-pressed:border-primary/40 aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-foreground",
          focusRing
        )}
      >
        {label}
        <span className="tabular-nums opacity-70">{count}</span>
      </button>
    );

    return (
      <div ref={ref} data-slot="artifact-library" className={cn("flex flex-col gap-3", className)} {...props}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            aria-label="Search artifacts"
            placeholder="Search artifacts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            clearable
            size="sm"
            wrapperClassName="min-w-48 flex-1"
            className="min-w-48 flex-1"
          />
          <SimpleSelect
            aria-label="Sort"
            size="sm"
            options={sortOptions}
            value={sort}
            onValueChange={(v) => setSort(v as ArtifactLibrarySort)}
            className="w-28"
          />
          <SegmentedControl
            className="max-w-full overflow-x-auto scrollbar-none"
            aria-label="Layout"
            size="sm"
            value={layout}
            onValueChange={(v) => v && setLayout(v as ArtifactLibraryLayout)}
            options={[
              { value: "grid", icon: <RiLayoutGridLine aria-hidden />, "aria-label": "Grid" },
              { value: "list", icon: <RiListUnordered aria-hidden />, "aria-label": "List" },
            ]}
          />
        </div>
        {artifacts.length > 0 && (
          <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-1.5">
            {chip("all", "All", artifacts.length)}
            {ARTIFACT_KINDS.filter((k) => kindCounts.has(k)).map((k) => chip(k, kindMeta[k].label, kindCounts.get(k) ?? 0))}
          </div>
        )}
        {artifacts.length === 0 ? (
          emptyState ?? (
            <EmptyState
              size="sm"
              variant="dashed"
              icon={<RiShapesLine aria-hidden />}
              title="No artifacts yet"
              description="Code, documents and previews the agent creates will collect here."
            />
          )
        ) : shown.length === 0 ? (
          <EmptyState size="sm" illustration="search" title="No matching artifacts" description="Try a different search or filter." />
        ) : (
          <ul
            aria-label="Artifacts"
            data-layout={layout}
            className={cn(layout === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2" : "flex flex-col divide-y divide-border rounded-box border border-border")}
          >
            {shown.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onOpenArtifact?.(a)}
                  className={cn(
                    "flex w-full items-center gap-3 text-left hover:bg-accent",
                    layout === "grid" ? "h-full flex-col items-start rounded-box border border-border bg-card p-3" : "px-3 py-2",
                    focusRing
                  )}
                >
                  <ArtifactKindIcon kind={a.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{a.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {kindMeta[a.kind].label}
                      {a.versions.length > 1 ? ` · v${a.versions.length}` : ""}
                      {(() => {
                        const t = formatArtifactTime(a.updatedAt ?? a.versions[a.versions.length - 1]?.createdAt, now);
                        return t ? ` · ${t}` : "";
                      })()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
ArtifactLibrary.displayName = "ArtifactLibrary";
