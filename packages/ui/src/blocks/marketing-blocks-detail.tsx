/** ExtensionDetailPage: breadcrumbs, hero, install command, facts, capabilities, screenshots, README and more from the author. */
import * as React from "react";
import {
  RiCalendarLine,
  RiComputerLine,
  RiGitCommitLine,
  RiKey2Line,
  RiLinksLine,
  RiPlugLine,
  RiScales3Line,
  RiShieldKeyholeLine,
  RiStackLine,
  RiTimeLine,
  RiToolsLine,
  RiVerifiedBadgeFill,
} from "@remixicon/react";
import { cn, focusRing } from "../lib/cn";
import { Badge } from "../primitives/badge";
import { Breadcrumbs, type BreadcrumbRenderLink } from "../primitives/breadcrumbs";
import { InlineCopy } from "../patterns/code-block";
import { Markdown } from "../patterns/markdown";
import type { MarketplaceExtension } from "./marketing-blocks-model";
import { tierMeta, GradientArt, Monogram, formatDate, StarPill } from "./marketing-blocks-internal";
import { AuthorShelf } from "./marketing-blocks-card";

export interface ExtensionDetailPageProps extends React.HTMLAttributes<HTMLElement> {
  /** The extension to describe: name, author, tier, versions, capabilities, readme and links. */
  extension: MarketplaceExtension;
  /** Other extensions by the same author. */
  moreFromAuthor?: MarketplaceExtension[];
  /** Breadcrumb trail above the header; each crumb has a `label` and an optional `href`. */
  breadcrumbs?: { label: string; href?: string }[];
  /** Renders breadcrumb links in place of the default `<a>`, e.g. to use your router's Link. */
  renderLink?: BreadcrumbRenderLink;
  /** Called with the extension when a card in "More from author" is opened. */
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="flex min-w-0 flex-col gap-8">
            {hasCaps && (
              <DetailSection title="Capabilities">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        className={cn("group block w-full overflow-hidden rounded-box border border-border text-start", focusRing)}
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
                    <dd className="truncate text-end font-medium text-foreground">{f.value}</dd>
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
