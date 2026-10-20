import * as React from "react";
import { dot } from "./emoji-ink-parts-internal";
import { C, L, O, P, R, Ring, pl, pt, soft, type InkShape, type InkSolid } from "./emoji-ink-solid-internal";

/** Ink drawings for the nature category (see emoji-ink-parts-internal for the shared parts and the style rules). */

const n = (value: number) => Number(value.toFixed(2));
/** A point at `radius` and `deg` degrees (0 = up, clockwise) around (cx, cy). */
const polar = (cx: number, cy: number, radius: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [n(cx + radius * Math.sin(a)), n(cy - radius * Math.cos(a))];
};
/** Straight rays around a centre, as one path. */
const rays = (cx: number, cy: number, from: number, to: number, count: number, offset = 0): string =>
  Array.from({ length: count }, (_, i) => {
    const [x1, y1] = polar(cx, cy, from, offset + (360 / count) * i);
    const [x2, y2] = polar(cx, cy, to, offset + (360 / count) * i);
    return `M${x1} ${y1}L${x2} ${y2}`;
  }).join("");

/**
 * The outer arc of a round ear (circle at ex, ey, radius er) that sticks out of a round head (circle at hx, hy, radius hr):
 * the part of the ear that is not inside the head, so the head outline is not crossed by the ear.
 */
function earArc(ex: number, ey: number, er: number, hx: number, hy: number, hr: number): string {
  const dx = hx - ex;
  const dy = hy - ey;
  const d = Math.hypot(dx, dy);
  const a = (er * er - hr * hr + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(er * er - a * a, 0));
  const mx = ex + (a * dx) / d;
  const my = ey + (a * dy) / d;
  const p1: [number, number] = [n(mx + (h * dy) / d), n(my - (h * dx) / d)];
  const p2: [number, number] = [n(mx - (h * dy) / d), n(my + (h * dx) / d)];
  // Go the long way round, away from the head: clockwise (sweep 1) when that passes the far side of the ear.
  const angle = (p: [number, number]) => Math.atan2(p[1] - ey, p[0] - ex);
  const far = Math.atan2(-dy, -dx);
  const turn = (from: number, to: number) => (((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sweep = turn(angle(p1), far) < turn(angle(p1), angle(p2)) ? 1 : 0;
  return `M${p1[0]} ${p1[1]}A${er} ${er} 0 1 ${sweep} ${p2[0]} ${p2[1]}`;
}

/** A scalloped ring (the lion's mane): `count` round bumps around a circle. */
function scallop(cx: number, cy: number, radius: number, count: number, bump: number): string {
  const points = Array.from({ length: count }, (_, i) => polar(cx, cy, radius, (360 / count) * i));
  return `M${points[0]![0]} ${points[0]![1]}${points.map((p) => `A${bump} ${bump} 0 0 1 ${p[0]} ${p[1]}`).slice(1).join("")}A${bump} ${bump} 0 0 1 ${points[0]![0]} ${points[0]![1]}z`;
}

/** A flower outline with `count` rounded petals: tips at `tip`, valleys at `valley`. */
function petalRing(cx: number, cy: number, tip: number, valley: number, count: number): string {
  const points = Array.from({ length: count * 2 }, (_, i) => polar(cx, cy, i % 2 === 0 ? tip : valley, (180 / count) * i));
  return `M${points.map((p) => `${p[0]} ${p[1]}`).join("L")}z`;
}

/** Two round eyes and a nose for the animal faces. */
const eyes = (y: number, dx = 3.5, r = 1.1) => (
  <>
    {dot(12 - dx, y, r)}
    {dot(12 + dx, y, r)}
  </>
);
const nose = (cy: number) => <ellipse cx="12" cy={cy} rx="1.5" ry="1" fill="currentColor" stroke="none" />;
/** A leaf (pointing up from its base at the origin), used by the herb, sprig and clover. */
const heartLeaf = "M0 0C-3.4-2.6-4.4-4.6-3.4-6.4A2.4 2.4 0 0 1 0-6.2 2.4 2.4 0 0 1 3.4-6.4C4.4-4.6 3.4-2.6 0 0z";

export const natureInkArt: Record<string, React.ReactNode> = {
  "🐶": (
    <>
      <path d="M6.2 9.6C6.2 6.2 8.6 4.6 12 4.6s5.8 1.6 5.8 5v4.2c0 3.6-2.4 6.2-5.8 6.2s-5.8-2.6-5.8-6.2z" />
      <path d="M6.4 6.8C3.6 6 2.4 8.8 2.8 13c.2 1.6 1.8 2.2 2.8.8M17.6 6.8C20.4 6 21.6 8.8 21.2 13c-.2 1.6-1.8 2.2-2.8.8" />
      {eyes(10.8, 3.2)}
      <ellipse cx="12" cy="14.2" rx="2.1" ry="1.5" fill="currentColor" stroke="none" />
      <path d="M12 15.6v1.4M9.8 17.6q2.2 1.8 4.4 0" />
    </>
  ),
  "🐱": (
    <>
      <path d="M3.8 9.4V3.8L8.6 6.6a9 9 0 0 1 6.8 0l4.8-2.8v5.6c.9 1.2 1.3 2.6 1.3 4 0 4.4-4 7.2-9.5 7.2s-9.5-2.8-9.5-7.2c0-1.4.4-2.8 1.3-4z" />
      {eyes(12.2, 3.8)}
      <path d="M10.8 14.6h2.4l-1.2 1.4z" fill="currentColor" strokeWidth="1" />
      <path d="M12 16v.8M9.8 17.6q1.1 1 2.2-.8 1.1 1.8 2.2.8" />
      <path d="M1.6 13.6l3.2.6M1.8 16.8l3-1M22.4 13.6l-3.2.6M22.2 16.8l-3-1" strokeWidth="1.25" />
    </>
  ),
  "🦊": (
    <>
      <path d="M2.8 3.6l5.6 3.6a9 9 0 0 1 7.2 0l5.6-3.6-.4 8.8L12 21 3.2 12.4z" />
      <path d="M3.2 12.4l5.8 3.2h6l5.8-3.2" />
      {eyes(11.4, 3.7)}
      {nose(19.4)}
    </>
  ),
  "🐻": (
    <>
      <path d={earArc(5.8, 5.6, 2.8, 12, 13, 8.6)} />
      <path d={earArc(18.2, 5.6, 2.8, 12, 13, 8.6)} />
      <circle cx="12" cy="13" r="8.6" />
      {eyes(11, 3.9)}
      <ellipse cx="12" cy="14.3" rx="1.8" ry="1.3" fill="currentColor" stroke="none" />
      <path d="M12 15.6v1.2M9.6 17.4q1.2 1.4 2.4-.6 1.2 2 2.4.6" />
    </>
  ),
  "🐼": (
    <>
      <circle cx="5.8" cy="5.6" r="2.8" fill="currentColor" />
      <circle cx="18.2" cy="5.6" r="2.8" fill="currentColor" />
      <circle cx="12" cy="13" r="8.6" />
      <ellipse cx="8.2" cy="11.4" rx="1.9" ry="2.5" transform="rotate(30 8.2 11.4)" fill="currentColor" stroke="none" />
      <ellipse cx="15.8" cy="11.4" rx="1.9" ry="2.5" transform="rotate(-30 15.8 11.4)" fill="currentColor" stroke="none" />
      {nose(15)}
      <path d="M12 16v.9M10 17.8q2 1.4 4 0" />
    </>
  ),
  "🐨": (
    <>
      <path d={earArc(4.6, 9.4, 3.8, 12, 13.4, 7.8)} />
      <path d={earArc(19.4, 9.4, 3.8, 12, 13.4, 7.8)} />
      <circle cx="12" cy="13.4" r="7.8" />
      <ellipse cx="12" cy="13.6" rx="1.9" ry="2.7" fill="currentColor" stroke="none" />
      {eyes(11.2, 4.2)}
      <path d="M10.2 18q1.8 1.2 3.6 0" />
    </>
  ),
  "🦁": (
    <>
      <path d={scallop(12, 12, 9.2, 11, 3.2)} />
      <circle cx="12" cy="12.4" r="5.6" />
      {eyes(11.2, 2.4, 1)}
      <path d="M10.8 13.6h2.4l-1.2 1.3z" fill="currentColor" strokeWidth="1" />
      <path d="M12 14.8v.8M10.4 16.2q1.6 1.2 1.6-.6 0 1.8 1.6.6" strokeWidth="1.4" />
    </>
  ),
  "🐸": (
    <>
      <circle cx="7.2" cy="8" r="3.4" />
      <circle cx="16.8" cy="8" r="3.4" />
      {dot(7.4, 8.4, 1.1)}
      {dot(16.6, 8.4, 1.1)}
      <path d="M4.4 10.6C3.2 11.6 2.6 12.8 2.6 14.2c0 3.8 4.2 6.4 9.4 6.4s9.4-2.6 9.4-6.4c0-1.4-.6-2.6-1.8-3.6" />
      {dot(10.6, 12.8, 0.8)}
      {dot(13.4, 12.8, 0.8)}
      <path d="M6.6 15.8q5.4 3.2 10.8 0" />
    </>
  ),
  "🐵": (
    <>
      <path d={earArc(3.8, 12.4, 2.6, 12, 12.6, 7.8)} />
      <path d={earArc(20.2, 12.4, 2.6, 12, 12.6, 7.8)} />
      <circle cx="12" cy="12.6" r="7.8" />
      <path d="M12 9.6c-1.2-1.6-3.2-1.4-4.2-.2-1 1.2-.6 3.2.6 4-1 .8-1.4 2-.8 3.2.8 1.8 3 2.8 4.4 2.8s3.6-1 4.4-2.8c.6-1.2.2-2.4-.8-3.2 1.2-.8 1.6-2.8.6-4-1-1.2-3-1.4-4.2.2z" />
      {eyes(11.4, 2.2, 1)}
      <path d="M10.4 16q1.6 1.2 3.2 0" />
    </>
  ),
  "🦄": (
    <>
      <path d="M11.2 8L16.4 1.8 15.8 10" />
      <path d="M13.6 5.2l2.4 1.1" strokeWidth="1.4" />
      <path d="M8.4 7.2L6.4 3l3.4 2.2" />
      <path d="M8.2 7.2c3.6-.4 7.2 1 9.4 4.2l2.4 3.2c1 1.6.4 3.6-1.4 3.8-1 .1-1.8-.3-2.6-1.1-1.2-1.2-2.6-1.6-4-1.2L13.2 21.4" />
      <path d="M8.2 7.2C5.8 8 5 10.4 5.4 12.6 4.2 13.6 4.2 15.2 5 16.2 4.2 17.4 4.6 18.8 5.6 19.6 5.4 20.4 5.6 21 6 21.4" />
      <path d="M6 21.4h7.2" />
      {dot(12.8, 11.2, 1.1)}
      {dot(18, 15.2, 0.8)}
    </>
  ),
  "🐝": (
    <>
      <ellipse cx="9.6" cy="6.8" rx="2.4" ry="3.8" transform="rotate(-24 9.6 6.8)" />
      <ellipse cx="15.2" cy="6.8" rx="2.4" ry="3.8" transform="rotate(24 15.2 6.8)" />
      <ellipse cx="12" cy="14.6" rx="7.4" ry="5.2" />
      <path d="M10 9.6v10M14 9.6v10" />
      <path d="M19.4 14.6h2.2" />
      {dot(6.8, 13.6, 1)}
    </>
  ),
  "🦋": (
    <>
      <g>
        <path d="M11.2 10.8C10.8 6.8 8 3.8 4.4 4.4 3.2 7.4 4.6 11 7.4 12.2z" />
        <path d="M11.2 13.2l-3.8.4c-2.4.8-2.6 4.2-.8 5.8 1.8 1.4 4 .6 4.6-1.8z" />
        {dot(7.6, 8, 1)}
      </g>
      <g transform="matrix(-1 0 0 1 24 0)">
        <path d="M11.2 10.8C10.8 6.8 8 3.8 4.4 4.4 3.2 7.4 4.6 11 7.4 12.2z" />
        <path d="M11.2 13.2l-3.8.4c-2.4.8-2.6 4.2-.8 5.8 1.8 1.4 4 .6 4.6-1.8z" />
        {dot(7.6, 8, 1)}
      </g>
      <path d="M12 9v10.4" />
      <path d="M12 9c-.2-1.8-1-3-2.2-3.6M12 9c.2-1.8 1-3 2.2-3.6" />
    </>
  ),
  "🐢": (
    <>
      <path d="M3 17.4C3 11.8 6.4 8.2 10.8 8.2s7.8 3.6 7.8 9.2z" />
      <path d="M10.8 11.4l2.8 2.1-1 3.9H9l-1-3.9z" />
      <path d="M10.8 11.4V8.4M13.6 13.5l2.8-1M7.8 13.5l-2.8-1" strokeWidth="1.4" />
      <path d="M6.2 17.4v2.6h3v-2.6M12.4 17.4v2.6h3v-2.6" />
      <path d="M18.4 15.4c.6-1.8 1.4-2.6 2.6-2.6 1.2 0 1.8 1 1.8 2.2 0 1.2-1 2.2-2.2 2.2h-2.2" />
      {dot(21, 14.2, 0.9)}
    </>
  ),
  "🐙": (
    <>
      <path d="M4.8 11.6V9.4a7.2 7.2 0 0 1 14.4 0v2.2c0 2.2-1.6 3.6-3.8 3.6H8.6c-2.2 0-3.8-1.4-3.8-3.6z" />
      {eyes(9.6, 2.8)}
      <path d="M6.6 15.2c-.2 2.4-1.6 3.6-3.4 4a1.5 1.5 0 0 0 1.4 2.4M10.2 15.2c.2 2.2-.2 3.8-1.4 5.2M13.8 15.2c-.2 2.2.2 3.8 1.4 5.2M17.4 15.2c.2 2.4 1.6 3.6 3.4 4a1.5 1.5 0 0 1-1.4 2.4" />
    </>
  ),
  "🐳": (
    <>
      <path d="M2.8 14.4c0-3.4 3-5.6 6.8-5.6 4 0 6.8 2.2 7.8 4.6l3.6-3.4c.4 2.8-.2 5.4-2 7.2-1.6 1.6-4 2.2-7.2 2.2-5.2 0-9-1.8-9-5z" />
      <path d="M9.4 8.8V5.4M9.4 5.4c-1.2 0-2.2-.8-2.6-1.8M9.4 5.4c1.2 0 2.2-.8 2.6-1.8" />
      <path d="M5 16.6q2.8.8 5.4.4" strokeWidth="1.4" />
      {dot(6.6, 12.4, 1)}
    </>
  ),
  "🌵": (
    <>
      <path d="M9.4 21V6.2a2.6 2.6 0 0 1 5.2 0V21" />
      <path d="M9.4 16.4H6.8a1.4 1.4 0 0 1-1.4-1.4V10.4a1.4 1.4 0 0 1 2.8 0v2.4h1.2" />
      <path d="M14.6 14h2.6a1.4 1.4 0 0 0 1.4-1.4V8.4a1.4 1.4 0 0 0-2.8 0v2h-1.2" />
      <path d="M6.4 21h11.2" />
      {dot(12, 8.8, 0.8)}
      {dot(12, 12.4, 0.8)}
      {dot(12, 16.4, 0.8)}
    </>
  ),
  "🌲": (
    <>
      <path d="M12 2.4L7.2 9.4h2.8L5.8 15.2h3.4L4.4 19h15.2l-4.8-3.8h3.4L14 9.4h2.8z" />
      <path d="M10.6 19v2.6h2.8V19" />
    </>
  ),
  "🌿": (
    <>
      <path d="M12 21.4V8.4" />
      <path d="M12 8.6C10.4 6.8 10.4 4.6 12 2.6c1.6 2 1.6 4.2 0 6z" />
      <path d="M12 14.4c0-3.4 2.4-5.6 6.2-6 .2 3.6-1.6 5.8-6.2 6z" />
      <path d="M12 18.4c0-3-2.2-5-5.6-5.4-.2 3 1.4 5 5.6 5.4z" />
    </>
  ),
  "🍀": (
    <>
      {[45, 135, 225, 315].map((deg) => (
        <path key={deg} transform={`translate(12 11) rotate(${deg}) scale(1.16)`} d={heartLeaf} strokeWidth="1.5" />
      ))}
      <path d="M12 11c0 4.4.8 7.2 3.6 9.8" />
    </>
  ),
  "🌸": (
    <>
      {[0, 72, 144, 216, 288].map((deg) => (
        <path
          key={deg}
          transform={`rotate(${deg} 12 12)`}
          d="M12 10.4C9 8.8 8.6 5.2 10.4 3.4L12 4.8l1.6-1.4C15.4 5.2 15 8.8 12 10.4z"
        />
      ))}
      {dot(12, 12, 1.2)}
    </>
  ),
  "🌻": (
    <>
      <path d={petalRing(12, 9.4, 8.2, 5.4, 10)} />
      <circle cx="12" cy="9.4" r="3" fill="currentColor" stroke="none" />
      <path d="M12 17.6V22M12 20.2c-.8-2.2-2.6-3-4.8-2.6.2 2.2 2.2 3.2 4.8 2.6z" />
    </>
  ),
  "🌈": (
    <>
      <path d="M2.6 17.6a9.4 9.4 0 0 1 18.8 0" />
      <path d="M6 17.6a6 6 0 0 1 12 0" />
      <path d="M9.4 17.6a2.6 2.6 0 0 1 5.2 0" />
    </>
  ),
  "☀": (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d={rays(12, 12, 7.6, 10, 8)} />
    </>
  ),
  "🌙": (
    <>
      <path d="M19.4 15.2A8.6 8.6 0 1 1 8.8 4.4a7.8 7.8 0 0 0 10.6 10.8z" />
      {dot(18.6, 5.4, 1)}
    </>
  ),
  "❄": (
    <>
      <path d={rays(12, 12, 0, 9.6, 6)} />
      <path d={Array.from({ length: 6 }, (_, i) => {
        const deg = 60 * i;
        const [bx, by] = polar(12, 12, 6.2, deg);
        const [lx, ly] = polar(bx, by, 2.8, deg - 55);
        const [rx, ry] = polar(bx, by, 2.8, deg + 55);
        return `M${lx} ${ly}L${bx} ${by}L${rx} ${ry}`;
      }).join("")} />
    </>
  ),
};

/** Short names of the drawn nature emoji (keyed by the emoji as the picker lists it, with its variation selector). */
export const natureInkNames: Record<string, string> = {
  "🐶": "Dog",
  "🐱": "Cat",
  "🦊": "Fox",
  "🐻": "Bear",
  "🐼": "Panda",
  "🐨": "Koala",
  "🦁": "Lion",
  "🐸": "Frog",
  "🐵": "Monkey",
  "🦄": "Unicorn",
  "🐝": "Bee",
  "🦋": "Butterfly",
  "🐢": "Turtle",
  "🐙": "Octopus",
  "🐳": "Whale",
  "🌵": "Cactus",
  "🌲": "Evergreen tree",
  "🌿": "Herb",
  "🍀": "Four leaf clover",
  "🌸": "Cherry blossom",
  "🌻": "Sunflower",
  "🌈": "Rainbow",
  "☀️": "Sun",
  "🌙": "Crescent moon",
  "❄️": "Snowflake",
};

/* ----- solid drawings (variants "solid" and "tint") ----- */

/** Two oval eye holes for the animal heads, and the blink that goes with them. */
const animalEyes = (y: number, dx: number, rx = 1.1, ry = 1.45) => pt("eye", "blink", [O(12 - dx, y, rx, ry), O(12 + dx, y, rx, ry)], undefined, true);
/** An animal head that hops (and blinks if it has eye parts). */
const head = (layers: InkSolid["layers"], origin = "12px 21px"): InkSolid => ({ layers, move: "hop", origin });
/** A ring (stroke) shape. */
const ring = (cx: number, cy: number, r: number, w: number): InkShape => Ring(cx, cy, r, r, w);
const BUTTERFLY_WING = [
  P("M11.2 10.8C10.8 6.8 8 3.8 4.4 4.4 3.2 7.4 4.6 11 7.4 12.2z", 1.6),
  P("M11.2 13.2l-3.8.4c-2.4.8-2.6 4.2-.8 5.8 1.8 1.4 4 .6 4.6-1.8z", 1.6),
];

/** Solid drawings of this category (variants "solid" and "tint"); see emoji-ink-solid-internal. */
export const natureSolidArt: Record<string, InkSolid> = {
  /* Dog: floppy ears behind the head (a paper gap), eyes and nose cut out. */
  "🐶": head([
    { body: [L("M6.6 6.9C3.8 6.1 2.6 8.9 3 13c.1 1.3 1.1 1.9 2 1.1M17.4 6.9c2.8-.8 4 2 3.6 6.1-.1 1.3-1.1 1.9-2 1.1", 3.4)] },
    {
      body: [P("M6.2 9.6C6.2 6.2 8.6 4.6 12 4.6s5.8 1.6 5.8 5v4.2c0 3.6-2.4 6.2-5.8 6.2s-5.8-2.6-5.8-6.2z", 1.75)],
      cuts: [...animalEyes(10.6, 3.2), O(12, 14.2, 2.1, 1.5), L("M12 15.6v1.4M9.8 17.6q2.2 1.8 4.4 0", 1.3)],
      key: 1,
    },
  ]),
  /* Cat: ears in the silhouette (inner ears take the tint), whiskers cut into the cheeks. */
  "🐱": head([
    {
      body: [P("M3.8 9.4V3.8L8.6 6.6a9 9 0 0 1 6.8 0l4.8-2.8v5.6c.9 1.2 1.3 2.6 1.3 4 0 4.4-4 7.2-9.5 7.2s-9.5-2.8-9.5-7.2c0-1.4.4-2.8 1.3-4z", 1.75)],
      cuts: [
        ...animalEyes(12, 3.8, 1.15, 1.6),
        P("M10.8 14.6h2.4l-1.2 1.4z", 0.8),
        L("M12 16v.8M9.8 17.6q1.1 1 2.2-.8 1.1 1.8 2.2.8", 1.2),
        L("M3.9 13.5l2.4.5M4.2 16.4l2.3-.8M20.1 13.5l-2.4.5M19.8 16.4l-2.3-.8", 1.1),
        soft(P("M5.2 6.4v2.4l2-1.2z", 0.5)),
        soft(P("M18.8 6.4v2.4l-2-1.2z", 0.5)),
      ],
    },
  ]),
  /* Fox: a pointed head, the light muzzle cut out, the nose given back. */
  "🦊": head([
    {
      body: [P("M2.8 3.6l5.6 3.6a9 9 0 0 1 7.2 0l5.6-3.6-.4 8.8L12 21 3.2 12.4z", 1.75)],
      cuts: [...animalEyes(10.4, 3.7, 1.1, 1.45), soft(P("M3.4 12.6l5.6 3.2h6l5.6-3.2L12 21.8z", 0.6)), soft(P("M4.4 5.4l3 2-2.6 2.4z", 0.5)), soft(P("M19.6 5.4l-3 2 2.6 2.4z", 0.5))],
      restore: [O(12, 19.2, 1.5, 1.05)],
    },
  ]),
  /* Bear: round ears, a light muzzle with the nose and mouth in ink. */
  "🐻": head([
    {
      body: [C(5.8, 5.6, 2.9), C(18.2, 5.6, 2.9), C(12, 13, 8.6)],
      cuts: [...animalEyes(10.8, 3.9), soft(O(12, 15.5, 3.8, 3)), soft(C(5.8, 5.6, 1.2)), soft(C(18.2, 5.6, 1.2))],
      restore: [O(12, 14.3, 1.8, 1.3), L("M12 15.6v1.2M9.8 17.2q1.1 1.2 2.2-.4 1.1 1.6 2.2.4", 1.1)],
    },
  ]),
  /* Panda: the one white face of the set (a thick rim with the face cut out), ink ears, patches and nose in front. */
  "🐼": head([
    { body: [C(5.8, 5.6, 2.9), C(18.2, 5.6, 2.9), C(12, 13, 8.6)], cuts: [soft(C(12, 13, 7.2))] },
    {
      body: [O(8.3, 11.6, 2, 2.6, 30), O(15.7, 11.6, 2, 2.6, -30), O(12, 15.1, 1.6, 1.1), L("M12 16v.9M10 17.8q2 1.4 4 0", 1.3)],
      cuts: pt("eye", "blink", [C(8.6, 11.2, 0.75), C(15.4, 11.2, 0.75)], undefined, true),
      key: 0,
    },
  ]),
  /* Koala: big round ears, the dark nose keyed in front of the face. */
  "🐨": head([
    {
      body: [C(4.6, 9.4, 3.9), C(19.4, 9.4, 3.9), C(12, 13.4, 7.8)],
      cuts: [...animalEyes(10.8, 4.2, 1.05, 1.4), soft(C(4.6, 9.4, 1.9)), soft(C(19.4, 9.4, 1.9)), L("M10.2 18.2q1.8 1.2 3.6 0", 1.3)],
    },
    { body: [O(12, 13.8, 2, 2.8)], key: 0.9 },
  ]),
  /* Lion: the face keyed in front of the scalloped mane. */
  "🦁": head([
    { body: [P(scallop(12, 12, 9.2, 11, 3.2), 0.8)] },
    {
      body: [C(12, 12.4, 5.8)],
      cuts: [...animalEyes(11, 2.4, 0.95, 1.25), P("M10.8 13.6h2.4l-1.2 1.3z", 0.7), L("M12 14.8v.8M10.4 16.2q1.6 1.2 1.6-.6 0 1.8 1.6.6", 1.1)],
      key: 1,
    },
  ]),
  /* Frog: eye bumps with paper whites and ink pupils, nostrils and the wide mouth cut out. */
  "🐸": head([
    {
      body: [C(7.2, 8, 3.5), C(16.8, 8, 3.5), P("M2.6 14.2c0-3.6 4.2-6 9.4-6s9.4 2.4 9.4 6c0 3.8-4.2 6.4-9.4 6.4s-9.4-2.6-9.4-6.4z", 1)],
      cuts: [C(7.2, 8, 2.1), C(16.8, 8, 2.1), C(10.6, 12.8, 0.7), C(13.4, 12.8, 0.7), L("M6.6 15.8q5.4 3.2 10.8 0", 1.4)],
      restore: pt("eye", "blink", [C(7.4, 8.4, 1.1), C(16.6, 8.4, 1.1)], undefined, true),
    },
  ]),
  /* Monkey: ears and head in ink, the light face cut out, eyes and mouth in ink inside it. */
  "🐵": head([
    {
      body: [C(3.8, 12.4, 2.7), C(20.2, 12.4, 2.7), C(12, 12.6, 7.8)],
      cuts: [
        soft(P("M12 9.6c-1.2-1.6-3.2-1.4-4.2-.2-1 1.2-.6 3.2.6 4-1 .8-1.4 2-.8 3.2.8 1.8 3 2.8 4.4 2.8s3.6-1 4.4-2.8c.6-1.2.2-2.4-.8-3.2 1.2-.8 1.6-2.8.6-4-1-1.2-3-1.4-4.2.2z", 0.5)),
        soft(C(3.8, 12.4, 1.1)),
        soft(C(20.2, 12.4, 1.1)),
      ],
      restore: [...pt("eye", "blink", [C(9.8, 11.4, 1), C(14.2, 11.4, 1)], undefined, true), L("M10.4 16q1.6 1.2 3.2 0", 1.2)],
    },
  ]),
  /* Unicorn: the head in profile, the ear in the silhouette, the horn keyed in front. */
  "🦄": {
    layers: [
      {
        body: [
          P("M8.2 7.2c3.6-.4 7.2 1 9.4 4.2l2.4 3.2c1 1.6.4 3.6-1.4 3.8-1 .1-1.8-.3-2.6-1.1-1.2-1.2-2.6-1.6-4-1.2L13.2 21.4H6c-.4-.4-.6-1-.4-1.8-1-.8-1.4-2.2-.6-3.4-.8-1-.8-2.6.4-3.6C5 10.4 5.8 8 8.2 7.2z", 1.2),
          P("M8.4 7.4L6.4 3l3.4 2.2z", 0.8),
        ],
        cuts: [pt("eye", "blink", C(12.8, 11.2, 1.1), undefined, true), C(18, 15.2, 0.75), soft(L("M8.8 8.6c-1.6 1.2-2 3.4-1.4 5.4-.8 1.2-.6 2.6.2 3.6", 1.2))],
      },
      { body: [P("M11.6 7.8L16.4 1.8 15.6 9.6z", 0.9)], cuts: [soft(L("M13.4 5.6l2.2 1", 1))], key: 0.9 },
    ],
    move: "nod",
    origin: "9px 21px",
  },
  /* Bee: outlined wings behind, the striped body keyed in front; the wings flap and the bee buzzes. */
  "🐝": {
    layers: [
      { body: [{ t: "ellipse", a: { cx: 9.6, cy: 6.8, rx: 2.4, ry: 3.8 }, w: 1.6, tf: "rotate(-24 9.6 6.8)" }, { t: "ellipse", a: { cx: 15.2, cy: 6.8, rx: 2.4, ry: 3.8 }, w: 1.6, tf: "rotate(24 15.2 6.8)" }], part: { name: "wings", move: "flap", origin: "12px 10px" } },
      { body: [O(12, 14.6, 7.4, 5.2), L("M19.4 14.6h2.4", 1.9)], cuts: [L("M10 9v11.4M14 9v11.4", 1.6), C(6.8, 13.6, 1)], key: 1 },
    ],
    move: "buzz",
    origin: "12px 14px",
  },
  /* Butterfly: four wings with their spots cut out, the body keyed in front; the wings flap. */
  "🦋": {
    layers: [
      {
        body: [...BUTTERFLY_WING, { t: "g", tf: "matrix(-1 0 0 1 24 0)", kids: BUTTERFLY_WING }],
        cuts: [C(7.6, 8, 1.15), C(16.4, 8, 1.15), soft(C(8.6, 16.4, 0.9)), soft(C(15.4, 16.4, 0.9))],
        part: { name: "wings", move: "flap-x", origin: "12px 12px" },
      },
      { body: [L("M12 9.2v10.2", 2.2)], key: 0.8 },
    ],
    lines: [L("M12 9c-.2-1.8-1-3-2.2-3.6M12 9c.2-1.8 1-3 2.2-3.6", 1.4)],
  },
  /* Turtle: a domed shell with its plates cut (tinted in tint), legs and head apart from it. */
  "🐢": {
    layers: [
      {
        body: [P("M3 17.4C3 11.8 6.4 8.2 10.8 8.2s7.8 3.6 7.8 9.2z", 1.75), R(6.1, 18.4, 3.2, 2.6, 0.9), R(12.3, 18.4, 3.2, 2.6, 0.9), P("M18.4 15.4c.6-1.8 1.4-2.6 2.6-2.6 1.2 0 1.8 1 1.8 2.2 0 1.2-1 2.2-2.2 2.2h-2.2z", 1.4)],
        cuts: [soft(L("M10.8 11.4l2.8 2.1-1 3.9H9l-1-3.9zM10.8 11.4V8.6M13.6 13.5l2.8-1M8 13.5l-2.8-1", 1.2)), L("M2 18.5h17.4", 1.1), C(21, 14.3, 0.75)],
      },
    ],
    move: "crawl",
    origin: "12px 20px",
  },
  "🐙": {
    layers: [
      {
        body: [
          P("M4.8 11.6V9.4a7.2 7.2 0 0 1 14.4 0v2.2c0 2.2-1.6 3.6-3.8 3.6H8.6c-2.2 0-3.8-1.4-3.8-3.6z", 1.75),
          L("M6.6 15.2c-.2 2.4-1.6 3.6-3.4 4a1.5 1.5 0 0 0 1.4 2.4M10.2 15.2c.2 2.2-.2 3.8-1.4 5.2M13.8 15.2c-.2 2.2.2 3.8 1.4 5.2M17.4 15.2c.2 2.4 1.6 3.6 3.4 4a1.5 1.5 0 0 1-1.4 2.4", 2.3),
        ],
        cuts: [...pt("eye", "blink", [O(9.2, 9.6, 1.1, 1.45), O(14.8, 9.6, 1.1, 1.45)], undefined, true)],
      },
    ],
    move: "float",
    origin: "12px 12px",
  },
  /* Whale: the body with a belly line and an eye cut out, the spout above. */
  "🐳": {
    layers: [
      {
        body: [P("M2.8 14.4c0-3.4 3-5.6 6.8-5.6 4 0 6.8 2.2 7.8 4.6l3.6-3.4c.4 2.8-.2 5.4-2 7.2-1.6 1.6-4 2.2-7.2 2.2-5.2 0-9-1.8-9-5z", 1.75)],
        cuts: [C(6.6, 12.4, 1), soft(L("M5 16.6q2.8.8 5.4.4", 1.3))],
      },
    ],
    lines: [pt("spout", "burst", L("M9.4 7.6V5.4M9.4 5.4c-1.2 0-2.2-.8-2.6-1.8M9.4 5.4c1.2 0 2.2-.8 2.6-1.8", 1.7), "9.4px 7.6px")],
    move: "rock",
    origin: "12px 14px",
  },
  /* Cactus: a capsule trunk and arms, spines cut out. */
  "🌵": {
    layers: [
      {
        body: [L("M12 21V6.6", 5.2), L("M9.8 15.4H7.6c-.9 0-1.4-.6-1.4-1.4v-3.2M14.2 12.8h2.2c.9 0 1.4-.6 1.4-1.4V8.4", 2.8), L("M6.4 21.4h11.2", 1.8)],
        cuts: [soft(C(12, 8.8, 0.75)), soft(C(12, 12.4, 0.75)), soft(C(12, 16.4, 0.75))],
      },
    ],
    move: "sway",
    origin: "12px 21px",
  },
  "🌲": {
    layers: [{ body: [P("M12 2.4L7.2 9.4h2.8L5.8 15.2h3.4L4.4 19h15.2l-4.8-3.8h3.4L14 9.4h2.8z", 1.5), R(10.7, 20.4, 2.6, 2.4, 0.5)], cuts: [soft(L("M9.8 9.8L12 8.4l2.2 1.4M9.2 15.6l2.8-1.6 2.8 1.6", 1))] }],
    move: "sway",
    origin: "12px 22px",
  },
  "🌿": {
    layers: [
      {
        body: [L("M12 21.4V8.4", 1.8), P("M12 8.6C10.4 6.8 10.4 4.6 12 2.6c1.6 2 1.6 4.2 0 6z", 1.3), P("M12 14.4c0-3.4 2.4-5.6 6.2-6 .2 3.6-1.6 5.8-6.2 6z", 1.3), P("M12 18.4c0-3-2.2-5-5.6-5.4-.2 3 1.4 5 5.6 5.4z", 1.3)],
        cuts: [soft(L("M12 7.6V4.4M13.4 12.6l3.2-2.4M10.6 16.6L7.8 14.6", 0.9))],
      },
    ],
    move: "sway",
    origin: "12px 21px",
  },
  "🍀": {
    layers: [
      {
        body: [...[45, 135, 225, 315].map((deg) => P(heartLeaf, 1.3, `translate(12 11) rotate(${deg}) scale(1.16)`)), L("M12 11c0 4.4.8 7.2 3.6 9.8", 1.8)],
        cuts: [L("M12 11V5.2M12 11v2.4M12 11H6.2M12 11h5.8", 1.1)],
      },
    ],
    move: "sway",
    origin: "15px 21px",
  },
  "🌸": {
    layers: [
      {
        body: [0, 72, 144, 216, 288].map((deg) => P("M12 10.4C9 8.8 8.6 5.2 10.4 3.4L12 4.8l1.6-1.4C15.4 5.2 15 8.8 12 10.4z", 1.6, `rotate(${deg} 12 12)`)),
        cuts: [C(12, 12, 1.6), soft(L([0, 72, 144, 216, 288].map((deg) => { const a = (deg * Math.PI) / 180; return `M${(12 + 2.4 * Math.sin(a)).toFixed(2)} ${(12 - 2.4 * Math.cos(a)).toFixed(2)}L${(12 + 5.2 * Math.sin(a)).toFixed(2)} ${(12 - 5.2 * Math.cos(a)).toFixed(2)}`; }).join(""), 0.9))],
      },
    ],
    move: "twinkle",
    origin: "12px 12px",
  },
  /* Sunflower: petals around a seed head, a paper ring between them; the stem and leaf below. */
  "🌻": {
    layers: [
      {
        body: [P(petalRing(12, 9.4, 8.2, 5.4, 10), 1.2), L("M12 17.6V22", 1.8), P("M12 20.2c-.8-2.2-2.6-3-4.8-2.6.2 2.2 2.2 3.2 4.8 2.6z", 1)],
        cuts: [ring(12, 9.4, 3.9, 1.1), soft(C(11, 8.6, 0.6)), soft(C(13, 8.8, 0.6)), soft(C(11.8, 10.6, 0.6))],
      },
    ],
    move: "sway",
    origin: "12px 22px",
  },
  /* Rainbow: three bands that draw on in turn (the middle one takes the tint). */
  "🌈": {
    layers: [],
    lines: [
      pt("band", "swipe", pl(L("M2.6 17.6a9.4 9.4 0 0 1 18.8 0", 2.3))),
      pt("band", "swipe", soft(pl(L("M6.1 17.6a5.9 5.9 0 0 1 11.8 0", 2.3))), undefined, false, 1),
      pt("band", "swipe", pl(L("M9.6 17.6a2.4 2.4 0 0 1 4.8 0", 2.3)), undefined, false, 2),
    ],
  },
  "☀": { layers: [{ body: [C(12, 12, 4.8), L(rays(12, 12, 7.8, 10, 8), 2)] }], move: "spin-45", origin: "12px 12px" },
  "🌙": { layers: [{ body: [P("M19.4 15.2A8.6 8.6 0 1 1 8.8 4.4a7.8 7.8 0 0 0 10.6 10.8z", 1.75)] }], dots: [pt("spark", "spark", C(18.6, 5.4, 1.2), "18.6px 5.4px")], move: "rock", origin: "11px 13px" },
  "❄": {
    layers: [
      {
        body: [
          L(rays(12, 12, 0, 9.6, 6), 2),
          L(Array.from({ length: 6 }, (_, i) => {
            const deg = 60 * i;
            const [bx, by] = polar(12, 12, 6.2, deg);
            const [lx, ly] = polar(bx, by, 2.8, deg - 55);
            const [rx, ry] = polar(bx, by, 2.8, deg + 55);
            return `M${lx} ${ly}L${bx} ${by}L${rx} ${ry}`;
          }).join(""), 2),
          C(12, 12, 2.4),
        ],
        cuts: [C(12, 12, 1)],
      },
    ],
    move: "spin-60",
    origin: "12px 12px",
  },
};
