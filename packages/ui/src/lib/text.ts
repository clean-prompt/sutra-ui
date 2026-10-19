/* Shared string helpers. Pure; Unicode-aware; never throw on bad input. */

const str = (s: unknown): string => (typeof s === "string" ? s : s === null || s === undefined ? "" : String(s));

/** Escapes RegExp metacharacters so a string matches literally. */
export function escapeRegExp(s: string): string {
  return str(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** User-perceived characters (grapheme clusters) of a string; falls back to code points. */
export function graphemes(s: string): string[] {
  const text = str(s);
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (typeof Segmenter === "function") {
    try {
      return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (x) => x.segment);
    } catch {
      /* fall through */
    }
  }
  return Array.from(text);
}

/** Options for `matchRanges`: every occurrence or the first, case sensitivity and whole-word matching. */
export interface MatchRangesOptions {
  /** Every occurrence (default) or only the first. */
  all?: boolean;
  /** Default false. */
  caseSensitive?: boolean;
  /** Match each whitespace-separated word of the query separately. Default false. */
  words?: boolean;
}

/** `[start, end)` ranges where `query` occurs in `text`, sorted and merged. Empty query → `[]`. */
export function matchRanges(text: string, query: string, options: MatchRangesOptions = {}): [number, number][] {
  const t = str(text);
  const q = str(query);
  if (!t || !q.trim()) return [];
  const terms = options.words ? q.split(/\s+/).filter(Boolean) : [q];
  const all = options.all !== false;
  const flags = `g${options.caseSensitive ? "" : "i"}u`;
  const found: [number, number][] = [];
  for (const term of terms) {
    let re: RegExp;
    try {
      re = new RegExp(escapeRegExp(term), flags);
    } catch {
      continue;
    }
    for (let m = re.exec(t); m; m = re.exec(t)) {
      found.push([m.index, m.index + m[0].length]);
      if (!all) break;
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const r of found) {
    const prev = merged[merged.length - 1];
    if (prev && r[0] <= prev[1]) prev[1] = Math.max(prev[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return all ? merged : merged.slice(0, 1);
}

/** Options for `slugify`. */
export interface SlugifyOptions {
  /** Keep non-Latin letters and digits (`"日本語"` stays). Default false (ASCII only, accents stripped). */
  unicode?: boolean;
  /** Default `"-"`. */
  separator?: string;
  /** Returned when nothing is left. Default `""`. */
  fallback?: string;
  /** Maximum length (cut on a separator boundary when possible). */
  maxLength?: number;
}

/** URL/anchor slug (`"Héllo, World!"` → `"hello-world"`). */
export function slugify(s: string, options: SlugifyOptions = {}): string {
  const sep = options.separator ?? "-";
  const base = str(s).normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();
  const pattern = options.unicode ? /[^\p{L}\p{N}]+/gu : /[^a-z0-9]+/g;
  let out = base.replace(pattern, sep);
  if (sep) {
    const e = escapeRegExp(sep);
    out = out.replace(new RegExp(`(?:${e}){2,}`, "g"), sep).replace(new RegExp(`^(?:${e})+|(?:${e})+$`, "g"), "");
  }
  if (options.maxLength !== undefined && options.maxLength >= 0 && out.length > options.maxLength) {
    out = Array.from(out).slice(0, options.maxLength).join("");
    if (sep && out.endsWith(sep)) out = out.slice(0, -sep.length);
  }
  return out || (options.fallback ?? "");
}

/** Options for `initials`: maximum letters, mode, single-word handling, case and fallback. */
export interface InitialsOptions {
  /** Maximum letters. Default 2. */
  max?: number;
  /** `"first-last"` (default: first and last word) or `"first-two"` (first words in order). */
  mode?: "first-last" | "first-two";
  /** Characters taken from a single-word name (`2` → `"Ma"` for "Maya"). Default 1. */
  singleWord?: number;
  /** Uppercase the result. Default true. */
  uppercase?: boolean;
  /** Returned for empty names. Default `""`. */
  fallback?: string;
}

const INITIAL_START = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

/** Initials of a display name (`"Maya Patel"` → `"MP"`), safe for accents, emoji and non-Latin scripts. */
export function initials(name: string | null | undefined, options: InitialsOptions = {}): string {
  const max = Math.max(1, Math.trunc(options.max ?? 2));
  const words = str(name)
    .trim()
    .split(/[\s ]+/)
    .map((w) => graphemes(w))
    .map((g) => g.slice(g.findIndex((c) => INITIAL_START.test(c))))
    .filter((g) => g.length > 0 && INITIAL_START.test(g[0]!));
  if (words.length === 0) return options.fallback ?? "";
  let picked: string[];
  if (words.length === 1) {
    picked = words[0]!.slice(0, Math.max(1, Math.min(max, Math.trunc(options.singleWord ?? 1))));
  } else if ((options.mode ?? "first-last") === "first-two") {
    picked = words.slice(0, max).map((w) => w[0]!);
  } else {
    picked = max === 1 ? [words[0]![0]!] : [...words.slice(0, max - 1).map((w) => w[0]!), words[words.length - 1]![0]!];
  }
  const out = picked.join("");
  return options.uppercase === false ? out : out.toLocaleUpperCase();
}

/** Uppercases the first character (`"élan"` → `"Élan"`). */
export function capitalize(s: string): string {
  const [first = "", ...rest] = graphemes(s);
  return first.toLocaleUpperCase() + rest.join("");
}

/** Shortens to `max` characters by replacing the middle with `ellipsis` (`"abcdef…uvwxyz"`). */
export function truncateMiddle(s: string, max: number, ellipsis = "…"): string {
  const chars = graphemes(s);
  if (!Number.isFinite(max) || chars.length <= max) return chars.join("");
  const m = Math.trunc(max);
  if (m <= 0) return "";
  const dots = graphemes(ellipsis);
  if (m <= dots.length) return chars.slice(0, m).join("");
  const keep = m - dots.length;
  const head = Math.ceil(keep / 2);
  const tail = keep - head;
  return chars.slice(0, head).join("") + ellipsis + (tail > 0 ? chars.slice(chars.length - tail).join("") : "");
}
