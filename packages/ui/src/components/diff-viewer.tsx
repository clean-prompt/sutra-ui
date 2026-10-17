import * as React from "react";
import { diffChars, diffLines, diffWordsWithSpace, type Change } from "diff";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiCloseLine,
  RiExpandUpDownLine,
  RiSparkling2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Button } from "./button";
import { SegmentedControl } from "./segmented-control";
import { getPresenceColor } from "./presence";

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export type DiffGranularity = "word" | "line" | "char";
export type DiffMode = "inline" | "split";
export type DiffSegmentType = "equal" | "insert" | "delete";

/** A run of text in a comparison, optionally attributed to an author id. */
export interface DiffSegment {
  type: DiffSegmentType;
  text: string;
  author?: string;
}

/** A segment with the index of the change (hunk) it belongs to; -1 for unchanged text. */
export interface DiffPart extends DiffSegment {
  change: number;
}

export interface DiffAuthor {
  name: string;
  /** Highlight color (any CSS color); derived from the id when omitted. */
  color?: string;
}

function typeOf(c: Change): DiffSegmentType {
  return c.added ? "insert" : c.removed ? "delete" : "equal";
}

/**
 * Line diff refined inside each changed block at the requested granularity. Every block of
 * consecutive changed lines is one change (hunk) and shares a `change` index.
 */
export function computeDiff(oldValue: string, newValue: string, granularity: DiffGranularity = "word"): DiffPart[] {
  const lines = diffLines(oldValue, newValue);
  const parts: DiffPart[] = [];
  let change = -1;
  for (let i = 0; i < lines.length; i++) {
    const c = lines[i]!;
    if (!c.added && !c.removed) {
      parts.push({ type: "equal", text: c.value, change: -1 });
      continue;
    }
    let removed = "";
    let added = "";
    while (i < lines.length && (lines[i]!.added || lines[i]!.removed)) {
      if (lines[i]!.added) added += lines[i]!.value;
      else removed += lines[i]!.value;
      i++;
    }
    i--;
    change++;
    if (granularity === "line" || !removed || !added) {
      if (removed) parts.push({ type: "delete", text: removed, change });
      if (added) parts.push({ type: "insert", text: added, change });
      continue;
    }
    const sub = granularity === "char" ? diffChars(removed, added) : diffWordsWithSpace(removed, added);
    for (const s of sub) {
      const type = typeOf(s);
      parts.push({ type, text: s.value, change: type === "equal" ? -1 : change });
    }
  }
  return parts;
}

/** Number segments into changes: each run of non-equal segments is one change. */
export function segmentsToParts(segments: DiffSegment[]): DiffPart[] {
  let change = -1;
  let inChange = false;
  return segments.map((s) => {
    const changed = s.type !== "equal";
    if (changed && !inChange) change++;
    inChange = changed;
    return { ...s, change: changed ? change : -1 };
  });
}

interface LinePiece extends DiffPart {
  /** An inserted/deleted line break with no visible text. */
  breakOnly?: boolean;
}

interface InlineLine {
  parts: LinePiece[];
  changed: boolean;
  changes: number[];
}

function lineMeta(parts: LinePiece[]) {
  const changes = [...new Set(parts.filter((p) => p.change >= 0).map((p) => p.change))];
  return { changed: changes.length > 0, changes };
}

function toInlineLines(parts: DiffPart[]): InlineLine[] {
  const lines: LinePiece[][] = [[]];
  for (const p of parts) {
    const segs = p.text.split("\n");
    segs.forEach((seg, i) => {
      if (i > 0) lines.push([]);
      const cur = lines[lines.length - 1]!;
      if (seg) cur.push({ ...p, text: seg });
      else if (p.type !== "equal" && i < segs.length - 1) cur.push({ ...p, text: "", breakOnly: true });
    });
  }
  if (lines.length > 1 && lines[lines.length - 1]!.length === 0) lines.pop();
  return lines.map((l) => ({ parts: l, ...lineMeta(l) }));
}

interface SideLine {
  no: number;
  parts: LinePiece[];
}

interface SplitRow {
  left?: SideLine;
  right?: SideLine;
  changed: boolean;
  changes: number[];
}

function toSplitRows(parts: DiffPart[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  let curOld: LinePiece[] = [];
  let curNew: LinePiece[] = [];
  let pendOld: SideLine[] = [];
  let pendNew: SideLine[] = [];
  const makeRow = (left?: SideLine, right?: SideLine): SplitRow => {
    const all = [...(left?.parts ?? []), ...(right?.parts ?? [])];
    const meta = lineMeta(all);
    return { left, right, changes: meta.changes, changed: meta.changed || !left || !right };
  };
  const flushPending = () => {
    const n = Math.max(pendOld.length, pendNew.length);
    for (let i = 0; i < n; i++) rows.push(makeRow(pendOld[i], pendNew[i]));
    pendOld = [];
    pendNew = [];
  };
  for (const p of parts) {
    const segs = p.text.split("\n");
    segs.forEach((seg, i) => {
      if (i > 0) {
        if (p.type === "equal") {
          flushPending();
          rows.push(makeRow({ no: oldNo++, parts: curOld }, { no: newNo++, parts: curNew }));
          curOld = [];
          curNew = [];
        } else if (p.type === "delete") {
          if (!curOld.length) curOld.push({ ...p, text: "", breakOnly: true });
          pendOld.push({ no: oldNo++, parts: curOld });
          curOld = [];
        } else {
          if (!curNew.length) curNew.push({ ...p, text: "", breakOnly: true });
          pendNew.push({ no: newNo++, parts: curNew });
          curNew = [];
        }
      }
      if (seg) {
        if (p.type !== "insert") curOld.push({ ...p, text: seg });
        if (p.type !== "delete") curNew.push({ ...p, text: seg });
      }
    });
  }
  flushPending();
  if (curOld.length || curNew.length)
    rows.push(makeRow(curOld.length ? { no: oldNo++, parts: curOld } : undefined, curNew.length ? { no: newNo++, parts: curNew } : undefined));
  return rows;
}

type CollapsedEntry = { kind: "item"; index: number } | { kind: "gap"; start: number; end: number };

function collapseRuns(flags: boolean[], context: number, expanded: ReadonlySet<number>, enabled: boolean): CollapsedEntry[] {
  const n = flags.length;
  if (!enabled || !flags.some(Boolean)) return flags.map((_, index) => ({ kind: "item", index }));
  const keep = new Array<boolean>(n).fill(false);
  flags.forEach((f, i) => {
    if (!f) return;
    for (let j = Math.max(0, i - context); j <= Math.min(n - 1, i + context); j++) keep[j] = true;
  });
  const out: CollapsedEntry[] = [];
  for (let i = 0; i < n; ) {
    if (keep[i]) {
      out.push({ kind: "item", index: i++ });
      continue;
    }
    let j = i;
    while (j < n && !keep[j]) j++;
    if (j - i >= 2 && !expanded.has(i)) out.push({ kind: "gap", start: i, end: j });
    else for (let k = i; k < j; k++) out.push({ kind: "item", index: k });
    i = j;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rendering helpers                                                   */
/* ------------------------------------------------------------------ */

interface AuthorInfo {
  id: string;
  name: string;
  color: string;
}

function resolveAuthor(
  part: DiffPart,
  authors: Record<string, DiffAuthor> | undefined,
  changeAuthors: ReadonlyArray<string | undefined> | undefined
): AuthorInfo | undefined {
  const id = part.author ?? (part.change >= 0 ? changeAuthors?.[part.change] : undefined);
  if (!id) return undefined;
  const a = authors?.[id];
  return { id, name: a?.name ?? id, color: a?.color ?? getPresenceColor(id) };
}

function Piece({
  part,
  author,
  active,
}: {
  part: LinePiece;
  author?: AuthorInfo;
  active: boolean;
}) {
  if (part.type === "equal") return <span>{part.text}</span>;
  const text = part.breakOnly ? "↵" : part.text;
  const ring = active && "outline outline-2 outline-offset-1 outline-ring/60";
  const title = author ? `${part.type === "insert" ? "Added" : "Deleted"} by ${author.name}` : undefined;
  if (part.type === "insert")
    return (
      <ins
        data-change={part.change}
        title={title}
        className={cn(
          "rounded-xs bg-success-soft text-success-soft-foreground no-underline",
          part.breakOnly && "px-0.5 text-[0.85em] opacity-70",
          ring
        )}
        style={
          author
            ? {
                backgroundColor: `color-mix(in srgb, ${author.color} 18%, transparent)`,
                color: "inherit",
                boxShadow: `inset 0 -2px 0 ${author.color}`,
              }
            : undefined
        }
      >
        {text}
      </ins>
    );
  return (
    <del
      data-change={part.change}
      title={title}
      className={cn(
        "rounded-xs bg-destructive-soft text-destructive-soft-foreground line-through decoration-destructive/70",
        part.breakOnly && "px-0.5 text-[0.85em] opacity-70",
        ring
      )}
      style={
        author
          ? {
              backgroundColor: `color-mix(in srgb, ${author.color} 10%, transparent)`,
              color: `color-mix(in srgb, ${author.color} 65%, var(--foreground))`,
              textDecorationColor: author.color,
            }
          : undefined
      }
    >
      {text}
    </del>
  );
}

function GapButton({ count, onClick, className }: { count: number; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-slot="diff-expand"
      className={cn(
        "flex w-full items-center justify-center gap-1.5 bg-subtle py-1 font-sans text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        focusRing,
        className
      )}
    >
      <RiExpandUpDownLine aria-hidden className="size-3.5" />
      {`Show ${count} unchanged ${count === 1 ? "line" : "lines"}`}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* DiffViewer                                                          */
/* ------------------------------------------------------------------ */

export interface DiffViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  oldValue?: string;
  newValue?: string;
  /** Precomputed (e.g. server-side, author-attributed) comparison; overrides old/new values. */
  segments?: DiffSegment[];
  /** Default "inline". */
  mode?: DiffMode;
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
  defaultActiveChange?: number;
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
      mode = "inline",
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
                  "flex border-l-2 border-transparent",
                  line.changed && "border-l-primary/50 bg-primary-soft/25",
                  isActive && "border-l-primary bg-primary-soft/50"
                )}
              >
                {lineNumbers && (
                  <span aria-hidden className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/70 tabular-nums">
                    {e.index + 1}
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
      const noBase = "w-10 select-none border-r border-border pr-2 text-right align-top text-muted-foreground/70 tabular-nums";
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
              <th scope="col" className="px-3 py-1.5 text-left font-medium">
                {oldLabel}
              </th>
              <th scope="col" className="border-l border-border py-1.5 font-medium">
                <span className="sr-only">New line number</span>
              </th>
              <th scope="col" className="px-3 py-1.5 text-left font-medium">
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
                  <td aria-hidden className={cn(noBase, "border-l")}>
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
        data-mode={mode}
        onKeyDown={handleKey}
        className={cn("flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-background", focusRing, className)}
        style={style}
        {...props}
      >
        {showHeader && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-subtle/60 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {changeCount ? `${changeCount} ${changeCount === 1 ? "change" : "changes"}` : "No changes"}
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
            <span className="ml-auto flex items-center gap-1">
              {headerExtra}
              {onModeChange && (
                <SegmentedControl
                  size="sm"
                  aria-label="Diff layout"
                  value={mode}
                  onValueChange={(v) => v && onModeChange(v as DiffMode)}
                  options={[
                    { value: "inline", label: "Inline" },
                    { value: "split", label: "Split" },
                  ]}
                />
              )}
              {changeCount > 0 && (
                <>
                  <span aria-live="polite" className="px-1 tabular-nums">
                    {active >= 0 ? `${active + 1} of ${changeCount}` : ""}
                  </span>
                  <Button size="icon-xs" variant="ghost" aria-label="Previous change" onClick={() => go(-1)}>
                    <RiArrowUpSLine />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="Next change" onClick={() => go(1)}>
                    <RiArrowDownSLine />
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

/* ------------------------------------------------------------------ */
/* SuggestionDiff                                                      */
/* ------------------------------------------------------------------ */

type HunkDecision = "accepted" | "rejected";

type SuggestionToken =
  | { kind: "text"; text: string }
  | { kind: "hunk"; index: number; removed: string; added: string };

function toTokens(original: string, suggestion: string, granularity: "word" | "char"): SuggestionToken[] {
  const changes = granularity === "char" ? diffChars(original, suggestion) : diffWordsWithSpace(original, suggestion);
  const tokens: SuggestionToken[] = [];
  let index = 0;
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i]!;
    if (!c.added && !c.removed) {
      tokens.push({ kind: "text", text: c.value });
      continue;
    }
    let removed = "";
    let added = "";
    while (i < changes.length && (changes[i]!.added || changes[i]!.removed)) {
      if (changes[i]!.added) added += changes[i]!.value;
      else removed += changes[i]!.value;
      i++;
    }
    i--;
    tokens.push({ kind: "hunk", index: index++, removed, added });
  }
  return tokens;
}

export interface SuggestionDiffProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  original: string;
  suggestion: string;
  /** Called with the resulting text (pending changes count as accepted). */
  onAccept?: (newText: string) => void;
  onDiscard?: () => void;
  /** Header title. Default "Suggested edit". */
  title?: React.ReactNode;
  /** e.g. the model name. */
  meta?: React.ReactNode;
  granularity?: "word" | "char";
  /** Per-change accept / reject buttons. Default true. */
  perHunk?: boolean;
  acceptLabel?: string;
  discardLabel?: string;
}

/** AI proposal review: word diff of a suggestion with Accept / Discard and per-change accept / reject. */
export const SuggestionDiff = React.forwardRef<HTMLDivElement, SuggestionDiffProps>(
  (
    {
      original,
      suggestion,
      onAccept,
      onDiscard,
      title = "Suggested edit",
      meta,
      granularity = "word",
      perHunk = true,
      acceptLabel = "Accept",
      discardLabel = "Discard",
      className,
      ...props
    },
    ref
  ) => {
    const tokens = React.useMemo(() => toTokens(original, suggestion, granularity), [original, suggestion, granularity]);
    const hunkCount = tokens.filter((t) => t.kind === "hunk").length;
    const [decisions, setDecisions] = React.useState<Record<number, HunkDecision>>({});
    React.useEffect(() => setDecisions({}), [tokens]);

    const decided = Object.keys(decisions).length;
    const accepted = Object.values(decisions).filter((d) => d === "accepted").length;
    const rejected = decided - accepted;
    const result = tokens
      .map((t) => (t.kind === "text" ? t.text : decisions[t.index] === "rejected" ? t.removed : t.added))
      .join("");
    const decide = (i: number, d: HunkDecision | null) =>
      setDecisions((prev) => {
        const next = { ...prev };
        if (d) next[i] = d;
        else delete next[i];
        return next;
      });

    return (
      <div
        ref={ref}
        role="group"
        aria-label={typeof title === "string" ? title : "Suggested edit"}
        data-slot="suggestion-diff"
        className={cn("flex flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
          <RiSparkling2Line aria-hidden className="size-4 text-primary" />
          <span className="font-medium text-foreground">{title}</span>
          {meta != null && <span className="text-xs text-muted-foreground">{meta}</span>}
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
            {hunkCount === 0
              ? "No changes"
              : `${hunkCount} ${hunkCount === 1 ? "change" : "changes"}${accepted ? ` · ${accepted} accepted` : ""}${rejected ? ` · ${rejected} rejected` : ""}`}
          </span>
        </div>
        <div className="whitespace-pre-wrap break-words px-4 py-3 text-sm leading-7 text-foreground">
          {tokens.map((t, i) => {
            if (t.kind === "text") return <span key={i}>{t.text}</span>;
            const d = decisions[t.index];
            if (d)
              return (
                <span
                  key={i}
                  data-hunk={t.index}
                  data-hunk-state={d}
                  className={cn(
                    "rounded-xs",
                    d === "accepted" ? "bg-success-soft/60 decoration-success" : "text-muted-foreground"
                  )}
                >
                  {d === "accepted" ? t.added : t.removed}
                  {perHunk && (
                    <button
                      type="button"
                      onClick={() => decide(t.index, null)}
                      aria-label={`Undo change ${t.index + 1}`}
                      className={cn(
                        "ml-0.5 inline-flex h-4 items-center rounded-xs px-1 align-[1px] font-sans text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                        focusRing
                      )}
                    >
                      Undo
                    </button>
                  )}
                </span>
              );
            return (
              <span key={i} data-hunk={t.index} data-hunk-state="pending" className="group/hunk">
                {t.removed && (
                  <del className="rounded-xs bg-destructive-soft text-destructive-soft-foreground line-through decoration-destructive/70">
                    {t.removed}
                  </del>
                )}
                {t.added && (
                  <ins className="rounded-xs bg-success-soft text-success-soft-foreground no-underline">{t.added}</ins>
                )}
                {perHunk && (
                  <span className="ml-0.5 inline-flex translate-y-[-1px] items-center gap-px rounded-xs border border-border bg-background align-middle shadow-xs">
                    <button
                      type="button"
                      onClick={() => decide(t.index, "accepted")}
                      aria-label={`Accept change ${t.index + 1}`}
                      className={cn("inline-flex size-5 items-center justify-center rounded-xs text-success hover:bg-success-soft", focusRing)}
                    >
                      <RiCheckLine aria-hidden className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(t.index, "rejected")}
                      aria-label={`Reject change ${t.index + 1}`}
                      className={cn("inline-flex size-5 items-center justify-center rounded-xs text-destructive hover:bg-destructive-soft", focusRing)}
                    >
                      <RiCloseLine aria-hidden className="size-3.5" />
                    </button>
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-subtle/60 px-3 py-2">
          {decided > 0 && (
            <Button size="sm" variant="ghost" className="mr-auto" onClick={() => setDecisions({})}>
              Reset
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onDiscard}>
            {discardLabel}
          </Button>
          <Button size="sm" variant="primary" disabled={result === original} onClick={() => onAccept?.(result)}>
            {hunkCount === 0 ? "No changes" : acceptLabel}
          </Button>
        </div>
      </div>
    );
  }
);
SuggestionDiff.displayName = "SuggestionDiff";
