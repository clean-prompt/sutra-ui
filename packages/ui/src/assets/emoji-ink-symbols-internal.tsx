import type * as React from "react";
import { dot } from "./emoji-ink-parts-internal";
import { C, HEART, L, P, R, Ring, drop, heartAt, pl, pt, soft, type InkSolid } from "./emoji-ink-solid-internal";

/*
 * Ink drawings for the symbols category (see emoji-ink-parts-internal for the shared parts and the style rules). The coloured
 * hearts cannot differ by colour in one ink, so each carries its own small mark inside the same heart outline that the red
 * heart uses: shine, sun rays, leaf, droplet, a smaller heart, or solid ink for the black one.
 */

/** The heart outline of the red heart (emoji-ink-internal), repeated here so the hearts stay one family. */
const heartOutline = "M12 20.3C7 17.2 3 13.6 3 9a4.6 4.6 0 0 1 9-1.6A4.6 4.6 0 0 1 21 9c0 4.6-4 8.2-9 11.3z";

/** A chevron arrowhead with its tip at (x, y) looking along (dx, dy), as a path. */
function arrowHead(x: number, y: number, dx: number, dy: number, length = 3): string {
  const norm = Math.hypot(dx, dy);
  const [ux, uy] = [dx / norm, dy / norm];
  const wing = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(x - length * (ux * Math.cos(a) - uy * Math.sin(a))).toFixed(2)} ${(y - length * (ux * Math.sin(a) + uy * Math.cos(a))).toFixed(2)}`;
  };
  return `M${wing(40)}L${x.toFixed(2)} ${y.toFixed(2)}L${wing(-40)}`;
}

/** One arrow of the recycling triangle (around the top corner, pointing down the right side), the others are turned copies. */
function recycleArrow(): string {
  const [ax, ay] = [12, 3.2];
  const [br, bl] = [[20.66, 18.2], [3.34, 18.2]];
  const along = (from: number[], to: number[], t: number) => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  const start = along(bl, [ax, ay], 0.4);
  const enter = along(bl, [ax, ay], 0.84);
  const leave = along([ax, ay], br, 0.16);
  const end = along([ax, ay], br, 0.5);
  const f = (p: number[]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  return `M${f(start)}L${f(enter)}Q${ax} ${ay} ${f(leave)}L${f(end)}${arrowHead(end[0], end[1], br[0] - ax, br[1] - ay)}`;
}

/** A ragged burst (an explosion) around (12, 12): spikes of unequal length and uneven valleys. */
function burstPath(): string {
  const spikes = [11, 7.4, 10.2, 8, 11.2, 7, 9.8, 8.2, 10.8];
  const valleys = [4.6, 5.8, 4.4, 5.6, 4.8, 5.4, 4.4, 5.8, 5];
  const parts: string[] = [];
  spikes.forEach((spike, i) => {
    const step = 360 / spikes.length;
    const tip = ((-90 + i * step) * Math.PI) / 180;
    const dip = ((-90 + (i + 0.5) * step) * Math.PI) / 180;
    parts.push(`${(12 + spike * Math.cos(tip)).toFixed(2)} ${(12 + spike * Math.sin(tip)).toFixed(2)}`);
    parts.push(`${(12 + valleys[i] * Math.cos(dip)).toFixed(2)} ${(12 + valleys[i] * Math.sin(dip)).toFixed(2)}`);
  });
  return `M${parts.join("L")}z`;
}

const recycle = recycleArrow();

/** Ink drawings for the symbols category. */
export const symbolInkArt: Record<string, React.ReactNode> = {
  "🧡": (
    <>
      <path d={heartOutline} />
      <path d="M6.6 10.6c-.3-2 .7-3.5 2.6-3.8" />
    </>
  ),
  "💛": (
    <>
      <path d={heartOutline} />
      <circle cx="12" cy="13.2" r="1.5" />
      <path d="M12 8.8v1.4M12 16.2v1.4M7.6 13.2H9M15 13.2h1.4M8.9 10.1l1 1M15.1 10.1l-1 1M8.9 16.3l1-1M15.1 16.3l-1-1" />
    </>
  ),
  "💚": (
    <>
      <path d={heartOutline} />
      <path d="M8.6 14.2c-.2-3.4 2.2-5.4 6-5.2.2 3.6-2.2 5.6-6 5.2zM8.6 14.2l3.2-3.2" />
    </>
  ),
  "💙": (
    <>
      <path d={heartOutline} />
      <path d="M12 8.6c-1.6 2.2-2.8 3.6-2.8 5.2a2.8 2.8 0 0 0 5.6 0c0-1.6-1.2-3-2.8-5.2z" fill="currentColor" strokeWidth="1" />
    </>
  ),
  "💜": (
    <>
      <path d={heartOutline} />
      <path d={heartOutline} transform="translate(6 5.6) scale(.5)" strokeWidth="3.5" />
    </>
  ),
  "🖤": <path d={heartOutline} fill="currentColor" />,
  "💥": <path d={burstPath()} />,
  "❌": <path d="M5 5l14 14M19 5L5 19" />,
  "⚠": (
    <>
      <path d="M10.3 4.5L2.9 17.4a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.6v4.4" />
      {dot(12, 17.2, 1.1)}
    </>
  ),
  "❓": (
    <>
      <path d="M8.2 8.6a3.8 3.8 0 1 1 5.6 3.3c-1.2.7-1.8 1.3-1.8 2.7" />
      {dot(12, 19, 1.3)}
    </>
  ),
  "❗": (
    <>
      <path d="M9.9 4.6a2.1 2.1 0 0 1 4.2 0l-.7 8.4a1.4 1.4 0 0 1-2.8 0z" />
      {dot(12, 18.8, 1.5)}
    </>
  ),
  "➕": <path d="M12 4.4v15.2M4.4 12h15.2" />,
  "🔔": (
    <>
      <path d="M5.4 17.4c1.2-1 1.8-2.4 1.8-4.4v-3a4.8 4.8 0 0 1 9.6 0v3c0 2 .6 3.4 1.8 4.4z" />
      <path d="M10 19.8a2 2 0 0 0 4 0M12 3V5.2" />
    </>
  ),
  "💤": <path d="M14.6 2.8h6.8l-6.8 8h6.8M9 10.4h5.2L9 16.4h5.2M3.4 16.6h4l-4 4.6h4" />,
  "♻": (
    <>
      <path d={recycle} />
      <path d={recycle} transform="rotate(120 12 13.2)" />
      <path d={recycle} transform="rotate(240 12 13.2)" />
    </>
  ),
  "🚫": (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M5.3 5.3l13.4 13.4" />
    </>
  ),
  "🆕": (
    <>
      <rect x="2.8" y="4.6" width="18.4" height="14.8" rx="3.6" />
      <path d="M12 7.6c.4 2.8 1.4 3.8 4.2 4.4-2.8.6-3.8 1.6-4.2 4.4-.4-2.8-1.4-3.8-4.2-4.4 2.8-.6 3.8-1.6 4.2-4.4z" />
    </>
  ),
  "🔁": <path d="M4 12v-2a3.6 3.6 0 0 1 3.6-3.6h12M16.8 3.6l2.8 2.8-2.8 2.8M20 12v2a3.6 3.6 0 0 1-3.6 3.6h-12M7.2 14.8l-2.8 2.8 2.8 2.8" />,
};

/** Short names of the drawn symbols emoji. */
export const symbolInkNames: Record<string, string> = {
  "🧡": "Orange heart",
  "💛": "Yellow heart",
  "💚": "Green heart",
  "💙": "Blue heart",
  "💜": "Purple heart",
  "🖤": "Black heart",
  "💥": "Collision",
  "❌": "Cross",
  "⚠️": "Warning",
  "❓": "Question",
  "❗": "Exclamation",
  "➕": "Plus",
  "🔔": "Bell",
  "💤": "Sleeping",
  "♻️": "Recycle",
  "🚫": "Prohibited",
  "🆕": "New",
  "🔁": "Repeat",
};

/* ----- solid drawings (variants "solid" and "tint") ----- */

/**
 * The coloured hearts: the plain solid heart is the red one, every other colour cuts its own mark out of it (shine, sun, leaf,
 * drop, a smaller heart, an inset line for black), so no two read the same in one ink.
 */
const heart = (cuts: InkSolid["layers"][number]["cuts"]): InkSolid => ({ layers: [{ body: [P(HEART, 0.6)], cuts }], move: "beat", origin: "12px 12.5px" });

/** Solid drawings of this category (variants "solid" and "tint"); see emoji-ink-solid-internal. */
export const symbolSolidArt: Record<string, InkSolid> = {
  "🧡": heart([L("M6.1 10.2c-.3-2 .8-3.6 2.9-4", 1.7)]),
  "💛": heart([C(12, 12.6, 1.8), L("M12 8.2v1.3M12 15.7v1.3M7.6 12.6h1.3M15.1 12.6h1.3M8.9 9.5l.9.9M15.1 9.5l-.9.9M8.9 15.7l.9-.9M15.1 15.7l-.9-.9", 1.2)]),
  "💚": heart([P("M8.6 14.4c-.2-3.6 2.3-5.6 6.2-5.4.2 3.7-2.3 5.8-6.2 5.4z", 0.5)], ),
  "💙": heart([drop(12, 14, 2.6, 12, 8.4)]),
  "💜": heart([heartAt(12, 12.4, 0.36)]),
  "🖤": heart([L(HEART, 1.2, "translate(12 12.1) scale(0.66) translate(-12 -12.05)")]),
  "💥": { layers: [{ body: [P(burstPath(), 1.2)], cuts: [soft(P(burstPath(), 0.6, "translate(12 12) scale(0.45) translate(-12 -12)"))] }], move: "burst", origin: "12px 12px" },
  "❌": { layers: [], lines: [pt("stroke", "draw", pl(L("M5 5l14 14", 3.6))), pt("stroke", "draw", pl(L("M19 5L5 19", 3.6)), undefined, false, 1)] },
  "⚠": {
    layers: [{ body: [P("M10.3 4.5L2.9 17.4a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0z", 1.6)], cuts: [L("M12 9.6v4.4", 1.9), C(12, 17.2, 1.2)] }],
    move: "shake",
    origin: "12px 20px",
  },
  "❓": { layers: [{ body: [L("M8.2 8.6a3.8 3.8 0 1 1 5.6 3.3c-1.2.7-1.8 1.3-1.8 2.7", 3), C(12, 19.2, 1.8)] }], move: "wiggle", origin: "12px 21px" },
  "❗": { layers: [{ body: [P("M9.9 4.6a2.1 2.1 0 0 1 4.2 0l-.7 8.4a1.4 1.4 0 0 1-2.8 0z", 1.4), C(12, 18.8, 1.9)] }], move: "jolt", origin: "12px 21px" },
  "➕": { layers: [{ body: [L("M12 4.4v15.2M4.4 12h15.2", 3.6)] }], move: "spin-90", origin: "12px 12px" },
  "🔔": {
    layers: [{ body: [P("M5.4 17.4c1.2-1 1.8-2.4 1.8-4.4v-3a4.8 4.8 0 0 1 9.6 0v3c0 2 .6 3.4 1.8 4.4z", 1.75), L("M12 2.8V5.2", 1.8)], cuts: [soft(L("M9.4 8.6c.4-1.1 1.1-1.8 2-2.1", 1.2))] }],
    dots: [pt("clapper", "swing", C(12, 20.4, 1.8), "12px 17px")],
    move: "ring",
    origin: "12px 3px",
  },
  "💤": {
    layers: [],
    lines: [
      pt("zzz", "zzz", L("M3.4 16.6h4l-4 4.6h4", 2), "5.4px 18.9px"),
      pt("zzz", "zzz", L("M9 10.4h5.2L9 16.4h5.2", 2), "11.6px 13.4px", false, 1),
      pt("zzz", "zzz", L("M14.6 2.8h6.8l-6.8 8h6.8", 2), "18px 6.8px", false, 2),
    ],
  },
  "♻": { layers: [{ body: [L(recycle, 2.2), L(recycle, 2.2, "rotate(120 12 13.2)"), L(recycle, 2.2, "rotate(240 12 13.2)")] }], move: "spin-120", origin: "12px 13.2px" },
  "🚫": { layers: [{ body: [Ring(12, 12, 9, 9, 2.6), L("M5.6 5.6l12.8 12.8", 2.6)] }], move: "shake", origin: "12px 12px" },
  "🆕": {
    layers: [{ body: [R(2.8, 4.6, 18.4, 14.8, 3.6)], cuts: [pt("spark", "twinkle-4", P("M12 7.6c.4 2.8 1.4 3.8 4.2 4.4-2.8.6-3.8 1.6-4.2 4.4-.4-2.8-1.4-3.8-4.2-4.4 2.8-.6 3.8-1.6 4.2-4.4z", 0.8), "12px 12px")] }],
    move: "pop",
    origin: "12px 12px",
  },
  "🔁": { layers: [{ body: [L("M4 12v-2a3.6 3.6 0 0 1 3.6-3.6h12M16.8 3.6l2.8 2.8-2.8 2.8M20 12v2a3.6 3.6 0 0 1-3.6 3.6h-12M7.2 14.8l-2.8 2.8 2.8 2.8", 2.2)] }], move: "spin-180", origin: "12px 12px" },
};
