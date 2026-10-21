import * as React from "react";

/**
 * True while the element's content overflows its box. A scrolling region needs a keyboard tab stop so the arrow keys can
 * scroll it (WCAG 2.1.1), but one that does not overflow should not add a useless stop: give `tabIndex={scrollable ? 0 : undefined}`.
 * False on the server and on the first client render (so hydration matches), then measured and kept current from resizes of
 * the element, of its children (the content) and of the child list (content added later).
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
    const watched = new Set<Element>();
    // Children come and go: watch the current ones, drop the removed ones and re-measure when the child list changes.
    const watchChildren = () => {
      const now = new Set(Array.from(el.children));
      for (const child of watched) {
        if (now.has(child)) continue;
        observer.unobserve(child);
        watched.delete(child);
      }
      for (const child of now) {
        if (watched.has(child)) continue;
        observer.observe(child);
        watched.add(child);
      }
    };
    watchChildren();
    const mutations = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
      watchChildren();
      update();
    });
    mutations?.observe(el, { childList: true });
    return () => {
      mutations?.disconnect();
      observer.disconnect();
    };
  }, [ref]);
  return scrollable;
}
