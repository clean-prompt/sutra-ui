/** MarketplaceCard and AuthorShelf: the extension card and a scrolling shelf of an author's cards. */
import * as React from "react";
import { RiArrowRightSLine, RiVerifiedBadgeFill } from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../lib/cn";
import { Avatar } from "../primitives/avatar";
import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import type { MarketplaceAuthor, MarketplaceExtension } from "./marketing-blocks-model";
import { tierMeta, GradientArt, Monogram, formatDate, Pill, StarPill } from "./marketing-blocks-internal";

export interface MarketplaceCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  /** The extension to show: name, author, tier, description, capabilities, install count and dates. */
  extension: MarketplaceExtension;
  /** Capability chips shown before "+N". Default 3. */
  maxCapabilities?: number;
  /** Called with the extension when the card is clicked; the card then becomes a button. */
  onOpen?: (extension: MarketplaceExtension) => void;
  /** `compact` hides the dates row (shelves). Default "normal". */
  density?: Density;
  /** Legacy form of `density="compact"`. @deprecated Use `density="compact"`. */
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
                <button type="button" onClick={() => onOpen(ext)} className={cn("rounded-xs text-start after:absolute after:inset-0 hover:underline", focusRing)}>
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
/* AuthorShelf                                                         */
/* ------------------------------------------------------------------ */

export interface AuthorShelfProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The author shown in the shelf header (name, avatar, handle). */
  author: MarketplaceAuthor;
  /** The author's extensions, shown as cards. */
  items: MarketplaceExtension[];
  /** Shelf heading; defaults to the author's name. */
  title?: React.ReactNode;
  /** Called with the extension when a card is opened. */
  onOpen?: (extension: MarketplaceExtension) => void;
  /** Called when "View all" is clicked; setting it shows the link. */
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
            <Button variant="ghost" size="sm" trailingIcon={<RiArrowRightSLine className="rtl:-scale-x-100" aria-hidden />} onClick={onViewAll} aria-label={`View all by ${author.name}`}>
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
