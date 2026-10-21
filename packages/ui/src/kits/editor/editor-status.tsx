import * as React from "react";
import {
  RiCheckLine,
  RiErrorWarningLine,
  RiGitMergeLine,
  RiLoader4Line,
  RiPencilLine,
  RiRefreshLine,
} from "@remixicon/react";
import { cn } from "../../lib/cn";
import { pluralize } from "../../lib/format";
import { formatRelative, toValidDate } from "../../lib/time";
import { useChangeKey } from "../../hooks/use-change-key";
import { useNow } from "../../hooks/use-now";
import { Button } from "../../primitives/button";
import { SimpleTooltip } from "../../primitives/tooltip";

/* ------------------------------------------------------------------ */
/* Text statistics                                                     */
/* ------------------------------------------------------------------ */

/** Han, Hiragana, Katakana (and CJK compatibility) characters: each counts as one word. */
const CJK_CHAR = /[⺀-⿟々〇〡-〩぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ\u{20000}-\u{2fa1f}]/gu;
const WORD = /[\p{L}\p{N}\p{M}]+(?:['’.\-][\p{L}\p{N}\p{M}]+)*/gu;

/**
 * Word count that understands CJK: every Chinese/Japanese character is one word, while
 * space-separated scripts (Latin, Cyrillic, Korean Hangul…) count runs of letters and digits.
 * Markdown punctuation (`#`, `*`, `>`…) is ignored.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const cjk = text.match(CJK_CHAR)?.length ?? 0;
  const rest = text.replace(CJK_CHAR, " ").match(WORD)?.length ?? 0;
  return cjk + rest;
}

export interface TextStatsOptions {
  /** Reading speed for space-separated words. Default 230. */
  wordsPerMinute?: number;
  /** Reading speed for CJK characters. Default 500. */
  cjkCharsPerMinute?: number;
  /** Words per printed page for the page estimate. Default 500. */
  wordsPerPage?: number;
}

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  /** Whole minutes, at least 1 for non-empty text. */
  readingMinutes: number;
  /** Estimated printed pages (at least 1 for non-empty text). */
  pages: number;
}

/** Words, characters, reading time and page estimate for a text. */
export function getTextStats(text: string, options: TextStatsOptions = {}): TextStats {
  const { wordsPerMinute = 230, cjkCharsPerMinute = 500, wordsPerPage = 500 } = options;
  const cjk = text.match(CJK_CHAR)?.length ?? 0;
  const latin = text.replace(CJK_CHAR, " ").match(WORD)?.length ?? 0;
  const words = cjk + latin;
  const chars = Array.from(text);
  const minutes = latin / wordsPerMinute + cjk / cjkCharsPerMinute;
  return {
    words,
    characters: chars.length,
    charactersNoSpaces: chars.filter((c) => !/\s/.test(c)).length,
    readingMinutes: words ? Math.max(1, Math.round(minutes)) : 0,
    pages: words ? Math.max(1, Math.ceil(words / wordsPerPage)) : 0,
  };
}

/** Compact "Saved …" label: "Saved just now", "Saved 2m ago", "Saved 3h ago", "Saved yesterday", "Saved Mar 3". */
export function formatSavedAgo(value: Date | number | string, now: Date | number = Date.now()) {
  // Whole days are floored, so anything under 48 hours reads "yesterday".
  return `Saved ${formatRelative(value, { now, yesterday: true, maxRelativeDays: 1, round: { day: "floor" } })}`;
}

const nf = new Intl.NumberFormat();

/* ------------------------------------------------------------------ */
/* SaveStatus                                                          */
/* ------------------------------------------------------------------ */

export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

export interface SaveStatusProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Save state (`saved`, `dirty`, `saving`, `error` or `conflict`); sets the icon, label and tone. */
  status: SaveState;
  /** Last successful save; renders "Saved 2m ago" (refreshed every 30 s). */
  savedAt?: Date | number | string;
  /** Reference time (tests / SSR); disables the refresh timer. */
  now?: Date | number;
  /** Error detail shown in the tooltip. */
  error?: React.ReactNode;
  /** Shows a Retry button in the error state. */
  onRetry?: () => void;
  /** Conflict: overwrite the server copy with this one. */
  onKeepMine?: () => void;
  /** Conflict: load the other copy. */
  onLoadTheirs?: () => void;
  /** Conflict: open a resolver (e.g. `ConflictResolver`). */
  onResolve?: () => void;
  /** Override the default labels. */
  labels?: Partial<Record<SaveState, string>>;
  /** Text and icon size. */
  size?: "sm" | "md";
}

const defaultLabels: Record<SaveState, string> = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn’t save",
  conflict: "Edit conflict",
};

/** Autosave indicator: saved (with relative time), unsaved, saving, error with retry, conflict with actions. */
export const SaveStatus = React.forwardRef<HTMLDivElement, SaveStatusProps>(
  (
    { status, savedAt, now, error, onRetry, onKeepMine, onLoadTheirs, onResolve, labels, size = "sm", className, ...props },
    ref
  ) => {
    const tick = useNow({ active: now == null && savedAt != null && status === "saved", interval: 30_000 });

    const text = { ...defaultLabels, ...labels };
    const relative = status === "saved" && savedAt != null && !labels?.saved;
    const label = relative ? formatSavedAgo(savedAt, now ?? tick) : text[status];
    const savedTitle = savedAt != null ? toValidDate(savedAt)?.toLocaleString() : undefined;
    const btn = size === "sm" ? "xs" : "sm";

    // The icon pops in when the status changes, never on the first render. The spinner keeps its own animation.
    const changes = useChangeKey(status);
    const pop = changes > 0 && "animate-pop";
    const icon = {
      saved: <RiCheckLine key={changes} aria-hidden className={cn("size-3.5 text-success", pop)} />,
      dirty: <RiPencilLine key={changes} aria-hidden className={cn("size-3.5", pop)} />,
      saving: <RiLoader4Line aria-hidden className="size-3.5 animate-spin" />,
      error: <RiErrorWarningLine key={changes} aria-hidden className={cn("size-3.5", pop)} />,
      conflict: <RiGitMergeLine key={changes} aria-hidden className={cn("size-3.5", pop)} />,
    }[status];

    const body = (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap transition-colors",
          status === "error" && "text-destructive",
          status === "conflict" && "text-warning-soft-foreground"
        )}
        title={status === "saved" ? savedTitle : undefined}
      >
        {icon}
        {/* The relative time ticks; keep it out of the live region so it isn't re-announced every 30 s. */}
        <span aria-hidden={relative || undefined}>{label}</span>
        {relative && <span className="sr-only">{text.saved}</span>}
      </span>
    );

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-slot="save-status"
        data-status={status}
        className={cn(
          "inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground",
          size === "sm" ? "text-xs" : "text-sm",
          className
        )}
        {...props}
      >
        {status === "error" && error ? <SimpleTooltip content={error}>{body}</SimpleTooltip> : body}
        {status === "error" && onRetry && (
          <Button size={btn} variant="ghost" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry}>
            Retry
          </Button>
        )}
        {status === "conflict" && (
          <span className="inline-flex items-center gap-1">
            {onKeepMine && (
              <Button size={btn} variant="outline" onClick={onKeepMine}>
                Keep mine
              </Button>
            )}
            {onLoadTheirs && (
              <Button size={btn} variant="ghost" onClick={onLoadTheirs}>
                Load theirs
              </Button>
            )}
            {onResolve && (
              <Button size={btn} variant="soft" onClick={onResolve}>
                Resolve…
              </Button>
            )}
          </span>
        )}
      </div>
    );
  }
);
SaveStatus.displayName = "SaveStatus";

/* ------------------------------------------------------------------ */
/* EditorStatusBar                                                     */
/* ------------------------------------------------------------------ */

export type EditorModeTone = "live" | "offline" | "neutral" | "warning";

export interface EditorStatusBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Left: usually a `SaveStatus`. */
  status?: React.ReactNode;
  /** Left, after the status: e.g. `PresenceAvatars` or `TypingIndicator`. */
  presence?: React.ReactNode;
  /** Document text; word/character counts, reading time and pages are derived from it. */
  text?: string;
  /** Explicit word count (overrides `text`). */
  words?: number;
  /** Explicit character count (overrides `text`). */
  characters?: number;
  /** Options for counting words and reading time (reading speeds, CJK handling). */
  statsOptions?: TextStatsOptions;
  /** Shows the word count. Default true. */
  showWords?: boolean;
  /** Shows the character count. Default true. */
  showCharacters?: boolean;
  /** Shows the estimated reading time. Default true. */
  showReadingTime?: boolean;
  /** Shows the estimated page count. Default true. */
  showPages?: boolean;
  /** 1-based cursor position. */
  cursor?: { line: number; column: number };
  /** Selection length, shown as "(N selected)" after the cursor. */
  selectionLength?: number;
  /** Mode chip, e.g. "Live" or "Offline". */
  mode?: React.ReactNode;
  /** Colour of the mode chip: `live`, `offline`, `neutral` or `warning`. */
  modeTone?: EditorModeTone;
}

const modeDot: Record<EditorModeTone, string> = {
  live: "bg-success",
  offline: "bg-muted-foreground",
  neutral: "bg-primary",
  warning: "bg-warning",
};

function StatusItem({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="whitespace-nowrap tabular-nums" title={title}>
      {children}
    </span>
  );
}

/** Editor footer: save status and presence on the left; counts, reading time, cursor and mode on the right. */
export const EditorStatusBar = React.forwardRef<HTMLDivElement, EditorStatusBarProps>(
  (
    {
      status,
      presence,
      text,
      words: wordsProp,
      characters: charsProp,
      statsOptions,
      showWords = true,
      showCharacters = true,
      showReadingTime = true,
      showPages = true,
      cursor,
      selectionLength,
      mode,
      modeTone = "neutral",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const deferred = React.useDeferredValue(text);
    const stats = React.useMemo(
      () => (deferred != null ? getTextStats(deferred, statsOptions) : null),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [deferred, statsOptions?.wordsPerMinute, statsOptions?.wordsPerPage, statsOptions?.cjkCharsPerMinute]
    );
    const words = wordsProp ?? stats?.words;
    const chars = charsProp ?? stats?.characters;

    const items: React.ReactNode[] = [];
    if (showWords && words != null)
      items.push(<StatusItem key="w">{`${nf.format(words)} ${pluralize(words, "word")}`}</StatusItem>);
    if (showCharacters && chars != null)
      items.push(
        <StatusItem key="c" title={stats ? `${nf.format(stats.charactersNoSpaces)} without spaces` : undefined}>
          {`${nf.format(chars)} ${pluralize(chars, "character")}`}
        </StatusItem>
      );
    if (showReadingTime && stats && stats.words > 0)
      items.push(<StatusItem key="r">{`${stats.readingMinutes} min read`}</StatusItem>);
    if (showPages && stats && stats.pages > 0)
      items.push(
        <StatusItem key="p" title="Estimated printed pages">{`~${stats.pages} ${pluralize(stats.pages, "page")}`}</StatusItem>
      );
    if (cursor)
      items.push(
        <StatusItem key="cur">
          {`Ln ${cursor.line}, Col ${cursor.column}`}
          {selectionLength ? ` (${nf.format(selectionLength)} selected)` : ""}
        </StatusItem>
      );

    return (
      <div
        ref={ref}
        role="group"
        aria-label="Editor status"
        data-slot="editor-status-bar"
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-subtle px-3 py-1 text-xs text-muted-foreground",
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-1">
          {status}
          {presence}
        </div>
        <div className="ms-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span aria-hidden className="text-border-strong">
                  ·
                </span>
              )}
              {item}
            </React.Fragment>
          ))}
          {children}
          {mode != null && (
            <span
              data-slot="editor-mode"
              data-tone={modeTone}
              className="ms-1 inline-flex items-center gap-1.5 rounded-control border border-border bg-background px-2 py-0.5 font-medium text-foreground"
            >
              <span aria-hidden className={cn("size-1.5 rounded-full", modeDot[modeTone], modeTone === "live" && "animate-pulse")} />
              {mode}
            </span>
          )}
        </div>
      </div>
    );
  }
);
EditorStatusBar.displayName = "EditorStatusBar";
