import * as React from "react";
import { RiLockLine } from "@remixicon/react";
import { cn } from "../lib/cn";
import { seededRandom } from "../lib/hash";
import { useSafeId } from "../hooks/use-safe-id";

/* ------------------------------------------------------------------ */
/* EmptyStateIllustration                                              */
/* ------------------------------------------------------------------ */

export type EmptyStateIllustrationVariant = "search" | "inbox" | "files" | "error" | "success" | "cloud";

export interface EmptyStateIllustrationProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children"> {
  variant?: EmptyStateIllustrationVariant;
  /** Width in pixels (height follows the 4:3 ratio). */
  size?: number;
  title?: string;
}

const line = "stroke-border-strong";
const sheet = "fill-background stroke-border-strong";

const illustrations: Record<EmptyStateIllustrationVariant, React.ReactNode> = {
  search: (
    <>
      <rect x="44" y="28" width="62" height="70" rx="8" className={sheet} />
      <path d="M56 46h30M56 56h38M56 66h22" className={line} strokeLinecap="round" />
      <circle cx="104" cy="74" r="17" className="fill-primary-soft stroke-primary" strokeWidth="3" />
      <path d="m116.5 86.5 12 12" className="stroke-primary" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M98 70a7 7 0 0 1 7-5" className="stroke-primary" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </>
  ),
  inbox: (
    <>
      <rect x="58" y="22" width="44" height="34" rx="5" className={sheet} />
      <path d="m60 25 20 15 20-15" className={line} strokeLinejoin="round" />
      <path
        d="M38 70 50 52h60l12 18v22a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V70Z"
        className={sheet}
        strokeLinejoin="round"
      />
      <path
        d="M38 70h24a4 4 0 0 1 4 4 6 6 0 0 0 6 6h16a6 6 0 0 0 6-6 4 4 0 0 1 4-4h24"
        className="fill-none stroke-primary"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </>
  ),
  files: (
    <>
      <rect x="64" y="20" width="50" height="62" rx="6" className={sheet} transform="rotate(10 89 51)" />
      <rect x="46" y="24" width="50" height="62" rx="6" className={sheet} transform="rotate(-8 71 55)" />
      <path
        d="M52 46a5 5 0 0 1 5-5h12l5 5h24a5 5 0 0 1 5 5v36a5 5 0 0 1-5 5H57a5 5 0 0 1-5-5V46Z"
        className="fill-primary-soft stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M52 56h51" className="stroke-primary" strokeWidth="2" opacity="0.5" />
    </>
  ),
  error: (
    <>
      <rect x="40" y="26" width="80" height="62" rx="8" className={sheet} />
      <path d="M40 40h80" className={line} />
      <circle cx="49" cy="33" r="2" className="fill-border-strong" />
      <circle cx="56" cy="33" r="2" className="fill-border-strong" />
      <circle cx="80" cy="64" r="14" className="fill-destructive-soft stroke-destructive" strokeWidth="2.5" />
      <path d="m75 59 10 10m0-10-10 10" className="stroke-destructive" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  success: (
    <>
      <rect x="40" y="26" width="80" height="62" rx="8" className={sheet} />
      <path d="M52 76h28M52 84h18" className={line} strokeLinecap="round" />
      <circle cx="80" cy="54" r="16" className="fill-success-soft stroke-success" strokeWidth="2.5" />
      <path d="m73 54 5 5 9-10" className="stroke-success" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cloud: (
    <>
      <path
        d="M54 90a20 20 0 0 1-2.4-39.9A28 28 0 0 1 106.6 46 22 22 0 0 1 106 90H54Z"
        className={sheet}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M80 82V58m0 0-10 10m10-10 10 10" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

/** Simple line illustrations for empty, error and success states. */
export const EmptyStateIllustration = React.forwardRef<SVGSVGElement, EmptyStateIllustrationProps>(
  ({ variant = "search", size = 160, title, className, ...props }, ref) => {
    const titleId = useSafeId("empty-illustration");
    return (
      <svg
        ref={ref}
        viewBox="0 0 160 120"
        width={size}
        height={(size * 3) / 4}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        {...(title ? { role: "img", "aria-labelledby": titleId } : { "aria-hidden": true, focusable: "false" as const })}
        {...props}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        <circle cx="80" cy="60" r="54" className="fill-muted" opacity="0.7" />
        <circle cx="80" cy="60" r="54" className="stroke-border" strokeDasharray="2 5" strokeLinecap="round" />
        <circle cx="22" cy="34" r="3" className="fill-primary" opacity="0.35" />
        <circle cx="140" cy="88" r="4" className="fill-primary" opacity="0.25" />
        <path d="M136 22v8M132 26h8" className="stroke-primary" strokeWidth="1.75" strokeLinecap="round" opacity="0.55" />
        <path d="M24 92v6M21 95h6" className={line} strokeWidth="1.5" strokeLinecap="round" />
        {illustrations[variant]}
      </svg>
    );
  }
);
EmptyStateIllustration.displayName = "EmptyStateIllustration";

/* ------------------------------------------------------------------ */
/* BackgroundPattern                                                   */
/* ------------------------------------------------------------------ */

export type BackgroundPatternVariant = "grid" | "dots" | "circles" | "lines";
export type BackgroundFade = "radial" | "top" | "bottom" | "edges" | "none";

const fadeMasks: Record<BackgroundFade, string | undefined> = {
  radial: "radial-gradient(ellipse at center, #000 20%, transparent 70%)",
  top: "linear-gradient(to bottom, #000 0%, transparent 85%)",
  bottom: "linear-gradient(to top, #000 0%, transparent 85%)",
  edges: "linear-gradient(to right, transparent, #000 20%, #000 80%, transparent)",
  none: undefined,
};

export interface BackgroundPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BackgroundPatternVariant;
  /** Pattern cell size in pixels. */
  cellSize?: number;
  fade?: BackgroundFade;
  /** Line or dot color. Defaults to the border token. */
  color?: string;
}

/** Absolutely positioned decorative pattern with a soft fade mask. */
export const BackgroundPattern = React.forwardRef<HTMLDivElement, BackgroundPatternProps>(
  ({ variant = "grid", cellSize, fade = "radial", color, className, style, ...props }, ref) => {
    const c = color ?? (variant === "dots" ? "var(--border-strong)" : "var(--border)");
    const s = cellSize ?? (variant === "dots" ? 16 : variant === "circles" ? 48 : variant === "lines" ? 12 : 32);
    let background: React.CSSProperties;
    switch (variant) {
      case "dots":
        background = {
          backgroundImage: `radial-gradient(${c} 1px, transparent 1px)`,
          backgroundSize: `${s}px ${s}px`,
        };
        break;
      case "circles":
        background = {
          backgroundImage: `repeating-radial-gradient(circle at center, transparent 0, transparent ${s - 1}px, ${c} ${s - 1}px, ${c} ${s}px)`,
        };
        break;
      case "lines":
        background = {
          backgroundImage: `repeating-linear-gradient(-45deg, ${c} 0, ${c} 1px, transparent 1px, transparent ${s}px)`,
        };
        break;
      default:
        background = {
          backgroundImage: `linear-gradient(to right, ${c} 1px, transparent 1px), linear-gradient(to bottom, ${c} 1px, transparent 1px)`,
          backgroundSize: `${s}px ${s}px`,
          backgroundPosition: "center center",
        };
    }
    const mask = fadeMasks[fade];
    return (
      <div
        ref={ref}
        aria-hidden
        data-variant={variant}
        className={cn("pointer-events-none absolute inset-0 select-none", className)}
        style={{ ...background, maskImage: mask, WebkitMaskImage: mask, ...style }}
        {...props}
      />
    );
  }
);
BackgroundPattern.displayName = "BackgroundPattern";

/* ------------------------------------------------------------------ */
/* Spotlight                                                           */
/* ------------------------------------------------------------------ */

export interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Glow color (any CSS color). Defaults to the brand color. */
  color?: string;
  /** Diameter in pixels. */
  size?: number;
  /** Center position, as CSS lengths/percentages. */
  x?: string;
  y?: string;
  intensity?: number;
  /** Slowly drift the glow. */
  animated?: boolean;
}

/** A soft radial glow for heroes and cards. */
export const Spotlight = React.forwardRef<HTMLDivElement, SpotlightProps>(
  (
    { color = "var(--b-500)", size = 560, x = "50%", y = "0%", intensity = 0.35, animated = false, className, style, ...props },
    ref
  ) => (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", animated && "animate-mesh", className)}
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        translate: "-50% -50%",
        opacity: intensity,
        background: `radial-gradient(circle at center, ${color} 0%, color-mix(in oklab, ${color} 40%, transparent) 35%, transparent 70%)`,
        ...style,
      }}
      {...props}
    />
  )
);
Spotlight.displayName = "Spotlight";

/* ------------------------------------------------------------------ */
/* GridBeams                                                           */
/* ------------------------------------------------------------------ */

const BEAM_CSS = `
@keyframes sutra-beam-y { 0% { transform: translateY(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(calc(var(--sutra-beam-travel, 600px))); opacity: 0; } }
@keyframes sutra-beam-x { 0% { transform: translateX(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateX(calc(var(--sutra-beam-travel, 1200px))); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { [data-sutra-beam] { animation: none !important; opacity: 0 !important; } }
`;

export interface GridBeamsProps extends React.HTMLAttributes<HTMLDivElement> {
  cellSize?: number;
  /** Number of animated beams. */
  beams?: number;
  /** Seconds for a beam to cross. */
  duration?: number;
  fade?: BackgroundFade;
}

/** A faint grid with light beams traveling along its lines. Content renders above it. */
export const GridBeams = React.forwardRef<HTMLDivElement, GridBeamsProps>(
  ({ cellSize = 40, beams = 6, duration = 6, fade = "radial", className, children, ...props }, ref) => {
    const mask = fadeMasks[fade];
    const beamList = Array.from({ length: beams }, (_, i) => {
      const vertical = i % 3 !== 2;
      const column = 2 + ((i * 7) % 23);
      const row = 1 + ((i * 5) % 11);
      return { vertical, offset: (vertical ? column : row) * cellSize, delay: (i * duration) / beams, key: i };
    });
    return (
      <div ref={ref} className={cn("relative isolate overflow-hidden", className)} {...props}>
        <style>{BEAM_CSS}</style>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
              backgroundSize: `${cellSize}px ${cellSize}px`,
            }}
          />
          {beamList.map((b) =>
            b.vertical ? (
              <span
                key={b.key}
                data-sutra-beam=""
                className="absolute top-0 h-24 w-px"
                style={{
                  left: b.offset,
                  background: "linear-gradient(to bottom, transparent, var(--b-500), transparent)",
                  animation: `sutra-beam-y ${duration}s linear ${b.delay}s infinite`,
                  ["--sutra-beam-travel" as string]: "800px",
                }}
              />
            ) : (
              <span
                key={b.key}
                data-sutra-beam=""
                className="absolute left-0 h-px w-24"
                style={{
                  top: b.offset,
                  background: "linear-gradient(to right, transparent, var(--b-400), transparent)",
                  animation: `sutra-beam-x ${duration * 1.4}s linear ${b.delay}s infinite`,
                  ["--sutra-beam-travel" as string]: "1400px",
                }}
              />
            )
          )}
        </div>
        {children}
      </div>
    );
  }
);
GridBeams.displayName = "GridBeams";

/* ------------------------------------------------------------------ */
/* NoiseTexture                                                        */
/* ------------------------------------------------------------------ */

export interface NoiseTextureProps extends Omit<React.ComponentPropsWithoutRef<"svg">, "children"> {
  opacity?: number;
  /** Turbulence base frequency; higher is finer grain. */
  frequency?: number;
}

/** A film-grain overlay, absolutely positioned over its container. */
export const NoiseTexture = React.forwardRef<SVGSVGElement, NoiseTextureProps>(
  ({ opacity = 0.08, frequency = 0.8, className, style, ...props }, ref) => {
    const id = useSafeId("sutra-noise");
    return (
      <svg
        ref={ref}
        aria-hidden
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("pointer-events-none absolute inset-0 size-full mix-blend-soft-light dark:mix-blend-overlay", className)}
        style={{ opacity, ...style }}
        {...props}
      >
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={3} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    );
  }
);
NoiseTexture.displayName = "NoiseTexture";

/* ------------------------------------------------------------------ */
/* QRCodePlaceholder                                                   */
/* ------------------------------------------------------------------ */

/** @deprecated See `QRCodePlaceholder`; use `QRCodeProps` with `QRCode`. */
export interface QRCodePlaceholderProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Seed for the (decorative, non-scannable) module pattern. */
  value?: string;
  /** Rendered size in pixels. */
  size?: number;
  /** Modules per side. */
  modules?: number;
  /** Optional center logo. */
  logo?: React.ReactNode;
  /** Draw a white quiet-zone card behind the code. */
  framed?: boolean;
}

/**
 * A decorative QR-code-like graphic for mockups and placeholders.
 *
 * @deprecated **Not scannable**: the modules are random noise, so a phone camera reads nothing (and it is still
 * announced as "QR code"). For anything a user might scan, use `QRCode` (or `QRCodeCard`) from `components/qr-code`,
 * which encodes a real value. Kept only for static mockups.
 */
export const QRCodePlaceholder = React.forwardRef<HTMLSpanElement, QRCodePlaceholderProps>(
  ({ value = "sutra", size = 160, modules = 25, logo, framed = true, className, ...props }, ref) => {
    const n = Math.max(21, modules);
    const hasLogo = logo != null && logo !== false;
    const d = React.useMemo(() => {
      const rand = seededRandom(value);
      const logoSpan = hasLogo ? Math.round(n * 0.28) : 0;
      const logoStart = Math.floor((n - logoSpan) / 2);
      const inFinder = (x: number, y: number) =>
        (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
      const inLogo = (x: number, y: number) =>
        logoSpan > 0 && x >= logoStart && x < logoStart + logoSpan && y >= logoStart && y < logoStart + logoSpan;
      let path = "";
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (inFinder(x, y) || inLogo(x, y)) continue;
          const timing = (x === 6 || y === 6) && !inFinder(x, y);
          const on = timing ? (x + y) % 2 === 0 : rand() > 0.52;
          if (on) path += `M${x} ${y}h1v1h-1z`;
        }
      }
      return path;
    }, [value, n, hasLogo]);

    const finder = (x: number, y: number) =>
      `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;

    return (
      <span
        ref={ref}
        role="img"
        aria-label="QR code"
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center text-[#09090b]",
          framed && "rounded-box border border-border bg-white p-3 shadow-xs",
          className
        )}
        {...props}
      >
        <svg
          viewBox={`0 0 ${n} ${n}`}
          width={size}
          height={size}
          shapeRendering="crispEdges"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          focusable="false"
          className="block"
        >
          <path d={d} fill="currentColor" />
          <path
            d={`${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}`}
            fill="currentColor"
            fillRule="evenodd"
            shapeRendering="geometricPrecision"
          />
        </svg>
        {logo ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className="flex items-center justify-center overflow-hidden rounded-md bg-white"
              style={{ width: size * 0.24, height: size * 0.24 }}
            >
              {logo}
            </span>
          </span>
        ) : null}
      </span>
    );
  }
);
QRCodePlaceholder.displayName = "QRCodePlaceholder";

/* ------------------------------------------------------------------ */
/* DeviceFrame                                                         */
/* ------------------------------------------------------------------ */

export type DeviceFrameVariant = "browser" | "phone" | "tablet";

export interface DeviceFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: DeviceFrameVariant;
  /** Address bar text (browser). */
  url?: string;
  /** Colored traffic-light buttons (browser). Neutral dots when false. */
  trafficLights?: boolean;
  /** Show a status bar with time and indicators (phone/tablet). */
  statusBar?: boolean;
  /** Extra classes for the screen/content area. */
  screenClassName?: string;
}

function StatusBar({ compact }: { compact?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between font-semibold text-foreground",
        compact ? "h-6 px-5 text-[10px]" : "h-11 px-7 pt-1 text-xs"
      )}
    >
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 18 12" className={compact ? "h-2 w-3" : "h-2.5 w-4"} fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 26 12" className={compact ? "h-2 w-4" : "h-2.5 w-5"} fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
          <path d="M24 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

/** Wraps content in browser window chrome or a phone/tablet bezel. */
export const DeviceFrame = React.forwardRef<HTMLDivElement, DeviceFrameProps>(
  (
    {
      variant = "browser",
      url = "sutra.app",
      trafficLights = true,
      statusBar = true,
      screenClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    if (variant === "browser") {
      const dots = trafficLights ? ["#ff5f57", "#febc2e", "#28c840"] : [];
      return (
        <div
          ref={ref}
          data-variant="browser"
          className={cn("w-full overflow-hidden rounded-box border border-border bg-card shadow-xl", className)}
          {...props}
        >
          <div className="relative flex h-10 items-center gap-3 border-b border-border bg-subtle px-3.5">
            <div className="flex items-center gap-1.5" aria-hidden>
              {(dots.length ? dots : [null, null, null]).map((color, i) => (
                <span
                  key={i}
                  className={cn("size-3 rounded-full", !color && "bg-border-strong")}
                  style={color ? { backgroundColor: color, boxShadow: "inset 0 0 0 0.5px rgb(0 0 0 / 0.12)" } : undefined}
                />
              ))}
            </div>
            <div className="mx-auto flex h-6 w-full max-w-sm min-w-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground">
              <RiLockLine aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{url}</span>
            </div>
            <div className="w-[3.25rem]" aria-hidden />
          </div>
          <div className={cn("relative bg-background", screenClassName)}>{children}</div>
        </div>
      );
    }

    const isPhone = variant === "phone";
    return (
      <div
        ref={ref}
        data-variant={variant}
        className={cn(
          "relative mx-auto max-w-full shadow-2xl ring-1 ring-black/10 dark:ring-white/15",
          isPhone ? "w-72 rounded-[3rem] p-2.5" : "w-[36rem] rounded-[2rem] p-3",
          className
        )}
        style={{ backgroundColor: "#0b0b0d" }}
        {...props}
      >
        {isPhone ? (
          <>
            <span aria-hidden className="absolute top-24 -left-[3px] h-8 w-[3px] rounded-l-sm bg-[#27272a]" />
            <span aria-hidden className="absolute top-36 -left-[3px] h-12 w-[3px] rounded-l-sm bg-[#27272a]" />
            <span aria-hidden className="absolute top-32 -right-[3px] h-16 w-[3px] rounded-r-sm bg-[#27272a]" />
          </>
        ) : null}
        <div
          className={cn(
            "relative overflow-hidden bg-background",
            isPhone ? "rounded-[2.4rem]" : "rounded-[1.25rem]",
            screenClassName
          )}
          style={{ aspectRatio: isPhone ? "9 / 19.5" : "4 / 3" }}
        >
          {isPhone ? (
            <span
              aria-hidden
              className="absolute top-2.5 left-1/2 z-20 h-6 w-20 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: "#0b0b0d" }}
            />
          ) : (
            <span
              aria-hidden
              className="absolute top-1.5 left-1/2 z-20 size-1.5 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: "#27272a" }}
            />
          )}
          {statusBar ? <StatusBar compact={!isPhone} /> : null}
          <div className={cn("size-full overflow-auto scrollbar-none", statusBar && (isPhone ? "pt-11" : "pt-6"))}>
            {children}
          </div>
        </div>
        {isPhone ? (
          <span aria-hidden className="absolute bottom-4 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-foreground/30" />
        ) : null}
      </div>
    );
  }
);
DeviceFrame.displayName = "DeviceFrame";
