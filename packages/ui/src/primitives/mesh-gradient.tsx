import * as React from "react";
import { cn } from "../lib/cn";

const defaultColors = [
  "var(--color-brand-400)",
  "var(--color-brand-600)",
  "#00b8db",
  "#8e51ff",
  "var(--color-brand-200)",
];

const blobs = [
  { left: "-10%", top: "-20%", size: "60%", delay: 0 },
  { left: "45%", top: "-25%", size: "55%", delay: -4 },
  { left: "60%", top: "35%", size: "50%", delay: -8 },
  { left: "-5%", top: "45%", size: "55%", delay: -12 },
  { left: "25%", top: "15%", size: "45%", delay: -16 },
];

const noiseSvg = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
);
const noiseUrl = `url("data:image/svg+xml;charset=utf-8,${noiseSvg}")`;

export interface MeshGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Up to 5 CSS colors. Defaults to the brand palette. */
  colors?: string[];
  /** Animation speed multiplier (1 = 18s loop). */
  speed?: number;
  /** Blur radius in px. */
  blur?: number;
  animated?: boolean;
  /** Film-grain noise overlay. */
  grain?: boolean;
  grainOpacity?: number;
  /** Blob opacity, 0–1. */
  intensity?: number;
  /** Classes for the decorative background layer. */
  layerClassName?: string;
}

/** Decorative animated gradient background; children render above it. */
export const MeshGradient = React.forwardRef<HTMLDivElement, MeshGradientProps>(
  (
    {
      className,
      layerClassName,
      colors = defaultColors,
      speed = 1,
      blur = 64,
      animated = true,
      grain = false,
      grainOpacity = 0.18,
      intensity = 0.7,
      children,
      ...props
    },
    ref
  ) => {
    const palette = colors.length > 0 ? colors : defaultColors;
    const duration = 18 / Math.max(0.05, speed);

    return (
      <div ref={ref} className={cn("relative isolate overflow-hidden", className)} {...props}>
        <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", layerClassName)}
        >
          {blobs.map((blob, i) => (
            <span
              key={i}
              className={cn(
                "absolute aspect-square rounded-full will-change-transform",
                animated && "animate-mesh motion-reduce:animate-none"
              )}
              style={{
                left: blob.left,
                top: blob.top,
                width: blob.size,
                minWidth: 160,
                opacity: intensity,
                filter: `blur(${blur}px)`,
                backgroundImage: `radial-gradient(circle at center, ${palette[i % palette.length]} 0%, transparent 68%)`,
                animationDuration: animated ? `${duration * (1 + i * 0.12)}s` : undefined,
                animationDelay: animated ? `${(blob.delay * duration) / 18}s` : undefined,
                animationDirection: animated ? (i % 2 ? "alternate-reverse" : "alternate") : undefined,
              }}
            />
          ))}
          {grain ? (
            <span
              className="absolute inset-0 mix-blend-overlay"
              style={{ backgroundImage: noiseUrl, backgroundSize: "220px 220px", opacity: grainOpacity }}
            />
          ) : null}
        </div>
        {children}
      </div>
    );
  }
);
MeshGradient.displayName = "MeshGradient";
