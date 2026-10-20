import * as React from "react";
import type { MascotState } from "./mascot";

/**
 * The drawing of the Sutra mascot, in the 64 x 64 space of the Bead mark. A solid bead (centre 32,33, radius 18.5) strung on a thread:
 * the thread's left piece lies over the bead's rim and ends in a small curl (the tail), its right piece runs under the rim.
 * The face and the gap around the left thread are cut out of the bead with a mask, so they show whatever is behind it, on any theme.
 * Every moving piece carries a `data-part`; the keyframes in `styles/sutra.css` ("Sutra mascot") move them from the `data-state` on the root.
 */
export const BEAD_X = 32;
export const BEAD_Y = 33;
export const BEAD_R = 18.5;
/** The paper gap that keeps the thread readable where it meets the bead. */
export const THREAD_GAP = 1.55;
export const THREAD_W = 4.2;

/** The tail: the thread's left piece, from over the bead's rim out to a small upward curl. */
export const THREAD_LEFT = "M17.5 33H12.4C9 33 6.9 30.7 7.5 27.6";
/** The right piece starts under the bead and leaves it on the right; `end` is longer on a tile so the thread runs off its edge. */
export const threadRight = (end: number) => `M38 33H${end}`;

const EYE_Y = 27.8;
const EYE_X = [26.2, 37.8] as const;

type EyeKind = "open" | "wide" | "focus" | "happy" | "closed";
type MouthKind = "smile" | "small" | "smirk" | "flat" | "wavy" | "talk" | "grin" | "sleep";

/** Which eyes and mouth each state wears: the expression stays when motion is off. */
export const MASCOT_FACE: Record<MascotState, { eyes: EyeKind; mouth: MouthKind; brows?: boolean }> = {
  idle: { eyes: "open", mouth: "smile" },
  listening: { eyes: "wide", mouth: "small" },
  thinking: { eyes: "open", mouth: "smirk" },
  working: { eyes: "focus", mouth: "flat" },
  speaking: { eyes: "open", mouth: "talk" },
  happy: { eyes: "happy", mouth: "grin" },
  sleeping: { eyes: "closed", mouth: "sleep" },
  error: { eyes: "open", mouth: "wavy", brows: true },
};

const BLACK = "black";
const arcProps = { fill: "none", stroke: BLACK, strokeWidth: 2.3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Eye({ kind }: { kind: EyeKind }) {
  switch (kind) {
    case "wide":
      return <ellipse data-part="eye" rx="3" ry="4.1" fill={BLACK} />;
    case "focus":
      return <path data-part="eye" d="M-3.3 -1H3.3A3.3 3.3 0 0 1 -3.3 -1Z" fill={BLACK} />;
    case "happy":
      return <path data-part="eye" d="M-3.1 1.5Q0 -3.1 3.1 1.5" {...arcProps} />;
    case "closed":
      return <path data-part="eye" d="M-3.1 -.8Q0 2.7 3.1 -.8" {...arcProps} />;
    default:
      return <ellipse data-part="eye" rx="2.4" ry="3.2" fill={BLACK} />;
  }
}

function Mouth({ kind }: { kind: MouthKind }) {
  const stroke = { fill: "none", stroke: BLACK, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (kind) {
    case "small":
      return <path data-part="mouth" d="M29 40.6Q32 42.8 35 40.6" {...stroke} />;
    case "smirk":
      return <path data-part="mouth" d="M28.6 41.9Q33 40.7 36.4 40.2" {...stroke} />;
    case "flat":
      return <path data-part="mouth" d="M28.6 41.2H35.4" {...stroke} />;
    case "wavy":
      return <path data-part="mouth" d="M27 41.8q2.5 -2.6 5 0t5 0" {...stroke} />;
    case "talk":
      return <ellipse data-part="mouth" data-talk="" cx="32" cy="41.3" rx="3.5" ry="2.6" fill={BLACK} />;
    case "grin":
      return <path data-part="mouth" d="M25.6 38.8H38.4A6.4 6.4 0 0 1 25.6 38.8Z" fill={BLACK} />;
    case "sleep":
      return <ellipse data-part="mouth" cx="32" cy="41.2" rx="1.6" ry="1.3" fill={BLACK} />;
    default:
      return <path data-part="mouth" d="M27.4 40Q32 44.4 36.6 40" {...stroke} />;
  }
}

/** The cut-outs of the bead's mask (black = see-through): eyes, mouth and, when worried, brows. */
export function MascotFace({ state }: { state: MascotState }) {
  const face = MASCOT_FACE[state];
  return (
    <>
      <g data-part="eyes" data-eyes={face.eyes}>
        {EYE_X.map((x) => (
          <g key={x} transform={`translate(${x} ${EYE_Y})`}>
            <Eye kind={face.eyes} />
          </g>
        ))}
      </g>
      <Mouth kind={face.mouth} />
      {face.brows ? (
        <g data-part="brows" fill="none" stroke={BLACK} strokeWidth="1.9" strokeLinecap="round">
          <path d="M22.4 23.6L28.4 21.4" />
          <path d="M35.6 21.4L41.6 23.6" />
        </g>
      ) : null}
    </>
  );
}

/** A point on the ring around the bead, `deg` degrees clockwise from three o'clock. */
const onRing = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(BEAD_X + r * Math.cos(a)).toFixed(2)} ${(BEAD_Y + r * Math.sin(a)).toFixed(2)}`;
};
const ringArc = (r: number, from: number, to: number) => `M${onRing(r, from)}A${r} ${r} 0 0 1 ${onRing(r, to)}`;

const SPARKLE = "M0 -4.2Q.6 -.6 4.2 0Q.6 .6 0 4.2Q-.6 .6 -4.2 0Q-.6 -.6 0 -4.2Z";

/** The little extras that say what the mascot is doing (rings, thought dots, sparks, stars, z marks, a bang). Drawn in `ink`. */
export function MascotAccessories({ state, ink }: { state: MascotState; ink: string }) {
  switch (state) {
    case "listening":
      return (
        <g data-part="rings" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round">
          {[-52, -128].map((center) =>
            [
              ["a", 23.5],
              ["b", 28],
            ].map(([id, r]) => (
              <path key={`${center}${id}`} data-part="ring" data-ring={id} d={ringArc(r as number, center - 24, center + 24)} />
            ))
          )}
        </g>
      );
    case "thinking":
      return (
        <g data-part="dots" fill={ink}>
          {(
            [
              [47.8, 17.4, 1.4],
              [52.4, 12.6, 1.9],
              [56.8, 7, 2.5],
            ] as const
          ).map(([x, y, r], i) => (
            <circle key={i} data-part="dot" data-i={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "working":
      return (
        <g data-part="sparks" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round">
          {(
            [
              [8.5, 19.5],
              [56.5, 24],
            ] as const
          ).map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path data-part="spark" data-i={i} d="M0 -3.4V3.4M-3.4 0H3.4" />
            </g>
          ))}
        </g>
      );
    case "happy":
      return (
        <g data-part="sparkles" fill={ink}>
          {(
            [
              [11, 14, 0.95],
              [54, 11.5, 1.2],
              [55.5, 41, 0.6],
            ] as const
          ).map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <path data-part="sparkle" data-i={i} d={SPARKLE} />
            </g>
          ))}
        </g>
      );
    case "sleeping":
      return (
        <g data-part="zees" fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
          {(
            [
              [43, 20, 0.55],
              [48.5, 13, 0.8],
              [54, 5.5, 1.05],
            ] as const
          ).map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <path data-part="zee" data-i={i} d="M0 0H5L0 6H5" strokeWidth={(2 / s).toFixed(2)} />
            </g>
          ))}
        </g>
      );
    case "error":
      return (
        <g data-part="bang" stroke={ink} fill={ink} strokeLinecap="round">
          <path d="M50 7.5V15.5" strokeWidth="3" fill="none" />
          <circle cx="50" cy="21.2" r="1.7" stroke="none" />
        </g>
      );
    default:
      return null;
  }
}
