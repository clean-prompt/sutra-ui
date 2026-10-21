import * as React from "react";
import { normalizeDirection } from "../lib/direction";
import { TEXT_MIRROR_BORDER_STYLES, TEXT_MIRROR_STYLES } from "../lib/text-field";
import { useIsoLayoutEffect } from "./use-iso-layout-effect";
import { useResizeObserver } from "./use-resize-observer";

/** Options for `useTextareaMirror`: an enabled switch. */
export interface UseTextareaMirrorOptions {
  /** Skip all work when false. Default true. */
  enabled?: boolean;
}

/**
 * Keeps a mirror element laid out exactly like a textarea (font, padding, borders, wrapping, scrollbar gutter,
 * size and scroll offset) so text rendered in the mirror lines up with the textarea's glyphs.
 * Attach `mirrorRef` to an absolutely positioned element behind the textarea and `onScroll` to the textarea.
 */
export function useTextareaMirror(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  { enabled = true }: UseTextareaMirrorOptions = {}
) {
  const mirrorRef = React.useRef<HTMLDivElement | null>(null);
  const sync = React.useCallback(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror || typeof window === "undefined") return;
    const cs = window.getComputedStyle(ta);
    const style = mirror.style as unknown as Record<string, string>;
    for (const prop of [...TEXT_MIRROR_STYLES, ...TEXT_MIRROR_BORDER_STYLES]) {
      const v = (cs as unknown as Record<string, string>)[prop];
      if (v) style[prop] = v;
    }
    mirror.style.boxSizing = "border-box";
    mirror.style.borderColor = "transparent";
    if (ta.offsetWidth) mirror.style.width = `${ta.offsetWidth}px`;
    if (ta.offsetHeight) mirror.style.height = `${ta.offsetHeight}px`;
    const borders = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
    const gutter = Math.max(0, ta.offsetWidth - ta.clientWidth - borders);
    if (gutter) {
      // The scrollbar sits on the inline-end side of the field: the left in right-to-left (its own computed direction).
      const side = normalizeDirection(cs.direction) === "rtl" ? "paddingLeft" : "paddingRight";
      mirror.style[side] = `${(parseFloat(cs[side]) || 0) + gutter}px`;
    }
    mirror.scrollTop = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;
  }, [textareaRef]);

  useIsoLayoutEffect(() => {
    if (enabled) sync();
  }, [enabled, value, sync]);

  useResizeObserver(enabled ? textareaRef : null, () => sync());

  return { mirrorRef, sync, onScroll: sync };
}
