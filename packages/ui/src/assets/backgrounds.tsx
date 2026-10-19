import * as React from "react";
import { cn } from "../lib/cn";
import { useSafeId } from "../hooks/use-safe-id";

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
                className="absolute start-0 h-px w-24"
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
