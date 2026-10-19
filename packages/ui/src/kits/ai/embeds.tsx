import * as React from "react";
import {
  RiCodepenLine,
  RiExternalLinkLine,
  RiFigmaLine,
  RiGithubLine,
  RiLinksLine,
  RiMastodonLine,
  RiShieldCheckLine,
  RiSoundcloudLine,
  RiSpotifyLine,
  RiTwitterXLine,
  RiVimeoLine,
  RiYoutubeLine,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useLatestRef } from "../../hooks/use-iso-layout-effect";
import { isSafeHref } from "../../lib/validate";
import { Favicon, domainOf } from "../../primitives/favicon";
import { SplitButton } from "../../primitives/split-button";

/* ------------------------------------------------------------------ */
/* Consent context                                                     */
/* ------------------------------------------------------------------ */

export interface EmbedConsentContextValue {
  /** Provider ids the user has chosen to always allow. */
  allowed: readonly string[];
  isAllowed: (provider: string) => boolean;
  allow: (provider: string) => void;
  revoke: (provider: string) => void;
}

const EmbedConsentContext = React.createContext<EmbedConsentContextValue | null>(null);

/** Read remembered embed consent (null outside an EmbedConsentProvider). */
export function useEmbedConsent() {
  return React.useContext(EmbedConsentContext);
}

export interface EmbedConsentProviderProps {
  /** Allowed provider ids (controlled). Persist them in your app (e.g. settings). */
  allowed?: readonly string[];
  defaultAllowed?: readonly string[];
  onAllowedChange?: (allowed: string[]) => void;
  children?: React.ReactNode;
}

/** Remembers which embed providers the user has "always allowed". Persistence is left to the app. */
export function EmbedConsentProvider({ allowed: allowedProp, defaultAllowed = [], onAllowedChange, children }: EmbedConsentProviderProps) {
  const [inner, setInner] = React.useState<readonly string[]>(defaultAllowed);
  const allowed = allowedProp ?? inner;
  const changeRef = useLatestRef(onAllowedChange);
  const update = React.useCallback(
    (next: string[]) => {
      if (allowedProp === undefined) setInner(next);
      changeRef.current?.(next);
    },
    [allowedProp]
  );
  const value = React.useMemo<EmbedConsentContextValue>(
    () => ({
      allowed,
      isAllowed: (p) => allowed.includes(p),
      allow: (p) => {
        if (!allowed.includes(p)) update([...allowed, p]);
      },
      revoke: (p) => update(allowed.filter((x) => x !== p)),
    }),
    [allowed, update]
  );
  return <EmbedConsentContext.Provider value={value}>{children}</EmbedConsentContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* EmbedConsent                                                        */
/* ------------------------------------------------------------------ */

export interface EmbedConsentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Provider display name, e.g. "YouTube". */
  provider: string;
  /** Stable id used for remembered consent. Defaults to the lower-cased provider name. */
  providerId?: string;
  /** Domain the embed loads from, shown in the notice (e.g. "youtube.com"). */
  domain: string;
  icon?: React.ReactNode;
  /** Overrides the default "This will load content from … and may set cookies." */
  description?: React.ReactNode;
  /** Local preview shown inside the gate (no network). */
  preview?: React.ReactNode;
  /** Controlled consent for this embed. */
  consented?: boolean;
  defaultConsented?: boolean;
  /** Fired when the user clicks Load (or Always allow). */
  onConsent?: () => void;
  /**
   * Fired with the consent key (`providerId`) when the user picks "Always allow". For providers whose
   * server is user-controlled (e.g. Mastodon) RichEmbed passes an origin-scoped key, `"<id>:<origin>"`.
   */
  onAllowAlways?: (providerId: string) => void;
  loadLabel?: string;
  /** Label of the "Always allow" menu action. Defaults to "Always allow {provider}". */
  allowAlwaysLabel?: string;
  /** The embed, rendered only after consent. */
  children?: React.ReactNode | (() => React.ReactNode);
}

/** Privacy gate shown in place of a third-party embed until the user agrees to load it. */
export const EmbedConsent = React.forwardRef<HTMLDivElement, EmbedConsentProps>(
  (
    {
      provider,
      providerId,
      domain,
      icon,
      description,
      preview,
      consented: consentedProp,
      defaultConsented = false,
      onConsent,
      onAllowAlways,
      loadLabel = "Load",
      allowAlwaysLabel,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const ctx = useEmbedConsent();
    const id = providerId ?? provider.toLowerCase();
    const [inner, setInner] = React.useState(defaultConsented);
    const consented = consentedProp ?? inner;
    const titleId = React.useId();
    const descId = React.useId();

    if (consented || ctx?.isAllowed(id)) {
      return <>{typeof children === "function" ? children() : children}</>;
    }

    const load = () => {
      if (consentedProp === undefined) setInner(true);
      onConsent?.();
    };

    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-slot="embed-consent"
        data-provider={id}
        className={cn("flex flex-col gap-3 rounded-box border border-border bg-card p-3 text-sm shadow-xs", className)}
        {...props}
      >
        {preview}
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-box bg-muted text-foreground [&_svg]:size-4">
            {icon ?? <RiShieldCheckLine aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p id={titleId} className="font-medium text-foreground">
              Load {provider} content?
            </p>
            <p id={descId} className="text-xs leading-5 text-muted-foreground">
              {description ?? (
                <>
                  This will load content from <span className="font-medium text-foreground">{domain}</span> and may set cookies.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <SplitButton
            size="sm"
            variant="secondary"
            onClick={load}
            menuLabel={`More ${provider} options`}
            actions={[
              {
                id: "always",
                label: allowAlwaysLabel ?? `Always allow ${provider}`,
                icon: <RiShieldCheckLine aria-hidden />,
                onSelect: () => {
                  onAllowAlways?.(id);
                  ctx?.allow(id);
                  load();
                },
              },
            ]}
          >
            {loadLabel}
          </SplitButton>
        </div>
      </div>
    );
  }
);
EmbedConsent.displayName = "EmbedConsent";

/* ------------------------------------------------------------------ */
/* SandboxedFrame                                                      */
/* ------------------------------------------------------------------ */

/** Default sandbox tokens for third-party players: scripts run in their own origin, no top navigation, no forms. */
export const EMBED_SANDBOX = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation";
/**
 * Stricter sandbox for embeds from arbitrary, user-supplied origins (e.g. Mastodon servers):
 * popups stay sandboxed (no `allow-popups-to-escape-sandbox`).
 */
export const EMBED_SANDBOX_STRICT = "allow-scripts allow-same-origin allow-popups allow-presentation";
/** Default permissions policy for embeds. */
export const EMBED_ALLOW = "encrypted-media; picture-in-picture; fullscreen; clipboard-write";

export interface SandboxedFrameProps extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, "title"> {
  /** Required accessible title. */
  title: string;
  /** Width / height ratio (e.g. 16/9). Ignored when `height` is set. */
  aspectRatio?: number;
  /** Fixed height in px. */
  height?: number;
  /** Class for the outer wrapper. */
  wrapperClassName?: string;
}

/** An iframe with a strict sandbox, permissions allow-list, no referrer leakage and lazy loading. */
export const SandboxedFrame = React.forwardRef<HTMLIFrameElement, SandboxedFrameProps>(
  (
    {
      title,
      sandbox = EMBED_SANDBOX,
      allow = EMBED_ALLOW,
      referrerPolicy = "strict-origin-when-cross-origin",
      loading = "lazy",
      aspectRatio = 16 / 9,
      height,
      className,
      wrapperClassName,
      style,
      ...props
    },
    ref
  ) => (
    <div
      data-slot="sandboxed-frame"
      className={cn("relative w-full overflow-hidden rounded-box border border-border bg-muted", wrapperClassName)}
      style={height ? { height } : { aspectRatio: String(aspectRatio) }}
    >
      <iframe
        ref={ref}
        title={title}
        sandbox={sandbox}
        allow={allow}
        referrerPolicy={referrerPolicy}
        loading={loading}
        allowFullScreen
        className={cn("absolute inset-0 size-full border-0", className)}
        style={style}
        {...props}
      />
    </div>
  )
);
SandboxedFrame.displayName = "SandboxedFrame";

/* ------------------------------------------------------------------ */
/* Provider registry                                                   */
/* ------------------------------------------------------------------ */

export interface EmbedProvider {
  id: string;
  name: string;
  /** Domain named in the consent notice. */
  domain: string;
  icon?: React.ReactNode;
  /** Return the iframe src for a URL this provider handles, or null. */
  match: (url: URL) => string | null;
  aspectRatio?: number;
  height?: number;
  /** Sandbox override for this provider's iframe. Defaults to `EMBED_SANDBOX`. */
  sandbox?: string;
  allow?: string;
  /**
   * The embed's server is chosen by the URL (any origin can match), e.g. Mastodon. Consent is then
   * remembered per origin (`"<id>:<origin>"`) and the consent notice names the actual host.
   */
  originScoped?: boolean;
}

export interface EmbedMatch {
  provider: EmbedProvider;
  /** Iframe src (only rendered after consent). */
  src: string;
  url: string;
  /**
   * Key used for remembered consent: the provider id, or `"<id>:<origin>"` for `originScoped`
   * providers, so allowing one Mastodon server never allows another.
   */
  consentKey: string;
  /** Host named in the consent notice: the provider's domain, or the URL's host for `originScoped` providers. */
  domain: string;
}

const host = (url: URL) => url.hostname.replace(/^www\./, "").toLowerCase();
const seg = (url: URL) => url.pathname.split("/").filter(Boolean);
const enc = encodeURIComponent;

/** YouTube `t` / `start`: plain seconds ("90", "90s") or h/m/s ("1m30s", "1h2m3s"). 0 when unparseable. */
function youTubeStart(t: string | null): number {
  const m = t ? /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i.exec(t.trim()) : null;
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Built-in providers. Order matters: the first match wins. */
export const embedProviders: EmbedProvider[] = [
  {
    id: "youtube",
    name: "YouTube",
    domain: "youtube.com",
    icon: <RiYoutubeLine aria-hidden />,
    allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen; clipboard-write",
    match: (url) => {
      const h = host(url);
      const s = seg(url);
      let id: string | null = null;
      if (h === "youtu.be") id = s[0] ?? null;
      else if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com" || h === "youtube-nocookie.com") {
        if (s[0] === "watch") id = url.searchParams.get("v");
        else if (s[0] === "shorts" || s[0] === "embed" || s[0] === "live") id = s[1] ?? null;
      }
      if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
      const start = youTubeStart(url.searchParams.get("t") ?? url.searchParams.get("start"));
      return "https://www.youtube-nocookie.com/embed/" + enc(id) + (start > 0 ? "?start=" + start : "");
    },
  },
  {
    id: "vimeo",
    name: "Vimeo",
    domain: "vimeo.com",
    icon: <RiVimeoLine aria-hidden />,
    match: (url) => {
      const h = host(url);
      if (h !== "vimeo.com" && h !== "player.vimeo.com") return null;
      const id = seg(url).find((p) => /^\d+$/.test(p));
      return id ? "https://player.vimeo.com/video/" + id + "?dnt=1" : null;
    },
  },
  {
    id: "spotify",
    name: "Spotify",
    domain: "spotify.com",
    icon: <RiSpotifyLine aria-hidden />,
    height: 152,
    allow: "encrypted-media; clipboard-write; fullscreen",
    match: (url) => {
      if (host(url) !== "open.spotify.com") return null;
      const s = seg(url).filter((p) => !/^intl-/.test(p) && p !== "embed");
      const [type, id] = s;
      if (!type || !id || !/^(track|album|playlist|episode|show|artist)$/.test(type) || !/^\w+$/.test(id)) return null;
      return "https://open.spotify.com/embed/" + type + "/" + id;
    },
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    domain: "soundcloud.com",
    icon: <RiSoundcloudLine aria-hidden />,
    height: 166,
    match: (url) => {
      if (host(url) !== "soundcloud.com" || seg(url).length < 2) return null;
      const clean = url.origin + url.pathname;
      return "https://w.soundcloud.com/player/?url=" + enc(clean) + "&visual=false&show_comments=false";
    },
  },
  {
    id: "x",
    name: "X",
    domain: "x.com",
    icon: <RiTwitterXLine aria-hidden />,
    height: 420,
    match: (url) => {
      const h = host(url);
      if (h !== "x.com" && h !== "twitter.com" && h !== "mobile.twitter.com") return null;
      const s = seg(url);
      const i = s.indexOf("status");
      const id = i >= 0 ? s[i + 1] : undefined;
      return id && /^\d+$/.test(id) ? "https://platform.twitter.com/embed/Tweet.html?dnt=true&id=" + id : null;
    },
  },
  {
    id: "mastodon",
    name: "Mastodon",
    domain: "the Mastodon server",
    icon: <RiMastodonLine aria-hidden />,
    height: 360,
    originScoped: true,
    sandbox: EMBED_SANDBOX_STRICT,
    match: (url) => {
      if (url.protocol !== "https:" || url.username || url.password) return null;
      const s = seg(url);
      if (s.length !== 2 || !/^@[\w.]+$/.test(s[0]) || !/^\d{6,}$/.test(s[1])) return null;
      return url.origin + "/" + s[0] + "/" + s[1] + "/embed";
    },
  },
  {
    id: "gist",
    name: "GitHub Gist",
    domain: "gist.github.com",
    icon: <RiGithubLine aria-hidden />,
    height: 320,
    match: (url) => {
      if (host(url) !== "gist.github.com") return null;
      const s = seg(url);
      const id = s.length >= 2 ? s[1] : s[0];
      if (!id || !/^[0-9a-f]{5,}$/i.test(id)) return null;
      return "https://gist.github.com/" + (s.length >= 2 ? s[0] + "/" : "") + id + ".pibb";
    },
  },
  {
    id: "figma",
    name: "Figma",
    domain: "figma.com",
    icon: <RiFigmaLine aria-hidden />,
    aspectRatio: 4 / 3,
    match: (url) => {
      if (host(url) !== "figma.com") return null;
      if (!/^(file|design|proto|board|slides)$/.test(seg(url)[0] ?? "")) return null;
      return "https://www.figma.com/embed?embed_host=sutra&url=" + enc(url.href);
    },
  },
  {
    id: "codepen",
    name: "CodePen",
    domain: "codepen.io",
    icon: <RiCodepenLine aria-hidden />,
    height: 380,
    match: (url) => {
      if (host(url) !== "codepen.io") return null;
      const [user, kind, id] = seg(url);
      if (!user || !id || (kind !== "pen" && kind !== "embed" && kind !== "full")) return null;
      return "https://codepen.io/" + enc(user) + "/embed/" + enc(id) + "?default-tab=result";
    },
  },
];

/**
 * Resolve a URL against a provider registry. Returns null for unsupported or non-http(s) URLs, and
 * for matches whose iframe src would not be https.
 */
export function resolveEmbed(href: string, providers: readonly EmbedProvider[] = embedProviders): EmbedMatch | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  for (const provider of providers) {
    const src = provider.match(url);
    if (!src || !/^https:/i.test(src)) continue;
    return {
      provider,
      src,
      url: href,
      consentKey: provider.originScoped ? `${provider.id}:${url.origin}` : provider.id,
      domain: provider.originScoped ? url.host : provider.domain,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* LinkPreviewCard                                                     */
/* ------------------------------------------------------------------ */

export interface LinkPreviewCardProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "title"> {
  href: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Overrides the domain derived from `href`. */
  domain?: string;
  /** Image slot (app-provided element; Sutra never fetches previews). */
  image?: React.ReactNode;
  /** Site icon; defaults to a local Favicon monogram. */
  icon?: React.ReactNode;
  layout?: "horizontal" | "vertical";
}

/** Link card with title, description, domain and an optional image slot. Data comes from the app; nothing is fetched. */
export const LinkPreviewCard = React.forwardRef<HTMLAnchorElement, LinkPreviewCardProps>(
  ({ href, title, description, domain: domainProp, image, icon, layout = "horizontal", className, target = "_blank", rel, ...props }, ref) => {
    const domain = domainProp ?? domainOf(href);
    return (
      <a
        ref={ref}
        href={isSafeHref(href) ? href : undefined}
        target={target}
        rel={rel ?? "noopener noreferrer nofollow"}
        data-slot="link-preview-card"
        className={cn(
          "group/link flex overflow-hidden rounded-box border border-border bg-card text-sm shadow-xs transition-colors hover:border-border-strong hover:bg-subtle",
          layout === "vertical" ? "flex-col" : "flex-row items-stretch",
          focusRing,
          className
        )}
        {...props}
      >
        {image && (
          <span
            aria-hidden
            className={cn(
              "relative flex shrink-0 overflow-hidden bg-muted [&>img]:size-full [&>img]:object-cover",
              layout === "vertical" ? "aspect-[1.91/1] w-full" : "w-28 sm:w-36"
            )}
          >
            {image}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {icon ?? <Favicon domain={domain} className="size-4" />}
            <span className="truncate">{domain}</span>
            <RiExternalLinkLine aria-hidden className="ml-auto size-3.5 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
          </span>
          {title && <span className="line-clamp-2 font-medium text-foreground">{title}</span>}
          {description && <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</span>}
          {!title && !description && <span className="truncate text-xs text-muted-foreground">{href}</span>}
        </span>
      </a>
    );
  }
);
LinkPreviewCard.displayName = "LinkPreviewCard";

/* ------------------------------------------------------------------ */
/* RichEmbed                                                           */
/* ------------------------------------------------------------------ */

export interface RichEmbedProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  url: string;
  /** Title for the local preview, the iframe title and the link card. */
  title?: string;
  description?: React.ReactNode;
  /** Image slot for the link-card fallback (app-provided). */
  image?: React.ReactNode;
  providers?: readonly EmbedProvider[];
  /**
   * Fired with the consent key when the user picks "Always allow": the provider id (e.g. `"youtube"`),
   * or `"<id>:<origin>"` for origin-scoped providers such as Mastodon (`"mastodon:<origin>"`).
   * Store it as-is in `EmbedConsentProvider`'s `allowed` list.
   */
  onAllowAlways?: (providerId: string) => void;
  /** Fired when the embed is loaded after consent, with the provider id and the consent key. */
  onConsent?: (providerId: string, consentKey: string) => void;
  /** Skip the consent gate (only when your app already obtained consent). */
  consented?: boolean;
}

/** Renders a URL as a provider embed (after consent) or a link card. The iframe src is only built into the DOM post-consent. */
export const RichEmbed = React.forwardRef<HTMLDivElement, RichEmbedProps>(
  ({ url, title, description, image, providers = embedProviders, onAllowAlways, onConsent, consented, className, ...props }, ref) => {
    const match = React.useMemo(() => resolveEmbed(url, providers), [url, providers]);
    if (!match) {
      return (
        <div ref={ref} data-slot="rich-embed" data-provider="link" className={className} {...props}>
          <LinkPreviewCard href={url} title={title} description={description} image={image} />
        </div>
      );
    }
    const { provider, src, consentKey } = match;
    const domain = domainOf(url);
    return (
      <div ref={ref} data-slot="rich-embed" data-provider={provider.id} className={cn("w-full", className)} {...props}>
        <EmbedConsent
          provider={provider.name}
          providerId={consentKey}
          domain={match.domain}
          allowAlwaysLabel={provider.originScoped ? `Always allow ${match.domain}` : undefined}
          icon={provider.icon}
          consented={consented}
          onAllowAlways={onAllowAlways}
          onConsent={() => onConsent?.(provider.id, consentKey)}
          preview={
            <div className="flex items-center gap-2.5 rounded-control border border-dashed border-border bg-subtle px-2.5 py-2">
              <Favicon domain={domain} className="size-5" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{title ?? `${provider.name} embed`}</div>
                <div className="truncate text-xs text-muted-foreground">{domain}</div>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={`Open on ${domain}`}
                title={`Open on ${domain}`}
                className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-4", focusRing)}
              >
                <RiLinksLine aria-hidden />
              </a>
            </div>
          }
        >
          {() => (
            <SandboxedFrame
              src={src}
              title={title ?? `${provider.name} embed`}
              aspectRatio={provider.aspectRatio}
              height={provider.height}
              sandbox={provider.sandbox ?? EMBED_SANDBOX}
              allow={provider.allow}
            />
          )}
        </EmbedConsent>
      </div>
    );
  }
);
RichEmbed.displayName = "RichEmbed";

/* ------------------------------------------------------------------ */
/* SvgEmbed                                                            */
/* ------------------------------------------------------------------ */

export interface SvgEmbedProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** SVG markup (untrusted). Rendered via an <img> data URL, never injected as HTML, so scripts and remote refs don't run. */
  svg: string;
  /** Alt text. */
  title: string;
  /** Optional caption. */
  caption?: React.ReactNode;
  imgClassName?: string;
}

/** Safely renders user-supplied SVG through an image data URL (no innerHTML, no script execution). */
export const SvgEmbed = React.forwardRef<HTMLElement, SvgEmbedProps>(({ svg, title, caption, className, imgClassName, ...props }, ref) => {
  const src = React.useMemo(() => {
    const markup = /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg) ? svg : "<svg xmlns='http://www.w3.org/2000/svg'/>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
  }, [svg]);
  return (
    <figure ref={ref} data-slot="svg-embed" className={cn("m-0 flex flex-col items-center gap-2 rounded-box border border-border bg-card p-3", className)} {...props}>
      <img src={src} alt={title} draggable={false} className={cn("max-h-96 max-w-full", imgClassName)} />
      {caption && <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
});
SvgEmbed.displayName = "SvgEmbed";
