/** Diff model: the segment and part types, the line diff at word, line or char granularity, and the numbering of precomputed segments. */
import { diffChars, diffLines, diffWordsWithSpace, type Change } from "diff";

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
