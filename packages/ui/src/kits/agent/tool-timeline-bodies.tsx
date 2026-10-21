import * as React from "react";
import { RiArrowDownSLine, RiFileTextLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { isSafeHref } from "../../lib/validate";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { CopyButton } from "../../primitives/copy-button";
import { parseAnsi, ansiSegmentClassName } from "../../patterns/log-viewer";
import { DiffCard, type DiffCardProps } from "../../patterns/diff-viewer";
import { Favicon, domainOf } from "../../primitives/favicon";
import { CodeBlock } from "../../patterns/code-block";

/* ------------------------------------------------------------------ */
/* ExpandableContent                                                   */
/* ------------------------------------------------------------------ */

export interface ExpandableContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height (px) of the collapsed view. Default 160. */
  collapsedHeight?: number;
  /** Controlled expanded state. */
  expanded?: boolean;
  /** Initial expanded state when `expanded` is not controlled. */
  defaultExpanded?: boolean;
  /** Called with the new state when the user expands or collapses the content. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Label of the button that expands the content. */
  moreLabel?: React.ReactNode;
  /** Label of the button that collapses the content. */
  lessLabel?: React.ReactNode;
  /** Classes for the gradient (match the surface, e.g. "from-card"). Default "from-background". */
  fadeClassName?: string;
}

/** Height-capped container with a bottom fade and Show more / Show less. */
export const ExpandableContent = React.forwardRef<HTMLDivElement, ExpandableContentProps>(
  (
    {
      collapsedHeight = 160,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpandedChange,
      moreLabel = "Show more",
      lessLabel = "Show less",
      fadeClassName = "from-background",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = useControllableState<boolean>({
      value: expandedProp,
      defaultValue: defaultExpanded,
      onChange: onExpandedChange,
    });
    const innerRef = React.useRef<HTMLDivElement>(null);
    const [overflows, setOverflows] = React.useState(false);
    const id = React.useId();

    const measure = React.useCallback(() => {
      const el = innerRef.current;
      if (el) setOverflows(el.scrollHeight > collapsedHeight + 4);
    }, [collapsedHeight]);
    React.useLayoutEffect(measure, [measure, children]);
    useResizeObserver(innerRef, measure);

    const capped = overflows && !expanded;
    return (
      <div ref={ref} data-slot="expandable-content" data-expanded={expanded || undefined} className={cn("relative", className)} {...props}>
        <div
          id={id}
          className={cn(capped && "overflow-hidden")}
          style={capped ? { maxHeight: collapsedHeight } : undefined}
        >
          <div ref={innerRef}>{children}</div>
        </div>
        {capped && (
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-x-0 bottom-7 h-12 bg-gradient-to-t to-transparent", fadeClassName)}
          />
        )}
        {overflows && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "mt-1 inline-flex h-6 items-center gap-1 rounded-control px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing
            )}
          >
            <RiArrowDownSLine aria-hidden className={cn("size-3.5 chevron-turn", expanded && "rotate-180")} />
            {expanded ? lessLabel : moreLabel}
          </button>
        )}
      </div>
    );
  }
);
ExpandableContent.displayName = "ExpandableContent";

/* ------------------------------------------------------------------ */
/* Bodies                                                              */
/* ------------------------------------------------------------------ */

function AnsiText({ text }: { text: string }) {
  const segs = React.useMemo(() => parseAnsi(text), [text]);
  return (
    <>
      {segs.map((s, i) => {
        const cls = ansiSegmentClassName(s);
        return cls ? (
          <span key={i} className={cls}>
            {s.text}
          </span>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        );
      })}
    </>
  );
}

function TruncatedOutput({
  text,
  maxLines,
  tone,
  label,
}: {
  text: string;
  maxLines: number;
  tone?: "error";
  label?: string;
}) {
  const [all, setAll] = React.useState(false);
  const lines = text.replace(/\n$/, "").split("\n");
  const hidden = Math.max(0, lines.length - maxLines);
  const shown = all || !hidden ? lines : lines.slice(0, maxLines);
  const id = React.useId();
  return (
    <div className="relative" data-slot={tone === "error" ? "bash-stderr" : "bash-output"}>
      {label && (
        <div className="px-3 pt-2 font-sans text-2xs font-semibold uppercase tracking-[0.08em] text-destructive-soft-foreground/80">{label}</div>
      )}
      <pre
        id={id}
        className={cn(
          "overflow-x-auto scrollbar-thin whitespace-pre px-3 py-2 font-mono text-xs leading-5",
          tone === "error" ? "text-destructive-soft-foreground" : "text-code-foreground/90"
        )}
      >
        <code>
          <AnsiText text={shown.join("\n")} />
        </code>
      </pre>
      {hidden > 0 && !all && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-7 h-10 bg-gradient-to-t from-code to-transparent"
        />
      )}
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={id}
          onClick={() => setAll(!all)}
          className={cn(
            "mx-2 mb-2 inline-flex h-6 items-center rounded-sm px-1.5 font-sans text-xs text-code-muted transition-colors hover:bg-white/10 hover:text-code-foreground",
            focusRing
          )}
        >
          {all ? "Show less" : `Show ${hidden} more ${hidden === 1 ? "line" : "lines"}`}
        </button>
      )}
    </div>
  );
}

export interface BashToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The command that ran, shown in mono with a prompt. */
  command: string;
  /** stdout (ANSI colors supported). */
  output?: string;
  /** stderr, shown separately as "Error output". */
  stderr?: string;
  /** Exit code, shown as an "exit N" badge; non-zero turns it red. */
  exitCode?: number;
  /** Visible lines before "Show N more lines". Default 12. */
  maxLines?: number;
  /** Shows a blinking caret after the output. */
  streaming?: boolean;
}

/** Shell call body: `$ command` with copy, ANSI output, separate stderr and an exit code chip. */
export const BashToolBody = React.forwardRef<HTMLDivElement, BashToolBodyProps>(
  ({ command, output, stderr, exitCode, maxLines = 12, streaming, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="bash-tool-body"
        className={cn(
          "dark overflow-hidden rounded-box border border-code-border bg-code text-code-foreground [color-scheme:dark]",
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-2 border-b border-white/10 bg-white/[0.03] py-1.5 ps-3 pe-1.5">
          <code className="min-w-0 flex-1 whitespace-pre-wrap break-all py-0.5 font-mono text-xs leading-5">
            <span aria-hidden className="select-none text-success-soft-foreground">
              ${" "}
            </span>
            {command}
          </code>
          {exitCode != null && (
            <span
              data-slot="bash-exit-code"
              className={cn(
                "mt-0.5 shrink-0 rounded-sm px-1.5 py-px font-mono text-2xs",
                exitCode === 0 ? "bg-success-soft text-success-soft-foreground" : "bg-destructive/20 text-destructive-soft-foreground"
              )}
            >
              exit {exitCode}
            </span>
          )}
          <CopyButton
            value={command}
            label="Copy command"
            size="xs"
            className="text-code-muted hover:bg-white/10 hover:text-code-foreground"
          />
        </div>
        {output ? <TruncatedOutput text={output} maxLines={maxLines} /> : null}
        {streaming && (
          <div className="px-3 pb-2">
            <span aria-hidden className="inline-block h-3.5 w-1.5 animate-caret-blink bg-code-foreground/80 align-middle" />
            <span className="sr-only">Running</span>
          </div>
        )}
        {stderr ? (
          <div className="border-t border-white/10 bg-destructive/[0.06]">
            <TruncatedOutput text={stderr} maxLines={maxLines} tone="error" label="Error output" />
          </div>
        ) : null}
        {!output && !stderr && !streaming && (
          <div className="px-3 py-2 font-sans text-xs italic text-code-muted">No output</div>
        )}
      </div>
    );
  }
);
BashToolBody.displayName = "BashToolBody";

export interface EditToolBodyProps extends Omit<DiffCardProps, "path"> {
  /** Path of the edited file, shown in the diff header. */
  path: string;
}

/** File edit body: path (link / button) and a compact DiffCard. */
export const EditToolBody = React.forwardRef<HTMLDivElement, EditToolBodyProps>((props, ref) => (
  <DiffCard ref={ref} data-slot="edit-tool-body" collapsedLines={10} {...props} />
));
EditToolBody.displayName = "EditToolBody";

export interface ReadToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Path of the file that was read. */
  path: string;
  /** First line that was read (1-based); shown in the range label and used as the snippet's first line number. */
  startLine?: number;
  /** Last line that was read (1-based); completes the "Lines 10–40" label. */
  endLine?: number;
  /** Total lines in the file; shown as "of N" after the range, or alone as "N lines" without a range. */
  totalLines?: number;
  /** Excerpt of what was read. */
  snippet?: string;
  /** Code language for highlighting the `snippet`; guessed from `path` when unset. */
  language?: string;
  /** Called when the user presses the path; the path is plain text when unset. */
  onOpenFile?: () => void;
}

/** File read body: path, line range and an optional snippet. */
export const ReadToolBody = React.forwardRef<HTMLDivElement, ReadToolBodyProps>(
  ({ path, startLine, endLine, totalLines, snippet, language, onOpenFile, className, ...props }, ref) => {
    const range =
      startLine != null
        ? `Lines ${startLine}${endLine != null ? `–${endLine}` : "+"}${totalLines != null ? ` of ${totalLines}` : ""}`
        : totalLines != null
          ? `${totalLines} lines`
          : null;
    return (
      <div ref={ref} data-slot="read-tool-body" className={cn("flex flex-col gap-1.5", className)} {...props}>
        <div className="flex items-center gap-2 text-xs">
          <RiFileTextLine aria-hidden className="size-3.5 text-muted-foreground" />
          {onOpenFile ? (
            <button type="button" onClick={onOpenFile} className={cn("truncate font-mono text-foreground hover:underline", focusRing)}>
              {path}
            </button>
          ) : (
            <span className="truncate font-mono text-foreground">{path}</span>
          )}
          {range && <span className="shrink-0 text-muted-foreground">{range}</span>}
        </div>
        {snippet != null && (
          <CodeBlock
            code={snippet}
            language={language}
            theme="light"
            hideHeader
            showLineNumbers
            startLine={startLine}
            maxHeight={240}
            className="text-xs"
          />
        )}
      </div>
    );
  }
);
ReadToolBody.displayName = "ReadToolBody";

export interface SearchToolMatch {
  file: string;
  line?: number;
  text?: string;
}

export interface SearchToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The search pattern or query that ran, shown in mono. */
  pattern: string;
  /** Directory / glob the search ran in. */
  scope?: string;
  /** Matches found, each with a path, line and excerpt. */
  matches?: SearchToolMatch[];
  /** Matches listed before "+N more". Default 20. */
  maxMatches?: number;
  /** Called with the match when the user opens one; rows are not interactive when unset. */
  onOpenMatch?: (match: SearchToolMatch) => void;
}

/** Search body: the pattern and a list of file:line matches. */
export const SearchToolBody = React.forwardRef<HTMLDivElement, SearchToolBodyProps>(
  ({ pattern, scope, matches = [], maxMatches = 20, onOpenMatch, className, ...props }, ref) => {
    const shown = matches.slice(0, maxMatches);
    const rest = matches.length - shown.length;
    return (
      <div ref={ref} data-slot="search-tool-body" className={cn("flex flex-col gap-1.5 text-xs", className)} {...props}>
        <div className="flex flex-wrap items-center gap-1.5">
          <code className="rounded-control border border-border bg-subtle px-1.5 py-0.5 font-mono text-foreground">{pattern}</code>
          {scope && <span className="text-muted-foreground">in <span className="font-mono">{scope}</span></span>}
          <span className="ms-auto text-muted-foreground">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </span>
        </div>
        {shown.length > 0 && (
          <ul aria-label="Matches" className="flex flex-col overflow-hidden rounded-box border border-border bg-card">
            {shown.map((m, i) => {
              const loc = (
                <>
                  <span className="max-w-[70%] shrink-0 truncate font-mono text-foreground">
                    {m.file}
                    {m.line != null && <span className="text-muted-foreground">:{m.line}</span>}
                  </span>
                  {m.text && <span className="min-w-0 truncate font-mono text-muted-foreground">{m.text.trim()}</span>}
                </>
              );
              return (
                <li key={`${m.file}:${m.line}:${i}`} className="border-b border-border last:border-b-0">
                  {onOpenMatch ? (
                    <button
                      type="button"
                      onClick={() => onOpenMatch(m)}
                      className={cn("flex w-full min-w-0 items-center gap-3 px-2.5 py-1 text-start hover:bg-accent", focusRing)}
                    >
                      {loc}
                    </button>
                  ) : (
                    <div className="flex min-w-0 items-center gap-3 px-2.5 py-1">{loc}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {rest > 0 && <span className="text-muted-foreground">+{rest} more</span>}
      </div>
    );
  }
);
SearchToolBody.displayName = "SearchToolBody";

export interface WebToolBodyProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** Address that was fetched or searched. */
  url: string;
  /** Page title shown as the link text; the URL is used when unset. */
  title?: React.ReactNode;
  /** Short excerpt or result summary. */
  snippet?: React.ReactNode;
  /** Favicon image URL; a letter tile is used when unset. */
  favicon?: string;
}

/** Web fetch / search body: favicon, domain, title and an optional excerpt. */
export const WebToolBody = React.forwardRef<HTMLDivElement, WebToolBodyProps>(
  ({ url, title, snippet, favicon, className, ...props }, ref) => {
    const domain = domainOf(url);
    return (
      <div
        ref={ref}
        data-slot="web-tool-body"
        className={cn("flex flex-col gap-1 rounded-box border border-border bg-card px-3 py-2 text-xs", className)}
        {...props}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Favicon domain={domain} src={favicon} shape="square" className="size-3.5" />
          <span className="truncate">{domain}</span>
        </div>
        <a
          href={isSafeHref(url) ? url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("-my-0.5 truncate py-0.5 text-sm font-medium text-foreground hover:underline", focusRing)}
        >
          {title ?? url}
        </a>
        {snippet != null && <p className="line-clamp-2 text-muted-foreground">{snippet}</p>}
      </div>
    );
  }
);
WebToolBody.displayName = "WebToolBody";

export interface ToolKeyValueRow {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Render the value in monospace. Default true for strings. */
  mono?: boolean;
}

export interface ToolKeyValueBodyProps extends Omit<React.HTMLAttributes<HTMLDListElement>, "children"> {
  /** Label and value pairs shown as a definition list. */
  rows: ToolKeyValueRow[];
  /** Height cap for each value before "Show more". Default 72. */
  valueHeight?: number;
}

/** Generic label / value grid for tool inputs and results. */
export const ToolKeyValueBody = React.forwardRef<HTMLDListElement, ToolKeyValueBodyProps>(
  ({ rows, valueHeight = 72, className, ...props }, ref) => (
    <dl
      ref={ref}
      data-slot="tool-key-value-body"
      className={cn("grid grid-cols-[max-content_1fr] overflow-hidden rounded-box border border-border bg-card text-xs", className)}
      {...props}
    >
      {rows.map((r, i) => {
        const mono = r.mono ?? typeof r.value === "string";
        return (
          <div key={i} className="col-span-2 grid grid-cols-subgrid border-t border-border first:border-t-0">
            <dt className="px-2.5 py-1.5 font-mono text-muted-foreground">{r.label}</dt>
            <dd className={cn("min-w-0 px-2.5 py-1.5 text-foreground", mono && "font-mono")}>
              <ExpandableContent collapsedHeight={valueHeight} fadeClassName="from-card">
                <div className="whitespace-pre-wrap break-words">{r.value}</div>
              </ExpandableContent>
            </dd>
          </div>
        );
      })}
    </dl>
  )
);
ToolKeyValueBody.displayName = "ToolKeyValueBody";
