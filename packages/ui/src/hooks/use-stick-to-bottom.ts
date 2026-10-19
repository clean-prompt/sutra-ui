import * as React from "react";
import { useResizeObserver } from "./use-resize-observer";

/** Options for `useStickToBottom`: the at-bottom threshold, whether to follow size changes and the initial position. */
export interface UseStickToBottomOptions {
  /** Distance in px from the bottom that still counts as "at bottom". */
  threshold?: number;
  /** Scroll behavior used when content grows while stuck to the bottom. */
  resize?: ScrollBehavior;
  /** Scroll behavior for the first jump to the bottom on mount. */
  initial?: ScrollBehavior | false;
}

/** What `useStickToBottom` returns: the scroll and content refs, whether the view is at the bottom and `scrollToBottom`. */
export interface StickToBottomState {
  /** Attach to the scrolling element. */
  scrollRef: (node: HTMLElement | null) => void;
  /** Attach to the element wrapping the messages; its size changes trigger auto-scroll. */
  contentRef: (node: HTMLElement | null) => void;
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

/** Keep a scroller pinned to the bottom while content grows, until the user scrolls up. */
export function useStickToBottom({
  threshold = 64,
  resize = "smooth",
  initial = "instant",
}: UseStickToBottomOptions = {}): StickToBottomState {
  const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null);
  const [contentEl, setContentEl] = React.useState<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const stuck = React.useRef(true);
  const lastTop = React.useRef(0);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (!scrollEl) return;
      stuck.current = true;
      setIsAtBottom(true);
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior });
    },
    [scrollEl]
  );

  React.useEffect(() => {
    if (!scrollEl) return;
    if (initial !== false) scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: initial });
    lastTop.current = scrollEl.scrollTop;

    const onScroll = () => {
      const top = scrollEl.scrollTop;
      const distance = scrollEl.scrollHeight - top - scrollEl.clientHeight;
      const atBottom = distance <= threshold;
      if (atBottom) stuck.current = true;
      else if (top < lastTop.current - 1) stuck.current = false;
      lastTop.current = top;
      setIsAtBottom(atBottom || stuck.current);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && scrollEl.scrollHeight > scrollEl.clientHeight) {
        stuck.current = false;
      }
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    scrollEl.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      scrollEl.removeEventListener("wheel", onWheel);
    };
    // `initial` only matters on mount of the scroller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollEl, threshold]);

  const onResize = () => {
    if (!scrollEl) return;
    if (stuck.current) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: resize });
    } else {
      const distance = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
      setIsAtBottom(distance <= threshold);
    }
  };
  useResizeObserver(contentEl ?? scrollEl, onResize);
  useResizeObserver(contentEl ? scrollEl : null, onResize);

  return { scrollRef: setScrollEl, contentRef: setContentEl, isAtBottom, scrollToBottom };
}
