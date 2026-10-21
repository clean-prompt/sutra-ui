/** Private helpers shared by the diff modules: inline and split line building, unchanged-run collapsing, author lookup, the changed-text piece and the expand button. */
import { RiExpandUpDownLine } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { pluralize } from "../lib/format";
import { colorForSeed } from "../lib/hash";
import type { DiffAuthor, DiffPart } from "./diff-viewer-model";

export interface LinePiece extends DiffPart {
  /** An inserted/deleted line break with no visible text. */
  breakOnly?: boolean;
}

export interface InlineLine {
  parts: LinePiece[];
  changed: boolean;
  changes: number[];
  /** Line number in the new text; undefined for a line that only exists in the old text. */
  newNo?: number;
}

export function lineMeta(parts: LinePiece[]) {
  const changes = [...new Set(parts.filter((p) => p.change >= 0).map((p) => p.change))];
  return { changed: changes.length > 0, changes };
}

export function toInlineLines(parts: DiffPart[]): InlineLine[] {
  const lines: LinePiece[][] = [[]];
  // New-text line breaks seen before each display line (deleted breaks don't advance the new text).
  const newBreaks: number[] = [0];
  let breaks = 0;
  for (const p of parts) {
    const segs = p.text.split("\n");
    segs.forEach((seg, i) => {
      if (i > 0) {
        if (p.type !== "delete") breaks++;
        lines.push([]);
        newBreaks.push(breaks);
      }
      const cur = lines[lines.length - 1]!;
      if (seg) cur.push({ ...p, text: seg });
      else if (p.type !== "equal" && i < segs.length - 1) cur.push({ ...p, text: "", breakOnly: true });
    });
  }
  if (lines.length > 1 && lines[lines.length - 1]!.length === 0) lines.pop();
  return lines.map((l, i) => {
    const deletedOnly = l.length > 0 && l.every((p) => p.type === "delete");
    return { parts: l, ...lineMeta(l), newNo: deletedOnly ? undefined : newBreaks[i]! + 1 };
  });
}

export interface SideLine {
  no: number;
  parts: LinePiece[];
}

export interface SplitRow {
  left?: SideLine;
  right?: SideLine;
  changed: boolean;
  changes: number[];
}

export function toSplitRows(parts: DiffPart[]): SplitRow[] {
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
          // A break-only change (the line's text came from an earlier part) still shows as a change.
          if (segs[i - 1] === "") curOld.push({ ...p, text: "", breakOnly: true });
          pendOld.push({ no: oldNo++, parts: curOld });
          curOld = [];
        } else {
          if (segs[i - 1] === "") curNew.push({ ...p, text: "", breakOnly: true });
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
  // An unterminated last line pairs with any pending lines on the other side (e.g. only a trailing newline changed).
  if (curOld.length) pendOld.push({ no: oldNo++, parts: curOld });
  if (curNew.length) pendNew.push({ no: newNo++, parts: curNew });
  flushPending();
  return rows;
}

export type CollapsedEntry = { kind: "item"; index: number } | { kind: "gap"; start: number; end: number };

export function collapseRuns(flags: boolean[], context: number, expanded: ReadonlySet<number>, enabled: boolean): CollapsedEntry[] {
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

export interface AuthorInfo {
  id: string;
  name: string;
  color: string;
}

export function resolveAuthor(
  part: DiffPart,
  authors: Record<string, DiffAuthor> | undefined,
  changeAuthors: ReadonlyArray<string | undefined> | undefined
): AuthorInfo | undefined {
  const id = part.author ?? (part.change >= 0 ? changeAuthors?.[part.change] : undefined);
  if (!id) return undefined;
  const a = authors?.[id];
  return { id, name: a?.name ?? id, color: a?.color ?? colorForSeed(id) };
}

export function Piece({
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

export function GapButton({ count, onClick, className }: { count: number; onClick: () => void; className?: string }) {
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
      {`Show ${count} unchanged ${pluralize(count, "line")}`}
    </button>
  );
}
