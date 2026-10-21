import * as React from "react";
import { createPortal } from "react-dom";
import { RiTranslate2 } from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { replaceTextRange } from "../../lib/text-field";
import { useCaretAnchor } from "../../hooks/use-caret-anchor";

/* ------------------------------------------------------------------ */
/* TransliterationCandidates                                           */
/* ------------------------------------------------------------------ */

const LATIN = /[A-Za-z]/;

/** The run of Latin letters touching `caret`, or null. */
export function latinWordAt(value: string, caret: number) {
  let start = caret;
  while (start > 0 && LATIN.test(value[start - 1]!)) start--;
  let end = caret;
  while (end < value.length && LATIN.test(value[end]!)) end++;
  if (start === end) return null;
  return { start, end, text: value.slice(start, end) };
}

export interface TransliterationCandidatesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The textarea / input being typed in. */
  anchorRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  /** Return candidates for a romanized word. May be async. */
  getCandidates: (word: string, lang: string) => string[] | Promise<string[]>;
  /** Language code passed to `getCandidates`. */
  lang: string;
  /** IME on/off. Default true. */
  enabled?: boolean;
  /** Max candidates shown (and number keys honored). Default 5. */
  max?: number;
  /** Called with the chosen candidate and the romanized word it replaces. */
  onSelect?: (candidate: string, word: string) => void;
}

/** IME-style candidate popup under the caret: pick by number, click, or arrows + Enter/Space; Esc keeps the raw text. */
export const TransliterationCandidates = React.forwardRef<HTMLDivElement, TransliterationCandidatesProps>(
  ({ anchorRef, getCandidates, lang, enabled = true, max = 5, onSelect, className, style, ...props }, ref) => {
    const [word, setWord] = React.useState<{ start: number; end: number; text: string } | null>(null);
    const [items, setItems] = React.useState<string[]>([]);
    const [active, setActive] = React.useState(0);
    const [dismissed, setDismissed] = React.useState<string | null>(null);
    const seq = React.useRef(0);
    const uid = React.useId();
    const getRef = useLatestRef(getCandidates);

    const sig = word ? `${word.start}:${word.text}` : null;
    const open = enabled && !!word && items.length > 0 && sig !== dismissed;
    const caret = useCaretAnchor(anchorRef, word?.start ?? null, open);

    const sync = React.useCallback(() => {
      const el = anchorRef.current;
      if (!el || !enabled) {
        setWord(null);
        return;
      }
      const pos = el.selectionStart ?? el.value.length;
      const w = el.selectionEnd != null && el.selectionEnd !== pos ? null : latinWordAt(el.value, pos);
      setWord((prev) => (prev && w && prev.start === w.start && prev.end === w.end && prev.text === w.text ? prev : w));
    }, [anchorRef, enabled]);

    React.useEffect(() => {
      if (dismissed !== null && sig !== dismissed) setDismissed(null);
    }, [sig, dismissed]);

    React.useEffect(() => {
      if (!word || !enabled) {
        setItems([]);
        return;
      }
      const id = ++seq.current;
      const apply = (list: string[]) => {
        if (id !== seq.current) return;
        setItems(list.slice(0, max));
        setActive(0);
      };
      const result = getRef.current(word.text, lang);
      if (Array.isArray(result)) apply(result);
      else {
        // Hide the previous word's candidates while these load, so Enter/Space can't commit a stale one.
        setItems([]);
        result.then(apply, () => apply([]));
      }
    }, [word, lang, enabled, max]);

    React.useEffect(() => {
      const el = anchorRef.current as HTMLElement | null;
      if (!el) return;
      const events = ["input", "change", "click", "keyup", "select"] as const;
      events.forEach((e) => el.addEventListener(e, sync));
      const blur = () => setWord(null);
      el.addEventListener("blur", blur);
      return () => {
        events.forEach((e) => el.removeEventListener(e, sync));
        el.removeEventListener("blur", blur);
      };
    }, [anchorRef, sync]);

    React.useEffect(() => {
      if (!enabled) setWord(null);
    }, [enabled]);

    const commit = React.useCallback(
      (candidate: string | undefined, suffix = "") => {
        const el = anchorRef.current;
        if (!el || !word || candidate == null) return;
        const w = word;
        setWord(null);
        setItems([]);
        replaceTextRange(el, w.start, w.end, candidate + suffix);
        onSelect?.(candidate, w.text);
      },
      [anchorRef, word, onSelect]
    );

    React.useEffect(() => {
      const el = anchorRef.current as HTMLElement | null;
      if (!el || !open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
        const n = items.length;
        if (/^[1-9]$/.test(e.key)) {
          const i = Number(e.key) - 1;
          if (i < n) {
            e.preventDefault();
            commit(items[i]);
          }
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          setActive((i) => (i + 1) % n);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          setActive((i) => (i - 1 + n) % n);
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          commit(items[active]);
        } else if (e.key === " ") {
          e.preventDefault();
          commit(items[active], " ");
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setDismissed(sig);
        }
      };
      el.addEventListener("keydown", onKey, true);
      return () => el.removeEventListener("keydown", onKey, true);
    }, [anchorRef, open, items, active, commit, sig]);

    React.useEffect(() => {
      const el = anchorRef.current;
      if (!el) return;
      if (open) {
        el.setAttribute("aria-controls", `${uid}-list`);
        el.setAttribute("aria-activedescendant", `${uid}-c-${active}`);
      } else {
        el.removeAttribute("aria-activedescendant");
        if (el.getAttribute("aria-controls") === `${uid}-list`) el.removeAttribute("aria-controls");
      }
    });

    if (!open || typeof document === "undefined") return null;
    const rect = anchorRef.current?.getBoundingClientRect();
    return createPortal(
      <div
        ref={ref}
        data-slot="transliteration-candidates"
        onMouseDown={(e) => e.preventDefault()}
        className={cn("fixed z-50 min-w-40 overflow-hidden rounded-box border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0", className)}
        style={{ top: (caret?.top ?? rect?.top ?? 0) + (caret?.height ?? 20) + 4, left: caret?.left ?? rect?.left ?? 0, ...style }}
        {...props}
      >
        <div id={`${uid}-list`} role="listbox" aria-label={`Candidates for ${word!.text}`} className="p-1">
          {items.map((c, i) => (
            <div
              key={`${c}-${i}`}
              id={`${uid}-c-${i}`}
              role="option"
              aria-selected={i === active}
              lang={lang}
              onMouseMove={() => setActive(i)}
              onClick={() => commit(c)}
              className={cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1 text-base", i === active && "bg-accent text-accent-foreground")}
            >
              <span aria-hidden="true" className="w-3 font-mono text-xs text-muted-foreground">
                {i + 1}
              </span>
              {c}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-2 py-1 text-2xs text-muted-foreground">
          <span className="font-mono">{word!.text}</span> · 1–{items.length} pick · esc keep
        </div>
      </div>,
      document.body
    );
  }
);
TransliterationCandidates.displayName = "TransliterationCandidates";

export interface TransliterationToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** Controlled on/off state of transliteration. */
  pressed?: boolean;
  /** Initial state when uncontrolled. Default false. */
  defaultPressed?: boolean;
  /** Called with the new state when the user presses the toggle. */
  onPressedChange?: (pressed: boolean) => void;
  /** Script sample shown on the button. Default "अ". */
  glyph?: React.ReactNode;
  /** Language name for the label, e.g. "Hindi". */
  languageName?: string;
}

/** IME on/off toggle for transliteration input. */
export const TransliterationToggle = React.forwardRef<HTMLButtonElement, TransliterationToggleProps>(
  ({ pressed: pressedProp, defaultPressed = false, onPressedChange, glyph = "अ", languageName, className, ...props }, ref) => {
    const [pressed, setPressed] = useControllableState({ value: pressedProp, defaultValue: defaultPressed, onChange: onPressedChange });
    return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      aria-label={languageName ? `Type in ${languageName} script` : "Transliteration"}
      onClick={() => setPressed(!pressed)}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-control px-2 text-sm font-medium transition-colors",
        pressed ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        focusRing,
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {glyph}
      </span>
      <RiTranslate2 aria-hidden="true" className="size-3.5" />
    </button>
    );
  }
);
TransliterationToggle.displayName = "TransliterationToggle";
