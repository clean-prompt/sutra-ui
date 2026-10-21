/** MarketplaceHero: title, subtitle, stats row and a search field on a mesh-gradient glow. */
import * as React from "react";
import { cn } from "../lib/cn";
import { SearchInput } from "../primitives/input";
import { MeshGradient } from "../primitives/mesh-gradient";

export interface MarketplaceHeroStat {
  value: React.ReactNode;
  label: string;
}

export interface MarketplaceHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onChange"> {
  /** Small label above the title. */
  eyebrow?: React.ReactNode;
  /**
   * Hero headline.
   * @default "Extend Sutra with plugins"
   */
  title?: React.ReactNode;
  /** Supporting text under the headline. */
  subtitle?: React.ReactNode;
  /** Counters under the search (e.g. plugins, authors); each has a `label` and a `value`. */
  stats?: MarketplaceHeroStat[];
  /** Controlled search text. Use with `onQueryChange`. */
  query?: string;
  /** Initial search text when uncontrolled. */
  defaultQuery?: string;
  /** Called with the search text as it changes. */
  onQueryChange?: (query: string) => void;
  /**
   * Placeholder of the search field.
   * @default "Search plugins, tools, authors…"
   */
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
