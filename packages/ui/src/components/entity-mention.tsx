import * as React from "react";
import { RiHashtag, RiSlashCommands2, RiUser3Line } from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { SutraAppIcon, sutraAppMeta, sutraApps, type SutraApp } from "../assets/brand";
import { HoverCard, HoverCardContent, HoverCardTrigger, Popover, PopoverAnchor, PopoverContent } from "./popover";
import { Spinner } from "./spinner";

/* ------------------------------------------------------------------ */
/* Types & token syntax                                                */
/* ------------------------------------------------------------------ */

/** A Sutra app, or a person / tag reference. */
export type EntityType = SutraApp | "person" | "tag";

export interface EntityRef {
  type: EntityType;
  id: string;
  title: string;
  /** e.g. "done" (tasks are struck through), "open", "archived". */
  status?: string;
  /** Event / due date. Shown after the title for calendar items. */
  date?: Date | string;
  href?: string;
}

function isSutraApp(type: string): type is SutraApp {
  return (sutraApps as readonly string[]).includes(type);
}

/** Display name of an entity type ("Tasks", "Person", "Tag"). */
export function entityTypeLabel(type: EntityType) {
  if (isSutraApp(type)) return sutraAppMeta[type].name;
  return type === "person" ? "Person" : "Tag";
}

function toDate(value: Date | string | undefined) {
  if (value == null) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatEntityDate(value: Date | string | undefined) {
  const d = toDate(value);
  if (!d) return undefined;
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/* ------------------------------------------------------------------ */
/* EntityChip                                                          */
/* ------------------------------------------------------------------ */

export interface EntityChipProps extends Omit<React.HTMLAttributes<HTMLElement>, "id" | "title"> {
  type: EntityType;
  id: string;
  title: string;
  status?: string;
  date?: Date | string;
  href?: string;
  /** Hover card content (e.g. a preview of the note or task). */
  preview?: React.ReactNode;
  size?: "sm" | "md";
  /** Hide the app icon. */
  hideIcon?: boolean;
}

/** Inline reference to an item in any Sutra app, tinted with the app's accent. */
export const EntityChip = React.forwardRef<HTMLElement, EntityChipProps>(
  ({ type, id, title, status, date, href, preview, size = "md", hideIcon, className, onClick, ...props }, ref) => {
    const app = isSutraApp(type) ? type : undefined;
    const done = status === "done" || status === "completed";
    const dateLabel = type === "calendar" || date ? formatEntityDate(date) : undefined;
    const iconSize = size === "sm" ? 12 : 14;
    const interactive = Boolean(href || onClick);

    const icon = hideIcon ? null : app ? (
      <SutraAppIcon app={app} size={iconSize} shape="squircle" />
    ) : type === "person" ? (
      <RiUser3Line aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    ) : (
      <RiHashtag aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    );

    const content = (
      <>
        {icon}
        <span className={cn("min-w-0 truncate", done && "text-muted-foreground line-through decoration-1")}>{title}</span>
        {done && <span className="sr-only">(done)</span>}
        {dateLabel && <span className="shrink-0 text-muted-foreground">· {dateLabel}</span>}
      </>
    );

    const chipClass = cn(
      "inline-flex max-w-full items-center gap-1 rounded-control border align-middle font-medium transition-colors",
      size === "sm" ? "h-5 px-1.5 text-xs" : "h-6 px-2 text-[13px]",
      app
        ? "border-primary/25 bg-primary-soft text-primary-soft-foreground"
        : "border-border bg-muted text-foreground",
      interactive && cn("cursor-pointer hover:border-primary/50", !app && "hover:bg-accent", focusRing),
      className
    );

    const shared = {
      "data-entity-type": type,
      "data-entity-id": id,
      "data-status": status,
      "data-app": app,
      className: chipClass,
      ...props,
    };

    const chip = href ? (
      <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} onClick={onClick} {...shared}>
        {content}
      </a>
    ) : onClick ? (
      <button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={onClick} {...shared}>
        {content}
      </button>
    ) : (
      <span ref={ref as React.Ref<HTMLSpanElement>} {...shared}>
        {content}
      </span>
    );

    if (!preview) return chip;
    return (
      <HoverCard>
        <HoverCardTrigger asChild>{chip}</HoverCardTrigger>
        <HoverCardContent size="md" data-app={app}>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            {icon}
            {entityTypeLabel(type)}
          </div>
          {preview}
        </HoverCardContent>
      </HoverCard>
    );
  }
);
EntityChip.displayName = "EntityChip";

/* ------------------------------------------------------------------ */
/* Mention parsing                                                     */
/* ------------------------------------------------------------------ */

export type MentionTrigger = "@" | "#" | "/";

export interface MentionToken {
  trigger: MentionTrigger;
  title: string;
  type: EntityType;
  id: string;
}

export type MentionSegment =
  | { kind: "text"; text: string; start: number; end: number }
  | ({ kind: "mention"; raw: string; start: number; end: number } & MentionToken);

const MENTION_RE = /([@#/])\[([^\]\n]+)\]\(([a-z]+):([^)\s]+)\)/g;

/** Serialize a mention to the stored token syntax: `@[Title](tasks:123)`. */
export function formatMention({ trigger, title, type, id }: MentionToken) {
  return `${trigger}[${title.replace(/[\][\n]/g, " ").trim()}](${type}:${id})`;
}

/** Split stored text into plain-text and mention segments. */
export function parseMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    const start = m.index ?? 0;
    if (start > last) segments.push({ kind: "text", text: text.slice(last, start), start: last, end: start });
    segments.push({
      kind: "mention",
      raw: m[0],
      trigger: m[1] as MentionTrigger,
      title: m[2],
      type: m[3] as EntityType,
      id: m[4],
      start,
      end: start + m[0].length,
    });
    last = start + m[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last), start: last, end: text.length });
  return segments;
}

/** Just the mentions in stored text. */
export function extractMentions(text: string): MentionToken[] {
  return parseMentions(text)
    .filter((s): s is Extract<MentionSegment, { kind: "mention" }> => s.kind === "mention")
    .map(({ trigger, title, type, id }) => ({ trigger, title, type, id }));
}

/** Stored text with tokens replaced by their display form ("@Title"). */
export function mentionsToPlainText(text: string) {
  return parseMentions(text)
    .map((s) => (s.kind === "text" ? s.text : `${s.trigger === "/" ? "" : s.trigger}${s.title}`))
    .join("");
}

/* ------------------------------------------------------------------ */
/* MentionText                                                         */
/* ------------------------------------------------------------------ */

export interface MentionTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Stored text with mention tokens. */
  value: string;
  /** Link builder for chips. */
  getHref?: (mention: MentionToken) => string | undefined;
  /** Custom renderer for each mention. */
  renderMention?: (mention: MentionToken, index: number) => React.ReactNode;
  chipSize?: EntityChipProps["size"];
}

/** Renders stored mention text with inline EntityChips. */
export const MentionText = React.forwardRef<HTMLSpanElement, MentionTextProps>(
  ({ value, getHref, renderMention, chipSize = "sm", className, ...props }, ref) => (
    <span ref={ref} className={cn("whitespace-pre-wrap break-words", className)} {...props}>
      {parseMentions(value).map((seg, i) =>
        seg.kind === "text" ? (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        ) : renderMention ? (
          <React.Fragment key={i}>{renderMention(seg, i)}</React.Fragment>
        ) : (
          <EntityChip
            key={i}
            type={seg.type}
            id={seg.id}
            title={seg.title}
            href={getHref?.(seg)}
            size={chipSize}
          />
        )
      )}
    </span>
  )
);
MentionText.displayName = "MentionText";

/* ------------------------------------------------------------------ */
/* MentionInput                                                        */
/* ------------------------------------------------------------------ */

export interface MentionSuggestion {
  id: string;
  title: string;
  type: EntityType;
  description?: string;
  icon?: React.ReactNode;
  /** For "/" commands: plain text inserted in place of the command (default: nothing). */
  insertText?: string;
}

export type MentionSearchHandler = (
  trigger: MentionTrigger,
  query: string
) => MentionSuggestion[] | Promise<MentionSuggestion[]>;

export interface MentionInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange"> {
  value?: string;
  defaultValue?: string;
  /** Receives the stored text, with tokens like `@[Title](tasks:123)`. */
  onValueChange?: (value: string) => void;
  /** Static suggestions per trigger, filtered by the typed query. */
  suggestions?: Partial<Record<MentionTrigger, MentionSuggestion[]>>;
  /** Async search; takes precedence over `suggestions`. */
  onSearch?: MentionSearchHandler;
  /** Triggers that open the menu. Default all three. */
  triggers?: MentionTrigger[];
  /** Called when a "/" command is picked. */
  onCommand?: (command: MentionSuggestion) => void;
  /** Render a single-line input instead of a textarea. */
  singleLine?: boolean;
  /** Max suggestions shown. Default 8. */
  maxSuggestions?: number;
  invalid?: boolean;
  wrapperClassName?: string;
}

interface DisplayToken {
  start: number;
  end: number;
  raw: string;
  type: EntityType;
}

function toDisplay(value: string) {
  let display = "";
  const tokens: DisplayToken[] = [];
  for (const seg of parseMentions(value)) {
    if (seg.kind === "text") display += seg.text;
    else {
      const text = `${seg.trigger}${seg.title}`;
      tokens.push({ start: display.length, end: display.length + text.length, raw: seg.raw, type: seg.type });
      display += text;
    }
  }
  return { display, tokens };
}

function fromDisplay(display: string, tokens: DisplayToken[]) {
  let out = "";
  let last = 0;
  for (const t of [...tokens].sort((a, b) => a.start - b.start)) {
    out += display.slice(last, t.start) + t.raw;
    last = t.end;
  }
  return out + display.slice(last);
}

/** Map an edit of the display text back onto the token list. Tokens touched by the edit become plain text. */
function reconcile(oldDisplay: string, newDisplay: string, tokens: DisplayToken[]) {
  const max = Math.min(oldDisplay.length, newDisplay.length);
  let p = 0;
  while (p < max && oldDisplay[p] === newDisplay[p]) p++;
  let s = 0;
  while (s < max - p && oldDisplay[oldDisplay.length - 1 - s] === newDisplay[newDisplay.length - 1 - s]) s++;
  const oldEnd = oldDisplay.length - s;
  const delta = newDisplay.length - oldDisplay.length;
  const next: DisplayToken[] = [];
  for (const t of tokens) {
    if (t.end <= p) next.push(t);
    else if (t.start >= oldEnd) next.push({ ...t, start: t.start + delta, end: t.end + delta });
  }
  return next;
}

const triggerTypes: Record<MentionTrigger, string> = { "@": "people", "#": "notes and tags", "/": "commands" };

function suggestionIcon(s: MentionSuggestion) {
  if (s.icon) return s.icon;
  if (isSutraApp(s.type)) return <SutraAppIcon app={s.type} size={18} shape="squircle" />;
  if (s.type === "person")
    return (
      <span aria-hidden className="grid size-[18px] place-items-center rounded-full bg-muted text-[10px] font-semibold">
        {s.title.charAt(0).toUpperCase()}
      </span>
    );
  return <RiHashtag aria-hidden className="size-4 text-muted-foreground" />;
}

/** Text field where "@", "#" and "/" open a suggestion menu and insert mention tokens. */
export const MentionInput = React.forwardRef<HTMLTextAreaElement, MentionInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      suggestions,
      onSearch,
      triggers = ["@", "#", "/"],
      onCommand,
      singleLine = false,
      maxSuggestions = 8,
      invalid,
      className,
      wrapperClassName,
      rows = 3,
      onKeyDown,
      onScroll,
      onBlur,
      disabled,
      id,
      ...props
    },
    forwardedRef
  ) => {
    const [internal, setInternal] = React.useState(defaultValue);
    const value = valueProp ?? internal;
    const setValue = (next: string) => {
      if (valueProp === undefined) setInternal(next);
      onValueChange?.(next);
    };
    const { display, tokens } = React.useMemo(() => toDisplay(value), [value]);

    const fieldRef = React.useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const pendingCaret = React.useRef<number | null>(null);
    const setRefs = (node: HTMLTextAreaElement | HTMLInputElement | null) => {
      fieldRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node as HTMLTextAreaElement);
      else if (forwardedRef) forwardedRef.current = node as HTMLTextAreaElement;
    };

    const [active, setActive] = React.useState<{ trigger: MentionTrigger; start: number; query: string } | null>(null);
    const [items, setItems] = React.useState<MentionSuggestion[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [highlight, setHighlight] = React.useState(0);
    const requestId = React.useRef(0);
    const reactId = React.useId();
    const listId = `${id ?? reactId}-mentions`;

    React.useLayoutEffect(() => {
      if (pendingCaret.current == null || !fieldRef.current) return;
      const pos = pendingCaret.current;
      pendingCaret.current = null;
      fieldRef.current.setSelectionRange(pos, pos);
    });

    React.useEffect(() => {
      if (!active) {
        setItems([]);
        setLoading(false);
        return;
      }
      const { trigger, query } = active;
      const current = ++requestId.current;
      const q = query.toLowerCase();
      const filterStatic = () =>
        (suggestions?.[trigger] ?? []).filter((s) => !q || s.title.toLowerCase().includes(q)).slice(0, maxSuggestions);
      if (!onSearch) {
        setItems(filterStatic());
        setHighlight(0);
        return;
      }
      const result = onSearch(trigger, query);
      if (Array.isArray(result)) {
        setItems(result.slice(0, maxSuggestions));
        setHighlight(0);
        return;
      }
      setLoading(true);
      result
        .then((list) => {
          if (current !== requestId.current) return;
          setItems(list.slice(0, maxSuggestions));
          setHighlight(0);
        })
        .catch(() => {
          if (current === requestId.current) setItems([]);
        })
        .finally(() => {
          if (current === requestId.current) setLoading(false);
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active?.trigger, active?.query, active?.start, onSearch, suggestions, maxSuggestions]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const nextDisplay = e.target.value;
      const nextTokens = reconcile(display, nextDisplay, tokens);
      setValue(fromDisplay(nextDisplay, nextTokens));
      const caret = e.target.selectionStart ?? nextDisplay.length;
      setActive(detectWith(nextDisplay, caret, nextTokens));
    };

    const detectWith = (text: string, caret: number, tks: DisplayToken[]) => {
      let i = caret - 1;
      while (i >= 0 && !/\s/.test(text[i])) {
        const ch = text[i] as MentionTrigger;
        if (triggers.includes(ch) && (i === 0 || /\s/.test(text[i - 1]))) {
          if (tks.some((t) => i >= t.start && i < t.end)) return null;
          return { trigger: ch, start: i, query: text.slice(i + 1, caret) };
        }
        i--;
      }
      return null;
    };

    const select = (s: MentionSuggestion) => {
      if (!active) return;
      const caret = active.start + 1 + active.query.length;
      const before = display.slice(0, active.start);
      const after = display.slice(caret);
      const shifted = tokens;
      let nextDisplay: string;
      let nextTokens: DisplayToken[];
      let nextCaret: number;
      if (active.trigger === "/") {
        const insert = s.insertText ?? "";
        nextDisplay = before + insert + after;
        const delta = insert.length - (caret - active.start);
        nextTokens = shifted.map((t) => (t.start >= caret ? { ...t, start: t.start + delta, end: t.end + delta } : t));
        nextCaret = before.length + insert.length;
        onCommand?.(s);
      } else {
        const token: MentionToken = { trigger: active.trigger, title: s.title, type: s.type, id: s.id };
        const raw = formatMention(token);
        const text = `${active.trigger}${raw.slice(2, raw.indexOf("]("))}`;
        const insert = `${text} `;
        nextDisplay = before + insert + after;
        const delta = insert.length - (caret - active.start);
        nextTokens = [
          ...shifted.map((t) => (t.start >= caret ? { ...t, start: t.start + delta, end: t.end + delta } : t)),
          { start: before.length, end: before.length + text.length, raw, type: s.type },
        ];
        nextCaret = before.length + insert.length;
      }
      pendingCaret.current = nextCaret;
      setValue(fromDisplay(nextDisplay, nextTokens));
      setActive(null);
      fieldRef.current?.focus();
    };

    const open = active != null && (items.length > 0 || loading || active.query.length > 0);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement & HTMLInputElement>) => {
      onKeyDown?.(e as React.KeyboardEvent<HTMLTextAreaElement>);
      if (e.defaultPrevented) return;
      if (open) {
        if (e.key === "ArrowDown" && items.length) {
          e.preventDefault();
          setHighlight((h) => (h + 1) % items.length);
          return;
        }
        if (e.key === "ArrowUp" && items.length) {
          e.preventDefault();
          setHighlight((h) => (h - 1 + items.length) % items.length);
          return;
        }
        if ((e.key === "Enter" || e.key === "Tab") && items[highlight]) {
          e.preventDefault();
          select(items[highlight]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setActive(null);
          return;
        }
      }
      if (e.key === "Backspace") {
        const el = e.currentTarget;
        if (el.selectionStart === el.selectionEnd) {
          const caret = el.selectionStart ?? 0;
          const token = tokens.find((t) => t.end === caret);
          if (token) {
            e.preventDefault();
            const nextDisplay = display.slice(0, token.start) + display.slice(token.end);
            const delta = token.start - token.end;
            const nextTokens = tokens
              .filter((t) => t !== token)
              .map((t) => (t.start >= token.end ? { ...t, start: t.start + delta, end: t.end + delta } : t));
            pendingCaret.current = token.start;
            setValue(fromDisplay(nextDisplay, nextTokens));
          }
        }
      }
    };

    const syncScroll = (e: React.UIEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = e.currentTarget.scrollTop;
        overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
    };

    const highlighted: React.ReactNode[] = [];
    let cursor = 0;
    tokens.forEach((t, i) => {
      highlighted.push(display.slice(cursor, t.start));
      highlighted.push(
        <span
          key={i}
          data-app={isSutraApp(t.type) ? t.type : undefined}
          className={cn("rounded-xs", isSutraApp(t.type) ? "bg-primary-soft" : "bg-muted")}
        >
          {display.slice(t.start, t.end)}
        </span>
      );
      cursor = t.end;
    });
    highlighted.push(display.slice(cursor));

    const textClass = cn(
      "px-3 py-2 text-sm leading-6",
      singleLine ? "whitespace-pre" : "whitespace-pre-wrap break-words"
    );
    const activeOptionId = open && items[highlight] ? `${listId}-${highlight}` : undefined;
    const fieldA11y = {
      "aria-autocomplete": "list" as const,
      "aria-controls": open ? listId : undefined,
      "aria-activedescendant": activeOptionId,
    };

    return (
      <Popover open={open} onOpenChange={(o) => !o && setActive(null)}>
        <PopoverAnchor asChild>
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-control border border-input bg-background shadow-xs transition-shadow",
              "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
              invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
              disabled && "cursor-not-allowed opacity-50",
              wrapperClassName
            )}
          >
            <div
              ref={overlayRef}
              aria-hidden
              className={cn("pointer-events-none absolute inset-0 overflow-hidden text-transparent", textClass)}
            >
              {highlighted}
              {"​"}
            </div>
            {singleLine ? (
              <input
                ref={setRefs as React.Ref<HTMLInputElement>}
                id={id}
                role="combobox"
                aria-expanded={open}
                {...fieldA11y}
                {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
                disabled={disabled}
                value={display}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                onBlur={(e) => {
                  onBlur?.(e as unknown as React.FocusEvent<HTMLTextAreaElement>);
                }}
                className={cn(
                  "relative block h-9 w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
                  textClass,
                  "py-0",
                  className
                )}
              />
            ) : (
              <textarea
                ref={setRefs as React.Ref<HTMLTextAreaElement>}
                id={id}
                rows={rows}
                {...fieldA11y}
                {...props}
                disabled={disabled}
                value={display}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={onBlur}
                onScroll={(e) => {
                  syncScroll(e);
                  onScroll?.(e);
                }}
                className={cn(
                  "relative block w-full resize-y bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
                  textClass,
                  className
                )}
              />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          size="sm"
          padded={false}
          className="w-64 p-1"
          aria-label="Mention suggestions"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (fieldRef.current && e.target instanceof Node && fieldRef.current.contains(e.target)) e.preventDefault();
          }}
        >
          <div className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
            {active?.trigger === "/" ? (
              <RiSlashCommands2 aria-hidden className="size-3.5" />
            ) : active?.trigger === "#" ? (
              <RiHashtag aria-hidden className="size-3.5" />
            ) : (
              <RiUser3Line aria-hidden className="size-3.5" />
            )}
            {active ? `Insert ${triggerTypes[active.trigger]}` : null}
            {loading && <Spinner size="xs" className="ml-auto" />}
          </div>
          <ul id={listId} role="listbox" aria-label={active ? `Suggested ${triggerTypes[active.trigger]}` : "Suggestions"}>
            {items.map((s, i) => (
              <li
                key={`${s.type}:${s.id}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                data-highlighted={i === highlight || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(s)}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                {suggestionIcon(s)}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{s.title}</span>
                  {s.description && <span className="truncate text-xs text-muted-foreground">{s.description}</span>}
                </span>
              </li>
            ))}
          </ul>
          {!loading && items.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches for “{active?.query}”</p>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);
MentionInput.displayName = "MentionInput";
