import * as React from "react";
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiCloseLine,
  RiCornerDownLeftLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiMoreLine,
  RiPencilLine,
  RiQuestionAnswerLine,
  RiSteering2Line,
  RiTimeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { Button } from "../../primitives/button";
import { Spinner } from "../../primitives/spinner";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useDrag } from "../../hooks/use-drag";
import { useIsoLayoutEffect } from "../../hooks/use-iso-layout-effect";
import { useElementWidth } from "../../hooks/use-resize-observer";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { clamp } from "../../lib/math";
import { normalizeTaskStatus, type TaskStatusInput } from "../../lib/status";
import { Lightbox, useLightbox, type LightboxItem } from "../../patterns/lightbox";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { SimpleTooltip } from "../../primitives/tooltip";
import { FileFormatIcon } from "../../assets/file-format";
import { ChatAttachment } from "../ai/chat-attachment";
import { formatBytes, pluralize } from "../../lib/format";
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from "../ai/prompt-input";


const iconAction = cn(
  "inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5",
  focusRing
);

/* ------------------------------------------------------------------ */
/* QueuedMessages                                                      */
/* ------------------------------------------------------------------ */

export interface QueuedMessage {
  id: string;
  text: string;
  /** Number of attachments sent with the message (shown as a hint). */
  attachments?: number;
}

export interface QueuedMessagesProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  /** Messages waiting to be sent, in send order. */
  items: QueuedMessage[];
  /** Saves an inline edit. Editing is disabled when unset. */
  onEdit?: (id: string, text: string) => void;
  /** Called with the message id when the user removes it from the queue; the button is hidden when unset. */
  onRemove?: (id: string) => void;
  /** Interrupt the agent and send this message now. */
  onSendNow?: (id: string) => void;
  /** Inject this message into the live turn without interrupting it ("Steer"). */
  onSteer?: (id: string) => void;
  /** Tooltip for the Steer action. */
  steerHint?: React.ReactNode;
  /** Enables move up / down (buttons and Alt+↑/↓) and reports the new order. */
  onReorder?: (ids: string[]) => void;
  /** Controlled collapsed state; collapsed shows only the count pill. */
  collapsed?: boolean;
  /** Initial collapsed state when `collapsed` is not controlled. */
  defaultCollapsed?: boolean;
  /** Called with the new state when the user expands or collapses the list. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Pill label. Default `${n} queued`. */
  formatCount?: (count: number) => string;
}

/** Messages typed while the agent is busy: inline edit, remove, send now (interrupt), reorder, and a collapsible "n queued" pill. */
export const QueuedMessages = React.forwardRef<HTMLElement, QueuedMessagesProps>(
  (
    {
      items,
      onEdit,
      onRemove,
      onSendNow,
      onSteer,
      steerHint = "Steer: add this to the current turn so the agent adjusts course without stopping. Send now interrupts and starts a new turn.",
      onReorder,
      collapsed: collapsedProp,
      defaultCollapsed = false,
      onCollapsedChange,
      formatCount = (n) => `${n} queued`,
      className,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = useControllableState<boolean>({
      value: collapsedProp,
      defaultValue: defaultCollapsed,
      onChange: onCollapsedChange,
    });
    const [editing, setEditing] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState("");
    const listId = React.useId();

    if (items.length === 0) return null;

    const move = (index: number, delta: number) => {
      const target = index + delta;
      if (!onReorder || target < 0 || target >= items.length) return;
      const ids = items.map((i) => i.id);
      [ids[index], ids[target]] = [ids[target], ids[index]];
      onReorder(ids);
    };
    const save = (id: string) => {
      const text = draft.trim();
      if (text) onEdit?.(id, text);
      else onRemove?.(id);
      setEditing(null);
    };

    return (
      <section
        ref={ref}
        aria-label="Queued messages"
        data-collapsed={collapsed ? "" : undefined}
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={collapsed ? undefined : listId}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "inline-flex h-6 w-fit items-center gap-1 rounded-control border border-border bg-subtle px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            focusRing
          )}
        >
          <RiTimeLine aria-hidden className="size-3.5" />
          {formatCount(items.length)}
          {collapsed ? <RiArrowUpSLine aria-hidden className="size-3.5" /> : <RiArrowDownSLine aria-hidden className="size-3.5" />}
        </button>
        {!collapsed && (
          <ul id={listId} className="flex flex-col gap-1">
            {items.map((item, index) => {
              const isEditing = editing === item.id;
              return (
                <li
                  key={item.id}
                  data-queued-id={item.id}
                  tabIndex={onReorder ? -1 : undefined}
                  onKeyDown={(e) => {
                    if (!onReorder || !e.altKey || isEditing) return;
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      move(index, -1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      move(index, 1);
                    }
                  }}
                  className="group/queued flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1 rounded-box border border-dashed border-border bg-card px-2.5 py-1.5 text-sm shadow-xs outline-none"
                >
                  <span className="mt-0.5 shrink-0 rounded-xs bg-muted px-1.5 py-px text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                    Queued
                  </span>
                  {isEditing ? (
                    <div className="flex min-w-0 flex-1 items-start gap-1">
                      <textarea
                        autoFocus
                        aria-label="Edit queued message"
                        value={draft}
                        rows={clamp(draft.split("\n").length, 1, 4)}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            save(item.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditing(null);
                          }
                        }}
                        className={cn(
                          "scrollbar-thin min-w-0 flex-1 resize-none rounded-xs border border-input bg-background px-1.5 py-0.5 text-sm leading-5 outline-none",
                          focusRing
                        )}
                      />
                      <button type="button" aria-label="Save" title="Save (Enter)" onClick={() => save(item.id)} className={iconAction}>
                        <RiCheckLine aria-hidden />
                      </button>
                      <button type="button" aria-label="Cancel" title="Cancel (Esc)" onClick={() => setEditing(null)} className={iconAction}>
                        <RiCloseLine aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 basis-32 truncate leading-5 text-foreground" title={item.text}>
                        {item.text}
                        {item.attachments ? (
                          <span className="ms-1.5 text-xs text-muted-foreground">
                            +{item.attachments} {item.attachments === 1 ? "attachment" : "attachments"}
                          </span>
                        ) : null}
                      </span>
                      <span className="ms-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-0.5">
                        {onReorder && (
                          <>
                            <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className={iconAction}>
                              <RiArrowUpSLine aria-hidden />
                            </button>
                            <button
                              type="button"
                              aria-label="Move down"
                              disabled={index === items.length - 1}
                              onClick={() => move(index, 1)}
                              className={iconAction}
                            >
                              <RiArrowDownSLine aria-hidden />
                            </button>
                          </>
                        )}
                        {onEdit && (
                          <button
                            type="button"
                            aria-label="Edit"
                            title="Edit"
                            onClick={() => {
                              setDraft(item.text);
                              setEditing(item.id);
                            }}
                            className={iconAction}
                          >
                            <RiPencilLine aria-hidden />
                          </button>
                        )}
                        {onRemove && (
                          <button type="button" aria-label="Remove" title="Remove" onClick={() => onRemove(item.id)} className={iconAction}>
                            <RiDeleteBinLine aria-hidden />
                          </button>
                        )}
                        {onSteer && (
                          <SimpleTooltip content={<span className="block max-w-60">{steerHint}</span>}>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              leadingIcon={<RiSteering2Line aria-hidden />}
                              onClick={() => onSteer(item.id)}
                              className="ms-0.5 h-6"
                            >
                              Steer
                            </Button>
                          </SimpleTooltip>
                        )}
                        {onSendNow && (
                          <Button
                            type="button"
                            size="xs"
                            variant="soft"
                            leadingIcon={<RiCornerDownLeftLine aria-hidden />}
                            onClick={() => onSendNow(item.id)}
                            className="ms-0.5 h-6"
                            title="Interrupt the agent and send this now"
                          >
                            Send now
                          </Button>
                        )}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }
);
QueuedMessages.displayName = "QueuedMessages";

/* ------------------------------------------------------------------ */
/* SideThread                                                          */
/* ------------------------------------------------------------------ */

export interface SideThreadExchange {
  id: string;
  question: React.ReactNode;
  answer?: React.ReactNode;
  /**
   * `pending`/`running`: waiting for the answer · `failed`: see `error` · `succeeded` (default): shows `answer`.
   * Legacy `done` / `error` still work.
   */
  status?: TaskStatusInput;
  error?: React.ReactNode;
}

export interface SideThreadProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Question and answer pairs, oldest first; an exchange without an answer is pending. */
  exchanges: SideThreadExchange[];
  /** Called with the question text from the side composer. */
  onAsk?: (text: string) => void;
  /** Called when the user closes the thread; the close button is hidden when unset. */
  onClose?: () => void;
  /** Header title. Default "Side question". */
  title?: React.ReactNode;
  /** Placeholder of the side composer. Default "Ask a quick side question…". */
  placeholder?: string;
  /** Shown when there are no exchanges yet. */
  emptyState?: React.ReactNode;
  /** Disables asking while an answer is pending. Default: any exchange is pending. */
  loading?: boolean;
  /** Disables asking while an answer is pending. @deprecated Use `loading`. */
  busy?: boolean;
  /** Controlled height of the thread in px. */
  height?: number;
  /** Initial height in px when `height` is not controlled. */
  defaultHeight?: number;
  /** Called with the height in px (rounded and clamped) when the user resizes the thread. */
  onHeightChange?: (height: number) => void;
  /** Smallest height in px the user can resize to. Default 140. */
  minHeight?: number;
  /** Largest height in px the user can resize to. Default 640. */
  maxHeight?: number;
  /** Show the top resize handle (pointer drag, ↑/↓, PageUp/PageDown, Home/End). Default true. */
  resizable?: boolean;
  /** Keyboard resize step in px. Default 16. */
  step?: number;
}

/** Docked mini-chat for quick side questions that don't interrupt the main conversation. Resizable from its top edge. */
export const SideThread = React.forwardRef<HTMLElement, SideThreadProps>(
  (
    {
      exchanges,
      onAsk,
      onClose,
      title = "Side question",
      placeholder = "Ask a quick side question…",
      emptyState = "Ask a quick side question without interrupting the main conversation.",
      loading: loadingProp,
      busy: busyProp,
      height: heightProp,
      defaultHeight = 280,
      onHeightChange,
      minHeight = 140,
      maxHeight = 640,
      resizable = true,
      step = 16,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [height, setHeightRaw] = useControllableState<number>({
      value: heightProp,
      defaultValue: defaultHeight,
      onChange: onHeightChange,
    });
    const setHeight = (h: number) => setHeightRaw(Math.round(clamp(h, minHeight, maxHeight)));
    // The top handle resizes from the height at the press; it is a bare handle (nothing clickable inside), so the pointer is captured
    // on the press and the drag starts on the first move.
    const startHeight = React.useRef(height);
    const resize = useDrag({
      axis: "both",
      threshold: 0,
      captureOnPress: true,
      enabled: resizable,
      onDown: (e) => {
        e.preventDefault();
        startHeight.current = height;
      },
      onMove: (info) => setHeight(startHeight.current - info.dy),
    });
    const logRef = React.useRef<HTMLDivElement>(null);
    const titleId = React.useId();
    const exchangeState = (x: SideThreadExchange) => {
      const st = normalizeTaskStatus(x.status, "succeeded");
      return st === "pending" || st === "running" ? "pending" : st === "failed" ? "error" : "done";
    };
    const busy = loadingProp ?? busyProp ?? exchanges.some((x) => exchangeState(x) === "pending");

    React.useEffect(() => {
      const el = logRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [exchanges]);

    return (
      <section
        ref={ref}
        aria-labelledby={titleId}
        data-slot="side-thread"
        style={{ height: resizable ? height : undefined, ...style }}
        className={cn("relative flex min-h-0 flex-col overflow-hidden rounded-box border border-border bg-card shadow-sm", className)}
        {...props}
      >
        {resizable && (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize side question"
            aria-valuenow={height}
            aria-valuemin={minHeight}
            aria-valuemax={maxHeight}
            tabIndex={0}
            onKeyDown={(e) => {
              const big = step * 4;
              const next =
                e.key === "ArrowUp" ? height + step
                : e.key === "ArrowDown" ? height - step
                : e.key === "PageUp" ? height + big
                : e.key === "PageDown" ? height - big
                : e.key === "Home" ? maxHeight
                : e.key === "End" ? minHeight
                : null;
              if (next == null) return;
              e.preventDefault();
              setHeight(next);
            }}
            ref={resize.ref}
            {...resize.handlers}
            className={cn(
              "group/handle absolute inset-x-0 top-0 z-10 flex h-2.5 cursor-row-resize touch-none items-start justify-center pt-1 outline-none",
              "focus-visible:bg-ring/10"
            )}
          >
            <span className="h-1 w-8 rounded-full bg-border transition-colors group-hover/handle:bg-border-strong group-focus-visible/handle:bg-ring" />
          </div>
        )}
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-2 pt-3">
          <RiQuestionAnswerLine aria-hidden className="size-4 text-muted-foreground" />
          <h3 id={titleId} className="flex-1 truncate text-sm font-medium text-foreground">
            {title}
          </h3>
          {onClose && (
            <button type="button" aria-label="Close side question" onClick={onClose} className={iconAction}>
              <RiCloseLine aria-hidden />
            </button>
          )}
        </header>
        <div
          ref={logRef}
          role="log"
          aria-label="Side question exchanges"
          tabIndex={0}
          className={cn("scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2.5 text-sm outline-none", focusRing)}
        >
          {exchanges.length === 0 ? (
            <p className="m-auto max-w-64 text-center text-xs text-muted-foreground">{emptyState}</p>
          ) : (
            exchanges.map((x) => (
              <div key={x.id} data-exchange-id={x.id} className="flex flex-col gap-1.5">
                <div className="max-w-[85%] self-end whitespace-pre-wrap rounded-box bg-secondary px-2.5 py-1.5 text-secondary-foreground">
                  {x.question}
                </div>
                <div className="max-w-full self-start leading-6 text-foreground">
                  {exchangeState(x) === "pending" ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Spinner size="xs" aria-hidden role="presentation" />
                      Answering…
                    </span>
                  ) : exchangeState(x) === "error" ? (
                    <span className="inline-flex items-center gap-1.5 text-destructive">
                      <RiErrorWarningLine aria-hidden className="size-4" />
                      {x.error ?? "Couldn't get an answer."}
                    </span>
                  ) : (
                    x.answer
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {onAsk && (
          <div className="shrink-0 border-t border-border p-2">
            <PromptInput
              onSubmit={(text) => onAsk(text.trim())}
              loading={busy}
              className="flex-row items-end rounded-control shadow-none"
            >
              <PromptInputTextarea
                aria-label="Side question"
                placeholder={placeholder}
                maxRows={4}
                className="px-3 py-1.5 text-sm leading-5"
              />
              <PromptInputSubmit submitLabel="Ask" className="m-1 size-7 shrink-0" />
            </PromptInput>
          </div>
        )}
      </section>
    );
  }
);
SideThread.displayName = "SideThread";

/* ------------------------------------------------------------------ */
/* ComposerToolbar                                                     */
/* ------------------------------------------------------------------ */

export interface ComposerToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add-context control (always visible). */
  addContext?: React.ReactNode;
  /** Mode switcher slot (collapses). */
  mode?: React.ReactNode;
  /** Effort slot (collapses). */
  effort?: React.ReactNode;
  /** Extra left-hand tools (collapse). */
  tools?: React.ReactNode;
  /** Right-hand meta such as a context meter (collapses). */
  meta?: React.ReactNode;
  /** Model pill (always visible). */
  model?: React.ReactNode;
  /** Voice button (always visible). */
  voice?: React.ReactNode;
  /** Send / stop button (always visible). */
  submit?: React.ReactNode;
  /** Move collapsible slots into an overflow popover: "auto" measures the toolbar width. Default "auto". */
  collapse?: boolean | "auto";
  /** Width in px below which "auto" collapses. Default 440. */
  collapseBelow?: number;
  /** Accessible name of the overflow button. Default "More options". */
  overflowLabel?: string;
}

/**
 * Composer footer layout: add context, mode and effort on the left; model, voice and send on the right; narrow widths collapse extras into an overflow popover.
 * This is the slot-based, agent-specific layout; `PromptInputToolbar` (prompt-input) is the plain flex row for a basic `PromptInput`.
 * Use `ComposerToolbar` when you need the named slots or overflow collapse, `PromptInputToolbar` otherwise.
 */
export const ComposerToolbar = React.forwardRef<HTMLDivElement, ComposerToolbarProps>(
  (
    {
      addContext,
      mode,
      effort,
      tools,
      meta,
      model,
      voice,
      submit,
      collapse = "auto",
      collapseBelow = 440,
      overflowLabel = "More options",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const width = useElementWidth(rootRef);
    const narrow = width > 0 && width < collapseBelow;
    const setRefs = useMergedRefs(rootRef, ref);

    const collapsed = collapse === "auto" ? narrow : collapse;
    const collapsible = [mode, effort, tools, meta].filter((n) => n != null && n !== false);
    const overflow = collapsed && collapsible.length > 0;

    return (
      <div
        ref={setRefs}
        data-slot="composer-toolbar"
        data-collapsed={overflow ? "" : undefined}
        className={cn("flex min-w-0 items-center justify-between gap-2 px-2.5 pb-2.5", className)}
        {...props}
      >
        <div className={cn("flex items-center gap-1", overflow ? "shrink-0" : "min-w-0")}>
          {addContext}
          {!overflow && (
            <>
              {mode}
              {effort}
              {tools}
            </>
          )}
          {overflow && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={overflowLabel}
                  title={overflowLabel}
                  className="text-muted-foreground hover:text-foreground data-[state=open]:bg-accent"
                >
                  <RiMoreLine aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                size="auto"
                padded={false}
                aria-label={overflowLabel}
                className="flex min-w-48 flex-col items-stretch gap-1 p-1.5 [&>*]:justify-start"
              >
                {collapsible.map((node, i) => (
                  <React.Fragment key={i}>{node}</React.Fragment>
                ))}
              </PopoverContent>
            </Popover>
          )}
          {children}
        </div>
        <div className="flex min-w-0 shrink items-center gap-1">
          {!overflow && meta}
          {model}
          {voice}
          {submit}
        </div>
      </div>
    );
  }
);
ComposerToolbar.displayName = "ComposerToolbar";

/* ------------------------------------------------------------------ */
/* AttachmentThumbnails                                                */
/* ------------------------------------------------------------------ */

export interface AttachmentThumbnailItem {
  id: string;
  name: string;
  /** Image URL (object URL, data URI or remote) for previews. */
  url?: string;
  mimeType?: string;
  /** Size in bytes. */
  size?: number;
  /** Page count (PDFs, documents). */
  pages?: number;
  status?: "ready" | "uploading" | "failed";
  /** Upload progress 0–100 while uploading. */
  progress?: number;
  error?: string;
  alt?: string;
}

export interface AttachmentThumbnailsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Attachments to show as thumbnails, each with a name, kind and upload status. */
  items: AttachmentThumbnailItem[];
  /** Called with the item id when the user removes an attachment; the remove button is hidden when unset. */
  onRemove?: (id: string) => void;
  /** Shows a retry action on failed items. */
  onRetry?: (id: string) => void;
  /** Click images to open them in a Lightbox. Default true. */
  preview?: boolean;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp|heic)$/i;

function isImageAttachment(item: AttachmentThumbnailItem) {
  return !!item.url && (item.mimeType?.startsWith("image/") || IMAGE_EXT.test(item.name) || item.url.startsWith("data:image/"));
}

function attachmentMeta(item: AttachmentThumbnailItem) {
  if (item.status === "failed") return item.error ?? "Upload failed";
  if (item.status === "uploading") return item.progress != null ? `Uploading… ${Math.round(item.progress)}%` : "Uploading…";
  return [item.pages != null ? `${item.pages} ${pluralize(item.pages, "page")}` : null, item.size != null ? formatBytes(item.size, { decimals: 1, wholeAbove: 10, trimZeros: false, negative: "invalid", invalid: "" }) : null]
    .filter(Boolean)
    .join(" · ");
}

/** Data-driven row of `ChatAttachment`s: image tiles (click to preview in a Lightbox) and file cards with pages / size, upload progress, failed + retry and remove on hover. */
export const AttachmentThumbnails = React.forwardRef<HTMLDivElement, AttachmentThumbnailsProps>(
  ({ items, onRemove, onRetry, preview = true, className, ...props }, ref) => {
    const lightbox = useLightbox();
    const images = items.filter(isImageAttachment);
    const lightboxItems = React.useMemo<LightboxItem[]>(
      () => images.map((i) => ({ src: i.url!, alt: i.alt ?? i.name, caption: i.name })),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [images.map((i) => `${i.id}:${i.url}`).join("|")]
    );
    if (items.length === 0) return null;

    return (
      <div
        ref={ref}
        role="list"
        aria-label="Attachments"
        data-prompt-input-ignore=""
        className={cn("scrollbar-none -m-1.5 flex items-center gap-2 overflow-x-auto p-1.5 [&>*]:shrink-0", className)}
        {...props}
      >
        {items.map((item) => {
          const state = item.status ?? "ready";
          const image = isImageAttachment(item);
          const imageIndex = image ? images.indexOf(item) : -1;
          return (
            <ChatAttachment
              key={item.id}
              role="listitem"
              data-state={state}
              variant={image ? "image" : "card"}
              name={item.name}
              mimeType={item.mimeType}
              previewUrl={image ? item.url : undefined}
              alt={item.alt ?? item.name}
              fileSize={item.size}
              pages={item.pages}
              status={state}
              progress={item.progress}
              error={state === "failed" ? (item.error ?? true) : undefined}
              meta={state === "ready" ? attachmentMeta(item) : undefined}
              icon={image ? undefined : <FileFormatIcon ext={item.name} size={32} aria-hidden />}
              onRemove={onRemove ? () => onRemove(item.id) : undefined}
              onRetry={onRetry ? () => onRetry(item.id) : undefined}
              onPreview={image && preview ? () => lightbox.openAt(imageIndex) : undefined}
              className={image ? "size-14" : "w-auto max-w-60"}
            />
          );
        })}
        {preview && lightboxItems.length > 0 && <Lightbox items={lightboxItems} {...lightbox.props} />}
      </div>
    );
  }
);
AttachmentThumbnails.displayName = "AttachmentThumbnails";

/* ------------------------------------------------------------------ */
/* useComposerHistory                                                  */
/* ------------------------------------------------------------------ */

export interface UseComposerHistoryOptions {
  value: string;
  onValueChange: (value: string) => void;
  /** Seed entries, oldest first. */
  initialEntries?: string[];
  /** Keep at most this many entries. Default 100. */
  max?: number;
}

export interface ComposerHistory {
  /** Entries, oldest first. */
  entries: string[];
  /** Index of the recalled entry, or null when editing the live draft. */
  index: number | null;
  /** Record a submitted prompt (trimmed; consecutive duplicates are skipped). */
  push: (text: string) => void;
  /** Attach to the textarea: ↑ with the caret at the start recalls older prompts, ↓ with the caret at the end walks back to the draft. */
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  /** Stop browsing (keeps the current text). */
  reset: () => void;
}

/** Shell-style prompt history for composers: ↑/↓ recall previous prompts when the caret is at the start / end. */
export function useComposerHistory({ value, onValueChange, initialEntries, max = 100 }: UseComposerHistoryOptions): ComposerHistory {
  const keepLast = (list: string[]) => (max > 0 ? list.slice(-max) : []);
  const [entries, setEntries] = React.useState<string[]>(() => keepLast(initialEntries ?? []));
  const [index, setIndex] = React.useState<number | null>(null);
  const draft = React.useRef("");
  const lastSet = React.useRef<string | null>(null);
  const pendingCaret = React.useRef<{ el: HTMLTextAreaElement | HTMLInputElement; at: "start" | "end" } | null>(null);

  useIsoLayoutEffect(() => {
    const pending = pendingCaret.current;
    if (pending) {
      pendingCaret.current = null;
      const pos = pending.at === "start" ? 0 : pending.el.value.length;
      pending.el.setSelectionRange(pos, pos);
    }
    if (index !== null && lastSet.current !== null && value !== lastSet.current) {
      setIndex(null);
      lastSet.current = null;
    }
  }, [value, index]);

  const recall = (el: HTMLTextAreaElement | HTMLInputElement, text: string, at: "start" | "end") => {
    lastSet.current = text;
    pendingCaret.current = { el, at };
    onValueChange(text);
    if (text === value) {
      const pos = at === "start" ? 0 : text.length;
      el.setSelectionRange(pos, pos);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.defaultPrevented || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) return;
    if (e.key === "ArrowUp") {
      if (start !== 0 || entries.length === 0) return;
      const next = index === null ? entries.length - 1 : index - 1;
      if (next < 0) return;
      e.preventDefault();
      if (index === null) draft.current = value;
      setIndex(next);
      recall(el, entries[next], "start");
    } else {
      if (index === null || end !== el.value.length) return;
      e.preventDefault();
      const next = index + 1;
      if (next >= entries.length) {
        setIndex(null);
        recall(el, draft.current, "end");
        lastSet.current = null;
      } else {
        setIndex(next);
        recall(el, entries[next], "end");
      }
    }
  };

  const push = React.useCallback(
    (text: string) => {
      const t = text.trim();
      setIndex(null);
      lastSet.current = null;
      draft.current = "";
      if (!t) return;
      setEntries((prev) => (prev[prev.length - 1] === t ? prev : max > 0 ? [...prev, t].slice(-max) : []));
    },
    [max]
  );

  const reset = React.useCallback(() => {
    setIndex(null);
    lastSet.current = null;
  }, []);

  return { entries, index, push, onKeyDown, reset };
}
