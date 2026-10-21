/** MarketplaceGrid and TestimonialWall: the filterable collections, sharing the filter pill. */
import * as React from "react";
import { RiArrowRightSLine, RiExternalLinkLine } from "@remixicon/react";
import { accentClasses } from "../lib/accent";
import { cn, focusRing, hitArea } from "../lib/cn";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { EmptyStateIllustration } from "../assets/empty-state-illustration";
import type { MarketplaceTier, MarketplaceExtension } from "./marketing-blocks-model";
import { tierMeta } from "./marketing-blocks-internal";
import { MarketplaceCard } from "./marketing-blocks-card";

function FilterPill({
  pressed,
  count,
  children,
  onClick,
}: {
  pressed: boolean;
  count?: number;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border px-3 text-sm font-medium transition-colors",
        pressed ? "border-transparent bg-inverse text-inverse-foreground" : "border-border bg-background text-foreground hover:bg-accent",
        focusRing
      )}
    >
      {children}
      {count != null && (
        <span data-slot="pill-count" className={cn("text-xs tabular-nums", pressed ? "opacity-70" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* MarketplaceGrid                                                     */
/* ------------------------------------------------------------------ */

export type MarketplaceSort = "popular" | "updated" | "newest" | "name";

const sortLabels: Record<MarketplaceSort, string> = { popular: "Popular", updated: "Recently updated", newest: "Newest", name: "A–Z" };

function sortExtensions(items: MarketplaceExtension[], sort: MarketplaceSort) {
  const list = [...items];
  if (sort === "popular") list.sort((a, b) => b.stars - a.stars);
  else if (sort === "updated") list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  else if (sort === "newest") list.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  else list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function matchesQuery(e: MarketplaceExtension, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [e.name, e.author.name, e.author.handle, e.description, e.category, ...(e.capabilities ?? [])].some((s) => s.toLowerCase().includes(needle));
}

export interface MarketplaceGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Extensions to list, before search and filters. */
  items: MarketplaceExtension[];
  /** Search query (e.g. from MarketplaceHero). */
  query?: string;
  /**
   * Initially selected tier filter when uncontrolled.
   * @default "all"
   */
  defaultTier?: MarketplaceTier | "all";
  /** Initially selected category filter when uncontrolled. */
  defaultCategory?: string;
  /**
   * Initial sort order when uncontrolled.
   * @default "popular"
   */
  defaultSort?: MarketplaceSort;
  /** Group by category with "View all" when no category is selected. Default true. */
  sectioned?: boolean;
  /** Cards per category section. Default 3. */
  sectionLimit?: number;
  /** Cards per page in the flat grid. Default 9. */
  pageSize?: number;
  /** Called with the extension when a card is opened. */
  onOpen?: (extension: MarketplaceExtension) => void;
  /** Called when the empty state's reset button is pressed (after filters reset). */
  onClearQuery?: () => void;
}

/** Filterable marketplace: tier/category pills with counts, sort pills, category sections with "View all", load more and empty state. */
export const MarketplaceGrid = React.forwardRef<HTMLDivElement, MarketplaceGridProps>(
  (
    {
      items,
      query = "",
      defaultTier = "all",
      defaultCategory = "all",
      defaultSort = "popular",
      sectioned = true,
      sectionLimit = 3,
      pageSize = 9,
      onOpen,
      onClearQuery,
      className,
      ...props
    },
    ref
  ) => {
    const [tier, setTier] = React.useState<MarketplaceTier | "all">(defaultTier);
    const [category, setCategory] = React.useState(defaultCategory);
    const [sort, setSort] = React.useState<MarketplaceSort>(defaultSort);
    const [shown, setShown] = React.useState(pageSize);
    React.useEffect(() => setShown(pageSize), [tier, category, sort, query, pageSize]);

    const searched = items.filter((e) => matchesQuery(e, query));
    const categories = Array.from(new Set(items.map((e) => e.category)));
    const tiers = (["official", "verified", "community"] as const).filter((t) => items.some((e) => e.tier === t));
    const inCategory = searched.filter((e) => category === "all" || e.category === category);
    const inTier = searched.filter((e) => tier === "all" || e.tier === tier);
    const filtered = sortExtensions(
      inCategory.filter((e) => tier === "all" || e.tier === tier),
      sort
    );
    const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
    const card = (e: MarketplaceExtension) => (
      <li key={e.id} className="flex">
        <MarketplaceCard extension={e} onOpen={onOpen} className="w-full" />
      </li>
    );
    const showSections = sectioned && category === "all" && filtered.length > 0;

    return (
      <div ref={ref} className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col gap-3">
          <div role="group" aria-label="Filter by tier" className="flex flex-wrap gap-2">
            <FilterPill pressed={tier === "all"} count={inCategory.length} onClick={() => setTier("all")}>
              All tiers
            </FilterPill>
            {tiers.map((t) => (
              <FilterPill key={t} pressed={tier === t} count={inCategory.filter((e) => e.tier === t).length} onClick={() => setTier(t)}>
                {tierMeta[t].label}
              </FilterPill>
            ))}
          </div>
          <div role="group" aria-label="Filter by category" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <FilterPill pressed={category === "all"} count={inTier.length} onClick={() => setCategory("all")}>
              All categories
            </FilterPill>
            {categories.map((c) => (
              <FilterPill key={c} pressed={category === c} count={inTier.filter((e) => e.category === c).length} onClick={() => setCategory(c)}>
                {c}
              </FilterPill>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "extension" : "extensions"}
            </p>
            <div role="group" aria-label="Sort by" className="flex flex-wrap items-center gap-1">
              {(Object.keys(sortLabels) as MarketplaceSort[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sort === s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "h-7 rounded-control px-2.5 text-xs font-medium transition-colors",
                    sort === s ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                    focusRing
                  )}
                >
                  {sortLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-box border border-dashed border-border px-6 py-12 text-center">
            <EmptyStateIllustration variant="search" width={120} aria-hidden />
            <p className="font-medium text-foreground">No extensions match</p>
            <p className="text-sm text-muted-foreground">Try a different search, tier or category.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTier("all");
                setCategory("all");
                onClearQuery?.();
              }}
            >
              Reset filters
            </Button>
          </div>
        ) : showSections ? (
          categories
            .map((c) => ({ c, list: filtered.filter((e) => e.category === c) }))
            .filter((g) => g.list.length > 0)
            .map(({ c, list }) => (
              <section key={c} aria-label={c} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {c} <span className="text-sm font-normal text-muted-foreground">{list.length}</span>
                  </h3>
                  {list.length > sectionLimit && (
                    <Button variant="ghost" size="sm" trailingIcon={<RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />} onClick={() => setCategory(c)} aria-label={`View all ${c}`}>
                      View all
                    </Button>
                  )}
                </div>
                <ul className={grid}>{list.slice(0, sectionLimit).map(card)}</ul>
              </section>
            ))
        ) : (
          <>
            <ul className={grid}>{filtered.slice(0, shown).map(card)}</ul>
            {filtered.length > shown && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => setShown((n) => n + pageSize)}>
                  Load more ({filtered.length - shown} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);
MarketplaceGrid.displayName = "MarketplaceGrid";

/* ------------------------------------------------------------------ */
/* TestimonialWall                                                     */
/* ------------------------------------------------------------------ */

export type TestimonialSource = "x" | "reddit" | "discord" | "blog" | "github" | "hn" | "youtube";

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  handle?: string;
  avatarSrc?: string;
  source: TestimonialSource;
  categories?: string[];
  /** Link to the original post (relative or anchor in demos). */
  href?: string;
}

const sourceMeta: Record<TestimonialSource, { label: string; className: string }> = {
  x: { label: "X", className: "bg-foreground text-background" },
  reddit: { label: "Reddit", className: `${accentClasses.chip} [--sutra-accent:var(--chart-7)]` },
  discord: { label: "Discord", className: `${accentClasses.chip} [--sutra-accent:var(--chart-1)]` },
  blog: { label: "Blog", className: "bg-muted text-foreground" },
  github: { label: "GitHub", className: "bg-inverse text-inverse-foreground" },
  hn: { label: "Hacker News", className: `${accentClasses.chip} [--sutra-accent:var(--chart-3)]` },
  youtube: { label: "YouTube", className: `${accentClasses.chip} [--sutra-accent:var(--chart-4)]` },
};

export interface TestimonialWallProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Quotes to show; each has a `quote`, a `name`, a `source` and optional handle, avatar and categories. */
  testimonials: Testimonial[];
  /**
   * Section heading.
   * @default "Loved by people who ship"
   */
  title?: React.ReactNode;
  /** Supporting text under the heading. */
  description?: React.ReactNode;
  /**
   * Initially selected category tab when uncontrolled.
   * @default "all"
   */
  defaultCategory?: string;
}

/** Masonry wall of quotes with source badges and a category filter. */
export const TestimonialWall = React.forwardRef<HTMLElement, TestimonialWallProps>(
  ({ testimonials, title = "Loved by people who ship", description, defaultCategory = "all", className, ...props }, ref) => {
    const [category, setCategory] = React.useState(defaultCategory);
    const titleId = React.useId();
    const categories = Array.from(new Set(testimonials.flatMap((t) => t.categories ?? [])));
    const visible = testimonials.filter((t) => category === "all" || (t.categories ?? []).includes(category));
    return (
      <section ref={ref} aria-labelledby={titleId} className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 id={titleId} className="text-display-xs font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && <p className="max-w-xl text-muted-foreground">{description}</p>}
        </div>
        {categories.length > 0 && (
          <div role="group" aria-label="Filter testimonials" className="flex flex-wrap justify-center gap-2">
            <FilterPill pressed={category === "all"} count={testimonials.length} onClick={() => setCategory("all")}>
              All
            </FilterPill>
            {categories.map((c) => (
              <FilterPill key={c} pressed={category === c} count={testimonials.filter((t) => t.categories?.includes(c)).length} onClick={() => setCategory(c)}>
                {c}
              </FilterPill>
            ))}
          </div>
        )}
        <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {visible.map((t) => {
            const src = sourceMeta[t.source];
            return (
              <li key={t.id} data-testimonial={t.id} className="mb-4 break-inside-avoid">
                <figure className="flex flex-col gap-4 rounded-box border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span data-slot="source-badge" className={cn("inline-flex h-5 items-center rounded-control px-1.5 text-2xs font-semibold", src.className)}>
                      {src.label}
                    </span>
                    {t.href && (
                      <a href={t.href} className={cn(hitArea, "inline-flex items-center gap-1 rounded-xs text-xs text-muted-foreground hover:text-foreground", focusRing)}>
                        View post
                        <RiExternalLinkLine aria-hidden className="size-3.5" />
                        <span className="sr-only">by {t.name} on {src.label}</span>
                      </a>
                    )}
                  </div>
                  <blockquote className="text-pretty text-sm leading-relaxed text-foreground">“{t.quote}”</blockquote>
                  <figcaption className="flex items-center gap-3">
                    <Avatar name={t.name} src={t.avatarSrc} size="sm" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                      {t.handle && <span className="truncate text-xs text-muted-foreground">{t.handle}</span>}
                    </span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
);
TestimonialWall.displayName = "TestimonialWall";
