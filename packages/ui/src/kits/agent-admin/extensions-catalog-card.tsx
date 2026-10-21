/** Catalog entries: the CatalogCard with its tier and entry-state types. */
import * as React from "react";
import { RiArrowUpCircleLine, RiBookOpenLine, RiCheckLine, RiDownloadLine, RiGithubLine, RiLinkUnlink, RiStarLine } from "@remixicon/react";
import { cn, focusRing, hitArea } from "../../lib/cn";
import { formatCompact } from "../../lib/format";
import { isSafeHref } from "../../lib/validate";
import { useAsyncAction } from "../../hooks/use-async-action";
import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { CapabilityMonogram, TrustBadge, type CapabilityTrustLevel } from "./capabilities";

function ExternalLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a
      href={isSafeHref(href) ? href : undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(hitArea, "inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-foreground [&_svg]:size-3.5", focusRing)}
    >
      <span aria-hidden>{icon}</span>
      {children}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* CatalogCard                                                         */
/* ------------------------------------------------------------------ */

export type ExtensionTier = "official" | "community";
export type CatalogEntryState = "available" | "installed" | "update-available" | "removed";

export interface CatalogCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Extension name, shown as the card title. */
  name: string;
  /** Publisher, shown as "by <author>" under the name. */
  author?: string;
  /** Short summary of what the extension does; clamped to two lines. */
  description?: React.ReactNode;
  /** Extension icon or logo, shown beside the name. */
  icon?: React.ReactNode;
  /** Banner image URL or node. */
  banner?: string | React.ReactNode;
  /** `official` (first-party) or `community`; sets the tier badge. */
  tier?: ExtensionTier;
  /** Trust level of the publisher or capability; shown as a trust badge. */
  trust?: CapabilityTrustLevel;
  /** Version of the catalog entry (without the leading `v`). */
  version?: string;
  /**
   * Newest available version; with `onUpdate` and `state="update-available"` it labels the Update button ("Update to
   * v1.2").
   */
  latestVersion?: string;
  /** Capability ids (mono chips), capped at `maxCapabilities`. */
  capabilities?: string[];
  /** How many capability chips to show before collapsing the rest into a "+N" badge. */
  maxCapabilities?: number;
  /** Supported platforms (e.g. "macos", "linux"), shown as small chips. */
  platforms?: string[];
  /** Star count from the source repository; hidden when unset. */
  stars?: number;
  /** Install state of this entry; drives the action button (Install, Installed, Update, Removed). */
  state?: CatalogEntryState;
  /** Link to the extension's documentation; shows a Docs link when set. */
  docsUrl?: string;
  /** Link to the source repository; shows a Repository link when set. */
  repoUrl?: string;
  /** Called when the user presses Install; may return a promise to keep the button busy until it settles. */
  onInstall?: () => void | Promise<void>;
  /** Called when the user presses Update (shown when the entry has a newer version). */
  onUpdate?: () => void;
  /** Called when the user presses Open; the button is hidden when unset. */
  onOpen?: () => void;
}

const formatStars = (n: number) => formatCompact(n, { decimals: 1, wholeAbove: 10, trimZeros: false });

/** Plugin/skill catalog entry with tier, trust, capabilities, platforms, stars and install/update states. */
export const CatalogCard = React.forwardRef<HTMLElement, CatalogCardProps>(
  (
    {
      name,
      author,
      description,
      icon,
      banner,
      tier,
      trust,
      version,
      latestVersion,
      capabilities = [],
      maxCapabilities = 4,
      platforms = [],
      stars,
      state = "available",
      docsUrl,
      repoUrl,
      onInstall,
      onUpdate,
      onOpen,
      className,
      ...props
    },
    ref
  ) => {
    const installAction = useAsyncAction(async () => {
      await onInstall?.();
    });
    const busy = installAction.busy;
    const titleId = React.useId();
    const shownCaps = capabilities.slice(0, maxCapabilities);
    const extra = capabilities.length - shownCaps.length;
    const install = () => void installAction.run();
    return (
      <article
        ref={ref}
        aria-labelledby={titleId}
        data-slot="catalog-card"
        data-state={state}
        className={cn("flex flex-col overflow-hidden rounded-box border border-border bg-card shadow-xs", className)}
        {...props}
      >
        {banner != null &&
          (typeof banner === "string" ? (
            <img src={banner} alt="" className="h-24 w-full object-cover" />
          ) : (
            <div aria-hidden className="h-24 w-full overflow-hidden">
              {banner}
            </div>
          ))}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-1 basis-40 items-start gap-3">
              {icon ? (
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-box border border-border bg-background [&_svg]:size-5">
                  {icon}
                </span>
              ) : (
                <CapabilityMonogram name={name} className="size-10" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 id={titleId} className="truncate text-sm font-semibold text-foreground">
                    {name}
                  </h3>
                  {tier && (
                    <Badge size="sm" color={tier === "official" ? "brand" : "neutral"} variant={tier === "official" ? "soft" : "outline"} data-tier={tier}>
                      {tier === "official" ? "Official" : "Community"}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {author && <>by {author}</>}
                  {author && version && " · "}
                  {version && <span className="font-mono">v{version}</span>}
                </p>
              </div>
            </div>
            {trust && <TrustBadge level={trust} />}
          </div>
          {description != null && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
          {capabilities.length > 0 && (
            <ul aria-label="Capabilities" className="flex flex-wrap gap-1">
              {shownCaps.map((c) => (
                <li key={c}>
                  <Badge size="sm" variant="outline" className="font-mono">
                    {c}
                  </Badge>
                </li>
              ))}
              {extra > 0 && (
                <li>
                  <Badge size="sm" color="gray" title={capabilities.slice(maxCapabilities).join(", ")} aria-label={`${extra} more capabilities`}>
                    +{extra}
                  </Badge>
                </li>
              )}
            </ul>
          )}
          {(platforms.length > 0 || stars != null) && (
            <div className="flex flex-wrap items-center gap-1">
              {platforms.map((p) => (
                <span key={p} className="rounded-control bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                  {p}
                </span>
              ))}
              {stars != null && (
                <span className="ms-auto inline-flex items-center gap-0.5 text-xs text-muted-foreground tabular-nums">
                  <RiStarLine aria-hidden className="size-3.5" />
                  <span className="sr-only">Stars:</span>
                  {formatStars(stars)}
                </span>
              )}
            </div>
          )}
          {state === "removed" && (
            <p role="note" className="flex items-start gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning-soft-foreground">
              <RiLinkUnlink aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Removed from the catalog. It keeps working but will not receive updates.
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
            {docsUrl && (
              <ExternalLink href={docsUrl} icon={<RiBookOpenLine aria-hidden />}>
                Docs
              </ExternalLink>
            )}
            {repoUrl && (
              <ExternalLink href={repoUrl} icon={<RiGithubLine aria-hidden />}>
                Repo
              </ExternalLink>
            )}
            <span className="flex-1" />
            {state === "available" && onInstall && (
              <Button size="sm" leadingIcon={<RiDownloadLine aria-hidden />} loading={busy} onClick={install} aria-label={`Install ${name}`}>
                Install
              </Button>
            )}
            {state === "update-available" && (
              <Button size="sm" variant="soft" leadingIcon={<RiArrowUpCircleLine aria-hidden />} onClick={onUpdate} aria-label={`Update ${name}${latestVersion ? ` to v${latestVersion}` : ""}`}>
                Update{latestVersion ? ` to v${latestVersion}` : ""}
              </Button>
            )}
            {(state === "installed" || state === "removed") && (
              <>
                <Badge size="sm" color="success" leadingIcon={<RiCheckLine aria-hidden className="size-3" />}>
                  Installed
                </Badge>
                {onOpen && (
                  <Button size="sm" variant="ghost" onClick={onOpen} aria-label={`Open ${name}`}>
                    Open
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </article>
    );
  }
);
CatalogCard.displayName = "CatalogCard";
