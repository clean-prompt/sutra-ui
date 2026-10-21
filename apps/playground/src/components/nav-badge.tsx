import { Badge } from "@sutra/ui";
import { activeStatus } from "../nav";
import type { NavItem, NavPage, NavStatus } from "../nav";

const LABEL: Record<NavStatus, string> = { new: "New", beta: "Beta", deprecated: "Deprecated" };
const TONE = { new: "primary", beta: "info", deprecated: "warning" } as const;

/** Status of a nav item or page as a small badge ("New", "Beta", "Deprecated"); the tooltip says since when. */
export function NavBadge({ status: given, since, className }: Pick<NavItem, "status" | "since"> & { className?: string }) {
  const status = activeStatus(given, since);
  if (!status) return null;
  return (
    <Badge
      size="sm"
      tone={TONE[status]}
      className={className}
      title={since ? `${LABEL[status]} since ${since}` : LABEL[status]}
    >
      {LABEL[status]}
    </Badge>
  );
}

/** A page's own badge, else a dot when some of its items are new (so a collapsed group still shows that there is news). */
export function PageMark({ page, className }: { page: NavPage; className?: string }) {
  if (activeStatus(page.status, page.since)) return <NavBadge status={page.status} since={page.since} className={className} />;
  if (!page.items?.some((item) => activeStatus(item.status, item.since) === "new")) return null;
  return (
    <span
      title="Has new items"
      className={`inline-block size-1.5 shrink-0 rounded-full bg-primary ${className ?? ""}`}
    >
      <span className="sr-only">Has new items</span>
    </span>
  );
}
