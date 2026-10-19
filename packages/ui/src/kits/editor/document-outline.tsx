import * as React from "react";
import { RiListUnordered, RiSearchLine } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";

/* ------------------------------------------------------------------ */
/* extractOutline                                                      */
/* ------------------------------------------------------------------ */

export interface OutlineHeading {
  /** Slug (unique within the document). */
  id?: string;
  /** 0-based source line. */
  line?: number;
  text: string;
  /** 1–6. */
  level: number;
}

/** Plain text of an inline markdown fragment (links, emphasis, code and images unwrapped). */
function stripInline(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
    .trim();
}

/** GitHub-style heading slug. */
export function slugifyHeading(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "-") || "section"
  );
}

const fenceOpen = /^ {0,3}(`{3,}|~{3,})/;
const atx = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const setext1 = /^ {0,3}=+[ \t]*$/;
const setext2 = /^ {0,3}-+[ \t]*$/;
const notParagraph = /^ {0,3}(?:[-*+>|#]|\d+[.)]\s|`{3}|~{3}|<)/;

/**
 * Headings of a markdown document (ATX `#` and setext `===`/`---`), skipping fenced code
 * and YAML front matter. Ids are unique GitHub-style slugs; `line` is 0-based.
 */
export function extractOutline(markdown: string): OutlineHeading[] {
  const lines = markdown.split(/\r?\n/);
  const out: OutlineHeading[] = [];
  const seen = new Map<string, number>();
  let fence: { char: string; size: number } | null = null;
  let start = 0;

  if (/^---\s*$/.test(lines[0] ?? "")) {
    const end = lines.findIndex((l, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(l));
    if (end > 0) start = end + 1;
  }

  const push = (raw: string, level: number, line: number) => {
    const text = stripInline(raw);
    if (!text) return;
    // github-slugger: bump the base's counter until the id is unused ("Foo", "Foo", "Foo 1" → foo, foo-1, foo-1-1).
    const base = slugifyHeading(text);
    let id = base;
    while (seen.has(id)) {
      const n = seen.get(base)! + 1;
      seen.set(base, n);
      id = `${base}-${n}`;
    }
    seen.set(id, 0);
    out.push({ id, line, text, level });
  };

  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1]![0] === fence.char && close[1]!.length >= fence.size) fence = null;
      continue;
    }
    const open = line.match(fenceOpen);
    if (open) {
      fence = { char: open[1]![0]!, size: open[1]!.length };
      continue;
    }
    const m = line.match(atx);
    if (m) {
      push(m[2] ?? "", m[1]!.length, i);
      continue;
    }
    const next = lines[i + 1];
    if (next != null && line.trim() && !notParagraph.test(line) && !/^ {4}/.test(line)) {
      const prev = i > start ? lines[i - 1]! : "";
      // A setext underline only makes a heading of a single-line paragraph here.
      if (prev.trim() && !atx.test(prev)) continue;
      if (setext1.test(next)) {
        push(line, 1, i);
        i++;
      } else if (setext2.test(next)) {
        push(line, 2, i);
        i++;
      }
    }
  }
  return out;
}

/** Key used to match a heading against `activeId`: its `id`, else its line. */
export function getOutlineKey(heading: OutlineHeading) {
  return heading.id ?? (heading.line != null ? `line-${heading.line}` : heading.text);
}

/** The heading a 0-based cursor line belongs to (last heading at or above it). */
export function findActiveHeading(headings: OutlineHeading[], line: number): OutlineHeading | undefined {
  let found: OutlineHeading | undefined;
  for (const h of headings) {
    if (h.line == null) continue;
    if (h.line <= line) found = h;
    else break;
  }
  return found;
}

/* ------------------------------------------------------------------ */
/* DocumentOutline                                                     */
/* ------------------------------------------------------------------ */

export interface DocumentOutlineProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  headings: OutlineHeading[];
  /** `id` (or `line-<n>`) of the current heading. */
  activeId?: string;
  onNavigate?: (heading: OutlineHeading) => void;
  /** Show a filter box. Default: when there are more than 8 headings. */
  filterable?: boolean;
  /** Heading shown above the list. Default "Outline"; `null` hides it. */
  title?: React.ReactNode;
  /** Shown when there are no headings. */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyHint?: React.ReactNode;
  /** Deepest level listed. Default 6. */
  maxLevel?: number;
}

/** Heading tree of a document: indented by level, active highlight, click to jump, optional filter. */
export const DocumentOutline = React.forwardRef<HTMLElement, DocumentOutlineProps>(
  (
    {
      headings,
      activeId,
      onNavigate,
      filterable,
      title = "Outline",
      emptyState,
      emptyHint,
      maxLevel = 6,
      className,
      ...props
    },
    ref
  ) => {
    const [query, setQuery] = React.useState("");
    const titleId = React.useId();
    const shown = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      return headings.filter((h) => h.level <= maxLevel && (!q || h.text.toLowerCase().includes(q)));
    }, [headings, query, maxLevel]);
    const minLevel = shown.reduce((m, h) => Math.min(m, h.level), 6);
    const showFilter = filterable ?? headings.length > 8;

    return (
      <nav
        ref={ref}
        aria-labelledby={title != null ? titleId : undefined}
        aria-label={title == null ? "Document outline" : undefined}
        data-slot="document-outline"
        className={cn("flex min-h-0 flex-col gap-2 text-sm", className)}
        {...props}
      >
        {title != null && (
          <div id={titleId} className="flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
            <RiListUnordered aria-hidden className="size-3.5" />
            {title}
          </div>
        )}
        {showFilter && headings.length > 0 && (
          <div className="relative px-1">
            <RiSearchLine aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter headings"
              aria-label="Filter headings"
              className={cn(
                "h-8 w-full rounded-control border border-input bg-background ps-8 pe-2 text-sm shadow-xs placeholder:text-muted-foreground",
                focusRing
              )}
            />
          </div>
        )}
        {headings.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">{emptyState ?? emptyHint ?? "No headings yet. Lines starting with # become headings."}</p>
        ) : shown.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">No headings match “{query}”.</p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-px overflow-y-auto scrollbar-thin">
            {shown.map((h, i) => {
              const key = getOutlineKey(h);
              const active = activeId != null && key === activeId;
              return (
                <li key={`${key}-${i}`}>
                  <button
                    type="button"
                    data-level={h.level}
                    aria-current={active ? "location" : undefined}
                    onClick={() => onNavigate?.(h)}
                    style={{ paddingLeft: `${0.5 + (h.level - minLevel) * 0.875}rem` }}
                    className={cn(
                      "relative flex w-full items-center rounded-sm py-1 pe-2 text-start text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      h.level === minLevel && "font-medium text-foreground/85",
                      active &&
                        "bg-primary-soft text-primary-soft-foreground before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:rounded-full before:bg-primary hover:bg-primary-soft hover:text-primary-soft-foreground",
                      focusRing
                    )}
                  >
                    <span className="truncate">{h.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    );
  }
);
DocumentOutline.displayName = "DocumentOutline";
