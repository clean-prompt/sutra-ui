/* Pure geometry for `CheckBurst`: where each particle flies and how it is drawn. No DOM, no React, no randomness (the same burst every time). */

/** Most particles one burst may have. */
export const BURST_MAX = 24;

/** Particle shape of a burst: dots, dashes or a mix. */
export type BurstShape = "dots" | "dashes" | "mixed";

/** One burst particle: its index, end offset (dx, dy), angle, shape, size and delay. */
export interface BurstParticle {
  index: number;
  /** Where the particle ends, in px from the centre. */
  dx: number;
  dy: number;
  /** Direction of travel in degrees (0 = towards the right, 90 = down). */
  angle: number;
  shape: "dot" | "dash";
  /** Drawn size in px (width, height). A dash is longer than it is tall. */
  width: number;
  height: number;
  /** Start delay in ms (a small three-step stagger, so the ring is not a single flash). */
  delay: number;
}

/** A whole number from 0 to `BURST_MAX` (NaN and negatives give 0). */
export function clampBurstCount(count: number): number {
  return Number.isFinite(count) ? Math.min(BURST_MAX, Math.max(0, Math.round(count))) : 0;
}

/**
 * Particles on a ring, the first one straight up, even steps round, every other one pulled in to 72% of the radius so the
 * ring looks hand-thrown rather than stamped. Dashes point along their direction of travel.
 */
export function burstParticles({ count = 10, radius = 28, size = 5, shape = "mixed" }: { count?: number; radius?: number; size?: number; shape?: BurstShape } = {}): BurstParticle[] {
  const n = clampBurstCount(count);
  const r = Math.max(0, radius);
  const s = Math.max(1, size);
  return Array.from({ length: n }, (_, index) => {
    const angle = -90 + (360 / n) * index;
    const rad = (angle * Math.PI) / 180;
    const reach = index % 2 === 0 ? r : r * 0.72;
    const kind: "dot" | "dash" = shape === "dots" ? "dot" : shape === "dashes" ? "dash" : index % 2 === 0 ? "dot" : "dash";
    return {
      index,
      dx: round(Math.cos(rad) * reach),
      dy: round(Math.sin(rad) * reach),
      angle: round(angle),
      shape: kind,
      width: kind === "dash" ? round(s * 1.8) : s,
      height: kind === "dash" ? round(s * 0.5) : s,
      delay: (index % 3) * 24,
    };
  });
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The Web Animations keyframes of one particle: out from the centre, full size a third of the way, then small and gone. */
export function burstKeyframes(p: Pick<BurstParticle, "dx" | "dy">): Keyframe[] {
  return [
    { translate: "0px 0px", scale: 0.3, opacity: 0 },
    { translate: `${round(p.dx * 0.7)}px ${round(p.dy * 0.7)}px`, scale: 1, opacity: 1, offset: 0.35 },
    { translate: `${p.dx}px ${p.dy}px`, scale: 0.4, opacity: 0 },
  ];
}

/** Keyframes of the pop on the wrapped content: a quick swell and back. */
export const burstPopKeyframes: Keyframe[] = [{ scale: 1 }, { scale: 1.22, offset: 0.35 }, { scale: 1 }];
