import * as React from "react";
import { dot } from "./emoji-ink-parts-internal";
import { C, L, O, P, R, drop as dropS, pt, soft, type InkSolid } from "./emoji-ink-solid-internal";

/** Ink drawings for the food category (see emoji-ink-parts-internal for the shared parts and the style rules). */

const n = (value: number) => Number(value.toFixed(2));
/** A point at `radius` and `deg` degrees (0 = up, clockwise) around (cx, cy). */
const polar = (cx: number, cy: number, radius: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [n(cx + radius * Math.sin(a)), n(cy - radius * Math.cos(a))];
};

/** A small solid flame or drop (candle flame, steam) pointing up from its base at (x, y). */
const drop = (x: number, y: number, size = 1) => (
  <path
    transform={`translate(${x} ${y}) scale(${size})`}
    d="M0 0C-1.5 0-2-1-2-2 0-3.2.4-3.8 0-5 1.8-4 2-2.8 2-2 2-1 1.5 0 0 0z"
    fill="currentColor"
    strokeWidth="1"
  />
);

/** A wavy line of `waves` equal humps from (x, y) to (x + width, y). */
const wave = (x: number, y: number, width: number, waves: number, amp = 1.2): string => {
  const w = width / waves;
  return `M${x} ${y}${Array.from({ length: waves }, (_, i) => `c${n(w * 0.25)} ${i % 2 === 0 ? amp : -amp} ${n(w * 0.75)} ${i % 2 === 0 ? amp : -amp} ${n(w)} 0`).join("")}`;
};

/** The cookie outline: a circle with a bite out of the top right (two round scoops). */
const cookiePath = (() => {
  const r = 9.2;
  const a = polar(12, 12, r, 72);
  const b = polar(12, 12, r, 45);
  const c = polar(12, 12, r, 18);
  return `M${a[0]} ${a[1]}A${r} ${r} 0 1 1 ${c[0]} ${c[1]}A2.4 2.4 0 0 0 ${b[0]} ${b[1]}A2.4 2.4 0 0 0 ${a[0]} ${a[1]}z`;
})();

export const foodInkArt: Record<string, React.ReactNode> = {
  "🍎": (
    <>
      <path d="M12 7.6c-1.4-1.2-3.2-1.6-4.8-.8C5 7.8 4 10.4 4.6 13.6c.6 3.4 3 7.4 5.6 7.4 1 0 1.2-.5 1.8-.5s.8.5 1.8.5c2.6 0 5-4 5.6-7.4.6-3.2-.4-5.8-2.6-6.8-1.6-.8-3.4-.4-4.8.8z" />
      <path d="M12 7.6c0-1.8.6-3.2 1.8-4" />
      <path d="M13.8 5.6c.8-1.6 2.4-2.2 4.2-1.8-.2 1.8-1.6 2.8-4.2 1.8z" />
    </>
  ),
  "🍌": (
    <>
      <path d="M5 4.4L4.4 2h3.2l1 3.2C9 11.2 12 15.2 19.8 16.4l1.6 2.4C10.6 20.6 3.6 14.4 5 4.4z" />
      <path d="M7 9c.8 3.8 3.6 6.8 8.4 8" strokeWidth="1.4" />
    </>
  ),
  "🍉": (
    <>
      <path d="M2.4 7.4a9.6 9.6 0 0 0 19.2 0z" />
      <path d="M5.2 7.4a6.8 6.8 0 0 0 13.6 0" />
      {dot(9, 10.8, 1)}
      {dot(12, 13.2, 1)}
      {dot(15, 10.8, 1)}
    </>
  ),
  "🍓": (
    <>
      <path d="M12 21.4c-4.2-1.8-7.4-5.8-7.4-10.2 0-2.4 1.8-4 4-4h6.8c2.2 0 4 1.6 4 4 0 4.4-3.2 8.4-7.4 10.2z" />
      <path d="M7.6 7.2L12 9.4l4.4-2.2M12 9.4V5" />
      <path d="M9.4 4.4L12 5.6l2.6-1.2" />
      {dot(9, 12.4, 0.9)}
      {dot(13.4, 12, 0.9)}
      {dot(11, 16, 0.9)}
      {dot(15.4, 15.4, 0.9)}
    </>
  ),
  "🍑": (
    <>
      <path d="M12 7.6C8 5.2 3.8 8.2 4 13c.2 4.4 3.6 8 8 8s7.8-3.6 8-8c.2-4.8-4-7.8-8-5.4z" />
      <path d="M12 7.6c-.8 3-.6 6.6 1.6 9.4" strokeWidth="1.4" />
      <path d="M12 7.6c.2-1.6.8-2.8 1.8-3.6" />
      <path d="M14 5.6c1.2-1.6 3-2 4.8-1.2-.6 1.8-2.6 2.6-4.8 1.2z" />
    </>
  ),
  "🥑": (
    <>
      <path d="M12 2.8c-3 0-4.6 3.6-5.4 6.4-.4 1.6-2.4 3-2.4 5.8 0 3.6 3.6 6.2 7.8 6.2s7.8-2.6 7.8-6.2c0-2.8-2-4.2-2.4-5.8C16.6 6.4 15 2.8 12 2.8z" />
      <circle cx="12" cy="14.6" r="3.3" />
    </>
  ),
  "🥕": (
    <g transform="rotate(40 12 12)">
      <path d="M8.4 8.6c0-2 7.2-2 7.2 0L12.8 21c-.3 1-1.3 1-1.6 0z" />
      <path d="M9.4 12.2h2.4M12.4 15.4h2.2" strokeWidth="1.4" />
      <path d="M12 6.6C11.6 4.4 10.4 3 8.6 2.4M12 6.6c0-2 .4-3.4.8-4.6M12 6.6c.6-2.2 1.8-3.6 3.6-4.2" />
    </g>
  ),
  "🌽": (
    <>
      <path d="M12 2.4c3 0 4.6 3.6 4.6 7.6 0 3-1.2 5.2-2.2 6.4H9.6c-1-1.2-2.2-3.4-2.2-6.4 0-4 1.6-7.6 4.6-7.6z" />
      <path d="M12 3.4v13M8.2 7.6h7.6M7.8 11.6h8.4" strokeWidth="1.4" />
      <path d="M12 21.6C7 21 4.4 17.6 4.6 11.6c3 .8 5 3 5.6 5.6" />
      <path d="M12 21.6c5-.6 7.6-4 7.4-10-3 .8-5 3-5.6 5.6" />
    </>
  ),
  "🍞": (
    <>
      <path d="M3.4 11.4C3.4 7 7 4.6 12 4.6s8.6 2.4 8.6 6.8c0 1.2-.6 2-1.4 2.4V19a1.6 1.6 0 0 1-1.6 1.6H6.4A1.6 1.6 0 0 1 4.8 19v-5.2c-.8-.4-1.4-1.2-1.4-2.4z" />
      <path d="M8.4 9.4l1.6 2.2M11.6 8.8l1.6 2.2M14.8 9.4l1.6 2.2" strokeWidth="1.4" />
    </>
  ),
  "🧀": (
    <>
      <path d="M3 11.4L19.6 4.4c.8 2 1.2 4.4 1.4 7v6.2a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 17.6z" />
      <path d="M3 11.4h18" />
      <circle cx="7.8" cy="15.6" r="1.5" />
      <circle cx="14.4" cy="16.2" r="1.2" />
      {dot(17.8, 13.6, 0.9)}
      {dot(13.4, 8.6, 0.9)}
    </>
  ),
  "🍔": (
    <>
      <path d="M3.6 9.4C3.6 5.8 7.2 3.4 12 3.4s8.4 2.4 8.4 6z" />
      {dot(8.8, 6.6, 0.9)}
      {dot(12.6, 5.6, 0.9)}
      {dot(15.8, 7.2, 0.9)}
      <path d={wave(3.2, 11.8, 17.6, 5, 1.2)} />
      <rect x="3.8" y="14.2" width="16.4" height="2.6" rx="1.3" fill="currentColor" stroke="none" />
      <path d="M3.8 18.8h16.4v.2a2.2 2.2 0 0 1-2.2 2.2H6A2.2 2.2 0 0 1 3.8 19z" />
    </>
  ),
  "🍕": (
    <>
      <path d="M3.2 7.2L12 21.4l8.8-14.2c-5.2-2.6-12.4-2.6-17.6 0z" />
      <path d="M5 10.2c4.6-1.8 9.4-1.8 14 0" strokeWidth="1.4" />
      {dot(10, 13.4, 1.2)}
      {dot(14.2, 13, 1.2)}
      {dot(12, 17.2, 1.1)}
    </>
  ),
  "🌮": (
    <g transform="rotate(-14 12 12)">
      <path d="M2.8 12.2h18.4a9.2 9.2 0 0 1-18.4 0z" />
      <path d="M4.2 12.2c.6-3 2.8-3.8 4.2-2 1-2.6 3.6-2.8 4.8-.6 1.4-1.4 3.6-.8 4.4 1.2 1.2 0 2.2.6 2.6 1.4" />
      {dot(9.2, 15.4, 0.9)}
      {dot(14.6, 15.6, 0.9)}
      {dot(12, 17.8, 0.9)}
    </g>
  ),
  "🍣": (
    <>
      <path d="M3.4 12c0-2.8 2.4-4.2 5.4-4.2h6.4c3 0 5.4 1.4 5.4 4.2 0 1.4-1 2.4-2.4 2.4H5.8c-1.4 0-2.4-1-2.4-2.4z" />
      <path d="M9.2 8l1 6.4M13 8l1 6.4M16.8 8.4l.6 6" strokeWidth="1.4" />
      <path d="M5.2 14.6v3a2.4 2.4 0 0 0 2.4 2.4h8.8a2.4 2.4 0 0 0 2.4-2.4v-3" />
    </>
  ),
  "🍜": (
    <>
      <path d="M3 12.2h18c0 4.6-4 8.4-9 8.4s-9-3.8-9-8.4z" />
      <path d="M7 12.2c0-2 2-2 2-4.2M10.8 12.2c0-2 2-2 2-4.2" />
      <path d="M14 9.2l5.8-6.4M16.8 10.2l4.6-5" />
    </>
  ),
  "🍛": (
    <>
      <path d="M2.8 14.6h18.4c0 3.8-4 6.4-9.2 6.4s-9.2-2.6-9.2-6.4z" />
      <path d="M4.4 14.6c0-3.4 2.4-5.8 5.2-5.8s5.2 2.4 5.2 5.8" />
      <path d="M14.8 14.6c0-1.4.8-2.2 1.8-2.2s1.8.8 1.8 2.2" />
      <ellipse cx="18.6" cy="5.4" rx="1.5" ry="2" />
      <path d="M18.6 7.4v5" />
      {dot(8, 12.2, 0.9)}
    </>
  ),
  "🍩": (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 5.6c1.6 0 2.4.8 3 1.8 1.4-.4 2.8.4 3.2 1.8 1 .4 1.6 1.6 1.2 2.8M12 5.6c-1.6 0-2.4.8-3 1.8-1.4-.4-2.8.4-3.2 1.8-1 .4-1.6 1.6-1.2 2.8" strokeWidth="1.4" />
      <path d="M9 8.6l1 .8M14.6 9l1-.6M16.6 13.4l.2 1M7.4 13.2l.6.8M11.4 16.6l.8.6" strokeWidth="1.4" />
    </>
  ),
  "🍪": (
    <>
      <path d={cookiePath} />
      {dot(8.4, 9, 1.1)}
      {dot(12.8, 13.4, 1.1)}
      {dot(7.8, 15.4, 1.1)}
      {dot(16, 16.4, 1.1)}
      {dot(13.4, 8.4, 0.9)}
    </>
  ),
  "🎂": (
    <>
      <path d="M3.8 20.6v-6.4a1.8 1.8 0 0 1 1.8-1.8h12.8a1.8 1.8 0 0 1 1.8 1.8v6.4" />
      <path d="M2.6 20.6h18.8" />
      <path d="M3.8 15.6c1.4 1.2 2.4 1.2 3.4 0s2.2-1.2 3.4 0 2.2 1.2 3.4 0 2.2-1.2 3.4 0 2.2 1.2 3.4 0" />
      <path d="M9.6 12.4V8.4M14.4 12.4V8.4" />
      {drop(9.6, 6.8, 0.9)}
      {drop(14.4, 6.8, 0.9)}
    </>
  ),
  "🍫": (
    <g transform="rotate(-14 12 12)">
      <rect x="5.6" y="3" width="12.8" height="18" rx="1.8" />
      <path d="M12 3v8.6M5.6 7.4h12.8" strokeWidth="1.4" />
      <path d="M5.6 11.6l2.4 1.4 2.4-1.4 2.4 1.4 2.4-1.4 3.2 1.4" strokeWidth="1.4" />
    </g>
  ),
  "🍿": (
    <>
      <path d="M5.4 10.6l1.6 10.8h10l1.6-10.8" />
      <path d="M10 10.6l.4 10.8M14 10.6l-.4 10.8" strokeWidth="1.4" />
      <path d="M5.6 10.6A2.6 2.6 0 0 1 4.8 6a3 3 0 0 1 5.2-1.8 3 3 0 0 1 5.4.6 2.6 2.6 0 0 1 3.6 3.6 2.4 2.4 0 0 1-.6 2.2z" />
    </>
  ),
  "☕": (
    <>
      <path d="M4.4 10h12.6v5.2a5 5 0 0 1-5 5h-2.6a5 5 0 0 1-5-5z" />
      <path d="M17 11.4h1.2a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M8.2 3.2c-1 1 1 2 0 3.4M12.8 3.2c-1 1 1 2 0 3.4" />
    </>
  ),
  "🍵": (
    <>
      <path d="M3.6 10.6h16.8c0 5-3.6 9-8.4 9s-8.4-4-8.4-9z" />
      <path d="M8.2 3.6c-1 1 1 2 0 3.4M12 3.6c-1 1 1 2 0 3.4M15.8 3.6c-1 1 1 2 0 3.4" />
      <path d="M12 16.4c0-2 1.4-3.2 3.4-3.2 0 2-1.4 3.2-3.4 3.2z" strokeWidth="1.4" />
    </>
  ),
  "🍺": (
    <>
      <path d="M4.6 9.4h11.4v10.8a1.4 1.4 0 0 1-1.4 1.4H6a1.4 1.4 0 0 1-1.4-1.4z" />
      <path d="M16 11.4h2.2a2 2 0 0 1 2 2v3.2a2 2 0 0 1-2 2H16" />
      <path d="M4.6 9.4c-1.4-.2-2-1.4-1.6-2.6.4-1.2 1.6-1.6 2.6-1.2.4-1.4 1.6-2 2.8-1.8.8-.6 2-.6 2.8.2 1.4-.2 2.6.8 2.6 2.2 1 .2 1.6 1 1.4 2" />
      <path d="M8.6 13v5.2M12 13v5.2" strokeWidth="1.4" />
    </>
  ),
};

/** Short names of the drawn food emoji (keyed by the emoji as the picker lists it). */
export const foodInkNames: Record<string, string> = {
  "🍎": "Red apple",
  "🍌": "Banana",
  "🍉": "Watermelon",
  "🍓": "Strawberry",
  "🍑": "Peach",
  "🥑": "Avocado",
  "🥕": "Carrot",
  "🌽": "Corn",
  "🍞": "Bread",
  "🧀": "Cheese",
  "🍔": "Burger",
  "🍕": "Pizza",
  "🌮": "Taco",
  "🍣": "Sushi",
  "🍜": "Ramen",
  "🍛": "Curry rice",
  "🍩": "Donut",
  "🍪": "Cookie",
  "🎂": "Birthday cake",
  "🍫": "Chocolate",
  "🍿": "Popcorn",
  "☕": "Coffee",
  "🍵": "Tea",
  "🍺": "Beer",
};

/* ----- solid drawings (variants "solid" and "tint") ----- */

const pop = (layers: InkSolid["layers"], extra: Partial<InkSolid> = {}): InkSolid => ({ layers, move: "pop", origin: "12px 13px", ...extra });
const APPLE_LEAF = "M13.8 5.6c.8-1.6 2.4-2.2 4.2-1.8-.2 1.8-1.6 2.8-4.2 1.8z";
const AVOCADO = "M12 2.8c-3 0-4.6 3.6-5.4 6.4-.4 1.6-2.4 3-2.4 5.8 0 3.6 3.6 6.2 7.8 6.2s7.8-2.6 7.8-6.2c0-2.8-2-4.2-2.4-5.8C16.6 6.4 15 2.8 12 2.8z";
/** Steam: three wavy lines that rise and fade when the drawing moves. */
const steam = (xs: number[], y: number) => pt("steam", "steam", L(xs.map((x) => `M${x} ${y}c-1 1 1 2 0 3.4`).join(""), 1.6), "12px 6px");

/** Solid drawings of this category (variants "solid" and "tint"); see emoji-ink-solid-internal. */
export const foodSolidArt: Record<string, InkSolid> = {
  "🍎": pop([
    {
      body: [P("M12 7.6c-1.4-1.2-3.2-1.6-4.8-.8C5 7.8 4 10.4 4.6 13.6c.6 3.4 3 7.4 5.6 7.4 1 0 1.2-.5 1.8-.5s.8.5 1.8.5c2.6 0 5-4 5.6-7.4.6-3.2-.4-5.8-2.6-6.8-1.6-.8-3.4-.4-4.8.8z", 1.75), L("M12 7.6c0-1.8.6-3.2 1.8-4", 1.8), P(APPLE_LEAF, 1.2)],
      cuts: [soft(L("M7.4 11.6c.2-1.6 1-2.6 2.2-3.1", 1.3))],
    },
  ]),
  "🍌": pop([{ body: [P("M5 4.4L4.4 2h3.2l1 3.2C9 11.2 12 15.2 19.8 16.4l1.6 2.4C10.6 20.6 3.6 14.4 5 4.4z", 1.75)], cuts: [L("M7 9c.8 3.8 3.6 6.8 8.4 8", 1.3)] }], { move: "wiggle", origin: "12px 16px" }),
  /* Watermelon: the rind parted by a paper line, seeds cut out. */
  "🍉": pop([{ body: [P("M2.4 7.4a9.6 9.6 0 0 0 19.2 0z", 1.75)], cuts: [L("M5.2 7.4a6.8 6.8 0 0 0 13.6 0", 1.3), C(9, 10.8, 1.05), C(12, 13.2, 1.05), C(15, 10.8, 1.05)] }]),
  /* Strawberry: the calyx keyed on top, the seeds cut out (tinted in tint). */
  "🍓": pop([
    { body: [P("M12 21.4c-4.2-1.8-7.4-5.8-7.4-10.2 0-2.4 1.8-4 4-4h6.8c2.2 0 4 1.6 4 4 0 4.4-3.2 8.4-7.4 10.2z", 1.75)], cuts: [soft(C(9, 12.4, 0.85)), soft(C(13.4, 12, 0.85)), soft(C(11, 16, 0.85)), soft(C(15.4, 15.4, 0.85))] },
    { body: [P("M7.2 6.8L12 9.8l4.8-3-2.6-.6L12 4.8l-2.2 1.4z", 0.9), L("M12 5.6V3.2", 1.6)], key: 0.8 },
  ]),
  "🍑": pop([
    {
      body: [P("M12 7.6C8 5.2 3.8 8.2 4 13c.2 4.4 3.6 8 8 8s7.8-3.6 8-8c.2-4.8-4-7.8-8-5.4z", 1.75), L("M12 7.6c.2-1.6.8-2.8 1.8-3.6", 1.7), P("M14 5.6c1.2-1.6 3-2 4.8-1.2-.6 1.8-2.6 2.6-4.8 1.2z", 1.2)],
      cuts: [L("M12 8c-.8 3-.6 6.6 1.6 9.4", 1.3)],
    },
  ]),
  /* Avocado: the dark skin, the light flesh cut out, the stone given back. */
  "🥑": pop([{ body: [P(AVOCADO, 1.75)], cuts: [soft(P(AVOCADO, 0, "translate(12 13.4) scale(0.74) translate(-12 -13.4)"))], restore: [C(12, 14.6, 3.1)] }]),
  "🥕": pop(
    [
      {
        body: [P("M8.4 8.6c0-2 7.2-2 7.2 0L12.8 21c-.3 1-1.3 1-1.6 0z", 1.75), L("M12 6.6C11.6 4.4 10.4 3 8.6 2.4M12 6.6c0-2 .4-3.4.8-4.6M12 6.6c.6-2.2 1.8-3.6 3.6-4.2", 1.7)],
        cuts: [L("M9.4 12.2h2.4M12.4 15.4h2.2", 1.2), L("M7.6 8.2h8.8", 1)],
      },
    ],
    { tf: "rotate(40 12 12)", move: "wiggle", origin: "12px 14px" }
  ),
  /* Corn: the cob with its kernels cut, two husks keyed in front. */
  "🌽": pop([
    { body: [P("M12 2.4c3 0 4.6 3.6 4.6 7.6 0 3-1.2 5.2-2.2 6.4H9.6c-1-1.2-2.2-3.4-2.2-6.4 0-4 1.6-7.6 4.6-7.6z", 1.75)], cuts: [soft(L("M12 3.4v12.6M8.2 7.6h7.6M7.8 11.6h8.4", 1.2))] },
    { body: [P("M12 21.6C7 21 4.4 17.6 4.6 11.6c3 .8 5 3 5.6 5.6z", 1.3), P("M12 21.6c5-.6 7.6-4 7.4-10-3 .8-5 3-5.6 5.6z", 1.3)], key: 0.9 },
  ]),
  "🍞": pop([
    {
      body: [P("M3.4 11.4C3.4 7 7 4.6 12 4.6s8.6 2.4 8.6 6.8c0 1.2-.6 2-1.4 2.4V19a1.6 1.6 0 0 1-1.6 1.6H6.4A1.6 1.6 0 0 1 4.8 19v-5.2c-.8-.4-1.4-1.2-1.4-2.4z", 1.75)],
      cuts: [soft(L("M8.4 9.4l1.6 2.2M11.6 8.8l1.6 2.2M14.8 9.4l1.6 2.2", 1.3)), L("M5.6 14.2h12.8", 1.1)],
    },
  ]),
  /* Cheese: the top face cut to paper (a tint in tint), holes through the side. */
  "🧀": pop([
    {
      body: [P("M3 11.4L19.6 4.4c.8 2 1.2 4.4 1.4 7v6.2a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 17.6z", 1.75)],
      cuts: [soft(P("M4.6 10.6L19 4.9c.6 1.8 1 3.6 1.2 5.7z", 0.4)), C(7.8, 15.6, 1.6), C(14.4, 16.2, 1.3), C(17.8, 13.6, 0.95)],
      restore: [C(13.4, 8.6, 0.9)],
    },
  ]),
  /* Burger: three parts with paper between them (bun with seeds, the filling with a lettuce edge, the base). */
  "🍔": pop(
    [
      {
        body: [P("M3.6 9.6C3.6 5.8 7.2 3.4 12 3.4s8.4 2.4 8.4 6.2z", 1.2), P("M3.4 13q1.7-1.6 3.4 0t3.4 0 3.4 0 3.4 0 3.4 0V16.4H3.4z", 0.8), P("M3.8 18.4h16.4v.8a2.2 2.2 0 0 1-2.2 2.2H6a2.2 2.2 0 0 1-2.2-2.2z", 1)],
        cuts: [soft(C(8.8, 6.6, 0.8)), soft(C(12.6, 5.6, 0.8)), soft(C(15.8, 7.2, 0.8)), soft(L("M4 15h16", 0.9))],
      },
    ],
    { move: "squash" }
  ),
  "🍕": pop([
    { body: [P("M3.2 7.2L12 21.4l8.8-14.2c-5.2-2.6-12.4-2.6-17.6 0z", 1.75)], cuts: [L("M5 10.2c4.6-1.8 9.4-1.8 14 0", 1.3), soft(C(10, 13.4, 1.3)), soft(C(14.2, 13, 1.3)), soft(C(12, 17.2, 1.15))] },
  ], { move: "wiggle", origin: "12px 18px" }),
  "🌮": pop(
    [
      {
        body: [P("M2.8 12.2h18.4a9.2 9.2 0 0 1-18.4 0z", 1.75), L("M4.2 11.6c.6-3 2.8-3.8 4.2-2 1-2.6 3.6-2.8 4.8-.6 1.4-1.4 3.6-.8 4.4 1.2 1.2 0 2.2.6 2.6 1.4", 1.8)],
        cuts: [L("M2.4 12.7h19.2", 1), soft(C(9.2, 15.4, 0.9)), soft(C(14.6, 15.6, 0.9)), soft(C(12, 17.8, 0.9))],
      },
    ],
    { tf: "rotate(-14 12 12)", move: "wiggle", origin: "12px 16px" }
  ),
  /* Sushi: the fish with its stripes, a paper line, the rice block below (tinted in tint). */
  "🍣": pop([
    {
      body: [P("M3.4 12c0-2.8 2.4-4.2 5.4-4.2h6.4c3 0 5.4 1.4 5.4 4.2 0 1.4-1 2.4-2.4 2.4H5.8c-1.4 0-2.4-1-2.4-2.4z", 1.75), soft(P("M5.2 14.6v3a2.4 2.4 0 0 0 2.4 2.4h8.8a2.4 2.4 0 0 0 2.4-2.4v-3z", 1.75))],
      cuts: [L("M9.2 8l1 6M13 8l1 6M16.8 8.4l.6 5.6", 1.2), L("M3 15.4h18", 1.1)],
    },
  ]),
  "🍜": pop([
    { body: [P("M3 12.2h18c0 4.6-4 8.4-9 8.4s-9-3.8-9-8.4z", 1.75), L("M14 9.2l5.8-6.4M16.8 10.2l4.6-5", 1.7)], cuts: [soft(L("M3.6 13.8h16.8", 1.1))] },
  ], { lines: [steam([7.4, 11.2], 7.4)] }),
  "🍛": pop([
    { body: [P("M2.8 14.6h18.4c0 3.8-4 6.4-9.2 6.4s-9.2-2.6-9.2-6.4z", 1.75), O(18.6, 5.4, 1.6, 2.1), L("M18.6 7.4v4.4", 1.6)], cuts: [L("M2.4 15.1h19.2", 1.1)] },
    { body: [P("M4.4 14.6c0-3.4 2.4-5.8 5.2-5.8s5.2 2.4 5.2 5.8z", 1.2), P("M15 14.6c0-1.4.8-2.2 1.8-2.2s1.8.8 1.8 2.2z", 1)], cuts: [soft(C(8, 12.2, 0.8)), soft(C(10.8, 11.2, 0.7))], key: 0.6 },
  ]),
  /* Donut: the ring with its hole, the icing edge and sprinkles cut (tinted in tint). */
  "🍩": pop([
    {
      body: [C(12, 12, 9.6)],
      cuts: [
        C(12, 12, 2.9),
        soft(L("M12 5.6c1.6 0 2.4.8 3 1.8 1.4-.4 2.8.4 3.2 1.8 1 .4 1.6 1.6 1.2 2.8M12 5.6c-1.6 0-2.4.8-3 1.8-1.4-.4-2.8.4-3.2 1.8-1 .4-1.6 1.6-1.2 2.8", 1.2)),
        L("M9 8.6l1 .8M14.6 9l1-.6M16.6 13.4l.2 1M7.4 13.2l.6.8M11.4 16.6l.8.6", 1.2),
      ],
    },
  ], { move: "spin-45", origin: "12px 12px" }),
  "🍪": pop([{ body: [P(cookiePath, 1.75)], cuts: [C(8.4, 9, 1.2), C(12.8, 13.4, 1.2), C(7.8, 15.4, 1.2), C(16, 16.4, 1.2), C(13.4, 8.4, 1)] }], { move: "wiggle" }),
  /* Birthday cake: the icing drip cut across the cake, candles with flames that flicker. */
  "🎂": {
    layers: [
      {
        body: [P("M3.8 20v-5.8a1.8 1.8 0 0 1 1.8-1.8h12.8a1.8 1.8 0 0 1 1.8 1.8V20z", 1.75), L("M2.6 21.9h18.8", 1.6), L("M9.6 12.6V9M14.4 12.6V9", 1.8)],
        cuts: [soft(L("M3.6 15.4c1.4 1.2 2.4 1.2 3.4 0s2.2-1.2 3.4 0 2.2 1.2 3.4 0 2.2-1.2 3.4 0 2.2 1.2 3.4 0", 1.3))],
      },
    ],
    dots: [pt("flame", "flicker", dropS(9.6, 6.4, 1.15, 9.6, 3.4), "9.6px 7.6px"), pt("flame", "flicker", dropS(14.4, 6.4, 1.15, 14.4, 3.4), "14.4px 7.6px", false, 1)],
  },
  "🍫": pop(
    [{ body: [R(5.6, 3, 12.8, 18, 1.8)], cuts: [L("M12 3v8.6M5.6 7.4h12.8", 1.3), soft(L("M5.6 11.6l2.4 1.4 2.4-1.4 2.4 1.4 2.4-1.4 3.2 1.4", 1.3))] }],
    { tf: "rotate(-14 12 12)", move: "wiggle", origin: "12px 12px" }
  ),
  /* Popcorn: the striped bucket, the popped top apart from it (it jumps). */
  "🍿": {
    layers: [
      { body: [P("M5.4 11.2l1.6 10.2h10l1.6-10.2z", 1.75)], cuts: [soft(L("M10 11.2l.4 10.2M14 11.2l-.4 10.2", 1.4))] },
      { body: [P("M5.6 10.2A2.6 2.6 0 0 1 4.8 5.6a3 3 0 0 1 5.2-1.8 3 3 0 0 1 5.4.6 2.6 2.6 0 0 1 3.6 3.6 2.4 2.4 0 0 1-.6 2.2z", 1.5)], key: 0.6, part: { name: "popcorn", move: "jab" } },
    ],
  },
  "☕": {
    layers: [{ body: [P("M4.4 10h12.6v5.2a5 5 0 0 1-5 5h-2.6a5 5 0 0 1-5-5z", 1.75), L("M17 11.4h1.2a2.6 2.6 0 0 1 0 5.2H16", 1.8)], cuts: [soft(L("M5.8 12.4h9.8", 1.1))] }],
    lines: [steam([8.4, 13], 3.2)],
  },
  "🍵": {
    layers: [{ body: [P("M3.6 10.6h16.8c0 5-3.6 9-8.4 9s-8.4-4-8.4-9z", 1.75)], cuts: [soft(P("M12 16.4c0-2 1.4-3.2 3.4-3.2 0 2-1.4 3.2-3.4 3.2z", 0.9))] }],
    lines: [steam([8.4, 12.2, 16], 3.6)],
  },
  /* Beer: the mug with its bubbles cut, the foam on top (a tint in tint). */
  "🍺": pop(
    [
      {
        body: [
          P("M4.6 9.4h11.4v10.8a1.4 1.4 0 0 1-1.4 1.4H6a1.4 1.4 0 0 1-1.4-1.4z", 1.75),
          L("M16 11.4h2.2a2 2 0 0 1 2 2v3.2a2 2 0 0 1-2 2H16", 1.8),
          soft(P("M4.6 9.4c-1.4-.2-2-1.4-1.6-2.6.4-1.2 1.6-1.6 2.6-1.2.4-1.4 1.6-2 2.8-1.8.8-.6 2-.6 2.8.2 1.4-.2 2.6.8 2.6 2.2 1 .2 1.6 1 1.4 2z", 1.4)),
        ],
        cuts: [L("M3.4 10.1h13.6", 1), L("M8.6 13v5.2M12 13v5.2", 1.3)],
      },
    ],
    { move: "wiggle" }
  ),
};
