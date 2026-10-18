import * as React from "react";
import { getTextareaCaretRect } from "../lib/text-field";

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
