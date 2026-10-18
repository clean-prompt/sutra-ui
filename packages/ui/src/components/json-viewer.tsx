import * as React from "react";
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiContractUpDownLine,
  RiErrorWarningLine,
  RiExpandUpDownLine,
  RiFileCopyLine,
  RiLinksLine,
  RiSearchLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useCopy } from "../hooks/use-copy";
import { safeISO } from "../lib/date";
import { CodeBlock } from "./code-block";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export type JsonPathSegment = string | number;

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** `["a", 0, "b c"]` → `$.a[0]["b c"]`. */
export function formatJsonPath(segments: JsonPathSegment[]): string {
  let out = "$";
  for (const s of segments) {
    if (typeof s === "number") out += `[${s}]`;
    else if (IDENT.test(s)) out += `.${s}`;
    else out += `[${JSON.stringify(s)}]`;
  }
  return out;
}

/** JSON.stringify that survives circular refs, BigInt, undefined and functions. */
export function safeJsonStringify(value: unknown, space: number | string = 2): string {
  const stack: object[] = [];
  // Converted Map/Set stand-ins → the original collection, so the ancestor stack tracks the original.
  const original = new WeakMap<object, object>();
  const replacer = function (this: unknown, _key: string, v: unknown) {
    if (typeof v === "bigint") return `${v}n`;
    if (typeof v === "function") return `[Function ${(v as { name?: string }).name || "anonymous"}]`;
    if (v && typeof v === "object") {
      const holder = original.get(this as object) ?? (this as object);
      while (stack.length && stack[stack.length - 1] !== holder) stack.pop();
      if (stack.includes(v as object)) return "[Circular]";
      stack.push(v as object);
      if (v instanceof Map) {
        const obj = Object.fromEntries([...v.entries()].map(([k, x]) => [String(k), x]));
        original.set(obj, v);
        return obj;
      }
      if (v instanceof Set) {
        const arr = [...v];
        original.set(arr, v);
        return arr;
      }
    }
    return v;
  };
  try {
    const out = JSON.stringify(value, replacer, space);
    return out === undefined ? String(value) : out;
  } catch (e) {
    return `/* unserializable: ${(e as Error).message} */`;
  }
}

type Kind = "object" | "array" | "string" | "number" | "boolean" | "null" | "undefined" | "bigint" | "function" | "date" | "other";

function kindOf(v: unknown): Kind {
  if (v === null) return "null";
  if (Array.isArray(v) || v instanceof Set) return "array";
  if (v instanceof Date) return "date";
  const t = typeof v;
  if (t === "object") return "object";
  if (t === "string" || t === "number" || t === "boolean" || t === "undefined" || t === "bigint" || t === "function") return t;
  return "other";
}

function entriesOf(v: unknown): [JsonPathSegment, unknown][] {
  if (Array.isArray(v)) return v.map((x, i) => [i, x]);
  if (v instanceof Set) return [...v].map((x, i) => [i, x]);
  if (v instanceof Map) return [...v.entries()].map(([k, x]) => [String(k), x]);
  return Object.keys(v as object).map((k) => [k, (v as Record<string, unknown>)[k]]);
}

function primitiveText(v: unknown, kind: Kind): string {
  switch (kind) {
    case "string":
      return JSON.stringify(v);
    case "date":
      return JSON.stringify(safeISO(v as Date) ?? "Invalid Date");
    case "bigint":
      return `${String(v)}n`;
    case "function":
      return `ƒ ${(v as { name?: string }).name || "anonymous"}()`;
    case "undefined":
      return "undefined";
    default:
      return String(v);
  }
}

const tokenClass: Record<Kind | "key" | "punct" | "circular", string> = {
  key: "text-foreground",
  string: "text-success-soft-foreground",
  date: "text-success-soft-foreground",
  number: "text-info-soft-foreground",
  bigint: "text-info-soft-foreground",
  boolean: "text-warning-soft-foreground",
  null: "italic text-muted-foreground",
  undefined: "italic text-muted-foreground",
  function: "italic text-primary-soft-foreground",
  other: "text-muted-foreground",
  object: "text-muted-foreground",
  array: "text-muted-foreground",
  punct: "text-muted-foreground",
  circular: "italic text-destructive",
};

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(query);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="rounded-xs bg-warning/40 text-inherit">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    i = idx + query.length;
    idx = lower.indexOf(query, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

/** Paths (formatted) whose subtree contains a match, plus the match count. */
function collectMatches(data: unknown, query: string, limit = 20000) {
  const expand = new Set<string>();
  let count = 0;
  let visited = 0;
  const walk = (v: unknown, segs: JsonPathSegment[], ancestors: Set<object>): boolean => {
    if (++visited > limit) return false;
    const kind = kindOf(v);
    if (kind === "object" || kind === "array") {
      if (ancestors.has(v as object)) return false;
      ancestors.add(v as object);
      let any = false;
      for (const [k, x] of entriesOf(v)) {
        const keyHit = typeof k === "string" && k.toLowerCase().includes(query);
        if (keyHit) count++;
        const childHit = walk(x, [...segs, k], ancestors);
        if (keyHit || childHit) any = true;
      }
      ancestors.delete(v as object);
      if (any) expand.add(formatJsonPath(segs));
      return any;
    }
    const hit = primitiveText(v, kind).toLowerCase().includes(query);
    if (hit) count++;
    return hit;
  };
  walk(data, [], new Set());
  return { expand, count };
}

/* ------------------------------------------------------------------ */
/* Tree                                                                */
/* ------------------------------------------------------------------ */

interface TreeCtx {
  isExpanded: (path: string, depth: number) => boolean;
  toggle: (path: string, depth: number) => void;
  visible: (path: string) => number;
  showMore: (path: string, all?: boolean) => void;
  chunkSize: number;
  query: string;
  copy: (text: string, kind: "value" | "path", path: string) => void;
  copiedKey: string | null;
}

const JsonTreeContext = React.createContext<TreeCtx | null>(null);

function CopyActions({ value, path }: { value: unknown; path: string }) {
  const ctx = React.useContext(JsonTreeContext)!;
  const kind = kindOf(value);
  const valueText =
    kind === "string" ? (value as string) : kind === "object" || kind === "array" ? safeJsonStringify(value, 2) : primitiveText(value, kind);
  const btn = cn(
    "inline-flex size-5 items-center justify-center rounded-xs text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-3",
    focusRing
  );
  return (
    <span className="ml-1 inline-flex gap-0.5 opacity-0 transition-opacity group-hover/json-row:opacity-100 focus-within:opacity-100">
      <button type="button" className={btn} aria-label={`Copy value of ${path}`} onClick={() => ctx.copy(valueText, "value", path)}>
        {ctx.copiedKey === `value:${path}` ? <RiCheckLine aria-hidden className="text-success" /> : <RiFileCopyLine aria-hidden />}
      </button>
      <button type="button" className={btn} aria-label={`Copy path ${path}`} onClick={() => ctx.copy(path, "path", path)}>
        {ctx.copiedKey === `path:${path}` ? <RiCheckLine aria-hidden className="text-success" /> : <RiLinksLine aria-hidden />}
      </button>
    </span>
  );
}

interface JsonNodeProps {
  name: JsonPathSegment | null;
  value: unknown;
  segs: JsonPathSegment[];
  depth: number;
  ancestors: Map<object, string>;
  last: boolean;
}

function JsonNode({ name, value, segs, depth, ancestors, last }: JsonNodeProps) {
  const ctx = React.useContext(JsonTreeContext)!;
  const groupId = React.useId();
  const path = formatJsonPath(segs);
  const kind = kindOf(value);
  const comma = last ? null : <span className={tokenClass.punct}>,</span>;
  const keyEl =
    name === null ? null : (
      <>
        <span className={typeof name === "number" ? tokenClass.number + " opacity-70" : tokenClass.key}>
          {typeof name === "number" ? name : <Highlight text={JSON.stringify(name)} query={ctx.query} />}
        </span>
        <span className={tokenClass.punct}>: </span>
      </>
    );
  const indent = { paddingLeft: depth * 16 };

  if (kind !== "object" && kind !== "array") {
    return (
      <div className="group/json-row flex items-center whitespace-pre rounded-xs hover:bg-accent/60" style={indent}>
        <span className="inline-block w-4 shrink-0" />
        {keyEl}
        <span className={cn(tokenClass[kind], "break-all whitespace-pre-wrap")} data-kind={kind}>
          <Highlight text={primitiveText(value, kind)} query={ctx.query} />
        </span>
        {comma}
        <CopyActions value={value} path={path} />
      </div>
    );
  }

  const circularOf = ancestors.get(value as object);
  if (circularOf !== undefined) {
    return (
      <div className="group/json-row flex items-center whitespace-pre" style={indent}>
        <span className="inline-block w-4 shrink-0" />
        {keyEl}
        <span className={tokenClass.circular} data-kind="circular">
          [Circular → {circularOf}]
        </span>
        {comma}
      </div>
    );
  }

  const entries = entriesOf(value);
  const isArray = kind === "array";
  const [open, close] = isArray ? ["[", "]"] : ["{", "}"];
  const countText = isArray ? `${entries.length} ${entries.length === 1 ? "item" : "items"}` : `${entries.length} ${entries.length === 1 ? "key" : "keys"}`;
  const expanded = entries.length > 0 && ctx.isExpanded(path, depth);
  const shown = expanded ? Math.min(entries.length, ctx.visible(path)) : 0;
  const nextAncestors = expanded ? new Map(ancestors).set(value as object, path) : ancestors;
  const remaining = entries.length - shown;

  return (
    <div data-path={path}>
      <div className="group/json-row flex items-center whitespace-pre rounded-xs hover:bg-accent/60" style={indent}>
        {entries.length ? (
          <button
            type="button"
            onClick={() => ctx.toggle(path, depth)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${path}`}
            aria-expanded={expanded}
            aria-controls={groupId}
            className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground", focusRing)}
          >
            <RiArrowRightSLine aria-hidden className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="inline-block w-4 shrink-0" />
        )}
        {keyEl}
        <span className={tokenClass.punct}>{open}</span>
        {expanded ? null : (
          <>
            {entries.length ? <span className="px-0.5 text-muted-foreground">…</span> : null}
            <span className={tokenClass.punct}>{close}</span>
            {comma}
          </>
        )}
        <span className="ml-2 text-2xs text-muted-foreground" data-count="">
          {countText}
        </span>
        <CopyActions value={value} path={path} />
      </div>
      {expanded ? (
        <>
          <div id={groupId}>
            {entries.slice(0, shown).map(([k, x], i) => (
              <JsonNode
                key={String(k)}
                name={k}
                value={x}
                segs={[...segs, k]}
                depth={depth + 1}
                ancestors={nextAncestors}
                last={i === entries.length - 1}
              />
            ))}
          </div>
          {remaining > 0 ? (
            <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: (depth + 1) * 16 + 16 }}>
              <button
                type="button"
                onClick={() => ctx.showMore(path)}
                className={cn("rounded-xs px-1.5 py-0.5 text-2xs font-medium text-primary hover:bg-primary-soft", focusRing)}
              >
                Show {Math.min(ctx.chunkSize, remaining)} more
              </button>
              <button
                type="button"
                onClick={() => ctx.showMore(path, true)}
                className={cn("rounded-xs px-1.5 py-0.5 text-2xs text-muted-foreground hover:bg-accent hover:text-foreground", focusRing)}
              >
                Show all ({remaining} remaining)
              </button>
            </div>
          ) : null}
          <div className="whitespace-pre" style={{ paddingLeft: depth * 16 + 16 }}>
            <span className={tokenClass.punct}>{close}</span>
            {comma}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* JsonViewer                                                          */
/* ------------------------------------------------------------------ */

export type JsonViewerMode = "tree" | "raw";

export interface JsonViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onCopy"> {
  /** Value to display. */
  data?: unknown;
  /** Raw JSON text (parsed; invalid JSON shows an error and the raw text). */
  json?: string;
  /** Levels expanded initially. Default 1. */
  defaultExpandDepth?: number;
  /** Children shown per "Show more" chunk. Default 100. */
  chunkSize?: number;
  mode?: JsonViewerMode;
  defaultMode?: JsonViewerMode;
  onModeChange?: (mode: JsonViewerMode) => void;
  /** Controlled search query. */
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (q: string) => void;
  /** Show the toolbar (search, expand/collapse all, tree/raw). Default true. */
  toolbar?: boolean;
  /** Show the search box in the toolbar. Default true. */
  searchable?: boolean;
  maxHeight?: number | string;
  onCopy?: (text: string, kind: "value" | "path", path: string) => void;
  /** Accessible label. */
  label?: string;
}

/** Collapsible JSON tree with search, copy value/path, chunked arrays and a raw view. */
export const JsonViewer = React.forwardRef<HTMLDivElement, JsonViewerProps>(
  (
    {
      className,
      data: dataProp,
      json,
      defaultExpandDepth = 1,
      chunkSize = 100,
      mode: modeProp,
      defaultMode = "tree",
      onModeChange,
      search: searchProp,
      defaultSearch = "",
      onSearchChange,
      toolbar = true,
      searchable = true,
      maxHeight = 480,
      onCopy,
      label = "JSON",
      ...props
    },
    ref
  ) => {
    const parsed = React.useMemo((): { ok: true; value: unknown } | { ok: false; error: string } => {
      if (json === undefined) return { ok: true, value: dataProp };
      try {
        return { ok: true, value: JSON.parse(json) };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    }, [json, dataProp]);

    const [modeState, setModeState] = React.useState<JsonViewerMode>(defaultMode);
    const mode = modeProp ?? modeState;
    const setMode = (m: JsonViewerMode) => {
      if (modeProp === undefined) setModeState(m);
      onModeChange?.(m);
    };
    const [searchState, setSearchState] = React.useState(defaultSearch);
    const search = searchProp ?? searchState;
    const setSearch = (q: string) => {
      if (searchProp === undefined) setSearchState(q);
      onSearchChange?.(q);
    };
    const query = search.trim().toLowerCase();

    const [bulk, setBulk] = React.useState<"default" | "all" | "none">("default");
    const [overrides, setOverrides] = React.useState<Map<string, boolean>>(() => new Map());
    const [chunks, setChunks] = React.useState<Map<string, number>>(() => new Map());
    const { copy } = useCopy();
    const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
    const copiedTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
    React.useEffect(() => () => clearTimeout(copiedTimer.current), []);

    const value = parsed.ok ? parsed.value : undefined;
    const matches = React.useMemo(() => (query && parsed.ok ? collectMatches(value, query) : null), [query, value, parsed.ok]);

    const isExpanded = React.useCallback(
      (path: string, depth: number) => {
        const o = overrides.get(path);
        if (o !== undefined) return o;
        if (matches?.expand.has(path)) return true;
        if (bulk === "all") return true;
        if (bulk === "none") return false;
        return depth < defaultExpandDepth;
      },
      [overrides, matches, bulk, defaultExpandDepth]
    );

    const ctx: TreeCtx = {
      isExpanded,
      toggle: (path, depth) => setOverrides((m) => new Map(m).set(path, !isExpanded(path, depth))),
      visible: (path) => chunks.get(path) ?? chunkSize,
      showMore: (path, all) => setChunks((m) => new Map(m).set(path, all ? Number.MAX_SAFE_INTEGER : (m.get(path) ?? chunkSize) + chunkSize)),
      chunkSize,
      query,
      copiedKey,
      copy: (text, kind, path) => {
        void copy(text);
        onCopy?.(text, kind, path);
        setCopiedKey(`${kind}:${path}`);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopiedKey(null), 1600);
      },
    };

    const raw = React.useMemo(() => (parsed.ok ? safeJsonStringify(value, 2) : json ?? ""), [parsed.ok, value, json]);
    const toolBtn = cn(
      "inline-flex h-7 items-center gap-1 rounded-control px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-3.5",
      focusRing
    );

    return (
      <div ref={ref} className={cn("flex min-w-0 flex-col overflow-hidden rounded-box border border-border bg-card text-sm", className)} {...props}>
        {toolbar && parsed.ok ? (
          <div className="flex flex-wrap items-center gap-1 border-b border-border bg-subtle px-2 py-1.5">
            {searchable && mode === "tree" ? (
              <label className="relative mr-auto flex min-w-40 flex-1 items-center">
                <span className="sr-only">Search JSON</span>
                <RiSearchLine aria-hidden className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search keys and values…"
                  className={cn(
                    "h-7 w-full max-w-64 rounded-control border border-input bg-background pl-7 pr-2 text-xs placeholder:text-muted-foreground",
                    focusRing
                  )}
                />
                {matches ? (
                  <span className="ml-2 whitespace-nowrap text-2xs text-muted-foreground" aria-live="polite" data-match-count="">
                    {matches.count} {matches.count === 1 ? "match" : "matches"}
                  </span>
                ) : null}
              </label>
            ) : (
              <span className="mr-auto" />
            )}
            {mode === "tree" ? (
              <>
                <button
                  type="button"
                  className={toolBtn}
                  onClick={() => {
                    setBulk("all");
                    setOverrides(new Map());
                  }}
                >
                  <RiExpandUpDownLine aria-hidden />
                  Expand all
                </button>
                <button
                  type="button"
                  className={toolBtn}
                  onClick={() => {
                    setBulk("none");
                    setOverrides(new Map());
                  }}
                >
                  <RiContractUpDownLine aria-hidden />
                  Collapse all
                </button>
              </>
            ) : null}
            <div role="group" aria-label="View" className="ml-1 inline-flex rounded-control border border-border bg-background p-0.5">
              {(["tree", "raw"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-6 rounded-control px-2 text-xs font-medium capitalize transition-colors",
                    mode === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                    focusRing
                  )}
                >
                  {m === "tree" ? "Tree" : "Raw"}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!parsed.ok ? (
          <div className="flex flex-col gap-2 p-3">
            <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive-soft p-2.5 text-xs text-destructive-soft-foreground">
              <RiErrorWarningLine aria-hidden className="mt-px size-4 shrink-0" />
              <span>
                <span className="font-semibold">Invalid JSON.</span> {parsed.error}
              </span>
            </div>
            <CodeBlock code={json ?? ""} theme="light" hideHeader className="rounded-md" maxHeight={maxHeight} />
          </div>
        ) : mode === "raw" ? (
          <CodeBlock code={raw} language="json" theme="light" className="rounded-none border-0" maxHeight={maxHeight} />
        ) : (
          <JsonTreeContext.Provider value={ctx}>
            <div
              role="group"
              aria-label={label}
              className="overflow-auto p-2 font-mono text-xs leading-5 scrollbar-thin"
              style={{ maxHeight }}
            >
              <JsonNode name={null} value={value} segs={[]} depth={0} ancestors={new Map()} last />
            </div>
          </JsonTreeContext.Provider>
        )}
      </div>
    );
  }
);
JsonViewer.displayName = "JsonViewer";

/* ------------------------------------------------------------------ */
/* JsonInline                                                          */
/* ------------------------------------------------------------------ */

interface Tok {
  text: string;
  cls: string;
}

function inlineTokens(v: unknown, depth: number, seen: Set<object>, out: Tok[]) {
  const kind = kindOf(v);
  if (kind !== "object" && kind !== "array") {
    out.push({ text: primitiveText(v, kind), cls: tokenClass[kind] });
    return;
  }
  if (seen.has(v as object)) {
    out.push({ text: "[Circular]", cls: tokenClass.circular });
    return;
  }
  const entries = entriesOf(v);
  const isArray = kind === "array";
  if (depth >= 2) {
    out.push({ text: isArray ? `Array(${entries.length})` : entries.length ? "{…}" : "{}", cls: tokenClass.punct });
    return;
  }
  seen.add(v as object);
  out.push({ text: isArray ? "[" : "{ ", cls: tokenClass.punct });
  entries.slice(0, 20).forEach(([k, x], i) => {
    if (i) out.push({ text: ", ", cls: tokenClass.punct });
    if (!isArray) {
      out.push({ text: IDENT.test(String(k)) ? String(k) : JSON.stringify(k), cls: tokenClass.key });
      out.push({ text: ": ", cls: tokenClass.punct });
    }
    inlineTokens(x, depth + 1, seen, out);
  });
  if (entries.length > 20) out.push({ text: ", …", cls: tokenClass.punct });
  out.push({ text: isArray ? "]" : " }", cls: tokenClass.punct });
  seen.delete(v as object);
}

export interface JsonInlineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: unknown;
  /** Max characters before truncating with "…". Default 80. */
  maxLength?: number;
}

/** One-line syntax-colored JSON preview: `{ id: 1, name: "x", tags: Array(3) }`. */
export const JsonInline = React.forwardRef<HTMLSpanElement, JsonInlineProps>(({ className, value, maxLength = 80, ...props }, ref) => {
  const toks: Tok[] = [];
  inlineTokens(value, 0, new Set(), toks);
  let used = 0;
  const shown: Tok[] = [];
  let truncated = false;
  for (const t of toks) {
    if (used + t.text.length > maxLength) {
      const room = Math.max(0, maxLength - used);
      if (room) shown.push({ text: t.text.slice(0, room), cls: t.cls });
      truncated = true;
      break;
    }
    shown.push(t);
    used += t.text.length;
  }
  const full = toks.map((t) => t.text).join("");
  return (
    <span ref={ref} className={cn("inline-block max-w-full truncate align-bottom font-mono text-xs", className)} title={truncated ? full : undefined} {...props}>
      {shown.map((t, i) => (
        <span key={i} className={t.cls}>
          {t.text}
        </span>
      ))}
      {truncated ? <span className={tokenClass.punct}>…</span> : null}
    </span>
  );
});
JsonInline.displayName = "JsonInline";
