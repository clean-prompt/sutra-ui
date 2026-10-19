import * as React from "react";
import { prefersReducedMotion } from "./use-media-query";

export interface UseScrollSectionsOptions {
  /** Element ids of the sections, in page order. */
  ids: readonly string[];
  /** Pixels below the top of the scroll area where a section starts to count as current (a fixed header's height). Default 0. */
  offset?: number;
  /** Full `IntersectionObserver` root margin, replacing the `offset` based default (`0px 0px -65% 0px`: the top third counts). */
  rootMargin?: string;
  /** The scrolling element (or a ref to it). Default: the viewport. */
  root?: Element | null | React.RefObject<Element | null>;
  /** Turn tracking off (the active id then only changes through `scrollTo` and `setActive`). Default true. */
  enabled?: boolean;
  /** Active id before any section has been seen. Default the first id. */
  defaultActive?: string;
  /** Smooth-scroll in `scrollTo`; reduced motion always jumps. Default true. */
  smooth?: boolean;
  /** Called when the active id changes, whether tracked or set. */
  onActiveChange?: (id: string) => void;
}

export interface ScrollSections {
  /** The id of the section in view (the last one seen while none is). */
  active: string | undefined;
  /** Scroll a section to the top of its scroller and make it active. Returns false when the element is missing. */
  scrollTo: (id: string) => boolean;
  /** Set the active id without scrolling. */
  setActive: (id: string) => void;
}

/**
 * Scroll-spy for a list of sections: tracks which element is in view with one `IntersectionObserver`, and scrolls to
 * one on request (`scrollIntoView`, so a target's `scroll-margin-top` clears a fixed header). Stays on the last section
 * seen while none is in the observed band, never re-renders unless the active id changes, and does nothing where
 * `IntersectionObserver` is missing. Build your own rail on it, or use `SectionRail`.
 */
export function useScrollSections({
  ids,
  offset = 0,
  rootMargin,
  root,
  enabled = true,
  defaultActive,
  smooth = true,
  onActiveChange,
}: UseScrollSectionsOptions): ScrollSections {
  const [active, setActiveState] = React.useState<string | undefined>(defaultActive ?? ids[0]);
  const activeRef = React.useRef(active);
  const onChangeRef = React.useRef(onActiveChange);
  onChangeRef.current = onActiveChange;

  const setActive = React.useCallback((id: string) => {
    if (activeRef.current === id) return;
    activeRef.current = id;
    setActiveState(id);
    onChangeRef.current?.(id);
  }, []);

  const key = ids.join("\u0000");
  const margin = rootMargin ?? `${offset > 0 ? -offset : 0}px 0px -65% 0px`;

  React.useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return;
    const order = key ? key.split("\u0000") : [];
    const elements = order.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    const rootEl = root && "current" in root ? root.current : (root ?? null);
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = order.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { root: rootEl, rootMargin: margin, threshold: [0, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key, margin, root, enabled, setActive]);

  const scrollTo = React.useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto", block: "start" });
      setActive(id);
      return true;
    },
    [smooth, setActive]
  );

  return { active, scrollTo, setActive };
}
