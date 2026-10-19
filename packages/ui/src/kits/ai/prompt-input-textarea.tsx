/** PromptInput textarea with auto-grow, Enter-to-submit, paste routing and inline token highlighting. */
import * as React from "react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { useIsoLayoutEffect } from "../../hooks/use-iso-layout-effect";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { useTextareaMirror } from "../../hooks/use-textarea-mirror";
import { useMergedRefs } from "../../hooks/use-merged-refs";
import { usePromptInput } from "./prompt-input-internal";

/* ------------------------------------------------------------------ */
/* Inline highlighting (mirror overlay)                                */
/* ------------------------------------------------------------------ */

export interface PromptInputHighlightRule {
  /** Global-or-not regex; every match is highlighted (use a capture group named `token` to highlight part of a match). */
  pattern?: RegExp;
  /** Explicit [start, end) character ranges. */
  ranges?: ReadonlyArray<readonly [number, number]>;
  className?: string;
  /** Exposed as `data-highlight` on the span (e.g. "mention", "tag", "command"). */
  kind?: string;
}

/** `true` = highlight `@file`, `#tag` and `/command` tokens; an array = custom rules; or both. */
export type PromptInputHighlight =
  | boolean
  | PromptInputHighlightRule[]
  | { mentions?: boolean; rules?: PromptInputHighlightRule[] };

export interface PromptInputHighlightSegment {
  text: string;
  start: number;
  end: number;
  kind?: string;
  className?: string;
}

const tokenHighlight = "rounded-xs bg-primary-soft text-primary-soft-foreground shadow-[0_0_0_1px_var(--color-primary-soft)]";

/** Built-in rules for agent prompts: `@path/to/file`, `#tag` and a leading `/command`. */
export const mentionHighlightRules: PromptInputHighlightRule[] = [
  { kind: "mention", pattern: /(?<token>[@#/]\[[^\]\n]+\]\([a-z]+:[^)\s]+\))/g, className: tokenHighlight },
  { kind: "mention", pattern: /(?:^|(?<=[\s(]))(?<token>@(?:"[^"\n]+"|[^\s@]*[^\s@.,;:!?)\]]))/g, className: tokenHighlight },
  { kind: "tag", pattern: /(?:^|(?<=[\s(]))(?<token>#[\p{L}\p{N}_][\p{L}\p{N}_\-./]*)/gu, className: "rounded-xs bg-info-soft text-info-soft-foreground shadow-[0_0_0_1px_var(--color-info-soft)]" },
  { kind: "command", pattern: /(?:^|(?<=\n))[ \t]*(?<token>\/[\w][\w\-:.]*)/g, className: "rounded-xs bg-warning-soft text-warning-soft-foreground shadow-[0_0_0_1px_var(--color-warning-soft)]" },
];

function resolveHighlightRules(highlight: PromptInputHighlight | undefined): PromptInputHighlightRule[] {
  if (!highlight) return [];
  if (highlight === true) return mentionHighlightRules;
  if (Array.isArray(highlight)) return highlight;
  return [...(highlight.rules ?? []), ...(highlight.mentions ? mentionHighlightRules : [])];
}

/** Split text into plain and highlighted segments. Earlier rules win where matches overlap. */
export function highlightTextSegments(text: string, rules: readonly PromptInputHighlightRule[]): PromptInputHighlightSegment[] {
  const marks: Array<{ start: number; end: number; kind?: string; className?: string }> = [];
  const free = (start: number, end: number) => marks.every((m) => end <= m.start || start >= m.end);
  for (const rule of rules) {
    const add = (start: number, end: number) => {
      const s = Math.max(0, start);
      const e = Math.min(text.length, end);
      if (e > s && free(s, e)) marks.push({ start: s, end: e, kind: rule.kind, className: rule.className });
    };
    for (const [start, end] of rule.ranges ?? []) add(start, end);
    if (rule.pattern) {
      const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g";
      const re = new RegExp(rule.pattern.source, flags.includes("d") ? flags : flags + "d");
      for (const m of text.matchAll(re)) {
        if (m[0].length === 0) continue;
        const idx = (m as RegExpMatchArray & { indices?: { groups?: Record<string, [number, number] | undefined> } }).indices;
        const token = idx?.groups?.token;
        if (token) add(token[0], token[1]);
        else add(m.index ?? 0, (m.index ?? 0) + m[0].length);
      }
    }
  }
  marks.sort((a, b) => a.start - b.start);
  const out: PromptInputHighlightSegment[] = [];
  let last = 0;
  for (const m of marks) {
    if (m.start > last) out.push({ text: text.slice(last, m.start), start: last, end: m.start });
    out.push({ text: text.slice(m.start, m.end), ...m });
    last = m.end;
  }
  if (last < text.length) out.push({ text: text.slice(last), start: last, end: text.length });
  return out;
}

export { useTextareaMirror, type UseTextareaMirrorOptions } from "../../hooks/use-textarea-mirror";

export interface PromptInputTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue"> {
  /** Rows shown when the text is short. Default 1. */
  minRows?: number;
  /** Rows after which the textarea stops growing and scrolls. Default 8. */
  maxRows?: number;
  /** Submit on Enter (Shift+Enter inserts a newline). Default true. */
  submitOnEnter?: boolean;
  /**
   * Highlight tokens inline. Renders a synchronized mirror behind a transparent-text textarea, so caret,
   * selection, IME and native editing are untouched. `true` highlights `@file`, `#tag` and `/command`.
   */
  highlight?: PromptInputHighlight;
  /** Class for the mirror layer (rarely needed). */
  mirrorClassName?: string;
}

/** Auto-growing textarea (1 → 8 rows). Enter submits, Shift+Enter adds a line, IME composition is respected. */
export const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  (
    {
      minRows = 1,
      maxRows = 8,
      submitOnEnter = true,
      placeholder = "Ask anything…",
      className,
      onChange,
      onKeyDown,
      onPaste,
      onCompositionStart,
      onCompositionEnd,
      onScroll,
      disabled: disabledProp,
      highlight,
      mirrorClassName,
      ...props
    },
    ref
  ) => {
    const { value, setValue, loading: isLoading, disabled, textareaRef, addFiles, acceptsFiles, onLargePaste: handleLargePaste } = usePromptInput();
    const composing = React.useRef(false);

    const setRefs = useMergedRefs(textareaRef, ref);

    const resize = React.useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      const style = window.getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || 24;
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const min = lineHeight * minRows + padding;
      const max = lineHeight * maxRows + padding;
      el.style.height = "auto";
      const next = clamp(el.scrollHeight, min, max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
    }, [minRows, maxRows, textareaRef]);

    useIsoLayoutEffect(() => {
      resize();
    }, [value, resize]);

    const widthRef = React.useRef<number | undefined>(undefined);
    useResizeObserver(textareaRef, (entry) => {
      const width = (entry.target as HTMLElement).clientWidth;
      if (width === widthRef.current) return;
      widthRef.current = width;
      resize();
    });

    const rules = React.useMemo(() => resolveHighlightRules(highlight), [highlight]);
    const highlighting = rules.length > 0;
    const mirror = useTextareaMirror(textareaRef, value, { enabled: highlighting });
    const segments = React.useMemo(
      () => (highlighting ? highlightTextSegments(value, rules) : []),
      [highlighting, value, rules]
    );

    const textarea = (
      <textarea
        ref={setRefs}
        rows={minRows}
        value={value}
        placeholder={placeholder}
        disabled={disabledProp ?? disabled}
        aria-label={props["aria-label"] ?? "Message"}
        onChange={(e) => {
          onChange?.(e);
          setValue(e.target.value);
        }}
        onCompositionStart={(e) => {
          composing.current = true;
          onCompositionStart?.(e);
        }}
        onCompositionEnd={(e) => {
          composing.current = false;
          onCompositionEnd?.(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || !submitOnEnter) return;
          if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
          if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          if (isLoading) return;
          e.currentTarget.form?.requestSubmit();
        }}
        onScroll={(e) => {
          onScroll?.(e);
          if (highlighting) mirror.onScroll();
        }}
        onPaste={(e) => {
          onPaste?.(e);
          if (e.defaultPrevented) return;
          const files = acceptsFiles ? Array.from(e.clipboardData?.files ?? []) : [];
          if (files.length > 0) {
            e.preventDefault();
            addFiles(files);
            return;
          }
          if (handleLargePaste) {
            const text = e.clipboardData?.getData("text/plain") ?? "";
            const el = e.currentTarget;
            if (text && handleLargePaste(text, [el.selectionStart ?? value.length, el.selectionEnd ?? value.length])) e.preventDefault();
          }
        }}
        className={cn(
          "scrollbar-thin block w-full resize-none border-0 bg-transparent px-4 pb-2 pt-3.5 text-[15px] leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
          highlighting &&
            "relative z-[1] text-transparent caret-foreground selection:bg-primary/25 selection:text-transparent",
          className
        )}
        {...props}
      />
    );

    if (!highlighting) return textarea;
    return (
      <div data-slot="prompt-input-highlight" className="relative w-full">
        <div
          ref={mirror.mirrorRef}
          aria-hidden
          data-slot="prompt-input-mirror"
          className={cn(
            "pointer-events-none absolute start-0 top-0 overflow-hidden whitespace-pre-wrap break-words border-0 px-4 pb-2 pt-3.5 text-[15px] leading-6 text-foreground [overflow-wrap:break-word]",
            className,
            "m-0 bg-transparent",
            mirrorClassName
          )}
        >
          {segments.map((seg) =>
            seg.kind || seg.className ? (
              <span key={seg.start} data-highlight={seg.kind ?? ""} className={seg.className}>
                {seg.text}
              </span>
            ) : (
              <React.Fragment key={seg.start}>{seg.text}</React.Fragment>
            )
          )}
          {value.endsWith("\n") || value === "" ? "\u200b" : null}
        </div>
        {textarea}
      </div>
    );
  }
);
PromptInputTextarea.displayName = "PromptInputTextarea";
