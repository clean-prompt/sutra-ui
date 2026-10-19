import * as React from "react";

/**
 * True while the element's content overflows its box. A scrolling region needs a keyboard tab stop so the arrow keys can
 * scroll it (WCAG 2.1.1), but one that does not overflow should not add a useless stop: give `tabIndex={scrollable ? 0 : undefined}`.
 * False on the server and on the first client render (so hydration matches), then measured and kept current from resizes of
 * the element and of its children (the content).
 */
export function useScrollable<T extends HTMLElement>(ref: React.RefObject<T | null>): boolean {
  const [scrollable, setScrollable] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScrollable(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [ref]);
  return scrollable;
}
