import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { RiCloseLine, RiDownloadLine, RiFullscreenExitLine, RiFullscreenLine, RiShareLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Button } from "../../primitives/button";
import { CodeBlock } from "../../patterns/code-block";
import { TextShimmer } from "../../primitives/text-shimmer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../primitives/tabs";
import { Dialog, DialogPortal } from "../../primitives/dialog";
import { type ArtifactKind, type ArtifactVersion, formatArtifactTime } from "./artifacts-model";
import { defaultDownload, useVersion, VersionSwitcher, CopyAction } from "./artifacts-internal";
import { ArtifactKindIcon, ArtifactPreview } from "./artifacts-preview";

/* ------------------------------------------------------------------ */
/* ArtifactViewer                                                      */
/* ------------------------------------------------------------------ */

export type ArtifactViewerTab = "preview" | "code";

export interface ArtifactViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "content" | "onCopy"> {
  /** Artifact name, shown in the viewer header. */
  title: string;
  /**
   * Artifact kind (`code`, `html`, `markdown`, `svg`, `image`, `diagram`, `document` or `data`); decides which tabs
   * apply.
   */
  kind: ArtifactKind;
  /** Code language for syntax highlighting (for example `tsx`). */
  language?: string;
  /** All versions, oldest first. */
  versions: ArtifactVersion[];
  /** Controlled selected version index (0-based). Defaults to the latest. */
  version?: number;
  /** Initially selected version index when `version` is not controlled. */
  defaultVersion?: number;
  /** Called with the version index when the user picks a version. */
  onVersionChange?: (index: number) => void;
  /** Controlled active tab: `preview` or `code`. */
  tab?: ArtifactViewerTab;
  /** Initially active tab when `tab` is not controlled. */
  defaultTab?: ArtifactViewerTab;
  /** Called with the tab when the user switches between preview and code. */
  onTabChange?: (tab: ArtifactViewerTab) => void;
  /** Controlled fullscreen state. */
  fullscreen?: boolean;
  /** Initial fullscreen state when `fullscreen` is not controlled. */
  defaultFullscreen?: boolean;
  /** Called with the new state when the user enters or leaves fullscreen. */
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** Version history sidebar. Default true. */
  showHistory?: boolean;
  /** Still being generated: shows a generating state and disables download and share. */
  streaming?: boolean;
  /** Called when the user closes the viewer; the close button is hidden when unset. */
  onClose?: () => void;
  /** Called with the content when the user presses Copy; defaults to copying to the clipboard. */
  onCopy?: (content: string) => void;
  /** Called with the content when the user presses Download; defaults to saving a file locally. */
  onDownload?: (content: string) => void;
  /** Called when the user presses Share; the button is shown only when set. */
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
            <TabsList className="ms-auto">
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
              <aside aria-label="Version history" className="hidden w-52 shrink-0 border-s border-border bg-subtle sm:block">
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
                            "flex w-full flex-col items-start gap-0.5 rounded-control px-2 py-1.5 text-start text-xs hover:bg-accent",
                            i === index && "bg-accent",
                            focusRing
                          )}
                        >
                          <span className="flex w-full items-center gap-1.5">
                            <span className="font-medium">v{i + 1}</span>
                            {i === versions.length - 1 && <span className="text-2xs text-muted-foreground">latest</span>}
                            <span className="ms-auto text-2xs text-muted-foreground">{formatArtifactTime(v.createdAt)}</span>
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
