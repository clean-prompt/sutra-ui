import * as React from "react";
import { cn } from "../lib/cn";
import { Marquee } from "./marquee";

export interface PlaceholderLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Height-driven size of the lockup. */
  size?: "sm" | "md" | "lg";
  /** Render only the geometric mark. */
  markOnly?: boolean;
}

const logoSize = {
  sm: { mark: 18, text: "text-sm", gap: "gap-1.5" },
  md: { mark: 22, text: "text-lg", gap: "gap-2" },
  lg: { mark: 28, text: "text-2xl", gap: "gap-2.5" },
} as const;

function createPlaceholderLogo(name: string, mark: React.ReactNode, wordClassName: string, wordmark?: string) {
  const Logo = React.forwardRef<HTMLSpanElement, PlaceholderLogoProps>(
    ({ size = "md", markOnly = false, className, ...props }, ref) => {
      const s = logoSize[size];
      return (
        <span
          ref={ref}
          role="img"
          aria-label={name}
          className={cn("inline-flex shrink-0 select-none items-center whitespace-nowrap leading-none", s.gap, className)}
          {...props}
        >
          <svg
            viewBox="0 0 24 24"
            width={s.mark}
            height={s.mark}
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            focusable="false"
            className="shrink-0"
          >
            {mark}
          </svg>
          {markOnly ? null : (
            <span aria-hidden className={cn("font-sans", s.text, wordClassName)}>
              {wordmark ?? name}
            </span>
          )}
        </span>
      );
    }
  );
  Logo.displayName = `${name.replace(/\s+/g, "")}Logo`;
  return Logo;
}

/** Acme — fictional placeholder logo. */
export const AcmeLogo = createPlaceholderLogo(
  "Acme",
  <path d="M12 2.5 22 21.5H2L12 2.5Zm0 6.2L6.9 18.5h10.2L12 8.7Z" />,
  "font-bold tracking-tight"
);

/** Lumen — fictional placeholder logo. */
export const LumenLogo = createPlaceholderLogo(
  "Lumen",
  <>
    <circle cx="12" cy="12" r="4.5" />
    <path
      d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </>,
  "font-medium tracking-tight"
);

/** Northwind — fictional placeholder logo. */
export const NorthwindLogo = createPlaceholderLogo(
  "Northwind",
  <path d="M12 2 20 12h-5v10H9V12H4l8-10Z" />,
  "font-semibold uppercase tracking-[0.12em] text-[0.8em]"
);

/** Orbit — fictional placeholder logo. */
export const OrbitLogo = createPlaceholderLogo(
  "Orbit",
  <>
    <circle cx="12" cy="12" r="4" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" transform="rotate(-30 12 12)" />
  </>,
  "font-semibold tracking-tight lowercase",
  "orbit"
);

/** Vertex — fictional placeholder logo. */
export const VertexLogo = createPlaceholderLogo(
  "Vertex",
  <path d="M12 1.5 21.5 7v10L12 22.5 2.5 17V7L12 1.5Zm0 2.6L5 8.2 12 12.3l7-4.1-7-4.1Zm-7.5 6v6l6.5 3.8v-6l-6.5-3.8Z" />,
  "font-bold tracking-tighter"
);

/** Quanta — fictional placeholder logo. */
export const QuantaLogo = createPlaceholderLogo(
  "Quanta",
  <>
    <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2" />
    <rect x="13" y="2.5" width="8.5" height="8.5" rx="4.25" />
    <rect x="2.5" y="13" width="8.5" height="8.5" rx="4.25" />
    <rect x="13" y="13" width="8.5" height="8.5" rx="2" opacity="0.5" />
  </>,
  "font-mono font-medium tracking-tight"
);

/** Halcyon — fictional placeholder logo. */
export const HalcyonLogo = createPlaceholderLogo(
  "Halcyon",
  <>
    <path d="M2 13a10 10 0 0 1 20 0h-4.5a5.5 5.5 0 0 0-11 0H2Z" />
    <path d="M2 17.5c2.5-1.6 5-1.6 7.5 0s5 1.6 7.5 0 3.5-1.6 5 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </>,
  "font-normal italic tracking-tight"
);

/** Polaris — fictional placeholder logo. */
export const PolarisLogo = createPlaceholderLogo(
  "Polaris",
  <path d="M12 1.5c.7 5.6 3.9 8.8 9.5 10.5-5.6 1.7-8.8 4.9-9.5 10.5-.7-5.6-3.9-8.8-9.5-10.5C8.1 10.3 11.3 7.1 12 1.5Z" />,
  "font-semibold tracking-tight"
);

/** Kite — fictional placeholder logo. */
export const KiteLogo = createPlaceholderLogo(
  "Kite",
  <>
    <path d="M14 1.5 21 9l-7 9-7-9 7-7.5Z" />
    <path d="M14 18c-1.5 2-3.5 3.5-7 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </>,
  "font-bold lowercase tracking-tight",
  "kite"
);

/** Monolith — fictional placeholder logo. */
export const MonolithLogo = createPlaceholderLogo(
  "Monolith",
  <>
    <rect x="3" y="7" width="4.5" height="14" rx="1" />
    <rect x="9.75" y="2.5" width="4.5" height="18.5" rx="1" />
    <rect x="16.5" y="10" width="4.5" height="11" rx="1" />
  </>,
  "font-extrabold uppercase tracking-[0.06em] text-[0.82em]"
);

/** Beacon — fictional placeholder logo. */
export const BeaconLogo = createPlaceholderLogo(
  "Beacon",
  <>
    <circle cx="12" cy="17" r="3" />
    <path
      d="M7 13.5a7 7 0 0 1 10 0M3.8 10.2a11.5 11.5 0 0 1 16.4 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </>,
  "font-semibold tracking-tight"
);

/** Ember — fictional placeholder logo. */
export const EmberLogo = createPlaceholderLogo(
  "Ember",
  <path d="M12.5 1.5c.6 3.6 5.5 6.4 5.5 12a6 6 0 0 1-12 0c0-2.6 1.3-4.4 2.8-5.6-.1 1.9.5 3.3 1.8 4 .1-3.7.8-7.3 1.9-10.4Zm-.5 14.3c-1.3 1-2 2-2 3a2 2 0 0 0 4 0c0-1-.7-2-2-3Z" />,
  "font-medium lowercase tracking-tight",
  "ember"
);

/** Nimbus — fictional placeholder logo. */
export const NimbusLogo = createPlaceholderLogo(
  "Nimbus",
  <path d="M7 19.5a5 5 0 0 1-.6-10A6.5 6.5 0 0 1 19 9.8a4.9 4.9 0 0 1-1 9.7H7Z" />,
  "font-semibold tracking-tight"
);

/** Cobalt — fictional placeholder logo. */
export const CobaltLogo = createPlaceholderLogo(
  "Cobalt",
  <path d="M12 2 20.7 7v10L12 22l-8.7-5V7L12 2Zm0 5.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Z" fillRule="evenodd" />,
  "font-bold uppercase tracking-[0.1em] text-[0.8em]"
);

export type PlaceholderLogoComponent = typeof AcmeLogo;

export interface PlaceholderLogoEntry {
  name: string;
  Logo: React.ComponentType<PlaceholderLogoProps>;
}

/** All fictional placeholder logos, for logo clouds and testimonials. */
export const placeholderLogos: PlaceholderLogoEntry[] = [
  { name: "Acme", Logo: AcmeLogo },
  { name: "Lumen", Logo: LumenLogo },
  { name: "Northwind", Logo: NorthwindLogo },
  { name: "Orbit", Logo: OrbitLogo },
  { name: "Vertex", Logo: VertexLogo },
  { name: "Quanta", Logo: QuantaLogo },
  { name: "Halcyon", Logo: HalcyonLogo },
  { name: "Polaris", Logo: PolarisLogo },
  { name: "Kite", Logo: KiteLogo },
  { name: "Monolith", Logo: MonolithLogo },
  { name: "Beacon", Logo: BeaconLogo },
  { name: "Ember", Logo: EmberLogo },
  { name: "Nimbus", Logo: NimbusLogo },
  { name: "Cobalt", Logo: CobaltLogo },
];

/* ------------------------------------------------------------------ */
/* LogoCloud                                                           */
/* ------------------------------------------------------------------ */

// Container queries: the cloud sits in a hero, a card or a narrow column, so the column count follows the
// width it is given, not the viewport (6 columns of logos overlapped in a 450 px column on a 768 px screen).
const gridCols: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 @sm:grid-cols-3",
  4: "grid-cols-2 @lg:grid-cols-4",
  5: "grid-cols-2 @sm:grid-cols-3 @2xl:grid-cols-5",
  6: "grid-cols-2 @sm:grid-cols-3 @3xl:grid-cols-6",
  7: "grid-cols-3 @[840px]:grid-cols-7",
  8: "grid-cols-2 @lg:grid-cols-4 @[960px]:grid-cols-8",
};

export interface LogoCloudProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Logos to show. Defaults to the first `limit` placeholder logos. */
  logos?: PlaceholderLogoEntry[];
  /** Number of placeholder logos when `logos` is not provided. */
  limit?: number;
  /** Scroll the logos in an infinite marquee row instead of a grid. */
  marquee?: boolean;
  /** Seconds per full marquee loop. */
  duration?: number;
  /**
   * Runs the marquee in the opposite direction.
   * @default false
   */
  reverse?: boolean;
  /**
   * Pauses the marquee while the pointer is over it.
   * @default true
   */
  pauseOnHover?: boolean;
  /** Marquee mode: show a pause and play button beside the row (see `Marquee` `pausable`). */
  pausable?: boolean;
  /** Grid columns (non-marquee). */
  columns?: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /**
   * Size of each logo.
   * @default "md"
   */
  logoSize?: PlaceholderLogoProps["size"];
  /** Muted grayscale logos that brighten on hover. */
  muted?: boolean;
  /** Optional caption above the logos, e.g. "Trusted by teams at". */
  title?: React.ReactNode;
}

/** A grid or marquee row of company logos. */
export const LogoCloud = React.forwardRef<HTMLDivElement, LogoCloudProps>(
  (
    {
      logos,
      limit = 6,
      marquee = false,
      duration = 30,
      reverse = false,
      pauseOnHover = true,
      pausable = false,
      columns = 6,
      logoSize = "md",
      muted = true,
      title,
      className,
      ...props
    },
    ref
  ) => {
    const items = logos ?? placeholderLogos.slice(0, limit);
    const itemClass = cn(
      "flex items-center justify-center transition-[color,opacity,filter] duration-200",
      muted && "text-muted-foreground opacity-80 grayscale hover:text-foreground hover:opacity-100 hover:grayscale-0"
    );

    return (
      <div ref={ref} className={cn("@container w-full", className)} {...props}>
        {title ? (
          <p className="mb-6 text-center text-sm font-medium text-muted-foreground">{title}</p>
        ) : null}
        {marquee ? (
          <Marquee duration={duration} reverse={reverse} pauseOnHover={pauseOnHover} pausable={pausable} itemClassName={itemClass}>
            {items.map(({ name, Logo }) => (
              <Logo key={name} size={logoSize} />
            ))}
          </Marquee>
        ) : (
          <ul className={cn("grid items-center gap-x-8 gap-y-8", gridCols[columns])}>
            {items.map(({ name, Logo }) => (
              <li key={name} className={itemClass}>
                <Logo size={logoSize} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
LogoCloud.displayName = "LogoCloud";
