import * as React from "react";
import {
  RiChat3Line,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiEmotionLine,
  RiMoreLine,
  RiPencilLine,
  RiReplyLine,
  RiArrowGoBackLine,
} from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density, hitArea } from "../lib/cn";
import { useControllableState } from "../hooks/use-controllable-state";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Textarea } from "../primitives/textarea";
import { Markdown } from "./markdown";
import { EmptyState } from "../primitives/empty-state";
import { SegmentedControl } from "../primitives/segmented-control";
import { formatRelativeTime } from "../lib/relative-time";
import { safeISO, toValidDate } from "../lib/time";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../primitives/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CommentAuthor {
  id: string;
  name: string;
  avatarSrc?: string;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  /** The current user reacted. */
  reacted?: boolean;
}

export interface CommentData {
  id: string;
  author: CommentAuthor;
  /** Markdown. */
  body: string;
  createdAt: Date | number | string;
  editedAt?: Date | number | string;
  reactions?: CommentReaction[];
}

export interface CommentThreadData {
  id: string;
  /** The excerpt of the document this thread is anchored to. */
  quote?: string;
  comments: CommentData[];
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: Date | number | string;
}

/** owner: everything · editor: resolve any thread · commenter: own comments · viewer: read only. */
export type CommentRole = "owner" | "editor" | "commenter" | "viewer";

export type CommentFilter = "open" | "resolved" | "all";

export interface CommentHandlers {
  /** Called with the thread id and the reply text when a reply is submitted. */
  onReply?: (threadId: string, body: string) => void;
  /** Called with the thread id and the new resolved state when a thread is resolved or reopened. */
  onResolve?: (threadId: string, resolved: boolean) => void;
  /** Called with the thread id, comment id and new text when a comment is edited. */
  onEdit?: (threadId: string, commentId: string, body: string) => void;
  /** Called with the thread id and comment id when a comment is deleted. */
  onDelete?: (threadId: string, commentId: string) => void;
  /** Enables reactions. */
  onReact?: (threadId: string, commentId: string, emoji: string) => void;
  /** Called with the thread when the user asks to jump to its anchor in the document. */
  onFocusAnchor?: (thread: CommentThreadData) => void;
}

const defaultReactions = ["👍", "❤️", "🎉", "👀", "✅"];

/* ------------------------------------------------------------------ */
/* CommentComposer                                                     */
/* ------------------------------------------------------------------ */

export interface CommentComposerProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  /** Called with the trimmed text when the user submits (button or Enter); the field is then cleared. */
  onSubmit: (body: string) => void;
  /** Called when the user cancels (Cancel button or Escape); setting it shows the Cancel button. */
  onCancel?: () => void;
  /** Excerpt shown above the field. */
  quote?: string;
  /**
   * Placeholder of the text field.
   * @default "Add a comment…"
   */
  placeholder?: string;
  /**
   * Text of the submit button.
   * @default "Comment"
   */
  submitLabel?: string;
  /** Draft text (controlled). */
  value?: string;
  /** Initial draft text when uncontrolled. */
  defaultValue?: string;
  /** Called with the draft text as it changes. */
  onValueChange?: (value: string) => void;
  /** Focuses the field on mount. */
  autoFocus?: boolean;
  /** Accessible label of the field. Default "Comment". */
  label?: string;
  /** `compact` hides the buttons until the field is focused or has text. Default `normal`. */
  density?: Density;
  /** Legacy form of `density="compact"`. @deprecated Use `density="compact"`. */
  compact?: boolean;
}

/** Comment input: Markdown text, ⌘/Ctrl+Enter to send, Escape to cancel. */
export const CommentComposer = React.forwardRef<HTMLFormElement, CommentComposerProps>(
  (
    {
      onSubmit,
      onCancel,
      quote,
      placeholder = "Add a comment…",
      submitLabel = "Comment",
      value: valueProp,
      defaultValue = "",
      onValueChange,
      autoFocus,
      label = "Comment",
      density,
      compact: compactProp,
      className,
      ...props
    },
    ref
  ) => {
    const compact = normalizeDensity(density ?? compactProp) === "compact";
    const [value, setValue] = useControllableState({ value: valueProp, defaultValue, onChange: onValueChange });
    const [focused, setFocused] = React.useState(false);
    const submit = () => {
      const body = value.trim();
      if (!body) return;
      onSubmit(body);
      setValue("");
    };
    const expanded = !compact || focused || value.length > 0;
    return (
      <form
        ref={ref}
        data-slot="comment-composer"
        className={cn("flex flex-col gap-2", className)}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        {...props}
      >
        {quote && (
          <blockquote className="line-clamp-3 border-s-2 border-warning ps-2 text-xs italic text-muted-foreground">{quote}</blockquote>
        )}
        <Textarea
          autoResize
          minRows={expanded ? 2 : 1}
          maxRows={8}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && onCancel) {
              e.preventDefault();
              onCancel();
            }
          }}
          className="text-sm"
        />
        {expanded && (
          <div className="flex items-center justify-end gap-2">
            {onCancel && (
              <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" size="xs" variant="primary" disabled={!value.trim()}>
              {submitLabel}
            </Button>
          </div>
        )}
      </form>
    );
  }
);
CommentComposer.displayName = "CommentComposer";

/* ------------------------------------------------------------------ */
/* CommentThread                                                       */
/* ------------------------------------------------------------------ */

export interface CommentThreadProps extends Omit<React.HTMLAttributes<HTMLElement>, "onReset">, CommentHandlers {
  /** The thread to render: its comments, resolved state and optional anchor quote. */
  thread: CommentThreadData;
  /** Id of the current user; their comments get edit and delete actions. */
  currentUserId?: string;
  /** What the current user may do: `owner` and `editor` resolve any thread, `commenter` resolves their own and replies, `viewer` can only read. */
  role?: CommentRole;
  /** Highlight (e.g. the thread whose anchor holds the cursor). */
  active?: boolean;
  /** Emoji offered in the reaction picker (needs `onReact`). */
  reactionOptions?: string[];
  /** Reference time for relative timestamps. */
  now?: Date | number;
}

function CommentItem({
  comment,
  thread,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onReact,
  reactionOptions,
  now,
}: {
  comment: CommentData;
  thread: CommentThreadData;
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: CommentHandlers["onEdit"];
  onDelete?: CommentHandlers["onDelete"];
  onReact?: CommentHandlers["onReact"];
  reactionOptions: string[];
  now?: Date | number;
}) {
  const [editing, setEditing] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const showMenu = (canEdit && onEdit) || (canDelete && onDelete);
  const created = toValidDate(comment.createdAt);
  return (
    <li data-comment={comment.id} className="group/comment flex gap-2.5">
      <Avatar name={comment.author.name} src={comment.author.avatarSrc} size="xs" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{comment.author.name}</span>
          <time dateTime={safeISO(created)} title={created?.toLocaleString()} className="shrink-0 text-xs text-muted-foreground">
            {created ? formatRelativeTime(created, now ?? Date.now()) : "—"}
          </time>
          {comment.editedAt && <span className="text-xs text-muted-foreground">(edited)</span>}
          {showMenu && !editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Actions for comment by ${comment.author.name}`}
                  className="ms-auto opacity-0 focus-visible:opacity-100 group-hover/comment:opacity-100 data-[state=open]:opacity-100"
                >
                  <RiMoreLine aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                {canEdit && onEdit && (
                  <DropdownMenuItem icon={<RiPencilLine aria-hidden />} onSelect={() => setEditing(true)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <DropdownMenuItem icon={<RiDeleteBinLine aria-hidden />} tone="destructive" onSelect={() => onDelete(thread.id, comment.id)}>
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {editing ? (
          <CommentComposer
            className="mt-1"
            defaultValue={comment.body}
            submitLabel="Save"
            label="Edit comment"
            autoFocus
            onCancel={() => setEditing(false)}
            onSubmit={(body) => {
              onEdit?.(thread.id, comment.id, body);
              setEditing(false);
            }}
          />
        ) : (
          <Markdown className="mt-0.5 text-sm text-foreground/90 [&_p]:my-1">{comment.body}</Markdown>
        )}
        {onReact && !editing && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {(comment.reactions ?? [])
              .filter((r) => r.count > 0)
              .map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  aria-pressed={!!r.reacted}
                  aria-label={`${r.emoji} ${r.count}`}
                  onClick={() => onReact(thread.id, comment.id, r.emoji)}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-control border px-1.5 text-xs tabular-nums transition-colors",
                    r.reacted ? "border-primary/40 bg-primary-soft text-primary-soft-foreground" : "border-border bg-background hover:bg-accent",
                    focusRing
                  )}
                >
                  <span aria-hidden>{r.emoji}</span>
                  {r.count}
                </button>
              ))}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button size="icon-xs" variant="ghost" aria-label="Add reaction" className="size-6 text-muted-foreground">
                  <RiEmotionLine aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="flex w-auto gap-0.5 p-1" align="start">
                {reactionOptions.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-label={`React with ${e}`}
                    onClick={() => {
                      onReact(thread.id, comment.id, e);
                      setPickerOpen(false);
                    }}
                    className={cn("inline-flex size-8 items-center justify-center rounded-sm text-base hover:bg-accent", focusRing)}
                  >
                    {e}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </li>
  );
}

/** A comment thread: quoted anchor, comments (Markdown), reactions, reply box and resolve / reopen. */
export const CommentThread = React.forwardRef<HTMLElement, CommentThreadProps>(
  (
    {
      thread,
      currentUserId,
      role = "commenter",
      active,
      onReply,
      onResolve,
      onEdit,
      onDelete,
      onReact,
      onFocusAnchor,
      reactionOptions = defaultReactions,
      now,
      className,
      ...props
    },
    ref
  ) => {
    const [replying, setReplying] = React.useState(false);
    const starter = thread.comments[0];
    const mine = (c?: CommentData) => !!c && !!currentUserId && c.author.id === currentUserId;
    const canResolve = role === "owner" || role === "editor" || (role === "commenter" && mine(starter));
    const canReply = role !== "viewer";
    const label = `Comment thread${starter ? ` by ${starter.author.name}` : ""}${thread.resolved ? " (resolved)" : ""}`;

    return (
      <article
        ref={ref}
        aria-label={label}
        data-thread={thread.id}
        data-resolved={thread.resolved || undefined}
        data-active={active || undefined}
        className={cn(
          "flex flex-col gap-3 rounded-box border border-border bg-card p-3 shadow-xs transition-shadow",
          active && "border-primary/50 ring-2 ring-primary/20",
          thread.resolved && "bg-subtle/60",
          className
        )}
        {...props}
      >
        {thread.quote &&
          (onFocusAnchor ? (
            <button
              type="button"
              onClick={() => onFocusAnchor(thread)}
              title="Find in the text"
              className={cn(
                hitArea,
                "line-clamp-2 rounded-xs border-s-2 border-warning bg-warning-soft/40 py-0.5 ps-2 pe-1 text-start text-xs italic text-muted-foreground transition-colors hover:bg-warning-soft hover:text-foreground",
                focusRing
              )}
            >
              {thread.quote}
            </button>
          ) : (
            <blockquote className="line-clamp-2 border-s-2 border-warning ps-2 text-xs italic text-muted-foreground">{thread.quote}</blockquote>
          ))}
        <ul className={cn("flex flex-col gap-3", thread.resolved && "opacity-75")}>
          {thread.comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              thread={thread}
              canEdit={mine(c) && role !== "viewer"}
              canDelete={role === "owner" || (mine(c) && role !== "viewer")}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={role === "viewer" ? undefined : onReact}
              reactionOptions={reactionOptions}
              now={now}
            />
          ))}
        </ul>
        {thread.resolved && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <RiCheckboxCircleLine aria-hidden className="size-3.5" />
            {thread.resolvedBy ? `Resolved by ${thread.resolvedBy}` : "Resolved"}
          </p>
        )}
        {replying && onReply ? (
          <CommentComposer
            autoFocus
            placeholder="Reply…"
            submitLabel="Reply"
            label="Reply"
            onCancel={() => setReplying(false)}
            onSubmit={(body) => {
              onReply(thread.id, body);
              setReplying(false);
            }}
          />
        ) : (
          (canReply && onReply && !thread.resolved) || (canResolve && onResolve) ? (
            <div className="flex items-center gap-1">
              {canReply && onReply && !thread.resolved && (
                <Button size="xs" variant="ghost" leadingIcon={<RiReplyLine className="rtl:-scale-x-100" aria-hidden />} onClick={() => setReplying(true)}>
                  Reply
                </Button>
              )}
              {canResolve && onResolve && (
                <Button
                  size="xs"
                  variant="ghost"
                  className="ms-auto"
                  leadingIcon={thread.resolved ? <RiArrowGoBackLine aria-hidden /> : <RiCheckboxCircleLine aria-hidden />}
                  onClick={() => onResolve(thread.id, !thread.resolved)}
                >
                  {thread.resolved ? "Reopen" : "Resolve"}
                </Button>
              )}
            </div>
          ) : null
        )}
      </article>
    );
  }
);
CommentThread.displayName = "CommentThread";

/* ------------------------------------------------------------------ */
/* CommentsPanel                                                       */
/* ------------------------------------------------------------------ */

export interface CommentsPanelProps extends Omit<React.HTMLAttributes<HTMLElement>, "title">, CommentHandlers {
  /** Threads to list, in display order. */
  threads: CommentThreadData[];
  /** Id of the current user; their comments get edit and delete actions. */
  currentUserId?: string;
  /** What the current user may do: `owner` and `editor` resolve any thread, `commenter` resolves their own and replies, `viewer` can only read. */
  role?: CommentRole;
  /** Controlled filter: open threads, resolved threads or all. Use with `onFilterChange`. */
  filter?: CommentFilter;
  /** Initial filter when uncontrolled. */
  defaultFilter?: CommentFilter;
  /** Called with the new filter when the user switches tabs. */
  onFilterChange?: (filter: CommentFilter) => void;
  /** Current editor selection; enables "Comment on selection". */
  selection?: string | null;
  /** Creates a thread anchored to the selection. */
  onCreateThread?: (body: string, quote?: string) => void;
  /** Id of the highlighted thread (e.g. the one whose anchor holds the cursor). */
  activeThreadId?: string;
  /** Emoji offered in the reaction picker (needs `onReact`). */
  reactionOptions?: string[];
  /**
   * Panel heading.
   * @default "Comments"
   */
  title?: React.ReactNode;
  /** Header actions (e.g. a close button). */
  actions?: React.ReactNode;
  /** Reference time for relative timestamps ("5m ago"); pass it to keep renders deterministic. */
  now?: Date | number;
}

/** Side panel of comment threads anchored to quoted excerpts, with Open / Resolved / All filters and a selection composer. */
export const CommentsPanel = React.forwardRef<HTMLElement, CommentsPanelProps>(
  (
    {
      threads,
      currentUserId,
      role = "commenter",
      filter: filterProp,
      defaultFilter = "open",
      onFilterChange,
      selection,
      onCreateThread,
      activeThreadId,
      reactionOptions,
      title = "Comments",
      actions,
      now,
      onReply,
      onResolve,
      onEdit,
      onDelete,
      onReact,
      onFocusAnchor,
      className,
      ...props
    },
    ref
  ) => {
    const [filterInner, setFilterInner] = React.useState<CommentFilter>(defaultFilter);
    const filter = filterProp ?? filterInner;
    const setFilter = (f: CommentFilter) => {
      if (filterProp === undefined) setFilterInner(f);
      onFilterChange?.(f);
    };
    const [draftQuote, setDraftQuote] = React.useState<string | null>(null);
    const openCount = threads.filter((t) => !t.resolved).length;
    const resolvedCount = threads.length - openCount;
    const shown = threads.filter((t) => (filter === "all" ? true : filter === "open" ? !t.resolved : t.resolved));
    const canCreate = onCreateThread && role !== "viewer";
    const quoteFromSelection = (selection ?? "").trim().slice(0, 500);

    return (
      <aside
        ref={ref}
        aria-label={typeof title === "string" ? title : "Comments"}
        data-slot="comments-panel"
        className={cn("flex min-h-0 flex-col bg-background", className)}
        {...props}
      >
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <RiChat3Line aria-hidden className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{title}</span>
            {openCount > 0 && (
              <span className="rounded-full bg-primary-soft px-1.5 text-2xs font-medium tabular-nums text-primary-soft-foreground">
                {openCount}
              </span>
            )}
            <span className="ms-auto flex items-center gap-1">{actions}</span>
          </div>
          <SegmentedControl
            size="sm"
            fullWidth
            aria-label="Filter comments"
            value={filter}
            onValueChange={(v) => v && setFilter(v as CommentFilter)}
            options={[
              { value: "open", label: `Open${openCount ? ` (${openCount})` : ""}` },
              { value: "resolved", label: `Resolved${resolvedCount ? ` (${resolvedCount})` : ""}` },
              { value: "all", label: "All" },
            ]}
          />
          {canCreate && draftQuote == null && (
            <Button
              size="sm"
              variant={quoteFromSelection ? "primary" : "outline"}
              className="w-full"
              leadingIcon={<RiChat3Line aria-hidden />}
              onClick={() => setDraftQuote(quoteFromSelection)}
            >
              {quoteFromSelection ? "Comment on selection" : "New comment"}
            </Button>
          )}
          {canCreate && draftQuote != null && (
            <CommentComposer
              autoFocus
              quote={draftQuote || undefined}
              placeholder={draftQuote ? "Comment on the selection…" : "Tip: select text in the editor first to quote it."}
              onCancel={() => setDraftQuote(null)}
              onSubmit={(body) => {
                onCreateThread!(body, draftQuote || undefined);
                setDraftQuote(null);
              }}
              className="rounded-box border border-border bg-card p-2"
            />
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3">
          {shown.length === 0 ? (
            <EmptyState
              size="sm"
              icon={filter === "resolved" ? <RiCheckboxCircleLine aria-hidden /> : <RiChat3Line aria-hidden />}
              title={
                filter === "resolved"
                  ? "No resolved comments"
                  : filter === "open" && resolvedCount > 0
                    ? "All comments are resolved"
                    : "No comments yet"
              }
              description={filter === "resolved" ? undefined : "Select some text and comment on it."}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {shown.map((t) => (
                <CommentThread
                  key={t.id}
                  thread={t}
                  currentUserId={currentUserId}
                  role={role}
                  active={t.id === activeThreadId}
                  reactionOptions={reactionOptions}
                  now={now}
                  onReply={onReply}
                  onResolve={onResolve}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onFocusAnchor={onFocusAnchor}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  }
);
CommentsPanel.displayName = "CommentsPanel";
