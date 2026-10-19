import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn, type Size } from "../lib/cn";
import { escapeRegExp, matchRanges } from "../lib/text";
import { useControllableState } from "../hooks/use-controllable-state";
import { usePendingRemoval } from "../hooks/use-pending-removal";
import { useField } from "./field";
import { CloseButton } from "./close-button";
import { inputShellVariants } from "./input";

export type TagRejectReason = "duplicate" | "invalid" | "max";

export interface TagRenderState {
  index: number;
  /** The tag can be removed (not disabled or read-only). */
  interactive: boolean;
  /** The tag is marked for removal by the next Backspace (see `confirmBackspace`). */
  pending: boolean;
  remove: () => void;
}

export interface TagInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "size" | "max" | "prefix"
  > {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Maximum number of tags. */
  max?: number;
  /** Return `false` to reject a tag. */
  validate?: (tag: string, tags: string[]) => boolean;
  /** Called when a tag is rejected. */
  onReject?: (tag: string, reason: TagRejectReason) => void;
  /** Allow the same tag more than once (case-insensitive comparison otherwise). */
  allowDuplicates?: boolean;
  /** Extra characters (or strings) that commit a tag. Enter and Tab always do; key names like "Enter" are treated as keys, not characters. Default `[","]`. */
  separators?: string[];
  /** Transform text before it becomes a tag. Default trims whitespace. */
  normalize?: (text: string) => string;
  /** Options shown in a dropdown, filtered as you type. */
  suggestions?: string[];
  /** Only accept tags from `suggestions`. */
  restrictToSuggestions?: boolean;
  /** Commit the pending text when the input loses focus. */
  addOnBlur?: boolean;
  /**
   * Backspace on an empty field first marks the last tag (announced politely: "Press Backspace again to remove …") and a
   * second press removes it. Typing, blur or any other key clears the mark, and a held key never confirms. Default false:
   * Backspace removes the last tag at once.
   */
  confirmBackspace?: boolean;
  /** Custom content for a tag, in place of its text. The chip frame, remove button and pending mark stay. */
  renderTag?: (tag: string, state: TagRenderState) => React.ReactNode;
  /** Show the number of tags (and the limit, with `max`) after the tags. */
  showCount?: boolean;
  size?: Size;
  /** `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. */
  variant?: "outline" | "filled";
  invalid?: boolean;
  /** Class for the outer container. */
  wrapperClassName?: string;
  tagClassName?: string;
  /** Empty state inside the suggestions dropdown. */
  emptyState?: React.ReactNode;
  /** @deprecated Use `emptyState`. */
  emptyText?: React.ReactNode;
}

const minHeights: Record<Size, string> = { sm: "min-h-8", md: "min-h-9", lg: "min-h-10" };
const tagHeights: Record<Size, string> = { sm: "h-5 text-xs", md: "h-6 text-xs", lg: "h-7 text-sm" };

const defaultNormalize = (s: string) => s.trim();

/** Text input that turns entries into removable tag chips, with optional suggestions. */
export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      value: valueProp,
      defaultValue = [],
      onValueChange,
      max,
      validate,
      onReject,
      allowDuplicates = false,
      separators = [","],
      normalize = defaultNormalize,
      suggestions,
      restrictToSuggestions = false,
      addOnBlur = false,
      confirmBackspace = false,
      renderTag,
      showCount = false,
      size = "md",
      variant,
      invalid,
      className,
      wrapperClassName,
      tagClassName,
      emptyState: emptyStateProp,
      emptyText,
      placeholder,
      id,
      disabled,
      required,
      readOnly,
      name,
      onKeyDown,
      onPaste,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const field = useField({
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": props["aria-describedby"],
      "aria-invalid": props["aria-invalid"],
    });
    const innerRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const listboxId = React.useId();

    const [tags, setTags] = useControllableState<string[]>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });
    const [text, setText] = React.useState("");
    const removal = usePendingRemoval(confirmBackspace ? tags.length : 0);
    const countId = React.useId();
    const [open, setOpen] = React.useState(false);
    const [active, setActive] = React.useState(-1);

    const interactive = !field.disabled && !readOnly;
    const atMax = max != null && tags.length >= max;

    const filtered = React.useMemo(() => {
      if (!suggestions?.length) return [];
      const taken = new Set(tags.map((t) => t.toLowerCase()));
      const q = text.trim().toLowerCase();
      return suggestions.filter(
        (s) => (allowDuplicates || !taken.has(s.toLowerCase())) && (!q || s.toLowerCase().includes(q))
      );
    }, [suggestions, tags, text, allowDuplicates]);

    const emptyState = emptyStateProp ?? emptyText;
    const showList = open && interactive && !atMax && Boolean(suggestions?.length) && (filtered.length > 0 || emptyState != null);

    React.useEffect(() => {
      setActive((i) => (filtered.length === 0 ? -1 : Math.min(i, filtered.length - 1)));
    }, [filtered.length]);

    const addTags = React.useCallback(
      (raw: string[]) => {
        const next = [...tags];
        let added = false;
        for (const r of raw) {
          const tag = normalize(r);
          if (!tag) continue;
          if (max != null && next.length >= max) {
            onReject?.(tag, "max");
            break;
          }
          if (!allowDuplicates && next.some((t) => t.toLowerCase() === tag.toLowerCase())) {
            onReject?.(tag, "duplicate");
            continue;
          }
          const allowed =
            (!restrictToSuggestions || (suggestions ?? []).some((s) => s.toLowerCase() === tag.toLowerCase())) &&
            (!validate || validate(tag, next));
          if (!allowed) {
            onReject?.(tag, "invalid");
            continue;
          }
          next.push(tag);
          added = true;
        }
        if (added) setTags(next);
        return added;
      },
      [tags, normalize, max, allowDuplicates, restrictToSuggestions, suggestions, validate, onReject, setTags]
    );

    const removeAt = (index: number) => {
      setTags(tags.filter((_, i) => i !== index));
      innerRef.current?.focus();
    };

    const commitText = (candidate = text) => {
      if (!candidate.trim()) return false;
      const ok = addTags([candidate]);
      if (ok) {
        setText("");
        setActive(-1);
      }
      return ok;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || !interactive || e.nativeEvent.isComposing) return;
      if (e.key !== "Backspace") removal.clear();

      if (showList && filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((i) => (i + 1) % filtered.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((i) => (i <= 0 ? filtered.length - 1 : i - 1));
          return;
        }
        if (e.key === "Home" && active >= 0) {
          e.preventDefault();
          setActive(0);
          return;
        }
        if (e.key === "End" && active >= 0) {
          e.preventDefault();
          setActive(filtered.length - 1);
          return;
        }
        if ((e.key === "Enter" || e.key === "Tab") && active >= 0) {
          e.preventDefault();
          commitText(filtered[active]);
          return;
        }
      } else if (e.key === "ArrowDown" && suggestions?.length) {
        e.preventDefault();
        setOpen(true);
        setActive(0);
        return;
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
        return;
      }

      if (e.key === "Enter" || separators.includes(e.key)) {
        if (text.trim()) e.preventDefault();
        commitText();
        return;
      }
      if (e.key === "Tab" && text.trim()) {
        if (commitText()) e.preventDefault();
        return;
      }
      if (e.key === "Backspace" && text === "" && tags.length > 0) {
        e.preventDefault();
        if (!confirmBackspace || removal.press(e.repeat)) setTags(tags.slice(0, -1));
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      removal.clear();
      const v = e.target.value;
      const splitter = separatorPattern(separators);
      const parts = splitter ? v.split(splitter) : [v];
      if (parts.length > 1) {
        const rest = parts.pop() ?? "";
        addTags(parts);
        setText(rest);
      } else {
        setText(v);
      }
      if (suggestions?.length) setOpen(true);
      setActive(-1);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(e);
      if (e.defaultPrevented || !interactive) return;
      const data = e.clipboardData.getData("text");
      const splitter = separatorPattern(separators, "\\r\\n")!;
      if (!splitter.test(data)) return;
      e.preventDefault();
      const parts = data.split(splitter);
      if (text) parts[0] = text + parts[0];
      addTags(parts);
      setText("");
    };

    const activeId = active >= 0 ? `${listboxId}-opt-${active}` : undefined;

    return (
      <PopoverPrimitive.Root open={showList} onOpenChange={(o) => !o && setOpen(false)}>
        <PopoverPrimitive.Anchor asChild>
          <div
            ref={anchorRef}
            data-slot="tag-input"
            data-disabled={field.disabled ? "true" : undefined}
            onMouseDown={(e) => {
              const target = e.target as HTMLElement;
              if (target === innerRef.current || target.closest("button")) return;
              e.preventDefault();
              innerRef.current?.focus();
            }}
            className={cn(
              "flex w-full min-w-0 cursor-text flex-wrap items-center gap-1.5 px-2 py-1 text-sm",
              inputShellVariants({ focus: "within", radius: "box", invalid: field.invalid, disabled: field.disabled, variant }),
              minHeights[size],
              wrapperClassName
            )}
          >
            {tags.map((tag, i) => {
              const pending = removal.pending && i === tags.length - 1;
              return (
              <span
                key={`${tag}-${i}`}
                data-slot="tag-input-tag"
                data-pending-remove={pending ? "true" : undefined}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-control border border-border bg-secondary pl-2 font-medium text-secondary-foreground",
                  "animate-in fade-in-0 zoom-in-95 duration-150",
                  "data-[pending-remove=true]:border-destructive data-[pending-remove=true]:bg-destructive-soft data-[pending-remove=true]:text-destructive-soft-foreground",
                  interactive ? "pr-0.5" : "pr-2",
                  tagHeights[size],
                  tagClassName
                )}
              >
                <span className="truncate">
                  {renderTag ? renderTag(tag, { index: i, interactive, pending, remove: () => removeAt(i) }) : tag}
                </span>
                {interactive && (
                  <CloseButton
                    shape="pill"
                    variant="muted"
                    size="3xs"
                    tabIndex={-1}
                    aria-label={`Remove ${tag}`}
                    onClick={() => removeAt(i)}
                  />
                )}
              </span>
              );
            })}
            <input
              ref={innerRef}
              data-slot="tag-input-field"
              type="text"
              autoComplete="off"
              {...props}
              id={field.id}
              disabled={field.disabled}
              readOnly={readOnly || atMax}
              aria-required={field.required}
              aria-invalid={field["aria-invalid"]}
              aria-describedby={[field["aria-describedby"], showCount ? countId : undefined].filter(Boolean).join(" ") || undefined}
              role={suggestions?.length ? "combobox" : undefined}
              aria-expanded={suggestions?.length ? showList : undefined}
              aria-controls={showList ? listboxId : undefined}
              aria-autocomplete={suggestions?.length ? "list" : undefined}
              aria-activedescendant={showList ? activeId : undefined}
              placeholder={tags.length === 0 ? placeholder : undefined}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={(e) => {
                if (suggestions?.length) setOpen(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                removal.clear();
                setOpen(false);
                setActive(-1);
                if (addOnBlur) commitText();
                onBlur?.(e);
              }}
              className={cn(
                "h-6 min-w-16 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
                atMax && "min-w-0 w-0 px-0",
                className
              )}
            />
            {showCount && (
              <span id={countId} data-slot="tag-input-count" className="ml-auto shrink-0 pl-1 text-xs tabular-nums text-muted-foreground">
                {tags.length}
                {max != null ? ` / ${max}` : ""}
                <span className="sr-only">{max != null ? " tags" : tags.length === 1 ? " tag" : " tags"}</span>
              </span>
            )}
            {confirmBackspace && (
              <span data-slot="tag-input-announcer" aria-live="polite" className="sr-only">
                {removal.pending ? `Press Backspace again to remove ${tags[tags.length - 1]}` : ""}
              </span>
            )}
            {name && tags.map((tag, i) => <input key={`h-${i}`} type="hidden" name={name} value={tag} />)}
          </div>
        </PopoverPrimitive.Anchor>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
            className={cn(
              "z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-box border border-border bg-popover p-1 text-popover-foreground shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Suggestions"
              className="max-h-60 overflow-y-auto scrollbar-thin"
            >
              {filtered.length === 0 ? (
                <li className="px-2 py-1.5 text-sm text-muted-foreground" role="presentation">
                  {emptyState}
                </li>
              ) : (
                filtered.map((s, i) => (
                  <li
                    key={s}
                    id={`${listboxId}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    data-active={i === active || undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => setActive(i)}
                    onClick={() => commitText(s)}
                    className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                  >
                    <Highlight text={s} query={text.trim()} />
                  </li>
                ))
              )}
            </ul>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }
);
TagInput.displayName = "TagInput";

function escapeForClass(ch: string) {
  return ch.replace(/[\\\]\[^-]/g, "\\$&");
}

/** Key names that may appear in `separators`; they commit on keydown and are never split characters. */
const SEPARATOR_KEYS = new Set(["Enter", "Tab"]);

/** Regex splitting text on the character separators (single chars in a class, longer strings by alternation). */
function separatorPattern(separators: string[], extraClass = ""): RegExp | null {
  const textSeps = separators.filter((s) => s && !SEPARATOR_KEYS.has(s));
  const chars = textSeps.filter((s) => s.length === 1).map(escapeForClass).join("") + extraClass;
  const strings = textSeps.filter((s) => s.length > 1).map(escapeRegExp);
  const alts = [...strings, ...(chars ? [`[${chars}]`] : [])];
  return alts.length ? new RegExp(alts.join("|")) : null;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const [range] = matchRanges(text, query, { all: false });
  if (!range) return <>{text}</>;
  const [start, end] = range;
  return (
    <>
      {text.slice(0, start)}
      <span className="font-semibold">{text.slice(start, end)}</span>
      {text.slice(end)}
    </>
  );
}
