/** Diff viewer: DiffViewer (inline or split text comparison) with re-exports of the diff model, SuggestionDiff, DiffStat and DiffCard, one module per family. */
import * as React from "react";
import { RiArrowDownSLine, RiArrowUpSLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { pluralize } from "../lib/format";
import { Button } from "../primitives/button";
import { SegmentedControl } from "../primitives/segmented-control";
import { computeDiff, segmentsToParts, type DiffAuthor, type DiffGranularity, type DiffMode, type DiffSegment } from "./diff-viewer-model";
import { GapButton, Piece, type LinePiece, collapseRuns, resolveAuthor, toInlineLines, toSplitRows } from "./diff-viewer-internal";

export * from "./diff-viewer-model";
export * from "./diff-viewer-suggestion";
export * from "./diff-viewer-card";

/* ------------------------------------------------------------------ */
/* DiffViewer                                                          */
/* ------------------------------------------------------------------ */

export interface DiffViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Original text (the "before" side). */
  oldValue?: string;
  /** Changed text (the "after" side). */
  newValue?: string;
  /** Precomputed (e.g. server-side, author-attributed) comparison; overrides old/new values. */
  segments?: DiffSegment[];
  /** Layout (controlled). Default "inline". */
  mode?: DiffMode;
  /** Initial layout when uncontrolled; also shows the Inline / Split toggle. */
  defaultMode?: DiffMode;
  /** Shows an Inline / Split toggle in the header. */
  onModeChange?: (mode: DiffMode) => void;
  /** Detail inside changed lines. Default "word". */
  granularity?: DiffGranularity;
  /** Collapse long unchanged regions. Default true. */
  collapseUnchanged?: boolean;
  /** Unchanged lines kept around each change. Default 3. */
  context?: number;
  /** Author id → name/color, for attribution coloring. */
  authors?: Record<string, DiffAuthor>;
  /** Author id per change index (when not given on `segments`). */
  changeAuthors?: ReadonlyArray<string | undefined>;
  /** Current change (controlled). */
  activeChange?: number;
  /** Initially active change index when uncontrolled. */
  defaultActiveChange?: number;
  /** Called with the change index when the user steps through changes. */
  onActiveChange?: (index: number) => void;
  /** Header with counts and next/previous. Default true. */
  showHeader?: boolean;
  /** Extra header content (right side). */
  headerExtra?: React.ReactNode;
  /** Line numbers in inline mode. Default false (split always shows them). */
  lineNumbers?: boolean;
  /** Monospace (code) or sans (prose). Default "mono". */
  font?: "mono" | "sans";
  /** Labels for the split columns. */
  oldLabel?: React.ReactNode;
  /**
   * Label of the "after" split column.
   * @default "After"
   */
  newLabel?: React.ReactNode;
  /** Max height of the scrolling body (CSS length). */
  maxHeight?: number | string;
}

/**
 * Text comparison: inline (track-changes style, word-level inside changed lines) or split
 * side-by-side with line numbers. Collapses unchanged regions, colors changes by author and
 * navigates changes with n / p (or j / k, ] / [).
 */
export const DiffViewer = React.forwardRef<HTMLDivElement, DiffViewerProps>(
  (
    {
      oldValue = "",
      newValue = "",
      segments,
      mode: modeProp,
      defaultMode,
      onModeChange,
      granularity = "word",
      collapseUnchanged = true,
      context = 3,
      authors,
      changeAuthors,
      activeChange: activeProp,
      defaultActiveChange = -1,
      onActiveChange,
      showHeader = true,
      headerExtra,
      lineNumbers = false,
      font = "mono",
      oldLabel = "Before",
      newLabel = "After",
      maxHeight,
      className,
      onKeyDown,
      style,
      ...props
    },
    ref
  ) => {
    const bodyRef = React.useRef<HTMLDivElement>(null);
    const [modeInner, setModeInner] = React.useState<DiffMode>(defaultMode ?? "inline");
    const mode = modeProp ?? modeInner;
    const setMode = (next: DiffMode) => {
      if (modeProp === undefined) setModeInner(next);
      onModeChange?.(next);
    };
    const parts = React.useMemo(
      () => (segments ? segmentsToParts(segments) : computeDiff(oldValue, newValue, granularity)),
      [segments, oldValue, newValue, granularity]
    );
    const changeCount = React.useMemo(() => parts.reduce((m, p) => Math.max(m, p.change + 1), 0), [parts]);
    const inline = React.useMemo(() => (mode === "inline" ? toInlineLines(parts) : []), [parts, mode]);
    const rows = React.useMemo(() => (mode === "split" ? toSplitRows(parts) : []), [parts, mode]);
    const [expanded, setExpanded] = React.useState<ReadonlySet<number>>(() => new Set());
    React.useEffect(() => setExpanded(new Set()), [parts, mode]);

    const [activeInner, setActiveInner] = React.useState(defaultActiveChange);
    const active = activeProp ?? activeInner;
    const setActive = (i: number) => {
      if (activeProp === undefined) setActiveInner(i);
      onActiveChange?.(i);
    };
    const go = (dir: 1 | -1) => {
      if (!changeCount) return;
      const next = active < 0 ? (dir === 1 ? 0 : changeCount - 1) : (active + dir + changeCount) % changeCount;
      setActive(next);
    };

    React.useEffect(() => {
      if (active < 0) return;
      bodyRef.current?.querySelector(`[data-change-start="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input,textarea,[contenteditable=true]")) return;
      if (["n", "j", "]"].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["p", "k", "["].includes(e.key)) {
        e.preventDefault();
        go(-1);
      }
    };

    const flags = mode === "inline" ? inline.map((l) => l.changed) : rows.map((r) => r.changed);
    const entries = collapseRuns(flags, context, expanded, collapseUnchanged);
    const expand = (start: number) => setExpanded((s) => new Set([...s, start]));

    const firstSeen = new Set<number>();
    const startAttr = (changes: number[]) => {
      const first = changes.find((c) => !firstSeen.has(c));
      changes.forEach((c) => firstSeen.add(c));
      return first;
    };

    const usedAuthors = React.useMemo(() => {
      const ids = new Set<string>();
      for (const p of parts) {
        const a = resolveAuthor(p, authors, changeAuthors);
        if (a && p.type !== "equal") ids.add(a.id);
      }
      return [...ids].map((id) => resolveAuthor({ type: "insert", text: "", change: -1, author: id }, authors, undefined)!);
    }, [parts, authors, changeAuthors]);

    const renderPieces = (pieces: LinePiece[]) =>
      pieces.map((p, i) => (
        <Piece key={i} part={p} author={resolveAuthor(p, authors, changeAuthors)} active={p.change >= 0 && p.change === active} />
      ));

    let body: React.ReactNode;
    if (mode === "inline") {
      body = (
        <div className="py-1">
          {entries.map((e) => {
            if (e.kind === "gap")
              return <GapButton key={`gap-${e.start}`} count={e.end - e.start} onClick={() => expand(e.start)} className="my-0.5" />;
            const line = inline[e.index]!;
            const start = startAttr(line.changes);
            const isActive = line.changes.includes(active);
            return (
              <div
                key={e.index}
                data-line=""
                data-changed={line.changed || undefined}
                data-change-start={start}
                className={cn(
                  "flex border-s-2 border-transparent",
                  line.changed && "border-s-primary/50 bg-primary-soft/25",
                  isActive && "border-s-primary bg-primary-soft/50"
                )}
              >
                {lineNumbers && (
                  <span aria-hidden className="w-10 shrink-0 select-none pe-2 text-end text-muted-foreground/70 tabular-nums">
                    {line.newNo}
                  </span>
                )}
                <span className="min-h-[1.6em] min-w-0 flex-1 whitespace-pre-wrap break-words px-3">{renderPieces(line.parts)}</span>
              </div>
            );
          })}
        </div>
      );
    } else {
      const cellBase = "min-w-0 whitespace-pre-wrap break-words px-3 align-top";
      const noBase = "w-10 select-none border-e border-border pe-2 text-end align-top text-muted-foreground/70 tabular-nums";
      body = (
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-10" />
            <col />
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-subtle font-sans text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-1.5 font-medium">
                <span className="sr-only">Old line number</span>
              </th>
              <th scope="col" className="px-3 py-1.5 text-start font-medium">
                {oldLabel}
              </th>
              <th scope="col" className="border-s border-border py-1.5 font-medium">
                <span className="sr-only">New line number</span>
              </th>
              <th scope="col" className="px-3 py-1.5 text-start font-medium">
                {newLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              if (e.kind === "gap")
                return (
                  <tr key={`gap-${e.start}`}>
                    <td colSpan={4} className="p-0">
                      <GapButton count={e.end - e.start} onClick={() => expand(e.start)} />
                    </td>
                  </tr>
                );
              const row = rows[e.index]!;
              const start = startAttr(row.changes);
              const isActive = row.changes.includes(active);
              const leftChanged = row.changed && (!row.right || row.left?.parts.some((p) => p.type !== "equal"));
              const rightChanged = row.changed && (!row.left || row.right?.parts.some((p) => p.type !== "equal"));
              return (
                <tr
                  key={e.index}
                  data-row=""
                  data-changed={row.changed || undefined}
                  data-change-start={start}
                  className={cn(isActive && "outline outline-1 -outline-offset-1 outline-ring/50")}
                >
                  <td aria-hidden className={noBase}>
                    {row.left?.no}
                  </td>
                  <td
                    className={cn(
                      cellBase,
                      !row.left && "bg-subtle bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--border)_6px_7px)]",
                      row.left && leftChanged && "bg-destructive-soft/40"
                    )}
                  >
                    {row.left ? renderPieces(row.left.parts) : null}
                  </td>
                  <td aria-hidden className={cn(noBase, "border-s")}>
                    {row.right?.no}
                  </td>
                  <td
                    className={cn(
                      cellBase,
                      !row.right && "bg-subtle bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--border)_6px_7px)]",
                      row.right && rightChanged && "bg-success-soft/40"
                    )}
                  >
                    {row.right ? renderPieces(row.right.parts) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    return (
      <div
        ref={ref}
        role="region"
        aria-label={props["aria-label"] ?? "Changes"}
        aria-keyshortcuts="n p"
        tabIndex={0}
        data-slot="diff-viewer"
        dir="ltr"
        data-mode={mode}
        onKeyDown={handleKey}
        className={cn("flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-background", focusRing, className)}
        style={style}
        {...props}
      >
        {showHeader && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-subtle/60 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {changeCount ? `${changeCount} ${pluralize(changeCount, "change")}` : "No changes"}
            </span>
            {usedAuthors.length > 0 && (
              <span className="flex flex-wrap items-center gap-2" aria-label="Authors">
                {usedAuthors.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1">
                    <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: a.color }} />
                    {a.name}
                  </span>
                ))}
              </span>
            )}
            <span className="ms-auto flex flex-wrap items-center justify-end gap-1">
              {headerExtra}
              {(onModeChange || defaultMode !== undefined) && (
                <SegmentedControl
                  size="sm"
                  aria-label="Diff layout"
                  value={mode}
                  onValueChange={(v) => v && setMode(v as DiffMode)}
                  options={[
                    { value: "inline", label: "Inline" },
                    { value: "split", label: "Split" },
                  ]}
                />
              )}
              {changeCount > 0 && (
                <>
                  <span aria-live="polite" className="px-1 tabular-nums">
                    {active >= 0 ? <bdi dir="ltr">{`${active + 1} of ${changeCount}`}</bdi> : ""}
                  </span>
                  <Button size="icon-xs" variant="ghost" aria-label="Previous change" onClick={() => go(-1)}>
                    <RiArrowUpSLine aria-hidden />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Next change" onClick={() => go(1)}>
                    <RiArrowDownSLine aria-hidden />
                  </Button>
                </>
              )}
            </span>
          </div>
        )}
        <div
          ref={bodyRef}
          className={cn(
            "min-h-0 flex-1 overflow-auto scrollbar-thin text-sm leading-relaxed text-foreground",
            font === "mono" ? "font-mono text-[13px]" : "font-sans"
          )}
          style={{ maxHeight }}
        >
          {body}
        </div>
      </div>
    );
  }
);
DiffViewer.displayName = "DiffViewer";

