import * as React from "react";
import {
  RiArrowDownSLine,
  RiBookmarkFill,
  RiBookmarkLine,
  RiCalendarLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiGitBranchLine,
  RiInformationLine,
  RiRefreshLine,
  RiSparkling2Fill,
  RiStackLine,
  RiStopCircleLine,
  RiThumbDownFill,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbUpLine,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { formatClockTime, formatDayLabel, toMs, type TimeInput } from "../lib/time";
import { Button } from "./button";
import { TextShimmer } from "./text-shimmer";
import { InlineAlert, InlineAlertActions } from "./inline-alert";
import { AgentStatusLine } from "./tool-timeline";

function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/* ------------------------------------------------------------------ */
/* TurnStickyHeader / TranscriptTurn                                   */
/* ------------------------------------------------------------------ */

export interface TurnStickyHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  /** The user's prompt for this turn. */
  prompt: React.ReactNode;
  /** Id of the element marking the start of the turn; clicking scrolls it into view. */
  targetId?: string;
  /** 1-based turn number for the screen-reader heading. */
  index?: number;
  /** Level of the visually hidden heading. Default 2. */
  headingLevel?: 2 | 3 | 4;
  onJump?: () => void;
}

/** User prompt pinned at the top of the scroll area while its turn scrolls; click to jump to the turn start. */
export const TurnStickyHeader = React.forwardRef<HTMLDivElement, TurnStickyHeaderProps>(
  ({ prompt, targetId, index, headingLevel = 2, onJump, className, ...props }, ref) => {
    const Heading = `h${headingLevel}` as "h2";
    const plain = textOf(prompt);
    return (
      <div
        ref={ref}
        data-slot="turn-sticky-header"
        className={cn("sticky top-0 z-10 -mx-1 bg-background/90 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/75", className)}
        {...props}
      >
        <Heading className="sr-only">
          {index != null ? `Turn ${index}: ` : "Turn: "}
          {plain}
        </Heading>
        <button
          type="button"
          onClick={() => {
            if (targetId) document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "smooth" });
            onJump?.();
          }}
          className={cn(
            "w-full rounded-control border border-border bg-card px-3 py-1.5 text-left text-sm text-foreground shadow-xs transition-colors hover:bg-accent",
            focusRing
          )}
        >
          <span aria-hidden className="line-clamp-2">
            {prompt}
          </span>
          <span className="sr-only">Scroll to start of turn</span>
        </button>
      </div>
    );
  }
);
TurnStickyHeader.displayName = "TurnStickyHeader";

export interface TranscriptTurnProps extends Omit<React.HTMLAttributes<HTMLElement>, "id"> {
  /** Unique id; the turn start anchor gets `${id}-start`. */
  id: string;
  prompt: React.ReactNode;
  index?: number;
  headingLevel?: 2 | 3 | 4;
}

/** A turn section whose sticky header stays pinned only while the turn is in view. */
export const TranscriptTurn = React.forwardRef<HTMLElement, TranscriptTurnProps>(
  ({ id, prompt, index, headingLevel, className, children, ...props }, ref) => (
    <section ref={ref} id={id} data-slot="transcript-turn" className={cn("relative", className)} {...props}>
      <span id={`${id}-start`} aria-hidden className="block h-0" />
      <TurnStickyHeader prompt={prompt} targetId={`${id}-start`} index={index} headingLevel={headingLevel} />
      <div className="flex flex-col gap-3 pt-2">{children}</div>
    </section>
  )
);
TranscriptTurn.displayName = "TranscriptTurn";

/* ------------------------------------------------------------------ */
/* DividerPill / TranscriptSystemRow                                   */
/* ------------------------------------------------------------------ */

export interface DividerPillProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  /** Trailing action inside the pill, e.g. a "Restore" link. */
  action?: React.ReactNode;
}

/** Horizontal rule with a centered pill, e.g. "Teleported from web" or a checkpoint marker. */
export const DividerPill = React.forwardRef<HTMLDivElement, DividerPillProps>(
  ({ icon, action, className, children, ...props }, ref) => (
    <div ref={ref} data-slot="divider-pill" className={cn("flex items-center gap-3 py-1", className)} {...props}>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="inline-flex max-w-[80%] items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground shadow-xs [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        <span className="truncate">{children}</span>
        {action}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
);
DividerPill.displayName = "DividerPill";

export type TranscriptSystemRowKind = "compaction" | "compacting" | "interrupted" | "command" | "error" | "divider" | "date";

export interface TranscriptSystemRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  kind: TranscriptSystemRowKind;
  /** Overrides the default label for the kind. */
  title?: React.ReactNode;
  /** compaction: the summary revealed by "Show summary". */
  summary?: React.ReactNode;
  defaultExpanded?: boolean;
  /** command: slash command name, e.g. "/review". */
  command?: string;
  args?: string;
  /** command: output shown under the command. */
  result?: React.ReactNode;
  /** error: details. */
  error?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** date: the day to show. */
  date?: TimeInput;
  now?: number;
  icon?: React.ReactNode;
  /** divider: trailing action in the pill. */
  action?: React.ReactNode;
}

/** "Today", "Yesterday" or "Mon, Oct 12". */
export function formatTranscriptDay(value: TimeInput, now: number = Date.now()) {
  return formatDayLabel(toMs(value) ?? now, { now, weekdayWithinWeek: false, tomorrow: false, weekday: true });
}

/** System rows in a transcript: compaction, interruption, slash commands, errors, dividers and day changes. */
export const TranscriptSystemRow = React.forwardRef<HTMLDivElement, TranscriptSystemRowProps>(
  (
    {
      kind,
      title,
      summary,
      defaultExpanded = false,
      command,
      args,
      result,
      error,
      onRetry,
      retryLabel = "Retry",
      date,
      now,
      icon,
      action,
      className,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const summaryId = React.useId();
    const base = "flex w-full text-xs text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0";

    if (kind === "divider") {
      return (
        <DividerPill ref={ref} data-kind={kind} icon={icon} action={action} className={className} {...props}>
          {title}
        </DividerPill>
      );
    }

    if (kind === "date") {
      const label = title ?? formatTranscriptDay(date ?? now ?? Date.now(), now);
      return (
        <div ref={ref} data-kind={kind} className={cn("flex items-center gap-3 py-1", className)} {...props}>
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="inline-flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            {icon ?? <RiCalendarLine aria-hidden className="size-3" />}
            {label}
          </span>
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>
      );
    }

    if (kind === "compacting") {
      return (
        <div ref={ref} role="status" data-kind={kind} className={cn(base, "items-center gap-2 py-1", className)} {...props}>
          {icon ?? <RiStackLine aria-hidden />}
          <TextShimmer>{title ?? "Compacting conversation…"}</TextShimmer>
        </div>
      );
    }

    if (kind === "compaction") {
      return (
        <div ref={ref} data-kind={kind} className={cn(base, "flex-col gap-1.5 py-1", className)} {...props}>
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-px flex-1 bg-border" />
            {icon ?? <RiStackLine aria-hidden />}
            <span className="font-medium">{title ?? "Conversation compacted"}</span>
            {summary != null && (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={summaryId}
                onClick={() => setExpanded(!expanded)}
                className={cn("inline-flex items-center gap-0.5 rounded-xs text-primary hover:underline", focusRing)}
              >
                {expanded ? "Hide summary" : "Show summary"}
                <RiArrowDownSLine aria-hidden className={cn("transition-transform", expanded && "rotate-180")} />
              </button>
            )}
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
          {summary != null && expanded && (
            <div id={summaryId} className="rounded-control border border-border bg-subtle px-3 py-2 text-sm text-foreground">
              {summary}
            </div>
          )}
        </div>
      );
    }

    if (kind === "interrupted") {
      return (
        <div ref={ref} data-kind={kind} className={cn(base, "items-center gap-1.5 py-0.5", className)} {...props}>
          {icon ?? <RiStopCircleLine aria-hidden className="text-warning" />}
          <span>{title ?? "Interrupted by user"}</span>
        </div>
      );
    }

    if (kind === "command") {
      return (
        <div ref={ref} data-kind={kind} className={cn(base, "flex-col gap-1 py-0.5", className)} {...props}>
          <div className="flex items-center gap-2">
            <code className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {command}
              {args ? <span className="text-muted-foreground"> {args}</span> : null}
            </code>
            {title && <span>{title}</span>}
          </div>
          {result != null && (
            <div className="ml-2 border-l-2 border-border pl-3 text-sm text-muted-foreground">{result}</div>
          )}
        </div>
      );
    }

    // error
    return (
      <div
        ref={ref}
        role="alert"
        data-kind={kind}
        className={cn(
          "flex w-full items-start gap-2 rounded-control border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground",
          className
        )}
        {...props}
      >
        {icon ?? <RiErrorWarningLine aria-hidden className="mt-0.5 size-4 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title ?? "Something went wrong"}</p>
          {error != null && <div className="mt-0.5 break-words text-xs opacity-90">{error}</div>}
        </div>
        {onRetry && (
          <Button variant="outline" size="xs" leadingIcon={<RiRefreshLine aria-hidden />} onClick={onRetry} className="shrink-0">
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }
);
TranscriptSystemRow.displayName = "TranscriptSystemRow";

/* ------------------------------------------------------------------ */
/* Bookmarks                                                           */
/* ------------------------------------------------------------------ */

export interface BookmarkButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  size?: "xs" | "sm";
}

/** Toggle that bookmarks a message. */
export const BookmarkButton = React.forwardRef<HTMLButtonElement, BookmarkButtonProps>(
  ({ pressed: pressedProp, defaultPressed = false, onPressedChange, size = "xs", className, onClick, ...props }, ref) => {
    const [pressed, setPressed] = useControllableState({ value: pressedProp, defaultValue: defaultPressed, onChange: onPressedChange });
    return (
      <Button
        ref={ref}
        variant="ghost"
        size={size === "xs" ? "icon-xs" : "icon-sm"}
        aria-pressed={pressed}
        aria-label={pressed ? "Remove bookmark" : "Bookmark message"}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) setPressed(!pressed);
        }}
        className={cn(pressed && "text-primary", className)}
        {...props}
      >
        {pressed ? <RiBookmarkFill aria-hidden /> : <RiBookmarkLine aria-hidden />}
      </Button>
    );
  }
);
BookmarkButton.displayName = "BookmarkButton";

export interface TranscriptBookmark {
  /** Message id; also the DOM id jumped to when `onJump` is not given. */
  id: string;
  snippet: string;
  time?: TimeInput;
  /** e.g. "You" / "Assistant". */
  author?: string;
}

/** Bookmark state helper: list, membership and toggle. */
export function useTranscriptBookmarks(initial: TranscriptBookmark[] = []) {
  const [bookmarks, setBookmarks] = React.useState<TranscriptBookmark[]>(initial);
  const isBookmarked = React.useCallback((id: string) => bookmarks.some((b) => b.id === id), [bookmarks]);
  const toggle = React.useCallback(
    (entry: TranscriptBookmark) =>
      setBookmarks((list) => (list.some((b) => b.id === entry.id) ? list.filter((b) => b.id !== entry.id) : [...list, entry])),
    []
  );
  const remove = React.useCallback((id: string) => setBookmarks((list) => list.filter((b) => b.id !== id)), []);
  return { bookmarks, setBookmarks, isBookmarked, toggle, remove };
}

function formatBookmarkTime(t: number | undefined) {
  return formatClockTime(t, { invalid: "" });
}

export interface BookmarksPaneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  bookmarks: TranscriptBookmark[];
  /** Default "Bookmarks". */
  title?: React.ReactNode;
  /** Called on click; when omitted the element with the bookmark's id is scrolled into view. */
  onJump?: (id: string) => void;
  onRemove?: (id: string) => void;
  onClose?: () => void;
  /** Shown when there is nothing to list. Default "Bookmark a message to find it here". */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
}

/** Pane listing bookmarked messages; click jumps to the message. */
export const BookmarksPane = React.forwardRef<HTMLDivElement, BookmarksPaneProps>(
  (
    { bookmarks, title = "Bookmarks", onJump, onRemove, onClose, emptyState, emptyText, className, ...props },
    ref
  ) => {
    const titleId = React.useId();
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        className={cn("flex w-full flex-col rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <RiBookmarkLine aria-hidden className="size-4 text-muted-foreground" />
          <h3 id={titleId} className="text-sm font-medium text-foreground">
            {title}
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">{bookmarks.length}</span>
          {onClose && (
            <Button variant="ghost" size="icon-xs" aria-label="Close bookmarks" onClick={onClose} className="ml-auto">
              <RiCloseLine aria-hidden />
            </Button>
          )}
        </div>
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <RiBookmarkLine aria-hidden className="size-6 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">{emptyState ?? emptyText ?? "Bookmark a message to find it here"}</p>
          </div>
        ) : (
          <ul className="flex flex-col p-1">
            {bookmarks.map((b) => (
              <li key={b.id} className="group/bm flex items-start gap-1 rounded-control hover:bg-accent">
                <button
                  type="button"
                  onClick={() => {
                    if (onJump) onJump(b.id);
                    else document.getElementById(b.id)?.scrollIntoView({ block: "center", behavior: "smooth" });
                  }}
                  className={cn("min-w-0 flex-1 rounded-control px-2 py-1.5 text-left", focusRing)}
                >
                  <span className="line-clamp-2 text-sm text-foreground">{b.snippet}</span>
                  <span className="mt-0.5 block text-2xs text-muted-foreground">
                    {[b.author, formatBookmarkTime(toMs(b.time))].filter(Boolean).join(" · ")}
                  </span>
                </button>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove bookmark: ${b.snippet.slice(0, 40)}`}
                    onClick={() => onRemove(b.id)}
                    className="mr-1 mt-1"
                  >
                    <RiCloseLine aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
BookmarksPane.displayName = "BookmarksPane";

/* ------------------------------------------------------------------ */
/* SpinnerVerbs                                                        */
/* ------------------------------------------------------------------ */

/** Default verbs for `SpinnerVerbs`. */
export const defaultSpinnerVerbs = [
  "Pondering",
  "Reticulating",
  "Percolating",
  "Noodling",
  "Synthesizing",
  "Tinkering",
  "Mulling",
  "Brewing",
  "Untangling",
  "Wrangling",
];

export interface SpinnerVerbsProps extends React.HTMLAttributes<HTMLDivElement> {
  verbs?: string[];
  /** Default "random". */
  order?: "random" | "sequential";
  /** Ms between verbs. Default 3000. */
  interval?: number;
  /** Shows elapsed time when set. */
  startedAt?: TimeInput;
  tokens?: number;
  /** Optional hint after the stats, e.g. "esc to interrupt". */
  hint?: React.ReactNode;
  /** Accessible status label. Default "Working". */
  label?: string;
  icon?: React.ReactNode;
}

/**
 * Loader that rotates through whimsical verbs with a shimmer, elapsed time and token count.
 * @deprecated Use `<AgentStatusLine state="thinking" verbs={…} layout="inline" tokensPrefix="↓" />`; this is now a preset of it.
 */
export const SpinnerVerbs = React.forwardRef<HTMLDivElement, SpinnerVerbsProps>(
  (
    {
      verbs = defaultSpinnerVerbs,
      order = "random",
      interval = 3000,
      startedAt,
      tokens,
      hint,
      label = "Working",
      icon,
      children: _children,
      ...props
    },
    ref
  ) => (
    <AgentStatusLine
      ref={ref}
      state="thinking"
      layout="inline"
      verbs={verbs.length ? verbs : defaultSpinnerVerbs}
      verbOrder={order}
      verbInterval={interval}
      label={label}
      aria-label={label}
      startedAt={startedAt}
      showElapsed={toMs(startedAt) != null}
      tokens={tokens}
      tokensPrefix="↓"
      hint={hint}
      icon={icon ?? <RiSparkling2Fill aria-hidden className="animate-pulse motion-reduce:animate-none" />}
      {...props}
    />
  )
);
SpinnerVerbs.displayName = "SpinnerVerbs";

/* ------------------------------------------------------------------ */
/* ContextBanner                                                       */
/* ------------------------------------------------------------------ */

export interface ContextBannerAction {
  label: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

export interface ContextBannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: "info" | "warning";
  icon?: React.ReactNode;
  /** Name rendered as a mono pill after the message (worktree, branch…). */
  name?: string;
  nameIcon?: React.ReactNode;
  action?: ContextBannerAction;
  /** Command output revealed by a "Show output" toggle. */
  output?: string;
  outputLabel?: string;
  defaultExpanded?: boolean;
  onDismiss?: () => void;
}

/** Banner with an icon, message, name pill, action and optional expandable command output (a compact `InlineAlert`). */
export const ContextBanner = React.forwardRef<HTMLDivElement, ContextBannerProps>(
  (
    {
      variant = "info",
      icon,
      name,
      nameIcon = <RiGitBranchLine aria-hidden />,
      action,
      output,
      outputLabel = "output",
      defaultExpanded = false,
      onDismiss,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const outputId = React.useId();
    const warning = variant === "warning";
    return (
      <InlineAlert
        ref={ref}
        tone={warning ? "warning" : "neutral"}
        icon={icon ?? (warning ? <RiErrorWarningLine aria-hidden /> : <RiInformationLine aria-hidden />)}
        onDismiss={onDismiss}
        data-variant={variant}
        className={cn("items-center gap-2 px-3 py-2 [&>[data-slot=inline-alert-icon]_svg]:size-4", className)}
        {...props}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0">{children}</span>
          {name && (
            <span
              data-slot="context-banner-name"
              className={cn(
                "inline-flex max-w-60 items-center gap-1 rounded-control border px-1.5 py-px font-mono text-xs [&_svg]:size-3 [&_svg]:shrink-0",
                warning ? "border-warning/40 bg-background/50" : "border-border bg-background"
              )}
            >
              {nameIcon}
              <span className="truncate">{name}</span>
            </span>
          )}
          {(output || action) && (
            <InlineAlertActions className="ml-auto mt-0 gap-1">
              {output && (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={outputId}
                  onClick={() => setExpanded(!expanded)}
                  className={cn("inline-flex items-center gap-0.5 rounded-xs text-xs font-medium underline-offset-2 hover:underline", focusRing)}
                >
                  {expanded ? `Hide ${outputLabel}` : `Show ${outputLabel}`}
                  <RiArrowDownSLine aria-hidden className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
                </button>
              )}
              {action && (
                <Button variant={warning ? "outline" : "secondary"} size="xs" loading={action.loading} onClick={action.onClick}>
                  {action.label}
                </Button>
              )}
            </InlineAlertActions>
          )}
        </div>
        {output && expanded && (
          <pre
            id={outputId}
            tabIndex={0}
            aria-label="Command output"
            className={cn(
              "mt-1 max-h-48 overflow-auto rounded-xs border border-code-border bg-code px-3 py-2 font-mono text-xs leading-relaxed text-code-foreground scrollbar-thin",
              focusRing
            )}
          >
            <code>{output}</code>
          </pre>
        )}
      </InlineAlert>
    );
  }
);
ContextBanner.displayName = "ContextBanner";

/* ------------------------------------------------------------------ */
/* ResponseRating                                                      */
/* ------------------------------------------------------------------ */

export type ResponseRatingValue = "good" | "bad";

export interface ResponseRatingSubmit {
  rating: ResponseRatingValue;
  reasons: string[];
}

export interface ResponseRatingProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  /** Prompt beside the thumbs. Default "How did this go?". */
  prompt?: React.ReactNode;
  /** Reason chips after a bad rating. Empty to submit immediately. */
  badReasons?: string[];
  /** Reason chips after a good rating. Empty (default) to submit immediately. */
  goodReasons?: string[];
  onRate?: (rating: ResponseRatingValue) => void;
  onSubmit?: (feedback: ResponseRatingSubmit) => void;
  thanksText?: React.ReactNode;
}

const defaultBadReasons = ["Incorrect", "Didn't follow instructions", "Too slow", "Too verbose", "Broke something"];

/** Good / Bad rating with optional follow-up reason chips and a thank-you state. */
export const ResponseRating = React.forwardRef<HTMLDivElement, ResponseRatingProps>(
  (
    {
      prompt = "How did this go?",
      badReasons = defaultBadReasons,
      goodReasons = [],
      onRate,
      onSubmit,
      thanksText = "Thanks for the feedback",
      className,
      ...props
    },
    ref
  ) => {
    const [rating, setRating] = React.useState<ResponseRatingValue | null>(null);
    const [reasons, setReasons] = React.useState<string[]>([]);
    const [done, setDone] = React.useState(false);
    const groupId = React.useId();
    const submit = (r: ResponseRatingValue, picked: string[]) => {
      onSubmit?.({ rating: r, reasons: picked });
      setDone(true);
    };
    const rate = (r: ResponseRatingValue) => {
      setRating(r);
      setReasons([]);
      onRate?.(r);
      const chips = r === "good" ? goodReasons : badReasons;
      if (!chips.length) submit(r, []);
    };
    if (done) {
      return (
        <div ref={ref} role="status" className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)} {...props}>
          {rating === "good" ? <RiThumbUpFill aria-hidden className="size-3.5" /> : <RiThumbDownFill aria-hidden className="size-3.5" />}
          {thanksText}
        </div>
      );
    }
    const chips = rating === "good" ? goodReasons : rating === "bad" ? badReasons : [];
    return (
      <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
        <div role="group" aria-labelledby={groupId} className="flex items-center gap-1">
          <span id={groupId} className="mr-1 text-xs text-muted-foreground">
            {prompt}
          </span>
          <Button variant="ghost" size="icon-xs" aria-label="Good response" aria-pressed={rating === "good"} onClick={() => rate("good")}>
            {rating === "good" ? <RiThumbUpFill aria-hidden /> : <RiThumbUpLine aria-hidden />}
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Bad response" aria-pressed={rating === "bad"} onClick={() => rate("bad")}>
            {rating === "bad" ? <RiThumbDownFill aria-hidden /> : <RiThumbDownLine aria-hidden />}
          </Button>
        </div>
        {rating && chips.length > 0 && (
          <div className="flex flex-col gap-2 rounded-control border border-border bg-card p-2.5">
            <p className="text-xs font-medium text-foreground">{rating === "bad" ? "What went wrong?" : "What went well?"}</p>
            <div role="group" aria-label="Reasons" className="flex flex-wrap gap-1.5">
              {chips.map((c) => {
                const on = reasons.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setReasons(on ? reasons.filter((x) => x !== c) : [...reasons, c])}
                    className={cn(
                      "h-7 rounded-control border px-2.5 text-xs transition-colors",
                      on ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-background text-foreground hover:bg-accent",
                      focusRing
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-1.5">
              <Button variant="ghost" size="xs" onClick={() => submit(rating, [])}>
                Skip
              </Button>
              <Button variant="primary" size="xs" onClick={() => submit(rating, reasons)}>
                Submit
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
ResponseRating.displayName = "ResponseRating";
