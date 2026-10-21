/** Log model: levels and their detection from text, the ANSI parser and its class names, and the entry and status types. */
import { cn } from "../lib/cn";

export type LogLevel = "error" | "warn" | "info" | "debug" | "http" | "other";

export const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "http", "debug", "other"];

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


export type LogViewerStatus = "idle" | "connecting" | "live" | "disconnected" | "error";
