import * as React from "react";
import { nav, routeAliases, routeOf } from "./nav";

export interface Route {
  section: string;
  page: string;
  /** Optional anchor inside the page (a Demo id). */
  anchor?: string;
}

export const DEFAULT_ROUTE: Route = { section: "foundations", page: "colors" };

export function parseHash(hash: string): Route {
  const [section, page, anchor] = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!section) return DEFAULT_ROUTE;
  if (!page) {
    // "#/blocks" → first page served under that section.
    const first = nav.flatMap((s) => s.pages.filter((p) => routeOf(s, p) === section))[0];
    return first ? { section, page: first.id } : DEFAULT_ROUTE;
  }
  // Renamed pages: "#/components/media/faq" still opens the Content page at #faq.
  const alias = routeAliases[`${section}/${page}`];
  if (alias) {
    const [aliasSection, aliasPage] = alias.split("/");
    return { section: aliasSection!, page: aliasPage!, anchor };
  }
  return { section, page, anchor };
}

export function href(section: string, page: string, anchor?: string) {
  return `#/${[section, page, anchor].filter(Boolean).join("/")}`;
}

/** Tiny hash router: returns the current route and re-renders on `hashchange`. */
export function useHashRoute(): Route {
  const [hash, setHash] = React.useState(() => window.location.hash);
  React.useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return React.useMemo(() => parseHash(hash), [hash]);
}
