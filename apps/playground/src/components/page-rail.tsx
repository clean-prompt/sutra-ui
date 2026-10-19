import * as React from "react";
import { SectionRail, prefersReducedMotion } from "@sutra/ui";
import type { NavItem } from "../nav";
import { href } from "../router";

export interface PageRailProps {
  /** Route section and page of the current page (links are router URLs, so the hash router keeps handling them). */
  section: string;
  page: string;
  /** The page's nav items; each maps to a `<Demo id>`. */
  items: NavItem[];
}

/**
 * The right-hand "On this page" rail. It sits in the gutter beside the page column (which is at most 64rem wide),
 * so it never moves the page: it only appears when that gutter is wide enough (a container query on its own host,
 * not on the page) and stays out of the way on narrow canvases, where the sidebar already lists the same items.
 * Mount it inside the page's Suspense boundary so the sections exist when tracking starts.
 */
export function PageRail({ section, page, items }: PageRailProps) {
  const scroller = React.useRef<HTMLDivElement>(null);
  // Only list the demos that are really on the page (a nav item without a matching section would be a dead link).
  const [present, setPresent] = React.useState(items);
  React.useLayoutEffect(() => {
    setPresent(items.filter((item) => document.getElementById(item.id)));
  }, [items]);
  const sections = React.useMemo(() => present.map((item) => ({ id: item.id, label: item.label })), [present]);
  const getHref = React.useCallback((id: string) => href(section, page, id), [section, page]);

  // Keep the highlighted link inside the rail's own scroller (instant, never moves the page).
  const reveal = React.useCallback(
    (id: string) => {
      requestAnimationFrame(() => {
        const box = scroller.current;
        const link = box && Array.from(box.querySelectorAll("a")).find((a) => a.getAttribute("href") === getHref(id));
        if (!box || !link) return;
        const l = link.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        if (l.top < b.top + 8) box.scrollTop -= b.top + 8 - l.top;
        else if (l.bottom > b.bottom - 8) box.scrollTop += l.bottom - (b.bottom - 8);
      });
    },
    [getHref]
  );

  // Clicking the link of the hash the address bar already has fires no hashchange: scroll to it directly.
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    const link = (e.target as HTMLElement).closest("a");
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = link.getAttribute("href");
    if (!target || target !== window.location.hash) return;
    e.preventDefault();
    document.getElementById(decodeURIComponent(target.split("/").pop() ?? ""))?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  if (sections.length < 2) return null;
  return (
    <div data-slot="page-rail" className="pointer-events-none absolute inset-x-0 bottom-0 top-14 z-30 @container/rail">
      <div className="hidden h-full @[88rem]/rail:block">
        <div
          ref={scroller}
          className="scrollbar-thin pointer-events-auto sticky top-20 ml-auto mr-4 mt-10 max-h-[calc(100svh-7rem)] w-44 overflow-y-auto overscroll-contain pr-1"
        >
          <SectionRail
            sections={sections}
            getHref={getHref}
            smoothScroll={false}
            offset={80}
            label="On this page"
            onValueChange={reveal}
            onClick={onClick}
          />
        </div>
      </div>
    </div>
  );
}
