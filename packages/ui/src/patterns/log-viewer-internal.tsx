/** Private helpers shared by the log viewer modules: level styles, entry normalization, the append-aware buffer, search matching and message rendering, the toolbar toggle and status chip. */
import * as React from "react";
import { cn } from "../lib/cn";
import { escapeRegExp } from "../lib/text";
import { pad2, toValidDate } from "../lib/time";
import { Button } from "../primitives/button";
import {
  LOG_LEVELS,
  ansiSegmentClassName,
  detectLogLevel,
  parseAnsi,
  stripAnsi,
  type LogEntry,
  type LogLevel,
  type LogLine,
  type LogViewerStatus,
} from "./log-viewer-model";

export const levelLabel: Record<LogLevel, string> = {
  error: "Error",
  warn: "Warn",
  info: "Info",
  http: "HTTP",
  debug: "Debug",
  other: "Other",
};

/* Tokens, lifted toward white so they read on the always-dark code surface. */
export const levelText: Record<LogLevel, string> = {
  error: "text-[color-mix(in_oklab,var(--color-destructive),white_30%)]",
  warn: "text-[color-mix(in_oklab,var(--color-warning),white_15%)]",
  info: "text-[color-mix(in_oklab,var(--color-info),white_35%)]",
  http: "text-[color-mix(in_oklab,var(--color-success),white_30%)]",
  debug: "text-code-muted",
  other: "text-code-foreground",
};

export const levelRow: Record<LogLevel, string> = {
  error: "bg-destructive/10",
  warn: "bg-warning/[0.07]",
  info: "",
  http: "",
  debug: "",
  other: "",
};

export const levelDot: Record<LogLevel, string> = {
  error: "bg-destructive",
  warn: "bg-warning",
  info: "bg-info",
  http: "bg-success",
  debug: "bg-muted-foreground",
  other: "bg-border-strong",
};

export function normalizeLevel(level: string | undefined, text: string): LogLevel {
  if (!level) return detectLogLevel(text);
  const l = level.toLowerCase();
  if (l === "warning") return "warn";
  if (l === "err" || l === "fatal" || l === "critical") return "error";
  if (l === "trace" || l === "verbose") return "debug";
  if ((LOG_LEVELS as string[]).includes(l)) return l as LogLevel;
  return detectLogLevel(text);
}

export interface NormalizedEntry {
  seq: number;
  key: string;
  ts?: string;
  level: LogLevel;
  source?: string;
  message: string;
  plain: string;
}

function formatTs(ts: LogEntry["ts"]): string | undefined {
  if (ts == null || ts === "") return undefined;
  if (typeof ts === "string") return ts;
  const d = toValidDate(ts);
  if (!d) return undefined;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

export function normalize(line: LogLine, seq: number): NormalizedEntry {
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

/**
 * How many leading items of `raw` are the (possibly front-trimmed) tail of `prev`: the longest suffix of
 * `prev` that `raw` starts with. -1 when `raw` doesn't continue `prev` at all. Matching the whole overlap,
 * not just the last line, keeps repeated lines ("tick", heartbeats) that were appended after a trim.
 */
function keptPrefix(prev: readonly LogLine[], raw: readonly LogLine[]): number {
  for (let dropped = 0; dropped < prev.length; dropped++) {
    const overlap = prev.length - dropped;
    if (overlap > raw.length) continue;
    let i = 0;
    while (i < overlap && raw[i] === prev[dropped + i]) i++;
    if (i === overlap) return overlap;
  }
  return -1;
}

/** Diff the incoming array against the last one so appends keep their sequence numbers. */
export function useLogBuffer(raw: readonly LogLine[], maxLines: number) {
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
      const kept = keptPrefix(prev, raw);
      if (kept < 0) {
        base = [];
        appended = raw;
      } else appended = raw.slice(kept);
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


export function buildMatcher(query: string, regex: boolean): { re: RegExp | null; invalid: boolean } {
  if (!query) return { re: null, invalid: false };
  try {
    return { re: new RegExp(regex ? query : escapeRegExp(query), "gi"), invalid: false };
  } catch {
    return { re: null, invalid: true };
  }
}

export function matchRanges(text: string, re: RegExp): [number, number][] {
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

export function renderMessage(message: string, ranges: [number, number][]) {
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

export function ToolbarToggle({
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

export const statusChip: Record<LogViewerStatus, { label: string; dot: string }> = {
  idle: { label: "Idle", dot: "bg-muted-foreground" },
  connecting: { label: "Connecting", dot: "bg-warning animate-pulse" },
  live: { label: "Live", dot: "bg-success animate-pulse" },
  disconnected: { label: "Disconnected", dot: "bg-muted-foreground" },
  error: { label: "Error", dot: "bg-destructive" },
};

/** Live log tail on the dark code surface: level colors, ANSI, filters, pause buffer, virtualized rows. */
