import * as React from "react";
import {
  RiArrowRightSLine,
  RiBrainLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiCodeSSlashLine,
  RiComputerLine,
  RiContrastLine,
  RiExternalLinkLine,
  RiFlashlightLine,
  RiGitCommitLine,
  RiGlobalLine,
  RiKey2Line,
  RiLinksLine,
  RiLockLine,
  RiPlugLine,
  RiRobot2Line,
  RiScales3Line,
  RiShieldKeyholeLine,
  RiStackLine,
  RiStarFill,
  RiTeamLine,
  RiTimeLine,
  RiToolsLine,
  RiVerifiedBadgeFill,
} from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../lib/cn";
import { formatCompact } from "../lib/format";
import { useSafeId } from "../hooks/use-safe-id";
import { hashString } from "../lib/hash";
import { initials } from "../lib/text";
import { formatShortDate } from "../lib/time";
import { Avatar } from "../primitives/avatar";
import { Badge, type BadgeColor } from "../primitives/badge";
import { Breadcrumbs, type BreadcrumbRenderLink } from "../primitives/breadcrumbs";
import { Button } from "../primitives/button";
import { InlineCopy } from "../patterns/code-block";
import { SearchInput } from "../primitives/input";
import { Markdown } from "../patterns/markdown";
import { MeshGradient } from "../primitives/mesh-gradient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../primitives/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../primitives/tabs";
import { EmptyStateIllustration } from "../assets/misc";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export type MarketplaceTier = "official" | "verified" | "community";

export interface MarketplaceAuthor {
  name: string;
  handle: string;
  bio?: string;
  avatarSrc?: string;
}

export interface MarketplaceScreenshot {
  id: string;
  caption: string;
  /** Optional image src (no network by default: a generated placeholder renders instead). */
  src?: string;
}

export interface MarketplaceExtension {
  id: string;
  name: string;
  author: MarketplaceAuthor;
  description: string;
  category: string;
  tier: MarketplaceTier;
  stars: number;
  version: string;
  /** ISO dates. */
  addedAt: string;
  updatedAt: string;
  capabilities?: string[];
  platforms?: string[];
  /** Icon node; defaults to a monogram on the generated gradient. */
  icon?: React.ReactNode;
  /** Banner node or image src; defaults to a generated gradient. */
  banner?: React.ReactNode | string;
  sha?: string;
  license?: string;
  installCommand?: string;
  provides?: { tools?: string[]; hooks?: string[]; middleware?: string[] };
  requiresEnv?: string[];
  security?: string;
  screenshots?: MarketplaceScreenshot[];
  readme?: string;
}

const tierMeta: Record<MarketplaceTier, { label: string; color: BadgeColor }> = {
  official: { label: "Official", color: "brand" },
  verified: { label: "Verified", color: "info" },
  community: { label: "Community", color: "neutral" },
};

const hueOf = (seed: string) => hashString(seed) % 360;

/** Deterministic gradient for a seed (no images, no network). */
function seedGradient(seed: string) {
  const h = hueOf(seed);
  return `radial-gradient(120% 140% at 0% 0%, oklch(0.78 0.13 ${h}) 0%, transparent 60%), linear-gradient(135deg, oklch(0.62 0.16 ${(h + 40) % 360}), oklch(0.42 0.14 ${(h + 90) % 360}))`;
}

function GradientArt({ seed, className, children }: { seed: string; className?: string; children?: React.ReactNode }) {
  const h = hueOf(seed);
  return (
    <div aria-hidden className={cn("relative overflow-hidden", className)} style={{ background: seedGradient(seed) }}>
      <svg className="absolute inset-0 size-full opacity-30 mix-blend-overlay" preserveAspectRatio="none" viewBox="0 0 200 100">
        <circle cx={40 + (h % 120)} cy="20" r="46" fill="white" />
        <circle cx={160 - (h % 80)} cy="96" r="36" fill="white" />
      </svg>
      {children}
    </div>
  );
}

function Monogram({ name, className }: { name: string; className?: string }) {
  const letters = initials(name, { mode: "first-two" });
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-box font-semibold text-white shadow-sm ring-2 ring-background", className)}
      style={{ background: seedGradient(name) }}
    >
      {letters}
    </span>
  );
}

const formatDate = (iso: string) => formatShortDate(iso, { locale: "en-US", year: "always" });

const formatCount = (n: number) => formatCompact(n, { wholeAbove: 10 });

function Pill({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1 rounded-control border border-border bg-background px-1.5 text-2xs font-medium text-muted-foreground [&_svg]:size-3", className)}
      {...props}
    >
      {children}
    </span>
  );
}

function StarPill({ stars }: { stars: number }) {
  return (
    <Pill>
      <RiStarFill aria-hidden className="text-warning" />
      <span>
        {formatCount(stars)}
        <span className="sr-only"> stars</span>
      </span>
    </Pill>
  );
}

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
/* MarketplaceHero                                                     */
/* ------------------------------------------------------------------ */

export interface MarketplaceHeroStat {
  value: React.ReactNode;
  label: string;
}

export interface MarketplaceHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onChange"> {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  stats?: MarketplaceHeroStat[];
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  /** Extra content under the search (popular tags, CTAs). */
  children?: React.ReactNode;
}

/** Marketplace / docs hero: title, subtitle, meta stats row and a search field on a mesh-gradient glow. */
export const MarketplaceHero = React.forwardRef<HTMLElement, MarketplaceHeroProps>(
  (
    {
      eyebrow = "Extensions",
      title = "Extend Sutra with plugins",
      subtitle = "Tools, hooks and integrations built by the Sutra team and the community. Install in one command.",
      stats = [
        { value: "678", label: "plugins" },
        { value: "120", label: "authors" },
        { value: "1.2M", label: "installs" },
      ],
      query,
      defaultQuery = "",
      onQueryChange,
      searchPlaceholder = "Search plugins, tools, authors…",
      children,
      className,
      ...props
    },
    ref
  ) => {
    const [inner, setInner] = React.useState(defaultQuery);
    const value = query ?? inner;
    const titleId = React.useId();
    return (
      <MeshGradient intensity={0.4} blur={90} animated={false} className={cn("rounded-box border border-border bg-background", className)}>
        <section ref={ref} aria-labelledby={titleId} className="relative flex flex-col items-center gap-5 px-6 py-14 text-center sm:py-20" {...props}>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
          <h2 id={titleId} className="max-w-2xl text-balance text-display-sm font-semibold tracking-tight text-foreground md:text-display-md">
            {title}
          </h2>
          {subtitle && <p className="max-w-xl text-pretty text-muted-foreground sm:text-lg">{subtitle}</p>}
          {stats.length > 0 && (
            <p data-slot="hero-stats" className="text-balance text-sm text-muted-foreground">
              {stats.map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && " · "}
                  <span className="whitespace-nowrap">
                    <span className="font-semibold text-foreground tabular-nums">{s.value}</span> {s.label}
                  </span>
                </React.Fragment>
              ))}
            </p>
          )}
          <div className="w-full max-w-lg">
            <SearchInput
              size="lg"
              aria-label="Search extensions"
              placeholder={searchPlaceholder}
              value={value}
              onChange={(e) => {
                setInner(e.target.value);
                onQueryChange?.(e.target.value);
              }}
              onClear={() => {
                setInner("");
                onQueryChange?.("");
              }}
              className="bg-background/80 shadow-sm backdrop-blur"
            />
          </div>
          {children}
        </section>
      </MeshGradient>
    );
  }
);
MarketplaceHero.displayName = "MarketplaceHero";

/* ------------------------------------------------------------------ */
/* MarketplaceCard                                                     */
/* ------------------------------------------------------------------ */

export interface MarketplaceCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  extension: MarketplaceExtension;
  /** Capability chips shown before "+N". Default 3. */
  maxCapabilities?: number;
  onOpen?: (extension: MarketplaceExtension) => void;
  /** `compact` hides the dates row (shelves). Default "normal". */
  density?: Density;
  /** @deprecated Use `density="compact"`. */
  compact?: boolean;
}

/** Marketplace entry card: banner, icon, name, author, description, stars, version, capabilities (+N), platforms, dates, tier. */
export const MarketplaceCard = React.forwardRef<HTMLElement, MarketplaceCardProps>(
  ({ extension: ext, maxCapabilities = 3, onOpen, density, compact: compactProp, className, ...props }, ref) => {
    const compact = normalizeDensity(density ?? compactProp) === "compact";
    const titleId = React.useId();
    const caps = ext.capabilities ?? [];
    const shown = caps.slice(0, maxCapabilities);
    const extra = caps.length - shown.length;
    const tier = tierMeta[ext.tier];
    return (
      <article
        ref={ref}
        aria-labelledby={titleId}
        data-extension={ext.id}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs transition-shadow hover:shadow-md",
          className
        )}
        {...props}
      >
        {typeof ext.banner === "string" ? (
          <img src={ext.banner} alt="" className="h-20 w-full object-cover" />
        ) : ext.banner ? (
          <div aria-hidden className="h-20 overflow-hidden">
            {ext.banner}
          </div>
        ) : (
          <GradientArt seed={ext.id} className="h-20" />
        )}
        <div className="flex flex-1 flex-col gap-3 p-4 pt-0">
          <div className="-mt-6 flex items-end justify-between gap-2">
            {ext.icon ? (
              <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-box bg-background shadow-sm ring-2 ring-background [&_svg]:size-6">
                {ext.icon}
              </span>
            ) : (
              <Monogram name={ext.name} className="size-12 text-base" />
            )}
            <Badge size="sm" color={tier.color} variant="soft" leadingIcon={ext.tier !== "community" ? <RiVerifiedBadgeFill aria-hidden /> : undefined}>
              {tier.label}
            </Badge>
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              {onOpen ? (
                <button type="button" onClick={() => onOpen(ext)} className={cn("rounded-xs text-left after:absolute after:inset-0 hover:underline", focusRing)}>
                  {ext.name}
                </button>
              ) : (
                ext.name
              )}
            </h3>
            <p className="text-xs text-muted-foreground">by {ext.author.name}</p>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{ext.description}</p>
          {caps.length > 0 && (
            <ul aria-label="Capabilities" className="flex flex-wrap gap-1">
              {shown.map((c) => (
                <li key={c} className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-2xs text-foreground">
                  {c}
                </li>
              ))}
              {extra > 0 && (
                <li data-slot="more-capabilities" title={caps.slice(maxCapabilities).join(", ")} className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                  +{extra}
                  <span className="sr-only"> more: {caps.slice(maxCapabilities).join(", ")}</span>
                </li>
              )}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            <StarPill stars={ext.stars} />
            <Pill className="font-mono">v{ext.version}</Pill>
            {(ext.platforms ?? []).map((p) => (
              <Pill key={p}>{p}</Pill>
            ))}
          </div>
          {!compact && (
            <p className="text-2xs text-muted-foreground">
              Added {formatDate(ext.addedAt)} · Updated {formatDate(ext.updatedAt)}
            </p>
          )}
        </div>
      </article>
    );
  }
);
MarketplaceCard.displayName = "MarketplaceCard";

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
  items: MarketplaceExtension[];
  /** Search query (e.g. from MarketplaceHero). */
  query?: string;
  defaultTier?: MarketplaceTier | "all";
  defaultCategory?: string;
  defaultSort?: MarketplaceSort;
  /** Group by category with "View all" when no category is selected. Default true. */
  sectioned?: boolean;
  /** Cards per category section. Default 3. */
  sectionLimit?: number;
  /** Cards per page in the flat grid. Default 9. */
  pageSize?: number;
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
    const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
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
                    <Button variant="ghost" size="sm" trailingIcon={<RiArrowRightSLine aria-hidden />} onClick={() => setCategory(c)} aria-label={`View all ${c}`}>
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
/* AuthorShelf                                                         */
/* ------------------------------------------------------------------ */

export interface AuthorShelfProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  author: MarketplaceAuthor;
  items: MarketplaceExtension[];
  title?: React.ReactNode;
  onOpen?: (extension: MarketplaceExtension) => void;
  onViewAll?: () => void;
}

/** Author header with a horizontally scrolling shelf of their extensions. */
export const AuthorShelf = React.forwardRef<HTMLElement, AuthorShelfProps>(
  ({ author, items, title, onOpen, onViewAll, className, ...props }, ref) => {
    const titleId = React.useId();
    return (
      <section ref={ref} aria-labelledby={titleId} className={cn("flex flex-col gap-4", className)} {...props}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={author.name} src={author.avatarSrc} size="md" />
            <div>
              <h3 id={titleId} className="text-base font-semibold text-foreground">
                {title ?? author.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                @{author.handle} · {items.length} {items.length === 1 ? "extension" : "extensions"}
                {author.bio ? ` · ${author.bio}` : ""}
              </p>
            </div>
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" trailingIcon={<RiArrowRightSLine aria-hidden />} onClick={onViewAll} aria-label={`View all by ${author.name}`}>
              View all
            </Button>
          )}
        </div>
        <div role="region" aria-label={`Extensions by ${author.name}`} tabIndex={0} className={cn("-mx-1 overflow-x-auto px-1 pb-2 scrollbar-thin", focusRing)}>
          <ul className="flex snap-x gap-4">
            {items.map((e) => (
              <li key={e.id} className="flex w-72 shrink-0 snap-start">
                <MarketplaceCard extension={e} onOpen={onOpen} density="compact" className="w-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
);
AuthorShelf.displayName = "AuthorShelf";

/* ------------------------------------------------------------------ */
/* ExtensionDetailPage                                                 */
/* ------------------------------------------------------------------ */

export interface ExtensionDetailPageProps extends React.HTMLAttributes<HTMLElement> {
  extension: MarketplaceExtension;
  /** Other extensions by the same author. */
  moreFromAuthor?: MarketplaceExtension[];
  breadcrumbs?: { label: string; href?: string }[];
  renderLink?: BreadcrumbRenderLink;
  onOpenExtension?: (extension: MarketplaceExtension) => void;
  /** Called with the screenshot index; wire it to a Lightbox. */
  onOpenScreenshot?: (index: number) => void;
  /** Link for the short sha (relative path or anchor); rendered as text when omitted. */
  shaHref?: string;
}

function DetailSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-3", className)}>
      <h2 id={id} className="text-base font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CapabilityList({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-box border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
        <span aria-hidden>{icon}</span>
        {label}
        <span className="tabular-nums">({items.length})</span>
      </p>
      <ul aria-label={label} className="flex flex-wrap gap-1">
        {items.map((t) => (
          <li key={t} className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Extension detail: breadcrumbs, hero, copyable install command, facts sidebar, capabilities, security note, screenshots, README and more from the author. */
export const ExtensionDetailPage = React.forwardRef<HTMLElement, ExtensionDetailPageProps>(
  (
    { extension: ext, moreFromAuthor = [], breadcrumbs, renderLink, onOpenExtension, onOpenScreenshot, shaHref, className, ...props },
    ref
  ) => {
    const tier = tierMeta[ext.tier];
    const install = ext.installCommand ?? `sutra plugins install ${ext.author.handle}/${ext.id}`;
    const shots = (ext.screenshots ?? []).slice(0, 6);
    const provides = ext.provides ?? {};
    const hasCaps = !!(provides.tools?.length || provides.hooks?.length || provides.middleware?.length || ext.requiresEnv?.length);
    const crumbs = breadcrumbs ?? [{ label: "Extensions", href: "#extensions" }, { label: ext.category, href: "#extensions" }, { label: ext.name }];
    return (
      <article ref={ref} aria-labelledby={`ext-${ext.id}-title`} className={cn("flex flex-col gap-8", className)} {...props}>
        <Breadcrumbs items={crumbs} renderLink={renderLink} />
        <header className="overflow-hidden rounded-box border border-border bg-card shadow-xs">
          {typeof ext.banner === "string" ? <img src={ext.banner} alt="" className="h-28 w-full object-cover" /> : <GradientArt seed={ext.id} className="h-28" />}
          <div className="flex flex-col gap-4 p-5 pt-0 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {ext.icon ? (
                <span aria-hidden className="-mt-8 inline-flex size-16 items-center justify-center rounded-box bg-background shadow-md ring-4 ring-background [&_svg]:size-8">
                  {ext.icon}
                </span>
              ) : (
                <Monogram name={ext.name} className="-mt-8 size-16 text-xl ring-4" />
              )}
              <div className="flex flex-col gap-1 pt-3">
                <h1 id={`ext-${ext.id}-title`} className="text-xl font-semibold tracking-tight text-foreground">
                  {ext.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    by <span className="font-medium text-foreground">{ext.author.name}</span>
                  </span>
                  <Badge size="sm" color={tier.color} leadingIcon={ext.tier !== "community" ? <RiVerifiedBadgeFill aria-hidden /> : undefined}>
                    {tier.label}
                  </Badge>
                  <StarPill stars={ext.stars} />
                </div>
              </div>
            </div>
            <InlineCopy value={install} className="w-full sm:w-auto sm:max-w-sm" />
          </div>
          <p className="px-5 pb-5 text-sm text-muted-foreground">{ext.description}</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="flex min-w-0 flex-col gap-8">
            {hasCaps && (
              <DetailSection title="Capabilities">
                <div className="grid gap-3 sm:grid-cols-2">
                  <CapabilityList icon={<RiToolsLine aria-hidden />} label="Provides tools" items={provides.tools ?? []} />
                  <CapabilityList icon={<RiLinksLine aria-hidden />} label="Provides hooks" items={provides.hooks ?? []} />
                  <CapabilityList icon={<RiStackLine aria-hidden />} label="Provides middleware" items={provides.middleware ?? []} />
                  <CapabilityList icon={<RiKey2Line aria-hidden />} label="Requires env" items={ext.requiresEnv ?? []} />
                </div>
              </DetailSection>
            )}
            <aside aria-label="Security disclosure" className="flex gap-3 rounded-box border border-warning/30 bg-warning-soft p-4 text-sm text-warning-soft-foreground">
              <RiShieldKeyholeLine aria-hidden className="mt-0.5 size-5 shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="font-semibold">Security disclosure</p>
                <p className="opacity-90">
                  {ext.security ??
                    "Extensions run with the permissions you grant. Review the tools and environment variables above before installing, and only install from authors you trust."}
                </p>
              </div>
            </aside>
            {shots.length > 0 && (
              <DetailSection title="Screenshots">
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {shots.map((s, i) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        data-lightbox-index={i}
                        onClick={() => onOpenScreenshot?.(i)}
                        aria-label={`Open screenshot ${i + 1}: ${s.caption}`}
                        className={cn("group block w-full overflow-hidden rounded-box border border-border text-left", focusRing)}
                      >
                        {s.src ? (
                          <img src={s.src} alt="" className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.03]" />
                        ) : (
                          <GradientArt seed={`${ext.id}-${s.id}`} className="aspect-video transition-transform group-hover:scale-[1.03]">
                            <div className="absolute inset-3 flex flex-col gap-1.5 rounded-sm bg-white/80 p-2 shadow-sm">
                              <span className="h-1.5 w-1/3 rounded-full bg-black/20" />
                              <span className="h-1.5 w-2/3 rounded-full bg-black/10" />
                              <span className="h-1.5 w-1/2 rounded-full bg-black/10" />
                            </div>
                          </GradientArt>
                        )}
                        <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">{s.caption}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}
            {ext.readme && (
              <DetailSection title="README">
                <div className="rounded-box border border-border bg-card p-5">
                  <Markdown>{ext.readme}</Markdown>
                </div>
              </DetailSection>
            )}
          </div>
          <aside aria-label="Facts" className="flex flex-col gap-4">
            <dl className="flex flex-col divide-y divide-border rounded-box border border-border bg-card text-sm">
              {([
                { icon: <RiPlugLine aria-hidden />, label: "Version", value: <span className="font-mono">v{ext.version}</span> },
                ext.sha
                  ? {
                      icon: <RiGitCommitLine aria-hidden />,
                      label: "Commit",
                      value: shaHref ? (
                        <a href={shaHref} className={cn("rounded-xs font-mono text-primary hover:underline", focusRing)}>
                          {ext.sha.slice(0, 7)}
                        </a>
                      ) : (
                        <span className="font-mono">{ext.sha.slice(0, 7)}</span>
                      ),
                    }
                  : null,
                ext.license ? { icon: <RiScales3Line aria-hidden />, label: "License", value: ext.license } : null,
                ext.platforms?.length ? { icon: <RiComputerLine aria-hidden />, label: "Platforms", value: ext.platforms.join(", ") } : null,
                { icon: <RiTimeLine aria-hidden />, label: "Updated", value: <time dateTime={ext.updatedAt}>{formatDate(ext.updatedAt)}</time> },
                { icon: <RiCalendarLine aria-hidden />, label: "Added", value: <time dateTime={ext.addedAt}>{formatDate(ext.addedAt)}</time> },
              ] as ({ icon: React.ReactNode; label: string; value: React.ReactNode } | null)[])
                .filter((f): f is { icon: React.ReactNode; label: string; value: React.ReactNode } => f !== null)
                .map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <dt className="flex items-center gap-1.5 text-muted-foreground [&_svg]:size-4">
                      <span aria-hidden>{f.icon}</span>
                      {f.label}
                    </dt>
                    <dd className="truncate text-right font-medium text-foreground">{f.value}</dd>
                  </div>
                ))}
            </dl>
          </aside>
        </div>

        {moreFromAuthor.length > 0 && <AuthorShelf author={ext.author} title={`More from ${ext.author.name}`} items={moreFromAuthor} onOpen={onOpenExtension} />}
      </article>
    );
  }
);
ExtensionDetailPage.displayName = "ExtensionDetailPage";

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
  reddit: { label: "Reddit", className: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  discord: { label: "Discord", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
  blog: { label: "Blog", className: "bg-muted text-foreground" },
  github: { label: "GitHub", className: "bg-inverse text-inverse-foreground" },
  hn: { label: "Hacker News", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  youtube: { label: "YouTube", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export interface TestimonialWallProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  testimonials: Testimonial[];
  title?: React.ReactNode;
  description?: React.ReactNode;
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
                      <a href={t.href} className={cn("inline-flex items-center gap-1 rounded-xs text-xs text-muted-foreground hover:text-foreground", focusRing)}>
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

/* ------------------------------------------------------------------ */
/* FeatureGrid                                                         */
/* ------------------------------------------------------------------ */

export interface FeatureGridItem {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

export interface FeatureGridProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  features: FeatureGridItem[];
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  columns?: 2 | 3 | 4;
}

const featureCols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

/** Icon + title + description cards in a 2–4 column grid, with an optional section header. */
export const FeatureGrid = React.forwardRef<HTMLElement, FeatureGridProps>(
  ({ features, eyebrow, title, description, columns = 3, className, ...props }, ref) => {
    const titleId = React.useId();
    return (
      <section ref={ref} aria-labelledby={title ? titleId : undefined} className={cn("flex flex-col gap-8", className)} {...props}>
        {(eyebrow || title || description) && (
          <div className="flex flex-col items-center gap-2 text-center">
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
            {title && (
              <h2 id={titleId} className="text-display-xs font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && <p className="max-w-xl text-muted-foreground">{description}</p>}
          </div>
        )}
        <ul data-columns={columns} className={cn("grid gap-4", featureCols[columns])}>
          {features.map((f) => (
            <li key={f.title} className="flex flex-col gap-3 rounded-box border border-border bg-card p-5 shadow-xs">
              <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-box bg-primary-soft text-primary-soft-foreground [&_svg]:size-5">
                {f.icon}
              </span>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </li>
          ))}
        </ul>
      </section>
    );
  }
);
FeatureGrid.displayName = "FeatureGrid";

/* ------------------------------------------------------------------ */
/* InstallSnippet                                                      */
/* ------------------------------------------------------------------ */

export interface InstallSnippetTab {
  id: string;
  label: string;
  /** One command, or several run in order. */
  command: string | string[];
  note?: React.ReactNode;
}

export interface InstallSnippetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  tabs: InstallSnippetTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  label?: string;
}

/** Tabbed install commands per platform or package manager, each copyable. */
export const InstallSnippet = React.forwardRef<HTMLDivElement, InstallSnippetProps>(
  ({ tabs, value, defaultValue, onValueChange, label = "Install method", className, ...props }, ref) => (
    <div ref={ref} className={cn("w-full rounded-box border border-border bg-card p-4 shadow-xs", className)} {...props}>
      <Tabs variant="underline" size="sm" value={value} defaultValue={defaultValue ?? tabs[0]?.id} onValueChange={onValueChange}>
        <TabsList aria-label={label}>
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => {
          const lines = Array.isArray(t.command) ? t.command : [t.command];
          return (
            <TabsContent key={t.id} value={t.id} className="flex flex-col gap-2">
              {lines.map((line) => (
                <InlineCopy key={line} value={line} theme="dark" className="w-full" />
              ))}
              {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  )
);
InstallSnippet.displayName = "InstallSnippet";

/* ------------------------------------------------------------------ */
/* ComparisonTable                                                     */
/* ------------------------------------------------------------------ */

export type ComparisonMark = "yes" | "no" | "partial";

export interface ComparisonProduct {
  id: string;
  name: string;
  /** Your product: highlighted column. */
  highlight?: boolean;
}

export interface ComparisonRow {
  feature: string;
  description?: string;
  /** "yes" | "no" | "partial" render as marks; other strings as text. */
  values: Record<string, ComparisonMark | (string & {})>;
  /** Footnote id (from `footnotes`). */
  footnote?: string;
}

export interface ComparisonFootnote {
  id: string;
  text: React.ReactNode;
}

export interface ComparisonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  products: ComparisonProduct[];
  rows: ComparisonRow[];
  footnotes?: ComparisonFootnote[];
  caption?: string;
}

function Mark({ value }: { value: string | undefined }) {
  if (value === "yes")
    return (
      <span data-mark="yes" className="inline-flex size-6 items-center justify-center rounded-full bg-success-soft text-success">
        <RiCheckLine aria-hidden className="size-4" />
        <span className="sr-only">Yes</span>
      </span>
    );
  if (value === "partial")
    return (
      <span data-mark="partial" className="inline-flex size-6 items-center justify-center rounded-full bg-warning-soft text-warning-soft-foreground">
        <RiContrastLine aria-hidden className="size-4" />
        <span className="sr-only">Partial</span>
      </span>
    );
  if (value === "no" || value == null)
    return (
      <span data-mark="no" className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RiCloseLine aria-hidden className="size-4" />
        <span className="sr-only">No</span>
      </span>
    );
  return <span className="text-sm text-foreground">{value}</span>;
}

/** Product-vs-alternatives matrix with check / cross / partial marks and numbered footnotes. */
export const ComparisonTable = React.forwardRef<HTMLDivElement, ComparisonTableProps>(
  ({ products, rows, footnotes = [], caption = "Product comparison", className, ...props }, ref) => {
    const uid = useSafeId("comparison");
    const fnNumber = (id: string) => footnotes.findIndex((f) => f.id === id) + 1;
    return (
      <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props}>
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48 pl-4">Feature</TableHead>
              {products.map((p) => (
                <TableHead key={p.id} align="center" className={cn("min-w-28", p.highlight && "bg-primary-soft text-primary-soft-foreground")}>
                  {p.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const n = r.footnote ? fnNumber(r.footnote) : 0;
              return (
                <TableRow key={r.feature}>
                  <th scope="row" className="border-b border-border px-4 py-3 text-left align-middle font-normal">
                    <span className="text-sm font-medium text-foreground">{r.feature}</span>
                    {n > 0 && (
                      <sup className="ml-0.5">
                        <a id={`${uid}-ref-${r.footnote}`} href={`#${uid}-fn-${r.footnote}`} aria-label={`Footnote ${n}`} className={cn("rounded-xs text-primary hover:underline", focusRing)}>
                          {n}
                        </a>
                      </sup>
                    )}
                    {r.description && <span className="block text-xs text-muted-foreground">{r.description}</span>}
                  </th>
                  {products.map((p) => (
                    <TableCell key={p.id} align="center" className={cn(p.highlight && "bg-primary-soft/30")}>
                      <Mark value={r.values[p.id]} />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {footnotes.length > 0 && (
          <ol aria-label="Footnotes" className="flex list-decimal flex-col gap-1 pl-5 text-xs text-muted-foreground">
            {footnotes.map((f) => (
              <li key={f.id} id={`${uid}-fn-${f.id}`}>
                {f.text}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
);
ComparisonTable.displayName = "ComparisonTable";

/* ------------------------------------------------------------------ */
/* Demo data (fictional)                                               */
/* ------------------------------------------------------------------ */

const demoAuthors: MarketplaceAuthor[] = [
  { name: "Sutra Labs", handle: "sutra", bio: "The team behind Sutra" },
  { name: "Maya Patel", handle: "mayap", bio: "Automation tinkerer" },
  { name: "Theo Laurent", handle: "theol", bio: "Search and retrieval" },
  { name: "Ines Okafor", handle: "ines", bio: "Security engineer" },
  { name: "Kenji Mori", handle: "kmori", bio: "Dev tooling" },
  { name: "Northwind Co.", handle: "northwind", bio: "Business integrations" },
];

const rawExtensions: [string, string, number, string, MarketplaceTier, number, string[]][] = [
  ["Calendar Sync", "Two-way sync between Sutra tasks and your calendars with conflict detection.", 0, "Productivity", "official", 4820, ["calendar.read", "calendar.write", "tasks.read", "notify"]],
  ["Inbox Zero", "Triage mail with agent-written summaries, snooze rules and one-key replies.", 0, "Productivity", "official", 3910, ["mail.read", "mail.send", "summarize"]],
  ["Focus Timer", "Pomodoro sessions that pause notifications and log deep work.", 1, "Productivity", "community", 860, ["notify", "timer"]],
  ["Meeting Notes", "Turns call transcripts into decisions, owners and follow-up tasks.", 1, "Productivity", "verified", 2140, ["audio.transcribe", "tasks.write", "summarize", "share"]],
  ["Git Companion", "Explain diffs, draft commit messages and review pull requests in chat.", 4, "Developer tools", "verified", 5630, ["repo.read", "shell", "diff", "review", "comment"]],
  ["Log Lens", "Tail and query logs with natural language; pin anomalies to a board.", 4, "Developer tools", "community", 1270, ["logs.read", "query"]],
  ["API Playground", "Send requests, save collections and let the agent write test cases.", 4, "Developer tools", "community", 940, ["http", "tests.write", "secrets.read"]],
  ["Schema Doctor", "Lint JSON schemas and database migrations before they ship.", 0, "Developer tools", "official", 2310, ["fs.read", "lint", "sql"]],
  ["Deep Search", "Hybrid keyword and vector search across notes, files and mail.", 2, "Data & search", "verified", 6120, ["index", "embed", "search", "files.read"]],
  ["Web Clipper", "Save pages as clean markdown with highlights and source links.", 2, "Data & search", "community", 1780, ["clip", "files.write"]],
  ["Sheets Bridge", "Read and write spreadsheets; the agent builds pivot summaries for you.", 5, "Data & search", "verified", 2450, ["sheets.read", "sheets.write", "chart"]],
  ["Paper Trail", "Cite sources automatically when the agent answers from your library.", 2, "Data & search", "community", 690, ["cite", "search"]],
  ["Team Chat Relay", "Bridge Sutra agents into team channels with per-channel permissions.", 0, "Communication", "official", 3340, ["chat.read", "chat.send", "mentions"]],
  ["Daily Digest", "A morning brief of tasks, events and unread threads, delivered your way.", 1, "Communication", "community", 1120, ["summarize", "notify", "calendar.read", "mail.read"]],
  ["Voice Notes", "Record voice memos that become searchable notes with action items.", 1, "Communication", "verified", 1530, ["audio.transcribe", "notes.write"]],
  ["Status Pages", "Post incident updates to your status page from a single command.", 5, "Communication", "community", 410, ["http", "notify"]],
  ["Workflow Builder", "Chain triggers, agents and actions on a visual canvas.", 0, "Automation", "official", 7210, ["triggers", "agents", "http", "schedule", "webhooks"]],
  ["Cron Jobs", "Schedule recurring agent runs with retries and run history.", 4, "Automation", "verified", 2980, ["schedule", "agents"]],
  ["Form Router", "Route form submissions to the right inbox, sheet or task list.", 5, "Automation", "community", 520, ["webhooks", "sheets.write", "tasks.write"]],
  ["Invoice Bot", "Extract line items from receipts and draft invoices for approval.", 5, "Automation", "community", 760, ["ocr", "files.read", "finance.write"]],
  ["Secret Scanner", "Blocks tokens and keys from leaving your workspace in agent output.", 3, "Security", "official", 4470, ["scan", "redact", "middleware"]],
  ["Permission Audit", "Weekly report of which extensions used which permissions.", 3, "Security", "verified", 1640, ["audit", "notify"]],
  ["Vault Connector", "Fetch secrets just-in-time from your vault instead of env files.", 3, "Security", "verified", 2090, ["secrets.read", "env"]],
  ["Sandbox Runner", "Run untrusted tools in an isolated, network-restricted sandbox.", 3, "Security", "community", 1380, ["sandbox", "shell", "fs.read"]],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const iso = (dayOffset: number) => new Date(Date.UTC(2026, 0, 5) + dayOffset * 86_400_000).toISOString().slice(0, 10);

const demoExtensions: MarketplaceExtension[] = rawExtensions.map(([name, description, a, category, tier, stars, capabilities], i) => {
  const author = demoAuthors[a]!;
  const id = slug(name);
  return {
    id,
    name,
    author,
    description,
    category,
    tier,
    stars,
    capabilities,
    version: `${1 + (i % 3)}.${(i * 7) % 10}.${i % 4}`,
    addedAt: iso((i * 11) % 180),
    updatedAt: iso(180 + ((i * 17) % 100)),
    platforms: i % 3 === 0 ? ["macOS", "Linux", "Windows"] : i % 3 === 1 ? ["macOS", "Linux"] : ["Web"],
    sha: (hueOf(id) * 2654435761).toString(16).replace("-", "").padEnd(12, "a").slice(0, 12),
    license: i % 4 === 0 ? "Apache-2.0" : "MIT",
    installCommand: `sutra plugins install ${author.handle}/${id}`,
    provides: {
      tools: capabilities.filter((c) => !["middleware", "env"].includes(c)).map((c) => c.replace(".", "_")),
      hooks: i % 2 === 0 ? ["on_message", "before_tool_call"] : ["on_schedule"],
      middleware: capabilities.includes("middleware") ? ["redact_output"] : [],
    },
    requiresEnv: capabilities.some((c) => c.startsWith("secrets") || c === "http") ? [`${id.toUpperCase().replace(/-/g, "_")}_TOKEN`] : [],
    screenshots: ["Overview", "Settings", "Run history", "Activity", "Permissions", "Logs", "Extra"].slice(0, 3 + (i % 5)).map((c, j) => ({ id: `s${j}`, caption: `${name}: ${c}` })),
    readme: `## ${name}\n\n${description}\n\n### Install\n\n\`\`\`sh\nsutra plugins install ${author.handle}/${id}\n\`\`\`\n\n### Configuration\n\n| Setting | Default | Description |\n| --- | --- | --- |\n| \`enabled\` | \`true\` | Turn the extension on or off |\n| \`scope\` | \`workspace\` | Where it applies |\n\n- Works offline where possible\n- Respects workspace permissions\n`,
  };
});

const demoTestimonials: Testimonial[] = [
  { id: "t1", source: "x", name: "Priya Raman", handle: "@priyabuilds", categories: ["Agents", "Speed"], href: "#testimonial-t1", quote: "Replaced four tabs and two scripts with one Sutra workflow. My mornings are quiet now." },
  { id: "t2", source: "reddit", name: "u/quietcompiler", handle: "r/selfhosted", categories: ["Privacy"], href: "#testimonial-t2", quote: "Runs entirely on my box, makes zero calls home by default, and the plugin permissions are actually readable." },
  { id: "t3", source: "discord", name: "Leo M.", handle: "Sutra community", categories: ["Plugins"], quote: "Wrote my first plugin in an afternoon. The hooks API is small enough to keep in your head." },
  { id: "t4", source: "blog", name: "Ama Owusu", handle: "amaowusu.dev", categories: ["Agents", "Plugins"], href: "#testimonial-t4", quote: "The subagent tree finally made delegation debuggable. I can see which child stalled and steer it without restarting the whole run." },
  { id: "t5", source: "hn", name: "jkessler", categories: ["Privacy", "Speed"], quote: "Snappy, local-first and the UI doesn't fight you. Rare combination." },
  { id: "t6", source: "github", name: "Dana Whitfield", handle: "@dwhit", categories: ["Plugins"], href: "#testimonial-t6", quote: "Clean extension manifest, sensible review process, fast merges. Contributing felt good." },
  { id: "t7", source: "youtube", name: "Build With Sam", handle: "@buildwithsam", categories: ["Speed"], quote: "Set up calendar sync, inbox triage and a daily digest in under ten minutes, on camera." },
  { id: "t8", source: "x", name: "Rafael Ortiz", handle: "@rafa_o", categories: ["Agents"], quote: "Auto reload on credits means my overnight agents never stall at 3am anymore." },
];

const demoFeatures: FeatureGridItem[] = [
  { icon: <RiRobot2Line aria-hidden />, title: "Agents that finish", description: "Plans, tools and retries built in, so long tasks complete without babysitting." },
  { icon: <RiLockLine aria-hidden />, title: "Private by default", description: "Runs on your machine. Nothing leaves unless you connect it." },
  { icon: <RiPlugLine aria-hidden />, title: "678 extensions", description: "Calendar, mail, git, search and more, installed in one command." },
  { icon: <RiFlashlightLine aria-hidden />, title: "Fast everywhere", description: "Native apps for macOS, Windows and Linux, plus a lightweight web client." },
  { icon: <RiTeamLine aria-hidden />, title: "Built for teams", description: "Shared workspaces, roles, audit logs and SSO on Team and Enterprise." },
  { icon: <RiCodeSSlashLine aria-hidden />, title: "Hackable", description: "A small hooks API and typed manifests make writing plugins a weekend project." },
  { icon: <RiBrainLine aria-hidden />, title: "Bring any model", description: "Route between hosted and local models per task, with spend limits." },
  { icon: <RiGlobalLine aria-hidden />, title: "Works offline", description: "Notes, tasks and search keep working on a plane." },
];

const demoInstallTabs: InstallSnippetTab[] = [
  { id: "curl", label: "curl", command: "curl -fsSL sutra.dev/install.sh | sh", note: "macOS and Linux. Installs to ~/.sutra and adds it to your PATH." },
  { id: "brew", label: "Homebrew", command: ["brew tap sutra/tap", "brew install sutra"] },
  { id: "npm", label: "npm", command: "npm install -g @sutra/cli", note: "Requires Node 20 or later." },
  { id: "pip", label: "pip", command: "pip install sutra-cli" },
];

const demoComparison: { products: ComparisonProduct[]; rows: ComparisonRow[]; footnotes: ComparisonFootnote[] } = {
  products: [
    { id: "sutra", name: "Sutra", highlight: true },
    { id: "atlas", name: "Atlas AI" },
    { id: "relay", name: "Relay Desk" },
  ],
  rows: [
    { feature: "Runs locally", values: { sutra: "yes", atlas: "no", relay: "partial" }, footnote: "local" },
    { feature: "Plugin marketplace", values: { sutra: "yes", atlas: "yes", relay: "no" } },
    { feature: "Bring your own model", values: { sutra: "yes", atlas: "partial", relay: "no" } },
    { feature: "Subagents", description: "Delegate work to child agents", values: { sutra: "yes", atlas: "no", relay: "no" } },
    { feature: "Audit log", values: { sutra: "yes", atlas: "yes", relay: "partial" }, footnote: "audit" },
    { feature: "Starting price", values: { sutra: "Free", atlas: "$25/mo", relay: "$12/seat" } },
  ],
  footnotes: [
    { id: "local", text: "Relay Desk offers an on-prem appliance on its enterprise plan only." },
    { id: "audit", text: "Audit log on Sutra Team and Enterprise; Relay Desk keeps 7 days." },
  ],
};

/** Fictional data used by the marketing block demos and the playground. */
export const marketingDemoData = {
  authors: demoAuthors,
  extensions: demoExtensions,
  testimonials: demoTestimonials,
  features: demoFeatures,
  installTabs: demoInstallTabs,
  comparison: demoComparison,
};
