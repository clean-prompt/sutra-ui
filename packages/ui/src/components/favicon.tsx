import * as React from "react";
import { cn } from "../lib/cn";
import { colorForSeed } from "../lib/hash";
import { hostnameOf } from "../lib/validate";

/** Maps a domain to an icon URL, or undefined to fall back to the monogram. */
export type FaviconResolver = (domain: string) => string | undefined;

const FaviconContext = React.createContext<FaviconResolver | undefined>(undefined);

/**
 * Opt in to remote favicons. Without a provider, Sutra makes no network
 * requests and renders a local monogram tile instead.
 */
export function FaviconProvider({ resolve, children }: { resolve: FaviconResolver; children: React.ReactNode }) {
  return <FaviconContext.Provider value={resolve}>{children}</FaviconContext.Provider>;
}

/**
 * Resolver backed by Google's favicon service. Note: this sends every domain
 * you render to Google. Prefer a self-hosted resolver for private data.
 */
export const googleFaviconResolver: FaviconResolver = (domain) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

/** Display host of a URL (drops the scheme, path and a leading `www.`), or the input itself when it has none. */
export function domainOf(url: string) {
  return hostnameOf(url) || url;
}

export interface FaviconProps extends React.HTMLAttributes<HTMLSpanElement> {
  domain: string;
  /** Explicit icon URL; overrides the provider. */
  src?: string;
  shape?: "circle" | "square";
}

/** Site icon for a domain: explicit `src`, provider-resolved URL, or a local monogram. */
export const Favicon = React.forwardRef<HTMLSpanElement, FaviconProps>(
  ({ domain, src, shape = "circle", className, style, ...props }, ref) => {
    const resolve = React.useContext(FaviconContext);
    const url = src ?? resolve?.(domain);
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => setFailed(false), [url]);

    const radius = shape === "circle" ? "rounded-full" : "rounded-[3px]";
    if (url && !failed) {
      return (
        <span ref={ref} className={cn("inline-flex shrink-0 overflow-hidden bg-background", radius, className)} style={style} {...props}>
          <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-contain" />
        </span>
      );
    }
    const letter = (domain.match(/[a-z0-9]/i)?.[0] ?? "?").toUpperCase();
    const color = colorForSeed(domain);
    return (
      <span
        ref={ref}
        aria-hidden
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center font-semibold leading-none text-white",
          radius,
          className
        )}
        style={{ backgroundColor: color, containerType: "size", ...style }}
        {...props}
      >
        <span style={{ fontSize: "60cqh" }}>{letter}</span>
      </span>
    );
  }
);
Favicon.displayName = "Favicon";
