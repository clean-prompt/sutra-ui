import * as React from "react";
import {
  RiArrowDownLine,
  RiCheckLine,
  RiDownloadLine,
  RiFileCopyLine,
  RiListOrdered,
  RiPauseLine,
  RiPlayLine,
  RiTextWrap,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useCopy } from "../hooks/use-copy";
import { useControllableState } from "../hooks/use-controllable-state";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { SearchInput } from "./input";
import { SimpleSelect } from "./select";
import { Spinner } from "./spinner";
import { useStickToBottom } from "./chat-conversation";

/* ------------------------------------------------------------------ */
/* Levels                                                              */
/* ------------------------------------------------------------------ */

export type LogLevel = "error" | "warn" | "info" | "debug" | "http" | "other";

export const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "http", "debug", "other"];

const levelLabel: Record<LogLevel, string> = {
  error: "Error",
  warn: "Warn",
  info: "Info",
  http: "HTTP",
  debug: "Debug",
  other: "Other",
};

/* Tokens, lifted toward white so they read on the always-dark code surface. */
const levelText: Record<LogLevel, string> = {
  error: "text-[color-mix(in_oklab,var(--color-destructive),white_30%)]",
  warn: "text-[color-mix(in_oklab,var(--color-warning),white_15%)]",
  info: "text-[color-mix(in_oklab,var(--color-info),white_35%)]",
  http: "text-[color-mix(in_oklab,var(--color-success),white_30%)]",
  debug: "text-code-muted",
  other: "text-code-foreground",
};

const levelRow: Record<LogLevel, string> = {
  error: "bg-destructive/10",
  warn: "bg-warning/[0.07]",
  info: "",
  http: "",
  debug: "",
  other: "",
};

const levelDot: Record<LogLevel, string> = {
  error: "bg-destructive",
  warn: "bg-warning",
  info: "bg-info",
  http: "bg-success",
  debug: "bg-muted-foreground",
  other: "bg-border-strong",
};

const HTTP_LINE = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)\s+\S+[^\n]*?(?:"\s+|\s)([1-5]\d\d)\b/;
const ERROR_RE = /\b(error|err|fatal|critical|crit|panic|emerg|exception)\b|Traceback \(most recent call last\)|\b\w+(Error|Exception):/i;
const WARN_RE = /\b(warn|warning|deprecated)\b/i;
const INFO_RE = /\b(info|notice)\b/i;
const DEBUG_RE = /\b(debug|trace|verbose|dbg)\b/i;

/**
 * Guess a log line's level from its text. Explicit severities win, then HTTP access lines
 * (5xx → error, 4xx → warn, else http), then info/debug keywords; otherwise `"other"`.
 */
export function detectLogLevel(line: string): LogLevel {
  const text = stripAnsi(line);
  if (ERROR_RE.test(text)) return "error";
  if (WARN_RE.test(text)) return "warn";
  const http = HTTP_LINE.exec(text);
  if (http) {
    const status = Number(http[2]);
    return status >= 500 ? "error" : status >= 400 ? "warn" : "http";
  }
  if (INFO_RE.test(text)) return "info";
  if (DEBUG_RE.test(text)) return "debug";
  return "other";
}

function normalizeLevel(level: string | undefined, text: string): LogLevel {
  if (!level) return detectLogLevel(text);
  const l = level.toLowerCase();
  if (l === "warning") return "warn";
  if (l === "err" || l === "fatal" || l === "critical") return "error";
  if (l === "trace" || l === "verbose") return "debug";
  if ((LOG_LEVELS as string[]).includes(l)) return l as LogLevel;
  return detectLogLevel(text);
}

/* ------------------------------------------------------------------ */
/* ANSI                                                                */
/* ------------------------------------------------------------------ */

export type AnsiColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "bright-black"
  | "bright-red"
  | "bright-green"
  | "bright-yellow"
  | "bright-blue"
  | "bright-magenta"
  | "bright-cyan"
  | "bright-white";

export interface AnsiSegment {
  text: string;
  fg?: AnsiColor;
  bg?: AnsiColor;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

const BASE_COLORS = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"] as const;
const colorAt = (i: number): AnsiColor =>
  (i < 8 ? BASE_COLORS[i] : `bright-${BASE_COLORS[i - 8]}`) as AnsiColor;

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[([0-9;?]*)([A-Za-z])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

/** Remove ANSI escape sequences. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, "");
}

/** Split text with ANSI SGR codes into styled segments (basic 16 colors, bold/dim/italic/underline). */
export function parseAnsi(text: string): AnsiSegment[] {
  const out: AnsiSegment[] = [];
  let style: Omit<AnsiSegment, "text"> = {};
  let last = 0;
  const push = (chunk: string) => {
    if (!chunk) return;
    const prev = out[out.length - 1];
    const seg: AnsiSegment = { text: chunk };
    for (const [k, v] of Object.entries(style)) if (v) (seg as unknown as Record<string, unknown>)[k] = v;
    if (prev && sameStyle(prev, seg)) prev.text += chunk;
    else out.push(seg);
  };
  ANSI_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANSI_RE.exec(text))) {
    push(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[2] !== "m") continue;
    const codes = (m[1] || "0").split(";").map((c) => (c === "" ? 0 : Number(c)));
    style = { ...style };
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      if (c === 0) style = {};
      else if (c === 1) style.bold = true;
      else if (c === 2) style.dim = true;
      else if (c === 3) style.italic = true;
      else if (c === 4) style.underline = true;
      else if (c === 22) {
        delete style.bold;
        delete style.dim;
      } else if (c === 23) delete style.italic;
      else if (c === 24) delete style.underline;
      else if (c >= 30 && c <= 37) style.fg = colorAt(c - 30);
      else if (c >= 90 && c <= 97) style.fg = colorAt(c - 90 + 8);
      else if (c === 39) delete style.fg;
      else if (c >= 40 && c <= 47) style.bg = colorAt(c - 40);
      else if (c >= 100 && c <= 107) style.bg = colorAt(c - 100 + 8);
      else if (c === 49) delete style.bg;
      else if (c === 38 || c === 48) {
        const key = c === 38 ? "fg" : "bg";
        if (codes[i + 1] === 5) {
          const n = codes[i + 2];
          if (n !== undefined && n < 16) style[key] = colorAt(n);
          i += 2;
        } else if (codes[i + 1] === 2) i += 4;
      }
    }
  }
  push(text.slice(last));
  return out;
}

function sameStyle(a: AnsiSegment, b: AnsiSegment) {
  return (
    a.fg === b.fg && a.bg === b.bg && !a.bold === !b.bold && !a.dim === !b.dim && !a.italic === !b.italic && !a.underline === !b.underline
  );
}

const ansiFg: Record<AnsiColor, string> = {
  black: "text-zinc-500",
  red: "text-red-400",
  green: "text-green-400",
  yellow: "text-yellow-300",
  blue: "text-blue-400",
  magenta: "text-fuchsia-400",
  cyan: "text-cyan-400",
  white: "text-zinc-200",
  "bright-black": "text-zinc-400",
  "bright-red": "text-red-300",
  "bright-green": "text-green-300",
  "bright-yellow": "text-yellow-200",
  "bright-blue": "text-blue-300",
  "bright-magenta": "text-fuchsia-300",
  "bright-cyan": "text-cyan-300",
  "bright-white": "text-white",
};

const ansiBg: Record<AnsiColor, string> = {
  black: "bg-zinc-900",
  red: "bg-red-500/30",
  green: "bg-green-500/30",
  yellow: "bg-yellow-500/30",
  blue: "bg-blue-500/30",
  magenta: "bg-fuchsia-500/30",
  cyan: "bg-cyan-500/30",
  white: "bg-zinc-300/30",
  "bright-black": "bg-zinc-700",
  "bright-red": "bg-red-400/40",
  "bright-green": "bg-green-400/40",
  "bright-yellow": "bg-yellow-400/40",
  "bright-blue": "bg-blue-400/40",
  "bright-magenta": "bg-fuchsia-400/40",
  "bright-cyan": "bg-cyan-400/40",
  "bright-white": "bg-white/40",
};

/** Tailwind classes for a parsed ANSI segment (colors tuned for dark code surfaces). */
export function ansiSegmentClassName(s: AnsiSegment) {
  return cn(
    s.fg && ansiFg[s.fg],
    s.bg && ansiBg[s.bg],
    s.bold && "font-semibold",
    s.dim && "opacity-60",
    s.italic && "italic",
    s.underline && "underline"
  );
}

/* ------------------------------------------------------------------ */
/* Virtual rows                                                        */
/* ------------------------------------------------------------------ */

export interface UseVirtualRowsOptions {
  count: number;
  /** Fixed row height in px. */
  rowHeight: number;
  /** The scrolling element. */
  scrollElement: HTMLElement | null;
  /** Extra rows rendered above and below the viewport. Default 12. */
  overscan?: number;
  /** When false, every row is rendered. Default true. */
  enabled?: boolean;
  /** Viewport height assumed before the element has been measured. Default 480. */
  fallbackHeight?: number;
}

export interface VirtualRows {
  start: number;
  end: number;
  /** Height of the full list in px. */
  totalHeight: number;
  /** Offset in px of the first rendered row. */
  offset: number;
}

/** Fixed-height windowing: which rows of a long list are inside (or near) the viewport. */
export function useVirtualRows({
  count,
  rowHeight,
  scrollElement,
  overscan = 12,
  enabled = true,
  fallbackHeight = 480,
}: UseVirtualRowsOptions): VirtualRows {
  const [view, setView] = React.useState({ top: 0, height: 0 });
  React.useEffect(() => {
    if (!scrollElement || !enabled) return;
    let frame = 0;
    const update = () => {
      setView((v) =>
        v.top === scrollElement.scrollTop && v.height === scrollElement.clientHeight
          ? v
          : { top: scrollElement.scrollTop, height: scrollElement.clientHeight }
      );
    };
    const onScroll = () => {
      if (typeof requestAnimationFrame === "undefined") return update();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    scrollElement.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(scrollElement);
    return () => {
      if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(frame);
      scrollElement.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [scrollElement, enabled]);

  const totalHeight = count * rowHeight;
  if (!enabled) return { start: 0, end: count, totalHeight, offset: 0 };
  const viewport = view.height || fallbackHeight;
  const maxTop = Math.max(0, totalHeight - viewport);
  const top = Math.min(view.top, maxTop);
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((top + viewport) / rowHeight) + overscan);
  return { start, end, totalHeight, offset: start * rowHeight };
}

/* ------------------------------------------------------------------ */
/* Entries                                                             */
/* ------------------------------------------------------------------ */

export interface LogEntry {
  id?: string | number;
  /** Timestamp: a preformatted string, epoch ms or a Date. */
  ts?: string | number | Date;
  /** Level; detected from the message when omitted. */
  level?: LogLevel | string;
  source?: string;
  message: string;
}

export type LogLine = string | LogEntry;

interface NormalizedEntry {
  seq: number;
  key: string;
  ts?: string;
  level: LogLevel;
  source?: string;
  message: string;
  plain: string;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function formatTs(ts: LogEntry["ts"]): string | undefined {
  if (ts == null || ts === "") return undefined;
  if (typeof ts === "string") return ts;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function normalize(line: LogLine, seq: number): NormalizedEntry {
  if (typeof line === "string") {
    const plain = stripAnsi(line);
    return { seq, key: `s${seq}`, level: detectLogLevel(plain), message: line, plain };
  }
  const message = line.message ?? "";
  const plain = stripAnsi(message);
  return {
    seq,
    key: line.id != null ? `i${line.id}` : `s${seq}`,
    ts: formatTs(line.ts),
    level: normalizeLevel(line.level, plain),
    source: line.source,
    message,
    plain,
  };
}

/** Diff the incoming array against the last one so appends keep their sequence numbers. */
function useLogBuffer(raw: readonly LogLine[], maxLines: number) {
  const store = React.useRef<{ raw: readonly LogLine[] | null; entries: NormalizedEntry[]; seq: number; max: number }>({
    raw: null,
    entries: [],
    seq: 0,
    max: maxLines,
  });
  return React.useMemo(() => {
    const s = store.current;
    if (s.raw === raw && s.max === maxLines) return s.entries;
    const prev = s.raw;
    let appended: readonly LogLine[];
    let base = s.entries;
    if (!prev || prev.length === 0 || raw.length === 0) {
      base = [];
      appended = raw;
    } else {
      const lastPrev = prev[prev.length - 1];
      const idx =
        raw.length >= prev.length && raw[prev.length - 1] === lastPrev ? prev.length - 1 : raw.lastIndexOf(lastPrev);
      if (idx < 0) {
        base = [];
        appended = raw;
      } else appended = raw.slice(idx + 1);
    }
    const tail = appended.length > maxLines ? appended.slice(appended.length - maxLines) : appended;
    if (appended.length > tail.length) s.seq += appended.length - tail.length;
    const next = tail.map((line) => normalize(line, ++s.seq));
    let entries = next.length || base !== s.entries ? base.concat(next) : base;
    if (entries.length > maxLines) entries = entries.slice(entries.length - maxLines);
    s.raw = raw;
    s.max = maxLines;
    s.entries = entries;
    return entries;
  }, [raw, maxLines]);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(query: string, regex: boolean): { re: RegExp | null; invalid: boolean } {
  if (!query) return { re: null, invalid: false };
  try {
    return { re: new RegExp(regex ? query : escapeRegExp(query), "gi"), invalid: false };
  } catch {
    return { re: null, invalid: true };
  }
}

function matchRanges(text: string, re: RegExp): [number, number][] {
  const ranges: [number, number][] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function renderMessage(message: string, ranges: [number, number][]) {
  const segments = parseAnsi(message);
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let r = 0;
  let k = 0;
  for (const seg of segments) {
    const cls = ansiSegmentClassName(seg);
    const segEnd = pos + seg.text.length;
    let cursor = pos;
    while (cursor < segEnd) {
      while (r < ranges.length && ranges[r][1] <= cursor) r++;
      const range = ranges[r];
      if (range && range[0] <= cursor) {
        const stop = Math.min(range[1], segEnd);
        nodes.push(
          <mark key={k++} className={cn("rounded-[2px] bg-warning/40 text-inherit", cls)}>
            {seg.text.slice(cursor - pos, stop - pos)}
          </mark>
        );
        cursor = stop;
      } else {
        const stop = range ? Math.min(range[0], segEnd) : segEnd;
        const text = seg.text.slice(cursor - pos, stop - pos);
        nodes.push(cls ? (
          <span key={k++} className={cls}>
            {text}
          </span>
        ) : (
          text
        ));
        cursor = stop;
      }
    }
    pos = segEnd;
  }
  return nodes;
}

/* ------------------------------------------------------------------ */
/* LogViewer                                                           */
/* ------------------------------------------------------------------ */

export type LogViewerStatus = "idle" | "connecting" | "live" | "disconnected" | "error";

export interface LogSourceOption {
  value: string;
  label?: React.ReactNode;
}

export interface LogViewerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Log lines: raw strings (ANSI allowed) or structured entries. Append to the same array or pass a new one. */
  lines?: readonly LogLine[];
  /** Alias of `lines`. */
  entries?: readonly LogLine[];
  /** Ring-buffer cap on retained lines. Default 10 000. */
  maxLines?: number;
  /** Connection state, drives the empty state and a status chip. */
  status?: LogViewerStatus;
  /** Height of the scrolling area. Default 360. */
  height?: number | string;
  /** Row height in px used for virtualization. Default 20. */
  rowHeight?: number;
  /** Virtualize when more than this many lines are shown and wrapping is off. Default 200. */
  virtualizeThreshold?: number;
  showTimestamps?: boolean;
  defaultShowTimestamps?: boolean;
  onShowTimestampsChange?: (value: boolean) => void;
  showLineNumbers?: boolean;
  defaultShowLineNumbers?: boolean;
  onShowLineNumbersChange?: (value: boolean) => void;
  wrap?: boolean;
  defaultWrap?: boolean;
  onWrapChange?: (value: boolean) => void;
  paused?: boolean;
  defaultPaused?: boolean;
  onPausedChange?: (value: boolean) => void;
  filter?: string;
  defaultFilter?: string;
  onFilterChange?: (value: string) => void;
  /** Treat the filter as a regular expression. */
  regex?: boolean;
  defaultRegex?: boolean;
  onRegexChange?: (value: boolean) => void;
  /** Levels currently shown. Default all. */
  levels?: LogLevel[];
  defaultLevels?: LogLevel[];
  onLevelsChange?: (levels: LogLevel[]) => void;
  /** Source picker options (e.g. services or models). The picker reports changes via `onSourceChange`. */
  sources?: (string | LogSourceOption)[];
  source?: string;
  defaultSource?: string;
  onSourceChange?: (source: string) => void;
  /** Also hide entries whose `source` differs from the selected one (client-side). Default false. */
  filterBySource?: boolean;
  /** File name for "Download". Default `logs.log`. */
  downloadName?: string;
  /** Hide the toolbar (search, level filters, actions). */
  hideToolbar?: boolean;
  /** Extra toolbar content, rendered before the action buttons. */
  toolbarExtra?: React.ReactNode;
  /** Called by the "Reconnect" button shown while disconnected. */
  onReconnect?: () => void;
  emptyMessage?: React.ReactNode;
  "aria-label"?: string;
}

function ToolbarToggle({
  pressed,
  onPressedChange,
  label,
  children,
}: {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn("text-muted-foreground", pressed && "bg-accent text-foreground")}
    >
      {children}
    </Button>
  );
}

const statusChip: Record<LogViewerStatus, { label: string; dot: string }> = {
  idle: { label: "Idle", dot: "bg-muted-foreground" },
  connecting: { label: "Connecting", dot: "bg-warning animate-pulse" },
  live: { label: "Live", dot: "bg-success animate-pulse" },
  disconnected: { label: "Disconnected", dot: "bg-muted-foreground" },
  error: { label: "Error", dot: "bg-destructive" },
};

/** Live log tail on the dark code surface: level colors, ANSI, filters, pause buffer, virtualized rows. */
export const LogViewer = React.forwardRef<HTMLDivElement, LogViewerProps>(
  (
    {
      lines,
      entries: entriesProp,
      maxLines = 10_000,
      status,
      height = 360,
      rowHeight = 20,
      virtualizeThreshold = 200,
      showTimestamps: showTimestampsProp,
      defaultShowTimestamps = true,
      onShowTimestampsChange,
      showLineNumbers: showLineNumbersProp,
      defaultShowLineNumbers = false,
      onShowLineNumbersChange,
      wrap: wrapProp,
      defaultWrap = false,
      onWrapChange,
      paused: pausedProp,
      defaultPaused = false,
      onPausedChange,
      filter: filterProp,
      defaultFilter = "",
      onFilterChange,
      regex: regexProp,
      defaultRegex = false,
      onRegexChange,
      levels: levelsProp,
      defaultLevels = LOG_LEVELS,
      onLevelsChange,
      sources,
      source: sourceProp,
      defaultSource,
      onSourceChange,
      filterBySource: filterBySourceProp = false,
      downloadName = "logs.log",
      hideToolbar,
      toolbarExtra,
      onReconnect,
      emptyMessage = "No log lines yet",
      className,
      "aria-label": ariaLabel = "Logs",
      ...props
    },
    ref
  ) => {
    const raw = lines ?? entriesProp ?? EMPTY;
    const buffer = useLogBuffer(raw, Math.max(1, maxLines));

    const [showTs, setShowTs] = useControllableState({
      value: showTimestampsProp,
      defaultValue: defaultShowTimestamps,
      onChange: onShowTimestampsChange,
    });
    const [showNums, setShowNums] = useControllableState({
      value: showLineNumbersProp,
      defaultValue: defaultShowLineNumbers,
      onChange: onShowLineNumbersChange,
    });
    const [wrap, setWrap] = useControllableState({ value: wrapProp, defaultValue: defaultWrap, onChange: onWrapChange });
    const [paused, setPausedState] = useControllableState({
      value: pausedProp,
      defaultValue: defaultPaused,
      onChange: onPausedChange,
    });
    const [filter, setFilter] = useControllableState({
      value: filterProp,
      defaultValue: defaultFilter,
      onChange: onFilterChange,
    });
    const [regex, setRegex] = useControllableState({ value: regexProp, defaultValue: defaultRegex, onChange: onRegexChange });
    const [levels, setLevels] = useControllableState<LogLevel[]>({
      value: levelsProp,
      defaultValue: defaultLevels,
      onChange: onLevelsChange,
    });
    const sourceOptions = React.useMemo(
      () => (sources ?? []).map((s) => (typeof s === "string" ? { value: s, label: s } : { value: s.value, label: s.label ?? s.value })),
      [sources]
    );
    const [source, setSource] = useControllableState({
      value: sourceProp,
      defaultValue: defaultSource ?? sourceOptions[0]?.value ?? "",
      onChange: onSourceChange,
    });

    const lastSeq = buffer.length ? buffer[buffer.length - 1].seq : 0;
    const [pausedAt, setPausedAt] = React.useState<number | null>(paused ? lastSeq : null);
    React.useEffect(() => {
      if (paused && pausedAt === null) setPausedAt(lastSeq);
      if (!paused && pausedAt !== null) setPausedAt(null);
    }, [paused, pausedAt, lastSeq]);
    const freezeAt = paused ? (pausedAt ?? lastSeq) : null;
    const pendingCount = freezeAt === null ? 0 : buffer.filter((e) => e.seq > freezeAt).length;

    const shown = React.useMemo(
      () => (freezeAt === null ? buffer : buffer.filter((e) => e.seq <= freezeAt)),
      [buffer, freezeAt]
    );

    const { re, invalid } = React.useMemo(() => buildMatcher(filter ?? "", !!regex), [filter, regex]);
    const levelSet = React.useMemo(() => new Set(levels), [levels]);
    const filterBySource = filterBySourceProp && !!source;

    const counts = React.useMemo(() => {
      const c: Record<LogLevel, number> = { error: 0, warn: 0, info: 0, http: 0, debug: 0, other: 0 };
      for (const e of shown) if (!filterBySource || !e.source || e.source === source) c[e.level]++;
      return c;
    }, [shown, filterBySource, source]);

    const visible = React.useMemo(
      () =>
        shown.filter((e) => {
          if (!levelSet.has(e.level)) return false;
          if (filterBySource && e.source && e.source !== source) return false;
          if (re) {
            re.lastIndex = 0;
            if (!re.test(e.plain)) return false;
          }
          return true;
        }),
      [shown, levelSet, filterBySource, source, re]
    );

    const hasTs = showTs && visible.some((e) => e.ts);
    const hasSource = visible.some((e) => e.source) && !filterBySource;
    const gutter = String(visible.length ? visible[visible.length - 1].seq : 0).length;

    const stick = useStickToBottom({ resize: "instant", threshold: rowHeight * 2 });
    const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null);
    const scrollRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        stick.scrollRef(node);
        setScrollEl(node);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [stick.scrollRef]
    );

    const virtual = useVirtualRows({
      count: visible.length,
      rowHeight,
      scrollElement: scrollEl,
      enabled: !wrap && visible.length > virtualizeThreshold,
    });
    const isVirtual = !wrap && visible.length > virtualizeThreshold;
    const rows = visible.slice(virtual.start, virtual.end);

    const { copied, copy } = useCopy();
    const asText = React.useCallback(
      () =>
        visible
          .map((e) => [e.ts, e.source ? `[${e.source}]` : null, e.plain].filter(Boolean).join(" "))
          .join("\n"),
      [visible]
    );
    const download = () => {
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
      const url = URL.createObjectURL(new Blob([asText() + "\n"], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    const setPaused = (v: boolean) => setPausedState(v);
    const resume = () => {
      setPaused(false);
      if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => stick.scrollToBottom("instant"));
    };

    const toggleLevel = (level: LogLevel, on: boolean) => {
      const next = on ? LOG_LEVELS.filter((l) => l === level || levelSet.has(l)) : levels.filter((l) => l !== level);
      setLevels(next);
    };
    const levelOptions = LOG_LEVELS.filter((l) => l !== "other" || counts.other > 0 || !levelSet.has("other"));

    const filtering = !!re || levels.length < LOG_LEVELS.length;
    const chip = status ? statusChip[status] : null;

    let empty: React.ReactNode = null;
    if (visible.length === 0) {
      if (shown.length > 0 && filtering) empty = "No lines match the current filters";
      else if (status === "connecting")
        empty = (
          <span className="inline-flex items-center gap-2">
            <Spinner size="xs" /> Connecting…
          </span>
        );
      else if (status === "disconnected") empty = "Disconnected";
      else if (status === "error") empty = "Log stream failed";
      else empty = emptyMessage;
    }

    return (
      <div
        ref={ref}
        className={cn("flex min-w-0 flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        {!hideToolbar && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-2.5 py-2">
            <div className="flex min-w-48 flex-1 items-center gap-1">
              <SearchInput
                size="sm"
                placeholder={regex ? "Filter (regex)…" : "Filter…"}
                aria-label="Filter log lines"
                value={filter ?? ""}
                onChange={(e) => setFilter(e.target.value)}
                onClear={() => setFilter("")}
                invalid={invalid}
                className="max-w-64"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Use regular expression"
                title="Use regular expression"
                aria-pressed={!!regex}
                onClick={() => setRegex(!regex)}
                className={cn("font-mono text-xs text-muted-foreground", regex && "bg-accent text-foreground")}
              >
                .*
              </Button>
            </div>
            <div role="group" aria-label="Levels" className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {levelOptions.map((level) => (
                <label key={level} className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-foreground">
                  <Checkbox
                    size="sm"
                    checked={levelSet.has(level)}
                    onCheckedChange={(v) => toggleLevel(level, v === true)}
                  />
                  <span aria-hidden className={cn("size-1.5 rounded-full", levelDot[level])} />
                  {levelLabel[level]}
                  <span className="tabular-nums text-muted-foreground">{counts[level]}</span>
                </label>
              ))}
            </div>
            {sourceOptions.length > 0 && (
              <SimpleSelect
                size="sm"
                aria-label="Log source"
                options={sourceOptions}
                value={source}
                onValueChange={setSource}
                className="w-40"
              />
            )}
            <div className="ml-auto flex items-center gap-0.5">
              {toolbarExtra}
              {chip && (
                <span className="mr-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                  <span aria-hidden className={cn("size-1.5 rounded-full", chip.dot)} />
                  {chip.label}
                </span>
              )}
              <ToolbarToggle pressed={!!showTs} onPressedChange={setShowTs} label="Show timestamps">
                <RiTimeLine />
              </ToolbarToggle>
              <ToolbarToggle pressed={!!showNums} onPressedChange={setShowNums} label="Show line numbers">
                <RiListOrdered />
              </ToolbarToggle>
              <ToolbarToggle pressed={!!wrap} onPressedChange={setWrap} label="Wrap lines">
                <RiTextWrap />
              </ToolbarToggle>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={paused ? "Resume" : "Pause"}
                title={paused ? "Resume" : "Pause"}
                onClick={() => (paused ? resume() : setPaused(true))}
                className="text-muted-foreground"
              >
                {paused ? <RiPlayLine /> : <RiPauseLine />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={copied ? "Copied" : "Copy visible lines"}
                title={copied ? "Copied" : "Copy visible lines"}
                onClick={() => void copy(asText())}
                className="text-muted-foreground"
              >
                {copied ? <RiCheckLine /> : <RiFileCopyLine />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Download as .log"
                title="Download as .log"
                onClick={download}
                className="text-muted-foreground"
              >
                <RiDownloadLine />
              </Button>
            </div>
          </div>
        )}
        <div className="relative min-h-0 flex-1 bg-code text-code-foreground [color-scheme:dark]">
          <div
            ref={scrollRef}
            role="log"
            aria-live="off"
            aria-label={ariaLabel}
            tabIndex={0}
            data-virtual={isVirtual ? "" : undefined}
            className={cn("scrollbar-thin overflow-auto py-2 font-mono text-xs", focusRing)}
            style={{ height }}
          >
            {empty ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-code-muted">{empty}</div>
            ) : (
              <div
                ref={stick.contentRef}
                className={cn("relative", !wrap && "min-w-max")}
                style={isVirtual ? { height: virtual.totalHeight } : undefined}
              >
                <div style={isVirtual ? { transform: `translateY(${virtual.offset}px)` } : undefined}>
                  {rows.map((e) => {
                    const ranges = re ? matchRanges(e.plain, re) : [];
                    return (
                      <div
                        key={e.key + ":" + e.seq}
                        data-level={e.level}
                        data-log-row=""
                        className={cn(
                          "flex gap-3 px-3 leading-5 hover:bg-code-foreground/[0.04]",
                          levelRow[e.level],
                          wrap ? "items-start" : "items-center whitespace-pre"
                        )}
                        style={wrap ? { minHeight: rowHeight } : { height: rowHeight }}
                      >
                        {showNums && (
                          <span
                            aria-hidden
                            className="shrink-0 select-none text-right tabular-nums text-code-muted/70"
                            style={{ width: `${gutter}ch` }}
                          >
                            {e.seq}
                          </span>
                        )}
                        {hasTs && <span className="shrink-0 tabular-nums text-code-muted">{e.ts ?? ""}</span>}
                        {hasSource && e.source && <span className="shrink-0 text-code-muted">[{e.source}]</span>}
                        <span
                          className={cn(
                            "min-w-0",
                            levelText[e.level],
                            wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                          )}
                        >
                          {e.message ? renderMessage(e.message, ranges) : " "}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {status === "disconnected" && visible.length > 0 && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-code/90 py-1 text-xs text-code-muted">
              Disconnected
              {onReconnect && (
                <button
                  type="button"
                  onClick={onReconnect}
                  className={cn("rounded-control px-1.5 text-code-foreground underline underline-offset-2", focusRing)}
                >
                  Reconnect
                </button>
              )}
            </div>
          )}
          {status === "disconnected" && visible.length === 0 && onReconnect && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <Button size="xs" variant="secondary" onClick={onReconnect}>
                Reconnect
              </Button>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {paused && pendingCount > 0 && (
              <button
                type="button"
                onClick={resume}
                className={cn(
                  "pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-lg animate-in fade-in-0 slide-in-from-bottom-2",
                  focusRing
                )}
              >
                <RiPlayLine className="size-3.5" aria-hidden />
                {pendingCount} new {pendingCount === 1 ? "line" : "lines"}
              </button>
            )}
            {!stick.isAtBottom && !(paused && pendingCount > 0) && visible.length > 0 && (
              <button
                type="button"
                aria-label="Jump to bottom"
                onClick={() => stick.scrollToBottom("instant")}
                className={cn(
                  "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-code-border bg-code text-code-foreground shadow-lg hover:bg-code-foreground/10 animate-in fade-in-0",
                  focusRing
                )}
              >
                <RiArrowDownLine className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
LogViewer.displayName = "LogViewer";

const EMPTY: readonly LogLine[] = [];
