import * as React from "react";
import { graphemes } from "../lib/text";
import { useLatestRef } from "./use-iso-layout-effect";
import { prefersReducedMotion } from "./use-media-query";

export interface UseTypewriterOptions {
  /** Milliseconds per typed character. Default 45. */
  speed?: number;
  /** Milliseconds per deleted character. Default 25. */
  deleteSpeed?: number;
  /** Milliseconds before the first character. Default 0. */
  delay?: number;
  /** Milliseconds a finished line is held before it is deleted (several lines only). Default 1600. */
  hold?: number;
  /** With several lines, start over after the last one (it is deleted first). Default false: the last line stays. */
  loop?: boolean;
  /** Called when the last line has been typed (never with `loop`). */
  onDone?: () => void;
}

export interface TypewriterState {
  /** The part of the current line typed so far. */
  text: string;
  /** The whole current line (what a screen reader should get). */
  line: string;
  /** Index of the current line. */
  index: number;
  /** True once the last line is fully typed and nothing more will happen. */
  done: boolean;
}

type Phase = "type" | "hold" | "delete" | "done";
interface Run {
  sig: string;
  index: number;
  shown: number;
  phase: Phase;
}

/**
 * Types one line, or several in turn, one character at a time (graphemes are not split). A `setTimeout` chain driven by
 * state: one timer at a time, none once it is done, all cleared on unmount, safe under StrictMode. Under
 * `prefers-reduced-motion` the full text is there from the first render and nothing runs (with several lines: the first
 * with `loop`, otherwise the last, which is where the typing would have ended).
 */
export function useTypewriter(text: string | readonly string[], options: UseTypewriterOptions = {}): TypewriterState {
  const { speed = 45, deleteSpeed = 25, delay = 0, hold = 1600, loop = false, onDone } = options;
  const lines = React.useMemo(() => (typeof text === "string" ? [text] : [...text]), [text]);
  const sig = lines.join("\u0000");
  const chars = React.useMemo(() => lines.map(graphemes), [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const reduced = prefersReducedMotion();
  const restIndex = loop ? 0 : lines.length - 1;
  const [run, setRun] = React.useState<Run>(() => (reduced ? { sig, index: restIndex, shown: (chars[restIndex] ?? []).length, phase: "done" } : { sig, index: 0, shown: 0, phase: "type" }));
  const doneRef = useLatestRef(onDone);

  // A different set of lines starts over.
  let current = run;
  if (run.sig !== sig) {
    current = reduced ? { sig, index: restIndex, shown: (chars[restIndex] ?? []).length, phase: "done" } : { sig, index: 0, shown: 0, phase: "type" };
    setRun(current);
  }

  React.useEffect(() => {
    if (current.phase === "done" || reduced) return;
    const { index, shown, phase } = current;
    const length = (chars[index] ?? []).length;
    const last = index >= lines.length - 1;
    const go = (next: Partial<Run>, ms: number, after?: () => void) => {
      const id = setTimeout(() => {
        setRun((r) => (r.sig === sig ? { ...r, ...next } : r));
        after?.();
      }, ms);
      return () => clearTimeout(id);
    };
    if (phase === "type") {
      if (shown < length) return go({ shown: shown + 1 }, shown === 0 && index === 0 ? delay + speed : speed);
      if (last && !loop) return go({ phase: "done" }, 0, () => doneRef.current?.());
      return go({ phase: "hold" }, 0);
    }
    if (phase === "hold") return go({ phase: "delete" }, hold);
    if (shown > 0) return go({ shown: shown - 1 }, deleteSpeed);
    return go({ index: last ? 0 : index + 1, phase: "type" }, deleteSpeed);
  }, [current, reduced, chars, lines.length, sig, speed, deleteSpeed, delay, hold, loop]);

  const line = lines[current.index] ?? "";
  if (reduced) return { text: lines[restIndex] ?? "", line: lines[restIndex] ?? "", index: restIndex, done: true };
  return { text: (chars[current.index] ?? []).slice(0, current.shown).join(""), line, index: current.index, done: current.phase === "done" };
}
