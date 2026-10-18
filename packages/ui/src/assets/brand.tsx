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

/** The Sutra thread: one continuous stroke forming a flowing "S" knot (32×32 space). */
const THREAD_PATH =
  "M21.5 10.2c-1.3-1.5-3.2-2.4-5.5-2.4-3.2 0-5.4 1.8-5.4 4.2 0 2.5 2.3 3.4 5.4 4.1 3.2.7 5.6 1.7 5.6 4.3 0 2.5-2.3 4.3-5.6 4.3-2.4 0-4.4-.9-5.7-2.5";
/** Small loop that closes the thread end into a knot. */
const THREAD_LOOP = "M10.3 22.2c-1.2-1.4-1.1-3 .1-3.6 1.2-.6 2.6.3 2.5 1.8";
const THREAD_BEAD = { cx: 21.6, cy: 10.2, r: 1.6 };

/* ------------------------------------------------------------------ */
/* SutraMark                                                           */
/* ------------------------------------------------------------------ */

export type SutraMarkVariant = "tile" | "glyph" | "outline";

export interface SutraMarkProps extends SvgBaseProps {
  /** `tile` gradient tile with a white thread, `glyph` thread only, `outline` stroked tile. */
  variant?: SutraMarkVariant;
}

/** The Sutra logomark: a single thread tied into a flowing "S". */
export const SutraMark = React.forwardRef<SVGSVGElement, SutraMarkProps>(
  ({ variant = "tile", size = 32, title, className, ...props }, ref) => {
    const id = useSafeId("sutra-mark");
    const titleId = `${id}-title`;
    const threadColor = variant === "tile" ? "#ffffff" : "currentColor";
    return (
      <svg
        ref={ref}
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        {...a11y(title, titleId)}
        {...props}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        {variant === "tile" ? (
          <>
            <defs>
              <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0" style={{ stopColor: "var(--b-400, #7c86ff)" }} />
                <stop offset="1" style={{ stopColor: "var(--b-600, #4f39f6)" }} />
              </linearGradient>
              <linearGradient id={`${id}-shine`} x1="16" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill={`url(#${id}-bg)`} />
            <rect width="32" height="32" rx="8" fill={`url(#${id}-shine)`} />
            <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" stroke="#ffffff" strokeOpacity="0.18" />
          </>
        ) : null}
        {variant === "outline" ? (
          <rect x="1" y="1" width="30" height="30" rx="7.5" stroke="currentColor" strokeWidth="1.75" />
        ) : null}
        <g
          stroke={threadColor}
          strokeWidth={variant === "glyph" ? 2.6 : 2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={variant === "glyph" ? "translate(16 16) scale(1.22) translate(-16 -16)" : undefined}
        >
          <path d={THREAD_PATH} />
          <path d={THREAD_LOOP} />
        </g>
        <circle
          {...THREAD_BEAD}
          fill={threadColor}
          transform={variant === "glyph" ? "translate(16 16) scale(1.22) translate(-16 -16)" : undefined}
        />
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

export interface SutraWordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SutraLogoSize;
  /** Show the brand name in a gradient instead of `currentColor`. */
  gradient?: boolean;
}

/** The lowercase "sutra" wordmark set in the brand sans. */
export const SutraWordmark = React.forwardRef<HTMLSpanElement, SutraWordmarkProps>(
  ({ size = "md", gradient = false, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-block select-none font-sans font-semibold leading-none tracking-[-0.04em]",
        wordmarkText[size],
        gradient && "bg-gradient-to-br from-brand-400 to-brand-600 bg-clip-text text-transparent",
        className
      )}
      {...props}
    >
      {children ?? "sutra"}
    </span>
  )
);
SutraWordmark.displayName = "SutraWordmark";

/* ------------------------------------------------------------------ */
/* SutraLogo                                                           */
/* ------------------------------------------------------------------ */

export interface SutraLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  layout?: "horizontal" | "stacked";
  size?: SutraLogoSize;
  markVariant?: SutraMarkVariant;
  /** Hide the wordmark and show only the mark. */
  markOnly?: boolean;
  /** Optional product suffix shown after the wordmark, e.g. "notes". */
  product?: React.ReactNode;
}

/** Mark + wordmark lockup. */
export const SutraLogo = React.forwardRef<HTMLSpanElement, SutraLogoProps>(
  (
    { layout = "horizontal", size = "md", markVariant = "tile", markOnly = false, product, className, ...props },
    ref
  ) => (
    <span
      ref={ref}
      role="img"
      aria-label={typeof product === "string" ? `Sutra ${product}` : "Sutra"}
      className={cn(
        "inline-flex shrink-0 items-center text-foreground",
        layout === "stacked" ? "flex-col gap-2" : size === "xs" || size === "sm" ? "gap-1.5" : "gap-2",
        className
      )}
      {...props}
    >
      <SutraMark variant={markVariant} size={layout === "stacked" ? markPx[size] * 1.5 : markPx[size]} />
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

/** Gradient pair (top-left → bottom-right) and display name for each suite app. */
export const sutraAppMeta: Record<SutraApp, { name: string; from: string; to: string }> = {
  notes: { name: "Notes", from: "#fdc700", to: "#f54900" },
  tasks: { name: "Tasks", from: "#7c86ff", to: "#4f39f6" },
  calendar: { name: "Calendar", from: "#ff637e", to: "#e7000b" },
  mail: { name: "Mail", from: "#51a2ff", to: "#155dfc" },
  files: { name: "Files", from: "#00d3f2", to: "#0084d1" },
  journal: { name: "Journal", from: "#a684ff", to: "#7008e7" },
  finance: { name: "Finance", from: "#05df72", to: "#008236" },
  habits: { name: "Habits", from: "#ff8904", to: "#ec003f" },
};

const appGlyphs: Record<SutraApp, React.ReactNode> = {
  notes: (
    <>
      <path d="M11 8.5h7.5l3.5 3.5v10a1.5 1.5 0 0 1-1.5 1.5H11A1.5 1.5 0 0 1 9.5 22V10A1.5 1.5 0 0 1 11 8.5Z" />
      <path d="M18.5 8.5V12H22" />
      <path d="M12.5 15.5h6M12.5 18.5h4" />
    </>
  ),
  tasks: (
    <>
      <rect x="9" y="9" width="14" height="14" rx="3.5" />
      <path d="m12.6 16.2 2.4 2.4 4.6-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="8.5" y="10" width="15" height="13.5" rx="2.5" />
      <path d="M8.5 14.5h15M12.5 8v3.5M19.5 8v3.5" />
      <path d="M12.5 18.2h.01M16 18.2h.01M19.5 18.2h.01" strokeWidth="2.6" />
    </>
  ),
  mail: (
    <>
      <rect x="8" y="10" width="16" height="12" rx="2.5" />
      <path d="m8.8 11.2 6.2 4.8a1.6 1.6 0 0 0 2 0l6.2-4.8" />
    </>
  ),
  files: (
    <>
      <path d="M8.5 12A1.5 1.5 0 0 1 10 10.5h3.6l1.8 2H22a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 22 23H10a1.5 1.5 0 0 1-1.5-1.5V12Z" />
      <path d="M8.5 15.5h15" />
    </>
  ),
  journal: (
    <>
      <path d="M10 9.5A1.5 1.5 0 0 1 11.5 8H22v14H11.5a1.5 1.5 0 0 0-1.5 1.5V9.5Z" />
      <path d="M10 23.5A1.5 1.5 0 0 0 11.5 25H22v-3" />
      <path d="M15 8v6l1.75-1.3L18.5 14V8" />
    </>
  ),
  finance: (
    <>
      <path d="M9 22.5h14" />
      <path d="M11 19.5v-3M15 19.5v-5.5M19 19.5v-8" />
      <path d="m10.5 13 3.5-3 2.5 2 5-4.5" />
      <path d="M19 7.5h2.5V10" />
    </>
  ),
  habits: (
    <>
      <path d="M22.4 18.6A7 7 0 1 1 18.6 9.6" />
      <path d="m12.8 16 2.3 2.3 4.4-4.6" />
      <circle cx="21.6" cy="11.2" r="1.3" fill="#ffffff" stroke="none" />
    </>
  ),
};

export interface SutraAppIconProps extends SvgBaseProps {
  app: SutraApp;
  /** Corner style of the tile. */
  shape?: "rounded" | "squircle" | "circle";
}

/** App icon for a Sutra suite app: a gradient tile with a glyph and the shared thread motif. */
export const SutraAppIcon = React.forwardRef<SVGSVGElement, SutraAppIconProps>(
  ({ app, shape = "rounded", size = 40, title, className, ...props }, ref) => {
    const id = useSafeId(`sutra-app-${app}`);
    const titleId = `${id}-title`;
    const meta = sutraAppMeta[app];
    const rx = shape === "circle" ? 16 : shape === "squircle" ? 9.5 : 7.5;
    return (
      <svg
        ref={ref}
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        {...a11y(title, titleId)}
        {...props}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        <defs>
          <linearGradient id={`${id}-bg`} x1="2" y1="1" x2="30" y2="31" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={meta.from} />
            <stop offset="1" stopColor={meta.to} />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="16" y1="0" x2="16" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <rect width="32" height="32" rx={rx} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-clip)`}>
          <rect width="32" height="32" fill={`url(#${id}-bg)`} />
          <rect width="32" height="32" fill={`url(#${id}-shine)`} />
          <path
            d="M-2 27.5c5.5-3.6 10.4-3.6 15.2-.6 4.8 3 10.6 3.2 18.8-1.6"
            stroke="#ffffff"
            strokeOpacity="0.22"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
        <rect x="0.5" y="0.5" width="31" height="31" rx={Math.max(rx - 0.5, 0)} stroke="#ffffff" strokeOpacity="0.16" />
        <g stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {appGlyphs[app]}
        </g>
      </svg>
    );
  }
);
SutraAppIcon.displayName = "SutraAppIcon";
