import * as React from "react";
import { useIsoLayoutEffect } from "./use-iso-layout-effect";

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
