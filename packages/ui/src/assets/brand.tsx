import * as React from "react";
import { cn } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";

type SvgBaseProps = Omit<React.ComponentPropsWithoutRef<"svg">, "children"> & {
  /** Rendered pixel size (width and height). */
  size?: number | string;
  /** Accessible title. When omitted, the graphic is hidden from assistive tech. */
  title?: string;
};

function a11y(title: string | undefined, titleId: string) {
  return title
    ? ({ role: "img", "aria-labelledby": titleId } as const)
    : ({ "aria-hidden": true, focusable: "false" } as const);
}

/** The two inks of the brand: warm near-black on warm paper. Tiles and app icons use them literally so the artwork never shifts with a theme. */
const INK = "#1c1915";
const PAPER = "#f7f5f0";

/**
 * The Sutra mark (64×64 space; chosen 2026-10-21, review option L10 "Crescent"): a crescent bead on an upright thread. The bead
 * is a disc with an oval bite that breaks through its top, so it has two sharp horns; the thread comes down through the opening,
 * runs behind the base and on below. Three filled shapes: the crescent, the thread above it (it stops a paper gap above the
 * floor of the bowl) and the thread below it (it starts a paper gap under the base). `fine` fills the height of the box (the
 * glyph); `bold` is the same drawing smaller with a heavier thread, for tiles and small sizes (the favicon). The geometry is
 * computed in design/brand/crescent.mjs, which prints these strings.
 */
const BEAD = {
  fine: {
    bead: "M25.07 15.18A17 17 0 1 0 38.93 15.18A8.5 13 0 1 1 25.07 15.18Z",
    above: "M29.8 5.1A2.2 2.2 0 0 1 34.2 5.1V33.19A3.76 3.76 0 0 1 29.8 33.19Z",
    below: "M29.8 49.37A18.8 18.8 0 0 0 34.2 49.37V58.9A2.2 2.2 0 0 1 29.8 58.9Z",
  },
  bold: {
    bead: "M26.45 18.53A13.6 13.6 0 1 0 37.55 18.53A6.8 10.4 0 1 1 26.45 18.53Z",
    above: "M29.7 10.45A2.3 2.3 0 0 1 34.3 10.45V32.18A2.85 2.85 0 0 1 29.7 32.18Z",
    below: "M29.7 45.97A15.2 15.2 0 0 0 34.3 45.97V53.55A2.3 2.3 0 0 1 29.7 53.55Z",
  },
} as const;

/* ------------------------------------------------------------------ */
/* SutraMark                                                           */
/* ------------------------------------------------------------------ */

export type SutraMarkVariant = "glyph" | "tile" | "reversed" | "solid" | "outline" | "badge";

export interface SutraMarkProps extends SvgBaseProps {
  /**
   * `glyph` the crescent bead and its thread alone in `currentColor`, ink on paper (default),
   * `tile` the bead in ink on a paper tile with a hairline edge,
   * `reversed` paper bead on an ink tile (for dark surfaces),
   * `solid` flat `--primary` tile with a `--primary-foreground` bead (follows the theme and the paper style),
   * `outline` thin frame in `currentColor` around the bead,
   * `badge` heavy frame in `currentColor` around a bold bead.
   */
  variant?: SutraMarkVariant;
  /**
   * Play the intro once when the mark mounts: the crescent drops in and lands with a short bounce, then the thread draws down
   * through its opening and on behind the base (about 1.4 s). Reduced motion shows the still mark. Remount (change `key`) to
   * play it again.
   * @default false
   */
  intro?: boolean;
}

type MarkLook = {
  geometry: keyof typeof BEAD;
  /** Scale about the centre of the 64 box. */
  scale: number;
  /** Bead colour. */
  paint: string;
};

const MARK_LOOK: Record<SutraMarkVariant, MarkLook> = {
  glyph: { geometry: "fine", scale: 1, paint: "currentColor" },
  tile: { geometry: "bold", scale: 1, paint: INK },
  reversed: { geometry: "bold", scale: 1, paint: PAPER },
  solid: { geometry: "bold", scale: 1, paint: "var(--primary-foreground, #ffffff)" },
  outline: { geometry: "fine", scale: 0.74, paint: "currentColor" },
  badge: { geometry: "bold", scale: 0.9, paint: "currentColor" },
};

/** The Sutra logomark: a crescent bead on an upright thread. Ink on paper by default, so it follows the text colour. */
export const SutraMark = React.forwardRef<SVGSVGElement, SutraMarkProps>(
  ({ variant = "glyph", size = 32, title, intro = false, className, ...props }, ref) => {
    const id = useSafeId("sutra-mark");
    const titleId = `${id}-title`;
    const { geometry, scale, paint } = MARK_LOOK[variant] ?? MARK_LOOK.glyph;
    const shapes = BEAD[geometry];
    const beadTransform = scale === 1 ? undefined : `translate(32 32) scale(${scale}) translate(-32 -32)`;
    return (
      <svg
        ref={ref}
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        data-slot="sutra-mark"
        data-intro={intro ? "" : undefined}
        {...a11y(title, titleId)}
        {...props}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        {variant === "tile" ? (
          <>
            <rect width="64" height="64" rx="14.3" fill={PAPER} />
            <rect x="0.5" y="0.5" width="63" height="63" rx="13.8" stroke={INK} strokeOpacity="0.14" />
          </>
        ) : null}
        {variant === "reversed" ? <rect width="64" height="64" rx="14.3" fill={INK} /> : null}
        {variant === "solid" ? <rect width="64" height="64" rx="14.3" fill="var(--primary, #4f39f6)" /> : null}
        {variant === "outline" ? (
          <rect x="2" y="2" width="60" height="60" rx="15" stroke="currentColor" strokeWidth="3.5" />
        ) : null}
        {variant === "badge" ? (
          <rect x="3" y="3" width="58" height="58" rx="15" stroke="currentColor" strokeWidth="6" />
        ) : null}
        <g fill={paint} transform={beadTransform}>
          <path data-part="bead" d={shapes.bead} />
          <path data-part="thread-above" d={shapes.above} />
          <path data-part="thread-below" d={shapes.below} />
        </g>
      </svg>
    );
  }
);
SutraMark.displayName = "SutraMark";

/* ------------------------------------------------------------------ */
/* SutraWordmark                                                       */
/* ------------------------------------------------------------------ */

export type SutraLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const wordmarkText: Record<SutraLogoSize, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-display-xs",
};

const markPx: Record<SutraLogoSize, number> = { xs: 18, sm: 22, md: 26, lg: 32, xl: 40 };

/** The lowercase word "sutra" drawn as round-capped monoline strokes: the baseline sits at y = 0, the box is 96.78 × 30.8. */
const WORDMARK_PATH =
  "M10.22 -17.77A4.3 4.3 0 1 0 6.7 -11A4.3 4.3 0 1 1 3.18 -4.23M20.2 -19.6V-7.56A5.16 5.16 0 0 0 30.52 -7.56M30.52 -19.6V-2.4M44.12 -28.4V-6.18A3.78 3.78 0 0 0 47.9 -2.4M39.72 -19.6H49.84M59.04 -19.6V-2.4M59.04 -14.44A5.16 5.16 0 0 1 64.2 -19.6h1.38M74.78 -11a8.6 8.6 0 1 0 17.2 0a8.6 8.6 0 1 0 -17.2 0M91.98 -19.6V-2.4";

export interface SutraWordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Wordmark text size.
   * @default "md"
   */
  size?: SutraLogoSize;
  /** Show the brand name in a gradient instead of `currentColor`. */
  gradient?: boolean;
}

/**
 * The lowercase "sutra" wordmark. Without `children` it is the drawn brand word (monoline, scales with the font size, real text for
 * screen readers); with `children` it sets your text in the brand sans.
 */
export const SutraWordmark = React.forwardRef<HTMLSpanElement, SutraWordmarkProps>(
  ({ size = "md", gradient = false, className, children, ...props }, ref) => {
    const gradientId = useSafeId("sutra-word");
    const drawn = children === undefined || children === null;
    return (
      <span
        ref={ref}
        className={cn(
          "inline-block select-none font-sans font-semibold leading-none tracking-[-0.04em]",
          wordmarkText[size],
          !drawn && gradient && "bg-gradient-to-br from-brand-400 to-brand-600 bg-clip-text text-transparent",
          className
        )}
        {...props}
      >
        {drawn ? (
          <>
            <span className="sr-only">sutra</span>
            <svg
              data-slot="sutra-wordmark"
              viewBox="0 -30.8 96.78 30.8"
              aria-hidden
              focusable="false"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="inline-block shrink-0 align-baseline"
              style={{ height: "0.7em", width: "2.2em" }}
            >
              {gradient ? (
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="-30" x2="97" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0" style={{ stopColor: "var(--b-400, #7c86ff)" }} />
                    <stop offset="1" style={{ stopColor: "var(--b-600, #4f39f6)" }} />
                  </linearGradient>
                </defs>
              ) : null}
              <path
                d={WORDMARK_PATH}
                pathLength={1}
                stroke={gradient ? `url(#${gradientId})` : "currentColor"}
                strokeWidth="4.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        ) : (
          children
        )}
      </span>
    );
  }
);
SutraWordmark.displayName = "SutraWordmark";

/* ------------------------------------------------------------------ */
/* SutraLogo                                                           */
/* ------------------------------------------------------------------ */

export interface SutraLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Mark beside the wordmark (`horizontal`) or above it (`stacked`).
   * @default "horizontal"
   */
  layout?: "horizontal" | "stacked";
  /**
   * Logo size.
   * @default "md"
   */
  size?: SutraLogoSize;
  /** Which `SutraMark` variant leads the lockup. Default `glyph` (ink on paper). */
  markVariant?: SutraMarkVariant;
  /** Hide the wordmark and show only the mark. */
  markOnly?: boolean;
  /** Optional product suffix shown after the wordmark, e.g. "notes". */
  product?: React.ReactNode;
  /**
   * Play the intro once on mount: the mark's intro (see `SutraMark`), then the drawn wordmark writes itself (about 2.3 s in
   * all). Reduced motion shows the still logo.
   * @default false
   */
  intro?: boolean;
}

/** Mark + wordmark lockup. */
export const SutraLogo = React.forwardRef<HTMLSpanElement, SutraLogoProps>(
  (
    { layout = "horizontal", size = "md", markVariant = "glyph", markOnly = false, product, intro = false, className, ...props },
    ref
  ) => (
    <span
      ref={ref}
      role="img"
      aria-label={typeof product === "string" ? `Sutra ${product}` : "Sutra"}
      data-slot="sutra-logo"
      data-intro={intro ? "" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center text-foreground",
        layout === "stacked" ? "flex-col gap-2" : size === "xs" || size === "sm" ? "gap-1.5" : "gap-2",
        className
      )}
      {...props}
    >
      {/* The bare glyph fills the height of its box, so the box is trimmed to keep the lockup's proportions. */}
      <SutraMark
        variant={markVariant}
        intro={intro}
        size={markPx[size] * (layout === "stacked" ? 1.5 : 1) * (markVariant === "glyph" ? 0.85 : 1)}
      />
      {markOnly ? null : (
        <span className="inline-flex items-baseline gap-1.5" aria-hidden>
          <SutraWordmark size={size} />
          {product ? (
            <span className={cn("font-medium leading-none tracking-tight text-muted-foreground", wordmarkText[size])}>
              {product}
            </span>
          ) : null}
        </span>
      )}
    </span>
  )
);
SutraLogo.displayName = "SutraLogo";

/* ------------------------------------------------------------------ */
/* SutraAppIcon                                                        */
/* ------------------------------------------------------------------ */

export const sutraApps = ["notes", "tasks", "calendar", "mail", "files", "journal", "finance", "habits"] as const;
export type SutraApp = (typeof sutraApps)[number];

/**
 * Display name, the textile dye of the app (the bead colour of the `dyed` icon tone) and the older gradient pair (`from`, `to`)
 * that the `data-app` accents in `sutra.css` still follow.
 */
export const sutraAppMeta: Record<SutraApp, { name: string; dye: string; from: string; to: string }> = {
  notes: { name: "Notes", dye: "#a87f1d", from: "#fdc700", to: "#f54900" },
  tasks: { name: "Tasks", dye: "#46773b", from: "#7c86ff", to: "#4f39f6" },
  calendar: { name: "Calendar", dye: "#b63042", from: "#ff637e", to: "#e7000b" },
  mail: { name: "Mail", dye: "#2d4498", from: "#51a2ff", to: "#155dfc" },
  files: { name: "Files", dye: "#c26300", from: "#00d3f2", to: "#0084d1" },
  journal: { name: "Journal", dye: "#7f3471", from: "#a684ff", to: "#7008e7" },
  finance: { name: "Finance", dye: "#2a2520", from: "#05df72", to: "#008236" },
  habits: { name: "Habits", dye: "#9d4529", from: "#ff8904", to: "#ec003f" },
};

/** One pictogram per app: stroked paths in a 24 box (2.4 monoline), plus optional filled dots. */
const appPictograms: Record<SutraApp, { d: string[]; dots?: [number, number][] }> = {
  notes: {
    d: [
      "M6.8 3.8h6.9l4.5 4.5v10.9a1.6 1.6 0 0 1-1.6 1.6H6.8a1.6 1.6 0 0 1-1.6-1.6V5.4a1.6 1.6 0 0 1 1.6-1.6Z",
      "M13.7 3.8v4.5h4.5",
      "M8.9 13.2h6.2M8.9 16.5h3.8",
    ],
  },
  tasks: { d: ["M4.4 7.4l1.5 1.5 2.7-3", "M4.4 15.6l1.5 1.5 2.7-3", "M12 7.6h7.6M12 15.8h7.6"] },
  calendar: {
    d: [
      "M6.6 5.2h10.8a2.2 2.2 0 0 1 2.2 2.2v10.4a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V7.4a2.2 2.2 0 0 1 2.2-2.2Z",
      "M4.4 10.2h15.2",
      "M8.4 3v3.6M15.6 3v3.6",
    ],
    dots: [
      [8.6, 14.4],
      [12, 14.4],
      [15.4, 14.4],
    ],
  },
  mail: {
    d: [
      "M6.2 5.8h11.6a2.2 2.2 0 0 1 2.2 2.2v8a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 16V8a2.2 2.2 0 0 1 2.2-2.2Z",
      "M4.6 8.2l7.4 5.1 7.4-5.1",
    ],
  },
  files: {
    d: ["M4 7.4a2.2 2.2 0 0 1 2.2-2.2h3.5l2.1 2.5h6a2.2 2.2 0 0 1 2.2 2.2v7.9a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8V7.4Z"],
  },
  journal: {
    d: [
      "M7.4 3.8h9.8a1.6 1.6 0 0 1 1.6 1.6v13.2a1.6 1.6 0 0 1-1.6 1.6H7.4a1.6 1.6 0 0 1-1.6-1.6V5.4a1.6 1.6 0 0 1 1.6-1.6Z",
      "M10 3.8v16.4",
      "M13.2 8.2h2.6",
    ],
  },
  finance: { d: ["M5 19.6h14", "M7.8 16v-3.2M12 16V9.6M16.2 16V6.4"] },
  habits: { d: ["M19.4 12a7.4 7.4 0 1 1-2.6-5.6", "M8.9 12.2l2.2 2.3 4.2-4.6"], dots: [[18.4, 6.2]] },
};

/**
 * Colour of an app icon: `mono` ink on paper (default, the app is told apart by its pictogram), `reversed` paper on ink,
 * `dyed` the paper tile with a bead in the app's own dye.
 */
export type SutraAppTone = "mono" | "reversed" | "dyed";

export interface SutraAppIconProps extends SvgBaseProps {
  /** The Sutra app to draw the icon for. */
  app: SutraApp;
  /** Corner style of the tile. */
  shape?: "rounded" | "squircle" | "circle";
  /** Colour of the icon. Default `mono`. */
  tone?: SutraAppTone;
}

const TILE_RX = { rounded: 14.3, squircle: 19, circle: 32 } as const;

/**
 * App icon for a Sutra suite app: a tile with a thread running across it, a bead on the thread and one pictogram in the bead.
 * The thread leaves the tile on both sides, so a row of icons reads as beads on one string.
 */
export const SutraAppIcon = React.forwardRef<SVGSVGElement, SutraAppIconProps>(
  ({ app, shape = "rounded", tone = "mono", size = 40, title, className, ...props }, ref) => {
    const id = useSafeId(`sutra-app-${app}`);
    const titleId = `${id}-title`;
    const rx = TILE_RX[shape];
    const picto = appPictograms[app];
    const tile = tone === "reversed" ? INK : PAPER;
    const thread = tone === "reversed" ? PAPER : INK;
    const bead = tone === "dyed" ? sutraAppMeta[app].dye : thread;
    const glyph = tone === "reversed" ? INK : PAPER;
    return (
      <svg
        ref={ref}
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        {...a11y(title, titleId)}
        {...props}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        <rect width="64" height="64" rx={rx} fill={tile} />
        {tone === "reversed" ? null : (
          <rect x="0.5" y="0.5" width="63" height="63" rx={rx - 0.5} stroke={INK} strokeOpacity="0.14" />
        )}
        <rect y="30.7" width="64" height="2.6" fill={thread} />
        <circle cx="32" cy="32" r="21" fill={bead} />
        <g transform="translate(19 19) scale(1.0833)" stroke={glyph} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {picto.d.map((d) => (
            <path key={d} d={d} />
          ))}
          {picto.dots?.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.49" fill={glyph} stroke="none" />
          ))}
        </g>
      </svg>
    );
  }
);
SutraAppIcon.displayName = "SutraAppIcon";
