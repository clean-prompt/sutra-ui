import * as React from "react";
import { RiDoubleQuotesL, RiStarFill } from "@remixicon/react";
import { cn, hitArea } from "../lib/cn";
import { Avatar } from "../primitives/avatar";
import { MeshGradient } from "../primitives/mesh-gradient";
import { SutraLogo, SutraMark, SutraAppIcon, sutraApps } from "../assets/brand";
import { LogoCloud, type PlaceholderLogoEntry } from "../assets/placeholder-logos";
import { BackgroundPattern, DeviceFrame } from "../assets/misc";
import { LoginCard } from "./auth-blocks";
import { BlockLink, type BlockLinkRenderer } from "./block-utils";

export interface AuthPageLink {
  label: React.ReactNode;
  href: string;
}

const defaultFooterLinks: AuthPageLink[] = [
  { label: "Terms", href: "#terms" },
  { label: "Privacy", href: "#privacy" },
  { label: "Help", href: "#help" },
];

/** Props shared by the full-page auth layouts. */
export interface AuthPageBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The form. Defaults to a `LoginCard`. */
  children?: React.ReactNode;
  /** Logo shown at the top. Defaults to the Sutra lockup. */
  logo?: React.ReactNode;
  /** Where the logo links to. */
  homeHref?: string;
  /** Links in the page footer (terms, privacy, help); each has a `label` and an `href`. */
  footerLinks?: AuthPageLink[];
  /** Copyright line. */
  copyright?: React.ReactNode;
  /** Renders the logo and footer links in place of the default `<a>`, e.g. to use your router's Link. */
  renderLink?: BlockLinkRenderer;
}

function AuthPageFooter({
  links,
  copyright,
  renderLink,
  className,
}: {
  links: AuthPageLink[];
  copyright: React.ReactNode;
  renderLink?: BlockLinkRenderer;
  className?: string;
}) {
  return (
    <footer className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground", className)}>
      <span>{copyright}</span>
      {links.length > 0 && (
        <nav aria-label="Legal" className="flex items-center gap-4">
          {links.map((l) => (
            <BlockLink
              key={l.href}
              href={l.href}
              renderLink={renderLink}
              className={cn(hitArea, "rounded-xs transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40")}
            >
              {l.label}
            </BlockLink>
          ))}
        </nav>
      )}
    </footer>
  );
}

function HomeLogo({ logo, href, renderLink }: { logo?: React.ReactNode; href: string; renderLink?: BlockLinkRenderer }) {
  return (
    <BlockLink
      href={href}
      renderLink={renderLink}
      className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
    >
      {logo ?? <SutraLogo size="md" />}
    </BlockLink>
  );
}

/* ------------------------------------------------------------------ */
/* AuthSplitPage                                                       */
/* ------------------------------------------------------------------ */

export interface AuthTestimonial {
  quote: React.ReactNode;
  name: string;
  role?: React.ReactNode;
  avatarSrc?: string;
}

export interface AuthSplitPageProps extends AuthPageBaseProps {
  /** Quote shown on the side panel: `quote`, author name and role. */
  testimonial?: AuthTestimonial;
  /** Logos under the testimonial. Pass `[]` to hide. */
  logos?: PlaceholderLogoEntry[];
  /**
   * Heading above the logo row.
   * @default "Trusted by 40,000+ people at"
   */
  logosTitle?: React.ReactNode;
  /** Fully replace the brand panel content. */
  panel?: React.ReactNode;
  /** Put the brand panel on the left. */
  reverse?: boolean;
}

const defaultTestimonial: AuthTestimonial = {
  quote:
    "Sutra replaced five apps for me. My notes, tasks and calendar finally talk to each other, and I get an hour back every single day.",
  name: "Lena Okafor",
  role: "Founder, Northwind Studio",
};

/** Two-column auth page: form on one side, brand panel with mesh gradient, testimonial and logos on the other. */
export const AuthSplitPage = React.forwardRef<HTMLDivElement, AuthSplitPageProps>(
  (
    {
      children,
      logo,
      homeHref = "/",
      footerLinks = defaultFooterLinks,
      copyright = "© 2026 Sutra Labs",
      renderLink,
      testimonial = defaultTestimonial,
      logos,
      logosTitle = "Trusted by 40,000+ people at",
      panel,
      reverse = false,
      className,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={cn("grid grid-cols-1 min-h-svh bg-background lg:grid-cols-2", className)} {...props}>
      <div className={cn("flex flex-col px-6 py-6 sm:px-10 lg:py-8", reverse && "lg:order-last")}>
        <HomeLogo logo={logo} href={homeHref} renderLink={renderLink} />
        <main className="flex flex-1 items-center justify-center py-10">
          {children ?? <LoginCard variant="plain" className="max-w-[380px]" />}
        </main>
        <AuthPageFooter links={footerLinks} copyright={copyright} renderLink={renderLink} className="justify-between" />
      </div>
      <aside className="hidden p-3 lg:block">
        <MeshGradient
          grain
          intensity={0.85}
          colors={["var(--color-brand-500)", "var(--color-brand-700)", "var(--chart-6)", "var(--chart-2)", "var(--color-brand-400)"]}
          className="dark flex h-full min-h-[640px] flex-col justify-between rounded-2xl bg-brand-950 p-10 text-white shadow-inner-highlight xl:p-14"
        >
          {panel ?? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <SutraMark size={22} />
                The calm productivity suite
              </div>
              <figure className="max-w-lg">
                <RiDoubleQuotesL aria-hidden className="mb-4 size-9 text-white/40" />
                <div className="mb-4 flex gap-0.5 text-warning-soft-foreground" role="img" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <RiStarFill key={i} aria-hidden className="size-4" />
                  ))}
                </div>
                <blockquote className="text-balance text-2xl font-medium leading-snug tracking-tight text-white xl:text-[28px]">
                  {testimonial.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Avatar name={testimonial.name} src={testimonial.avatarSrc} size="md" className="ring-2 ring-white/20 rounded-full" />
                  <div className="leading-tight">
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    {testimonial.role ? <div className="mt-0.5 text-sm text-white/70">{testimonial.role}</div> : null}
                  </div>
                </figcaption>
              </figure>
              {logos && logos.length === 0 ? (
                <span />
              ) : (
                <div className="text-white/75">
                  <p className="mb-5 text-sm font-medium text-white/60">{logosTitle}</p>
                  <LogoCloud logos={logos} limit={4} columns={4} logoSize="sm" muted={false} className="[&_ul]:gap-x-6" />
                </div>
              )}
            </>
          )}
        </MeshGradient>
      </aside>
    </div>
  )
);
AuthSplitPage.displayName = "AuthSplitPage";

/* ------------------------------------------------------------------ */
/* AuthCenteredPage                                                    */
/* ------------------------------------------------------------------ */

export interface AuthCenteredPageProps extends AuthPageBaseProps {
  /** Background pattern behind the card. */
  pattern?: "dots" | "grid" | "none";
}

/** Centered card on a dotted background, with the logo above and footer links below. */
export const AuthCenteredPage = React.forwardRef<HTMLDivElement, AuthCenteredPageProps>(
  (
    {
      children,
      logo,
      homeHref = "/",
      footerLinks = defaultFooterLinks,
      copyright = "© 2026 Sutra Labs",
      renderLink,
      pattern = "dots",
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn("relative isolate flex min-h-svh flex-col items-center overflow-hidden bg-subtle px-4 py-8 sm:py-12", className)}
      {...props}
    >
      {pattern !== "none" && <BackgroundPattern variant={pattern} fade="radial" className="-z-10" />}
      <div
        aria-hidden
        className="pointer-events-none absolute start-1/2 top-0 -z-10 h-80 w-[48rem] max-w-full -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-brand-400/15 blur-3xl"
      />
      <HomeLogo logo={logo ?? <SutraLogo size="lg" />} href={homeHref} renderLink={renderLink} />
      <main className="flex w-full flex-1 items-center justify-center py-8">
        {children ?? <LoginCard logo={false} className="shadow-lg" />}
      </main>
      <AuthPageFooter links={footerLinks} copyright={copyright} renderLink={renderLink} className="justify-center" />
    </div>
  )
);
AuthCenteredPage.displayName = "AuthCenteredPage";

/* ------------------------------------------------------------------ */
/* AuthImagePage                                                       */
/* ------------------------------------------------------------------ */

export interface AuthImagePageProps extends AuthPageBaseProps {
  /** Image URL for the right panel. */
  imageSrc?: string;
  /**
   * Alt text of the panel image; the default is empty (decorative).
   * @default ""
   */
  imageAlt?: string;
  /** Custom illustration/media for the right panel (overrides `imageSrc`). */
  media?: React.ReactNode;
  /** Caption overlaid at the bottom of the media. */
  caption?: React.ReactNode;
}

function AuthAppPreview() {
  return (
    <DeviceFrame url="app.sutra.so/home" className="w-full max-w-xl shadow-2xl" screenClassName="bg-background">
      <div className="grid grid-cols-[120px_1fr] text-start">
        <div className="flex flex-col gap-1.5 border-e border-border bg-subtle p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <SutraMark size={16} />
            <span className="text-xs font-semibold">Personal</span>
          </div>
          {sutraApps.slice(0, 6).map((app, i) => (
            <div key={app} className={cn("flex items-center gap-1.5 rounded-sm px-1.5 py-1", i === 1 && "bg-background shadow-xs ring-1 ring-border")}>
              <SutraAppIcon app={app} size={12} />
              <span className="h-1.5 flex-1 rounded-full bg-border" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="h-2.5 w-28 rounded-full bg-foreground/80" />
          <div className="h-2 w-44 rounded-full bg-border" />
          <div className="mt-1 grid grid-cols-3 gap-2">
            {["notes", "tasks", "calendar"].map((app) => (
              <div key={app} className="flex flex-col gap-2 rounded-md border border-border p-2.5">
                <SutraAppIcon app={app as "notes"} size={18} />
                <span className="h-1.5 w-3/4 rounded-full bg-border" />
                <span className="h-1.5 w-1/2 rounded-full bg-border" />
              </div>
            ))}
          </div>
          {[0.9, 0.7, 0.8].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={cn("size-3 rounded-[4px] border border-border-strong", i === 0 && "border-primary bg-primary")} />
              <span className="h-1.5 rounded-full bg-border" style={{ width: `${w * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
    </DeviceFrame>
  );
}

/** Form on the left; full-bleed image or illustration slot on the right. */
export const AuthImagePage = React.forwardRef<HTMLDivElement, AuthImagePageProps>(
  (
    {
      children,
      logo,
      homeHref = "/",
      footerLinks = defaultFooterLinks,
      copyright = "© 2026 Sutra Labs",
      renderLink,
      imageSrc,
      imageAlt = "",
      media,
      caption = (
        <>
          <p className="text-lg font-semibold text-white">Everything in one calm place</p>
          <p className="mt-1 text-sm text-white/75">Notes, tasks, calendar, mail and more — connected by a single thread.</p>
        </>
      ),
      className,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={cn("grid grid-cols-1 min-h-svh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]", className)} {...props}>
      <div className="flex flex-col px-6 py-6 sm:px-10 lg:py-8">
        <HomeLogo logo={logo} href={homeHref} renderLink={renderLink} />
        <main className="flex flex-1 items-center justify-center py-10">
          {children ?? <LoginCard variant="plain" className="max-w-[380px]" />}
        </main>
        <AuthPageFooter links={footerLinks} copyright={copyright} renderLink={renderLink} />
      </div>
      <aside className="relative hidden overflow-hidden border-s border-border bg-muted lg:block">
        {media ??
          (imageSrc ? (
            <img src={imageSrc} alt={imageAlt} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-400 via-brand-600 to-brand-900 p-12">
              <BackgroundPattern variant="grid" fade="radial" color="color-mix(in oklab, white 12%, transparent)" />
              <AuthAppPreview />
            </div>
          ))}
        {caption ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent p-10 pt-24">
            {caption}
          </div>
        ) : null}
      </aside>
    </div>
  )
);
AuthImagePage.displayName = "AuthImagePage";

/* ------------------------------------------------------------------ */
/* AuthMinimalPage                                                     */
/* ------------------------------------------------------------------ */

export type AuthMinimalPageProps = AuthPageBaseProps;

/** No card, no chrome: just the mark and the form, centered. */
export const AuthMinimalPage = React.forwardRef<HTMLDivElement, AuthMinimalPageProps>(
  (
    {
      children,
      logo,
      homeHref = "/",
      footerLinks = defaultFooterLinks,
      copyright = "© 2026 Sutra Labs",
      renderLink,
      className,
      ...props
    },
    ref
  ) => (
    <div ref={ref} className={cn("flex min-h-svh flex-col items-center bg-background px-4 py-10", className)} {...props}>
      <main className="flex w-full max-w-[360px] flex-1 flex-col items-center justify-center gap-8">
        <HomeLogo logo={logo ?? <SutraMark size={44} title="Sutra" />} href={homeHref} renderLink={renderLink} />
        {children ?? (
          <LoginCard
            variant="plain"
            title="Sign in to Sutra"
            description={null}
            providers={["google"]}
            socialLayout="stack"
            showRemember={false}
          />
        )}
      </main>
      <AuthPageFooter links={footerLinks} copyright={copyright} renderLink={renderLink} className="justify-center" />
    </div>
  )
);
AuthMinimalPage.displayName = "AuthMinimalPage";
