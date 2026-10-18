import * as React from "react";
import { cn } from "../lib/cn";
import { chartColors } from "../lib/tokens";
import { hashString, seededRandom } from "../lib/hash";
import { useSafeId } from "../hooks/use-safe-id";


/* ------------------------------------------------------------------ */
/* Spec + generator                                                    */
/* ------------------------------------------------------------------ */

export type AgentAvatarShape = "circle" | "squircle" | "hexagon" | "blob";
export type AgentAvatarFace = "dots" | "visor" | "smile" | "sleepy" | "cyclops" | "pixel";

export interface AgentAvatarSpec {
  shape: AgentAvatarShape;
  /** Any CSS color; `var(--primary)` for the brand color. */
  color: string;
  face: AgentAvatarFace;
  /** Drives the blob outline and small variations. */
  seed: string;
  /** Uploaded image; replaces the drawn face, clipped to the shape. */
  imageUrl?: string;
}

export const agentAvatarShapes: AgentAvatarShape[] = ["circle", "squircle", "hexagon", "blob"];
export const agentAvatarFaces: AgentAvatarFace[] = ["dots", "visor", "smile", "sleepy", "cyclops", "pixel"];
/** Swatches offered by the builder. The first entry is the brand color. */
export const agentAvatarColors: string[] = ["var(--primary)", ...chartColors];

/** Deterministic avatar spec for a seed. */
export function randomAvatarSpec(seed: string): AgentAvatarSpec {
  const h = hashString(seed);
  return {
    shape: agentAvatarShapes[h % agentAvatarShapes.length]!,
    color: agentAvatarColors[(h >>> 4) % agentAvatarColors.length]!,
    face: agentAvatarFaces[(h >>> 9) % agentAvatarFaces.length]!,
    seed,
  };
}

function blobPath(seed: string) {
  const r = seededRandom(`${seed}#blob`);
  const n = 8;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rad = 38 + r() * 9;
    return [50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad] as const;
  });
  let d = `M${pts[0]![0].toFixed(2)},${pts[0]![1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0]!.toFixed(2)},${c1[1]!.toFixed(2)} ${c2[0]!.toFixed(2)},${c2[1]!.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

function shapePath(shape: AgentAvatarShape, seed: string) {
  switch (shape) {
    case "circle":
      return "M50,4a46,46 0 1 0 0.01,0Z";
    case "squircle":
      return "M50,4C86,4 96,14 96,50S86,96 50,96 4,86 4,50 14,4 50,4Z";
    case "hexagon":
      return "M50,3L91,26.5V73.5L50,97L9,73.5V26.5Z";
    case "blob":
      return blobPath(seed);
  }
}

function Face({ face, seed }: { face: AgentAvatarFace; seed: string }) {
  const r = seededRandom(`${seed}#face`);
  const spread = 13 + Math.round(r() * 4);
  const y = 44 + Math.round(r() * 4);
  const lx = 50 - spread;
  const rx = 50 + spread;
  const ink = "#fff";
  switch (face) {
    case "dots":
      return (
        <g fill={ink}>
          <circle cx={lx} cy={y} r={6} />
          <circle cx={rx} cy={y} r={6} />
        </g>
      );
    case "visor":
      return (
        <g>
          <rect x={22} y={y - 8} width={56} height={16} rx={8} fill="rgba(0,0,0,0.35)" />
          <rect x={30} y={y - 2.5} width={12} height={5} rx={2.5} fill={ink} />
          <rect x={58} y={y - 2.5} width={12} height={5} rx={2.5} fill={ink} />
        </g>
      );
    case "smile":
      return (
        <g fill={ink} stroke={ink} strokeLinecap="round">
          <circle cx={lx} cy={y - 2} r={5} stroke="none" />
          <circle cx={rx} cy={y - 2} r={5} stroke="none" />
          <path d={`M${lx + 2},${y + 12}Q50,${y + 22} ${rx - 2},${y + 12}`} fill="none" strokeWidth={4} />
        </g>
      );
    case "sleepy":
      return (
        <g fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round">
          <path d={`M${lx - 6},${y}Q${lx},${y + 6} ${lx + 6},${y}`} />
          <path d={`M${rx - 6},${y}Q${rx},${y + 6} ${rx + 6},${y}`} />
          <path d={`M44,${y + 16}h12`} />
        </g>
      );
    case "cyclops":
      return (
        <g>
          <circle cx={50} cy={y} r={14} fill={ink} />
          <circle cx={50 + (r() * 6 - 3)} cy={y + 1} r={6} fill="rgba(0,0,0,0.75)" />
        </g>
      );
    case "pixel":
      return (
        <g fill={ink}>
          <rect x={lx - 5} y={y - 5} width={10} height={10} />
          <rect x={rx - 5} y={y - 5} width={10} height={10} />
          <rect x={40} y={y + 14} width={20} height={4} />
        </g>
      );
  }
}

/* ------------------------------------------------------------------ */
/* AgentAvatar                                                         */
/* ------------------------------------------------------------------ */

export interface AgentAvatarProps extends Omit<React.SVGAttributes<SVGSVGElement>, "color"> {
  spec: AgentAvatarSpec;
  /** Pixel size. Default 40. */
  size?: number;
  /** Accessible name. Pass "" to hide from assistive tech. Default "Agent avatar". */
  label?: string;
}

/** Procedural agent avatar drawn as pure SVG from `{ shape, color, face, seed }`. */
export const AgentAvatar = React.forwardRef<SVGSVGElement, AgentAvatarProps>(
  ({ spec, size = 40, label = "Agent avatar", className, ...props }, ref) => {
    const uid = useSafeId("agent-avatar");
    const d = React.useMemo(() => shapePath(spec.shape, spec.seed), [spec.shape, spec.seed]);
    const hl = React.useMemo(() => {
      const r = seededRandom(`${spec.seed}#hl`);
      return { cx: 30 + r() * 12, cy: 22 + r() * 8 };
    }, [spec.seed]);
    return (
      <svg
        ref={ref}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role={label ? "img" : undefined}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
        data-shape={spec.shape}
        data-face={spec.face}
        data-color={spec.color}
        className={cn("shrink-0", className)}
        {...props}
      >
        <defs>
          <clipPath id={`${uid}-clip`}>
            <path d={d} />
          </clipPath>
          <radialGradient id={`${uid}-hl`} cx={hl.cx / 100} cy={hl.cy / 100} r="0.6">
            <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={d} style={{ fill: spec.color }} />
        {spec.imageUrl ? (
          <image href={spec.imageUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-clip)`} />
        ) : (
          <g clipPath={`url(#${uid}-clip)`}>
            <rect width="100" height="100" fill={`url(#${uid}-hl)`} />
            <Face face={spec.face} seed={spec.seed} />
          </g>
        )}
      </svg>
    );
  }
);
AgentAvatar.displayName = "AgentAvatar";
