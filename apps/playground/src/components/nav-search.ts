/** The ⌘K palette's entries (from nav.ts) and fuzzy matching: pure functions, unit-tested in packages/ui/test/docs-tooling.test.ts. */
import { nav, routeOf } from "../nav";
import type { NavStatus } from "../nav";
import { href } from "../router";

export interface PaletteEntry {
  /** Router URL (`#/components/buttons/toggle-group`). */
  href: string;
  kind: "section" | "page" | "item";
  label: string;
  /** Where it lives: "Primitives › Buttons & Actions". */
  trail: string;
  keywords: string[];
  status?: NavStatus;
  since?: string;
}

/** The searchable entries, in nav order. */
export function paletteEntries(): PaletteEntry[] {
  const out: PaletteEntry[] = [];
  for (const section of nav) {
    const first = section.pages[0];
    if (first) out.push({ href: href(routeOf(section, first), first.id), kind: "section", label: section.label, trail: "Section", keywords: [section.id] });
    for (const page of section.pages) {
      const route = routeOf(section, page);
      out.push({ href: href(route, page.id), kind: "page", label: page.label, trail: section.label, keywords: [page.id], status: page.status, since: page.since });
      for (const item of page.items ?? []) {
        out.push({
          href: href(route, page.id, item.id),
          kind: "item",
          label: item.label,
          trail: `${section.label} › ${page.label}`,
          keywords: [item.id],
          status: item.status,
          since: item.since,
        });
      }
    }
  }
  return out;
}

/** Separates a palette entry's label, trail and keywords inside its cmdk value. */
export const SEP = "¦";
/** Marks the "Recent" rows: they show for the empty query only. */
export const RECENT_PREFIX = "~recent~";

/** 0 for no match; 1 for equal; prefix, word start, substring and in-order letters score in between. */
export function textScore(token: string, text: string): number {
  const t = text.toLowerCase();
  if (!t) return 0;
  if (t === token) return 1;
  if (t.startsWith(token)) return 0.9;
  if (t.split(/[^a-z0-9]+/).some((w) => w.startsWith(token))) return 0.8;
  if (t.includes(token)) return 0.65;
  // Letters in order ("tgrp" finds "Toggle Group"): word starts and runs of consecutive letters count most, and a loose
  // scatter of letters ("tgrp" in "Typography") is not a match. Too short a query is only ever a prefix or word start.
  if (token.length < 3) return 0;
  const starts: number[] = [];
  for (let i = 0; i < t.length; i++) if (/[a-z0-9]/.test(t[i]!) && !/[a-z0-9]/.test(t[i - 1] ?? " ")) starts.push(i);
  let at = 0;
  let run = 0;
  let bonus = 0;
  for (const ch of token) {
    const wordStart = starts.find((i) => i >= at && t[i] === ch);
    const next = t[at] === ch ? at : (wordStart ?? t.indexOf(ch, at));
    if (next < 0) return 0;
    run = next === at && at > 0 ? run + 1 : 0;
    bonus += run > 0 ? 0.5 : starts.includes(next) ? 0.4 : 0.1;
    at = next + 1;
  }
  const average = bonus / token.length;
  return average < 0.3 ? 0 : Math.min(0.5, 0.15 + 0.35 * average);
}

/**
 * cmdk filter. A nav entry's value is `label SEP trail SEP keywords`; every word of the query must match somewhere, and the
 * label counts most, then the page, then the section. Other values (the shortcut commands) are matched as plain text.
 */
export function paletteFilter(value: string, search: string, keywords?: string[]): number {
  const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  if (value.startsWith(RECENT_PREFIX)) return 0; // the "Recent" group is for the empty query only
  const [label = "", trail = "", extra = ""] = value.split(SEP);
  const parts = value.includes(SEP) ? [[label, 1], [trail.split("›").pop()!.trim(), 0.6], [trail.split("›")[0]!.trim(), 0.4], [extra, 0.5]] as const : ([[label, 1], [(keywords ?? []).join(" "), 0.5]] as const);
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [text, weight] of parts) best = Math.max(best, textScore(token, text) * weight);
    if (best === 0) return 0;
    total += best;
  }
  return total / tokens.length;
}

