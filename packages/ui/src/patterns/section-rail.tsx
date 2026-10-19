import * as React from "react";
import { cn } from "../lib/cn";
import { clamp } from "../lib/math";
import { directionOf } from "../lib/direction";
import { prefersReducedMotion } from "../hooks/use-media-query";
import { useScrollSections } from "../hooks/use-scroll-sections";
import { Skeleton } from "../primitives/progress";

export interface SectionRailItem {
  /** Id of the section element on the page. */
  id: string;
  label: React.ReactNode;
  /** Heading level, typically 2 to 4: deeper levels are indented (vertical rail only). */
  level?: number;
}

export interface SectionRailProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "defaultValue" | "onChange"> {
  sections: SectionRailItem[];
  /** Controlled active id. Omit it and the rail tracks the sections in view itself. */
  value?: string;
  /** Active id before any section has been seen, when uncontrolled. */
  defaultValue?: string;
  /** Called when the active id changes (tracked or clicked), and on a click when controlled. */
  onValueChange?: (id: string) => void;
  /** `vertical` is an "On this page" column with a rule; `horizontal` is a scrolling row of tabs for a sticky sub-nav. Default vertical. */
  orientation?: "vertical" | "horizontal";
  /** Heading above the rail. Default "On this page" for a vertical rail; none when horizontal. */
  title?: React.ReactNode;
  /** Accessible name of the navigation landmark. Default "Table of contents". */
  label?: string;
  /** Pixels below the top of the scroll area where a section starts to count as current (see `useScrollSections`). */
  offset?: number;
  /** Observer root margin, replacing the `offset` based default. */
  rootMargin?: string;
  /** The scrolling element the sections live in. Default: the viewport. */
  root?: Element | null | React.RefObject<Element | null>;
  /** Smooth-scroll to a section on click (reduced motion jumps). `false` leaves the browser's own anchor jump. Default true. */
  smoothScroll?: boolean;
  /** The link target of a section, also written to the address bar on click. Default `#id`; give a router URL where `#id` is taken. */
  getHref?: (id: string) => string;
  /** Show placeholder rows in the rail's layout while the sections are not known yet. */
  loading?: boolean;
  /** Shown when there are no sections. Default: nothing is rendered. */
  emptyState?: React.ReactNode;
}

/**
 * Section navigation that highlights the section in view ("On this page", a sticky sub-nav). The links are real
 * anchors (`aria-current="location"` on the active one); a click scrolls the section to the top of its scroller,
 * respecting reduced motion. Tracking is `useScrollSections`; pass `value` to drive the highlight yourself.
 */
export const SectionRail = React.forwardRef<HTMLElement, SectionRailProps>(
  (
    {
      className,
      sections,
      value,
      defaultValue,
      onValueChange,
      orientation = "vertical",
      title,
      label = "Table of contents",
      offset,
      rootMargin,
      root,
      smoothScroll = true,
      getHref = (id: string) => `#${id}`,
      loading = false,
      emptyState,
      ...props
    },
    ref
  ) => {
    const controlled = value !== undefined;
    const vertical = orientation === "vertical";
    const heading = title === undefined ? (vertical ? "On this page" : null) : title;
    const { active: tracked, scrollTo } = useScrollSections({
      ids: sections.map((s) => s.id),
      offset,
      rootMargin,
      root,
      enabled: !controlled && !loading,
      defaultActive: defaultValue,
      smooth: smoothScroll,
      onActiveChange: controlled ? undefined : onValueChange,
    });
    const active = controlled ? value : tracked;
    const minLevel = sections.reduce((m, s) => Math.min(m, s.level ?? 2), Infinity);
    const listRef = React.useRef<HTMLUListElement>(null);

    // A horizontal rail keeps the active tab in view inside its own scroller (never scrolls the page).
    React.useEffect(() => {
      if (vertical) return;
      const list = listRef.current;
      const link = list?.querySelector<HTMLElement>('[aria-current="location"]');
      if (!list || !link || list.scrollWidth <= list.clientWidth) return;
      if (directionOf(list) === "rtl") {
        // `scrollLeft` runs negative in right-to-left: centre the link by its distance on screen instead.
        const l = link.getBoundingClientRect();
        const b = list.getBoundingClientRect();
        const delta = l.left + l.width / 2 - (b.left + b.width / 2);
        if (typeof list.scrollBy === "function") list.scrollBy({ left: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        else list.scrollLeft += delta;
        return;
      }
      const left = clamp(link.offsetLeft - (list.clientWidth - link.offsetWidth) / 2, 0, list.scrollWidth - list.clientWidth);
      if (typeof list.scrollTo === "function") list.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      else list.scrollLeft = left;
    }, [active, vertical, sections]);

    if (!loading && sections.length === 0) {
      return emptyState ? (
        <div data-slot="section-rail" data-state="empty" className={cn("text-sm text-muted-foreground", className)}>
          {emptyState}
        </div>
      ) : null;
    }

    const onLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (smoothScroll && scrollTo(id)) {
        e.preventDefault();
        history.replaceState(null, "", getHref(id));
      }
      if (controlled) onValueChange?.(id);
    };

    return (
      <nav
        ref={ref}
        data-slot="section-rail"
        data-orientation={orientation}
        aria-label={label}
        aria-busy={loading || undefined}
        className={cn("min-w-0 text-sm", className)}
        {...props}
      >
        {heading ? <p className="mb-3 text-xs font-semibold text-foreground">{heading}</p> : null}
        {loading ? (
          <>
            <span className="sr-only">Loading…</span>
            <ul aria-hidden="true" className={cn(vertical ? "flex flex-col gap-3 border-s border-border py-1 ps-3" : "flex gap-3 overflow-hidden border-b border-border py-2")}>
              {[0, 1, 2, 3].map((i) => (
                <li key={i}>
                  <Skeleton shape="text" className={cn("h-3.5", vertical ? (i % 2 ? "w-24" : "w-32") : "w-16")} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul
            ref={listRef}
            className={cn(
              vertical
                ? "flex flex-col border-s border-border"
                : "scrollbar-none relative flex gap-1 overflow-x-auto border-b border-border"
            )}
          >
            {sections.map((s) => {
              const isActive = s.id === active;
              const depth = Math.max(0, (s.level ?? 2) - (Number.isFinite(minLevel) ? minLevel : 2));
              return (
                <li key={s.id} className={vertical ? undefined : "shrink-0"}>
                  <a
                    href={getHref(s.id)}
                    aria-current={isActive ? "location" : undefined}
                    onClick={(e) => onLinkClick(e, s.id)}
                    className={cn(
                      vertical
                        ? "-ms-px block border-s py-1.5 pe-2 leading-snug outline-none transition-colors focus-visible:text-foreground focus-visible:underline"
                        : "-mb-px block whitespace-nowrap border-b-2 px-3 py-2 leading-snug outline-none transition-colors focus-visible:text-foreground focus-visible:underline",
                      isActive
                        ? "border-primary font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
                    )}
                    style={vertical ? { paddingLeft: 12 + depth * 12 } : undefined}
                  >
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    );
  }
);
SectionRail.displayName = "SectionRail";
