import * as React from "react";
import { formatCompact } from "../lib/format";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Compact token count: 950, 1.2K, 33K, 1.1M. */
export function formatTokenCount(n: number) {
  // Whole thousands from 10K up; millions keep one decimal.
  return formatCompact(n, { suffixCase: "upper", wholeAbove: Math.abs(n) < 1_000_000 ? 10 : undefined });
}

/** Set a textarea/input value the way the browser does so React's onChange fires. */
function setNativeInputValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Replace `[start, end)` of a text field with `text`, keeping React in sync, and put the caret after it. */
export function replaceTextRange(el: HTMLTextAreaElement | HTMLInputElement, start: number, end: number, text: string) {
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  setNativeInputValue(el, next);
  const caret = start + text.length;
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    /* not focusable / detached */
  }
  el.focus();
}

const mirrorProps = [
  "boxSizing", "width", "height", "overflowX", "overflowY", "borderTopWidth", "borderRightWidth", "borderBottomWidth",
  "borderLeftWidth", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontStyle", "fontVariant",
  "fontWeight", "fontStretch", "fontSize", "lineHeight", "fontFamily", "textAlign", "textTransform", "textIndent",
  "letterSpacing", "wordSpacing", "tabSize", "direction",
] as const;

/**
 * Viewport rect of the caret at `position` in a textarea/input (mirror-div technique).
 * Falls back to the field's own top-left in environments without layout.
 */
export function getTextareaCaretRect(el: HTMLTextAreaElement | HTMLInputElement, position = el.selectionStart ?? 0) {
  const rect = el.getBoundingClientRect();
  if (typeof window === "undefined" || typeof document === "undefined") return { top: 0, left: 0, height: 16 };
  const cs = window.getComputedStyle(el);
  const div = document.createElement("div");
  const style = div.style as unknown as Record<string, string>;
  for (const p of mirrorProps) style[p] = (cs as unknown as Record<string, string>)[p] ?? "";
  style.position = "absolute";
  style.visibility = "hidden";
  style.top = "0";
  style.left = "-9999px";
  style.whiteSpace = el instanceof HTMLTextAreaElement ? "pre-wrap" : "pre";
  style.overflowWrap = "break-word";
  div.textContent = el.value.slice(0, position);
  const span = document.createElement("span");
  span.textContent = el.value.slice(position) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 16;
  const top = rect.top + span.offsetTop + (parseFloat(cs.borderTopWidth) || 0) - el.scrollTop;
  const left = rect.left + span.offsetLeft + (parseFloat(cs.borderLeftWidth) || 0) - el.scrollLeft;
  document.body.removeChild(div);
  return { top, left, height: lineHeight };
}

/** Position a fixed popup under (or above) the caret of a field, re-measured on scroll/resize. */
export function useCaretAnchor(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  position: number | null,
  open: boolean
) {
  const [pos, setPos] = React.useState<{ top: number; left: number; height: number } | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el || position == null) {
      setPos(null);
      return;
    }
    const measure = () => setPos(getTextareaCaretRect(el, position));
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [ref, position, open]);
  return pos;
}
