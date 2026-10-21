import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Kbd } from "../primitives/typography";
import { replaceTextRange } from "../lib/text-field";
import { useCaretAnchor } from "../hooks/use-caret-anchor";

/* ------------------------------------------------------------------ */
/* useSlashTrigger + SlashMenu                                         */
/* ------------------------------------------------------------------ */

export interface SlashTriggerMatch {
  trigger: string;
  /** Text typed after the trigger, up to the caret. */
  query: string;
  /** Index of the trigger character. */
  start: number;
  /** Caret index (end of the query). */
  end: number;
}

export interface DetectSlashTriggerOptions {
  /** Allow trigger characters inside the query ("#notes/2024"). Default false, so "/a/b" paths don't open the menu. */
  allowTriggerInQuery?: boolean;
}

/** Find a trigger token ("/cmd", "@name") ending at `caret`; it must start a word. */
export function detectSlashTrigger(
  value: string,
  caret: number,
  triggers: readonly string[] = ["/"],
  options: DetectSlashTriggerOptions = {}
): SlashTriggerMatch | null {
  if (caret < 0 || caret > value.length) return null;
  let i = caret;
  while (i > 0 && !/\s/.test(value[i - 1]!)) i--;
  const token = value.slice(i, caret);
  if (!token) return null;
  const trigger = triggers.find((t) => token.startsWith(t));
  if (!trigger) return null;
  const query = token.slice(trigger.length);
  if (!options.allowTriggerInQuery && triggers.some((t) => query.includes(t))) return null;
  return { trigger, query, start: i, end: caret };
}

export interface SlashTriggerState {
  match: SlashTriggerMatch | null;
  /** Close until the caret leaves the current token. */
  dismiss: () => void;
  /** Replace the trigger token with `text`. */
  replace: (text: string) => void;
  /** Re-read the field (called automatically on input / caret moves). */
  sync: () => void;
}

/** Watch a textarea for a trigger character at the start of a word and report the query under the caret. */
export function useSlashTrigger(
  textareaRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  triggers: readonly string[] = ["/"]
): SlashTriggerState {
  const [match, setMatch] = React.useState<SlashTriggerMatch | null>(null);
  const dismissed = React.useRef<string | null>(null);
  const key = triggers.join("\u0000");

  const sync = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    const collapsed = el.selectionEnd == null || el.selectionEnd === caret;
    const m = collapsed ? detectSlashTrigger(el.value, caret, key.split("\u0000")) : null;
    const sig = m ? `${m.start}:${m.trigger}` : null;
    if (dismissed.current && dismissed.current !== sig) dismissed.current = null;
    const next = m && dismissed.current !== sig ? m : null;
    setMatch((prev) =>
      prev && next && prev.start === next.start && prev.end === next.end && prev.query === next.query && prev.trigger === next.trigger
        ? prev
        : next
    );
  }, [textareaRef, key]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = () => sync();
    const events = ["input", "change", "click", "keyup", "select", "focus"] as const;
    events.forEach((e) => el.addEventListener(e, handler));
    const blur = () => setMatch(null);
    el.addEventListener("blur", blur);
    return () => {
      events.forEach((e) => el.removeEventListener(e, handler));
      el.removeEventListener("blur", blur);
    };
  }, [textareaRef, sync]);

  const dismiss = React.useCallback(() => {
    setMatch((m) => {
      if (m) dismissed.current = `${m.start}:${m.trigger}`;
      return null;
    });
  }, []);

  const replace = React.useCallback(
    (text: string) => {
      const el = textareaRef.current;
      if (!el || !match) return;
      replaceTextRange(el, match.start, match.end, text);
      sync();
    },
    [textareaRef, match, sync]
  );

  return { match, dismiss, replace, sync };
}

export interface SlashCommand {
  id: string;
  name: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Extra search terms. */
  keywords?: string[];
  /** Text that replaces the trigger token on select. Default "" (token removed). */
  insertText?: string;
  disabled?: boolean;
}

export interface SlashMenuProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The composer textarea to attach to. */
  anchorRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  /** Commands (or mentions) to offer, each with a name, optional description and keywords. */
  commands: SlashCommand[];
  /** Trigger character(s). Default "/". Use "@" for mentions. */
  trigger?: string | string[];
  /** Called with the chosen command and the trigger match (trigger, query and caret range) when the user picks one. */
  onSelect?: (command: SlashCommand, match: SlashTriggerMatch) => void;
  /** Header label. Default "Commands" (or "Mentions" for "@"). */
  heading?: React.ReactNode;
  /** Shown when nothing matches. Default "No matching commands". */
  emptyState?: React.ReactNode;
  /** Content shown when there is nothing to list. @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
  /** Max visible rows before scrolling. Default 8. */
  maxRows?: number;
  /** Custom filter; default matches name/keywords (prefix matches first). */
  filter?: (commands: SlashCommand[], query: string) => SlashCommand[];
}

function defaultCommandFilter(commands: SlashCommand[], query: string) {
  const q = query.toLowerCase();
  if (!q) return commands;
  const scored: Array<[number, SlashCommand]> = [];
  for (const c of commands) {
    const n = c.name.toLowerCase();
    if (n.startsWith(q)) scored.push([0, c]);
    else if (n.includes(q)) scored.push([1, c]);
    else if (c.keywords?.some((k) => k.toLowerCase().includes(q))) scored.push([2, c]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, c]) => c);
}

/** Wrap the first case-insensitive occurrence of `query` in a <mark>. */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark data-slot="match" className="rounded-[2px] bg-primary-soft px-0 text-primary-soft-foreground">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}

/** Inline command / mention listbox anchored to the caret of a composer textarea. */
export const SlashMenu = React.forwardRef<HTMLDivElement, SlashMenuProps>(
  ({ anchorRef, commands, trigger = "/", onSelect, heading, emptyState, emptyText, maxRows = 8, filter = defaultCommandFilter, className, style, onMouseDown, ...props }, ref) => {
    const triggers = React.useMemo(() => (Array.isArray(trigger) ? trigger : [trigger]), [trigger]);
    const { match, dismiss, replace } = useSlashTrigger(anchorRef, triggers);
    const items = React.useMemo(() => (match ? filter(commands, match.query) : []), [match, commands, filter]);
    const [active, setActive] = React.useState(0);
    const listId = React.useId();
    const optionId = (i: number) => `${listId}-opt-${i}`;
    const open = !!match;
    const caret = useCaretAnchor(anchorRef, match?.start ?? null, open);
    const listRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => setActive(0), [match?.query, match?.start]);

    const choose = React.useCallback(
      (cmd: SlashCommand | undefined) => {
        if (!cmd || cmd.disabled || !match) return;
        replace(cmd.insertText ?? "");
        onSelect?.(cmd, match);
      },
      [match, replace, onSelect]
    );

    React.useEffect(() => {
      const el = anchorRef.current;
      if (!el || !open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.isComposing) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          if (!items.length) return;
          e.preventDefault();
          setActive((i) => (e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length));
        } else if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
          if (!items.length) return;
          e.preventDefault();
          e.stopPropagation();
          choose(items[active]);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }
      };
      const node = el as HTMLElement;
      node.addEventListener("keydown", onKey, true);
      return () => node.removeEventListener("keydown", onKey, true);
    }, [anchorRef, open, items, active, choose, dismiss]);

    React.useEffect(() => {
      const el = anchorRef.current;
      if (!el) return;
      if (open) {
        el.setAttribute("aria-autocomplete", "list");
        el.setAttribute("aria-controls", listId);
        if (items[active]) el.setAttribute("aria-activedescendant", optionId(active));
        else el.removeAttribute("aria-activedescendant");
      } else {
        el.removeAttribute("aria-controls");
        el.removeAttribute("aria-activedescendant");
      }
    });

    React.useEffect(() => {
      if (!open) return;
      listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    if (!open || typeof document === "undefined") return null;
    const rect = anchorRef.current?.getBoundingClientRect();
    const top = caret?.top ?? rect?.top ?? 0;
    const below = top < (typeof window !== "undefined" ? window.innerHeight / 2 : 400);
    const positionStyle: React.CSSProperties = below
      ? { top: top + (caret?.height ?? 16) + 4, left: caret?.left ?? rect?.left ?? 0 }
      : { bottom: (typeof window !== "undefined" ? window.innerHeight : 800) - top + 4, left: caret?.left ?? rect?.left ?? 0 };
    const label = heading ?? (triggers[0] === "@" ? "Mentions" : "Commands");

    return createPortal(
      <div
        ref={ref}
        data-slot="slash-menu"
        data-side={below ? "bottom" : "top"}
        className={cn(
          "fixed z-50 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-box border border-border bg-popover text-popover-foreground shadow-lg",
          "animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={{ ...positionStyle, ...style }}
        {...props}
        onMouseDown={(e) => {
          onMouseDown?.(e);
          e.preventDefault(); // keep the caret in the composer
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium">{label}</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <Kbd>↑↓</Kbd>
            <Kbd>↵</Kbd>
            <Kbd>esc</Kbd>
          </span>
        </div>
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={typeof label === "string" ? label : "Commands"}
          className="overflow-y-auto p-1 scrollbar-thin"
          style={{ maxHeight: maxRows * 44 + 8 }}
        >
          {items.length === 0 ? (
            <div role="option" aria-selected={false} aria-disabled="true" className="px-2 py-3 text-center text-sm text-muted-foreground">
              {emptyState ?? emptyText ?? "No matching commands"}
            </div>
          ) : (
            items.map((c, i) => (
              <div
                key={c.id}
                id={optionId(i)}
                role="option"
                data-index={i}
                aria-selected={i === active}
                aria-disabled={c.disabled || undefined}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(c)}
                className={cn(
                  "flex cursor-default items-start gap-2.5 rounded-sm px-2 py-1.5 text-sm",
                  i === active && "bg-accent text-accent-foreground",
                  c.disabled && "opacity-50"
                )}
              >
                {c.icon ? <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{c.icon}</span> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    <span className="text-muted-foreground">{match!.trigger}</span>
                    {highlightMatch(c.name, match!.query)}
                  </span>
                  {c.description ? <span className="block truncate text-xs text-muted-foreground">{c.description}</span> : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>,
      document.body
    );
  }
);
SlashMenu.displayName = "SlashMenu";
