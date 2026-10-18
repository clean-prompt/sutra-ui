import * as React from "react";
import { useIsoLayoutEffect } from "./use-iso-layout-effect";
import { useResizeObserver } from "./use-resize-observer";

const MIRRORED_STYLES = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "fontStretch", "fontFeatureSettings",
  "fontVariationSettings", "fontKerning", "letterSpacing", "wordSpacing", "lineHeight", "textTransform", "textIndent",
  "textAlign", "tabSize", "direction", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopStyle", "borderRightStyle",
  "borderBottomStyle", "borderLeftStyle", "whiteSpace", "wordBreak", "overflowWrap",
] as const;

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
    for (const prop of MIRRORED_STYLES) {
      const v = (cs as unknown as Record<string, string>)[prop];
      if (v) style[prop] = v;
    }
    mirror.style.boxSizing = "border-box";
    mirror.style.borderColor = "transparent";
    if (ta.offsetWidth) mirror.style.width = `${ta.offsetWidth}px`;
    if (ta.offsetHeight) mirror.style.height = `${ta.offsetHeight}px`;
    const borders = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
    const gutter = Math.max(0, ta.offsetWidth - ta.clientWidth - borders);
    if (gutter) mirror.style.paddingRight = `${(parseFloat(cs.paddingRight) || 0) + gutter}px`;
    mirror.scrollTop = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;
  }, [textareaRef]);

  useIsoLayoutEffect(() => {
    if (enabled) sync();
  }, [enabled, value, sync]);

  useResizeObserver(enabled ? textareaRef : null, () => sync());

  return { mirrorRef, sync, onScroll: sync };
}
