import * as React from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";
import { prefersReducedMotion } from "../../hooks/use-media-query";
import { useResizeObserver } from "../../hooks/use-resize-observer";
import { Button } from "../../primitives/button";
import { directionOf, inlineKeyStep, inlineScrollOffset, inlineSign } from "../../lib/direction";

/* ------------------------------------------------------------------ */
/* MediaShelf                                                          */
/* ------------------------------------------------------------------ */

type ShelfBreakpoint = "sm" | "md" | "lg" | "xl";

const shelfGrid: Record<ShelfBreakpoint, { list: string; item: string; hide: string }> = {
  sm: {
    list: "sm:grid sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] sm:overflow-visible sm:[mask-image:none]",
    item: "sm:w-auto",
    hide: "sm:hidden",
  },
  md: {
    list: "md:grid md:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] md:overflow-visible md:[mask-image:none]",
    item: "md:w-auto",
    hide: "md:hidden",
  },
  lg: {
    list: "lg:grid lg:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] lg:overflow-visible lg:[mask-image:none]",
    item: "lg:w-auto",
    hide: "lg:hidden",
  },
  xl: {
    list: "xl:grid xl:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] xl:overflow-visible xl:[mask-image:none]",
    item: "xl:w-auto",
    hide: "xl:hidden",
  },
};

export interface MediaShelfProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Heading of the shelf. */
  title: React.ReactNode;
  /** Helper text under the heading. */
  description?: React.ReactNode;
  /** Called when the user presses See all; with `seeAllHref` set the link is used instead. */
  onSeeAll?: () => void;
  /** Address of the See all link. */
  seeAllHref?: string;
  /** Label of the See all link. Default "See all". */
  seeAllLabel?: string;
  /** Width classes for each item in the row. Default "w-36 sm:w-40 md:w-44". */
  itemClassName?: string;
  /** Switch from a scrolling row to a wrapping grid from this breakpoint. */
  gridAbove?: ShelfBreakpoint;
  /** Classes for the scrolling list (e.g. a different gap). */
  listClassName?: string;
}

/** Horizontal media shelf: title + "See all", scroll-snap row with edge fades and prev/next, optional grid from a breakpoint. */
export const MediaShelf = React.forwardRef<HTMLElement, MediaShelfProps>(
  (
    {
      title,
      description,
      onSeeAll,
      seeAllHref,
      seeAllLabel = "See all",
      itemClassName = "w-36 sm:w-40 md:w-44",
      gridAbove,
      listClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const listRef = React.useRef<HTMLUListElement | null>(null);
    const [edges, setEdges] = React.useState({ start: false, end: false });
    const headingId = React.useId();

    const update = React.useCallback(() => {
      const el = listRef.current;
      if (!el) return;
      // `scrollLeft` is negative in right-to-left: measure the distance from the inline start.
      const max = el.scrollWidth - el.clientWidth;
      const at = inlineScrollOffset(el.scrollLeft, directionOf(el));
      const next = { start: at > 1, end: max - at > 1 };
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    }, []);

    React.useEffect(() => {
      const el = listRef.current;
      if (!el) return;
      update();
      el.addEventListener("scroll", update, { passive: true });
      return () => el.removeEventListener("scroll", update);
    }, [update]);
    useResizeObserver(listRef, update);

    const scrollByPage = (dir: 1 | -1) => {
      const el = listRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * inlineSign(directionOf(el)) * Math.max(160, el.clientWidth * 0.9), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [role="slider"]')) return;
      const items = Array.from(listRef.current?.children ?? []) as HTMLElement[];
      const at = items.findIndex((li) => li.contains(target));
      if (at < 0) return;
      const to =
        e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : clamp(at + inlineKeyStep(e.key, directionOf(listRef.current)), 0, items.length - 1);
      if (to === at) return;
      const focusable = items[to].querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable) return;
      e.preventDefault();
      focusable.focus({ preventScroll: true });
      items[to].scrollIntoView?.({ block: "nearest", inline: "nearest" });
    };

    const fade = 32;
    const mask = `linear-gradient(to ${directionOf(listRef.current) === "rtl" ? "left" : "right"}, ${edges.start ? "transparent" : "#000"}, #000 ${fade}px, #000 calc(100% - ${fade}px), ${
      edges.end ? "transparent" : "#000"
    })`;
    const grid = gridAbove ? shelfGrid[gridAbove] : null;
    const items = React.Children.toArray(children).filter(Boolean);

    return (
      <section ref={ref} aria-labelledby={headingId} className={cn("min-w-0", className)} {...props}>
        <div className="mb-3 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="truncate text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description && <p className="truncate text-sm text-muted-foreground">{description}</p>}
          </div>
          {(onSeeAll || seeAllHref) &&
            (seeAllHref ? (
              <Button asChild variant="link" size="sm" className="shrink-0">
                <a href={seeAllHref} onClick={onSeeAll ? () => onSeeAll() : undefined}>
                  {seeAllLabel}
                </a>
              </Button>
            ) : (
              <Button variant="link" size="sm" className="shrink-0" onClick={onSeeAll}>
                {seeAllLabel}
              </Button>
            ))}
          <div className={cn("hidden shrink-0 gap-1 [@media(hover:hover)]:md:flex", grid?.hide)}>
            <Button variant="secondary" size="icon-sm" aria-label="Scroll back" disabled={!edges.start} onClick={() => scrollByPage(-1)}>
              <RiArrowLeftSLine className="rtl:-scale-x-100" aria-hidden />
            </Button>
            <Button variant="secondary" size="icon-sm" aria-label="Scroll forward" disabled={!edges.end} onClick={() => scrollByPage(1)}>
              <RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />
            </Button>
          </div>
        </div>
        <ul
          ref={listRef}
          onKeyDown={onKeyDown}
          style={{ maskImage: mask, WebkitMaskImage: mask }}
          className={cn(
            "-mx-1 flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none",
            grid?.list,
            listClassName
          )}
        >
          {items.map((child, i) => (
            <li key={(React.isValidElement(child) && child.key) || i} className={cn("shrink-0 snap-start", itemClassName, grid?.item)}>
              {child}
            </li>
          ))}
        </ul>
      </section>
    );
  }
);
MediaShelf.displayName = "MediaShelf";
