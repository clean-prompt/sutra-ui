import * as React from "react";
import { dot } from "./emoji-ink-parts-internal";

/** Ink drawings for the activities category (see emoji-ink-parts-internal for the shared parts and the style rules). */

const n = (value: number) => Number(value.toFixed(2));
/** A point at `radius` and `deg` degrees (0 = up, clockwise) around (cx, cy). */
const polar = (cx: number, cy: number, radius: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [n(cx + radius * Math.sin(a)), n(cy - radius * Math.cos(a))];
};

/** A wavy line of `waves` equal humps from (x, y) to (x + width, y). */
const wave = (x: number, y: number, width: number, waves: number, amp = 1.2): string => {
  const w = width / waves;
  return `M${x} ${y}${Array.from({ length: waves }, (_, i) => `c${n(w * 0.25)} ${i % 2 === 0 ? amp : -amp} ${n(w * 0.75)} ${i % 2 === 0 ? amp : -amp} ${n(w)} 0`).join("")}`;
};

/** The black pentagon of the football, the seams that run from its corners and the branches that reach the edge. */
const footballPatch = (() => {
  const corners = Array.from({ length: 5 }, (_, i) => polar(12, 12, 3.4, 72 * i));
  const pentagon = `M${corners.map((p) => `${p[0]} ${p[1]}`).join("L")}z`;
  const seams = Array.from({ length: 5 }, (_, i) => {
    const from = polar(12, 12, 3.4, 72 * i);
    const mid = polar(12, 12, 6.2, 72 * i);
    const left = polar(12, 12, 9.3, 72 * i - 30);
    const right = polar(12, 12, 9.3, 72 * i + 30);
    return `M${from[0]} ${from[1]}L${mid[0]} ${mid[1]}M${left[0]} ${left[1]}L${mid[0]} ${mid[1]}L${right[0]} ${right[1]}`;
  }).join("");
  return { pentagon, seams };
})();

/** One arm of the volleyball's pinwheel, from the centre to the edge. */
const volleyArm = "M12 12C11.2 8.8 13 6 17.4 4.3";

export const activityInkArt: Record<string, React.ReactNode> = {
  "⚽": (
    <>
      <circle cx="12" cy="12" r="9.4" />
      <path d={footballPatch.pentagon} fill="currentColor" strokeWidth="1" />
      <path d={footballPatch.seams} />
    </>
  ),
  "🏀": (
    <>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M12 2.6v18.8M2.6 12h18.8" />
      <path d="M5.2 5.2c3.6 3.4 3.6 10.2 0 13.6M18.8 5.2c-3.6 3.4-3.6 10.2 0 13.6" />
    </>
  ),
  "🏈": (
    <g transform="rotate(-42 12 12)">
      <path d="M1.8 12C5.4 5.2 18.6 5.2 22.2 12c-3.6 6.8-16.8 6.8-20.4 0z" />
      <path d="M9.2 12h5.6M10.4 10.4v3.2M12 10v4M13.6 10.4v3.2" strokeWidth="1.4" />
      <path d="M5.4 9.6c-.4 1.6-.4 3.2 0 4.8M18.6 9.6c.4 1.6.4 3.2 0 4.8" strokeWidth="1.4" />
    </g>
  ),
  "⚾": (
    <>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M6.2 4.6c2.6 3.4 2.6 11.4 0 14.8M17.8 4.6c-2.6 3.4-2.6 11.4 0 14.8" />
      <path d="M8.2 8l-2 .8M8.8 11.4l-2.2.2M8.8 14.2l-2.2-.4M8 17l-1.8-.8M15.8 8l2 .8M15.2 11.4l2.2.2M15.2 14.2l2.2-.4M16 17l1.8-.8" strokeWidth="1.2" />
    </>
  ),
  "🎾": (
    <>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M4.6 6.2c5 1.8 5 10 .2 11.8M19.4 6.2c-5 1.8-5 10-.2 11.8" />
    </>
  ),
  "🏐": (
    <>
      <circle cx="12" cy="12" r="9.4" />
      {[0, 120, 240].map((deg) => (
        <path key={deg} d={volleyArm} transform={`rotate(${deg} 12 12)`} />
      ))}
    </>
  ),
  "🏓": (
    <>
      <circle cx="9.8" cy="9.8" r="7" />
      <rect x="-1.9" y="0" width="3.8" height="6.2" rx="1.5" transform="translate(14.6 14.6) rotate(-45)" />
      <path d="M5.6 7.6C6.6 5.8 8.2 5 10 5" strokeWidth="1.3" />
      {dot(19.4, 5, 2.2)}
    </>
  ),
  "🏸": (
    <g transform="rotate(40 12 12)">
      <circle cx="12" cy="19.2" r="2.4" />
      <path d="M10.4 17.2L6.2 4.6q5.8-1.8 11.6 0l-4.2 12.6" />
      <path d="M12 16.8V5.2M9 15.2L8 5.2M15 15.2l1-10" strokeWidth="1.3" />
    </g>
  ),
  "🏏": (
    <>
      <g transform="rotate(40 11 12)">
        <rect x="7.8" y="9.2" width="6.4" height="11.4" rx="1.6" />
        <path d="M11 2.8v6.4" />
      </g>
      {dot(19.4, 18.4, 2.1)}
    </>
  ),
  "⛳": (
    <>
      <ellipse cx="12" cy="19.4" rx="9" ry="2.6" />
      <path d="M12 19V3.2" />
      <path d="M12 3.4l7.2 3.4L12 10.2" />
      {dot(17, 17.8, 1.2)}
    </>
  ),
  "🏊": (
    <>
      {dot(17, 6.6, 2)}
      <path d="M3.6 13.8c3-.2 5.8-1.2 8-3.2l2.8-2.6" />
      <path d="M12 10.6l2.6 1.4" />
      <path d={wave(2.6, 17.4, 18.8, 4, 1.3)} />
      <path d={wave(2.6, 21, 18.8, 4, 1.3)} />
    </>
  ),
  "🚴": (
    <>
      <circle cx="5.4" cy="17" r="3.4" />
      <circle cx="18.6" cy="17" r="3.4" />
      <path d="M5.4 17l4-6.4h6.6l2.6 6.4M9.4 10.6L11.6 17l4.4-6.4" />
      <path d="M9.4 10.2L12 6.6l4.4 2.6" />
      {dot(12.6, 3.8, 1.7)}
    </>
  ),
  "🧘": (
    <>
      {dot(12, 4.6, 2.1)}
      <path d="M8.6 10.6c0-1.8 1.2-2.8 3.4-2.8s3.4 1 3.4 2.8v5.2H8.6z" />
      <path d="M8.6 10.6L5.2 15.8M15.4 10.6l3.4 5.2" />
      <ellipse cx="8.6" cy="19" rx="6" ry="2.1" transform="rotate(-12 8.6 19)" />
      <ellipse cx="15.4" cy="19" rx="6" ry="2.1" transform="rotate(12 15.4 19)" />
    </>
  ),
  "🏋": (
    <>
      <path d="M2.6 12h18.8" />
      <rect x="5.2" y="5.6" width="3" height="12.8" rx="1.2" />
      <rect x="15.8" y="5.6" width="3" height="12.8" rx="1.2" />
      <path d="M2.6 9.6v4.8M21.4 9.6v4.8" />
    </>
  ),
  "🎯": (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="5.2" />
      {dot(12, 12, 1.6)}
      <path d="M12 12L20.4 3.6M20.4 3.6l.2-2.2M20.4 3.6l2.2-.2" />
    </>
  ),
  "🎮": (
    <>
      <path d="M7 7.4h10c2.8 0 4.4 2.4 4.8 5.2l.8 4.8c.2 1.6-.8 2.6-2.2 2.6-1 0-1.8-.6-2.4-1.4l-1.6-2.2H8.8l-1.6 2.2c-.6.8-1.4 1.4-2.4 1.4-1.4 0-2.4-1-2.2-2.6l.8-4.8C2.6 9.8 4.2 7.4 7 7.4z" />
      <path d="M7.4 10.4v3.6M5.6 12.2h3.6" />
      {dot(16, 11, 1.1)}
      {dot(18.4, 13.2, 1.1)}
    </>
  ),
  "🎲": (
    <g transform="rotate(-10 12 12)">
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3.6" />
      {dot(8.4, 8.4, 1.3)}
      {dot(15.6, 8.4, 1.3)}
      {dot(12, 12, 1.3)}
      {dot(8.4, 15.6, 1.3)}
      {dot(15.6, 15.6, 1.3)}
    </g>
  ),
  "🧩": (
    <path d="M3.6 7.6h4.2A2.5 2.5 0 1 1 12.8 7.6h4.6v4.2a2.5 2.5 0 1 1 0 5v4.4H12.8a2.5 2.5 0 1 0-5 0H3.6v-4.4a2.5 2.5 0 1 0 0-5z" />
  ),
  "🎨": (
    <>
      <path d="M12 3C6.6 3 2.6 6.8 2.6 11.8c0 4.6 3.6 8 8 8 1.8 0 2.2-1 2.2-2 0-1.6 1.2-2.2 2.4-2.2h2.2c3 0 5-1.8 5-4.6C22.4 6.6 17.8 3 12 3z" />
      {dot(7.2, 11.2, 1.3)}
      {dot(10, 7.4, 1.3)}
      {dot(15, 7.4, 1.3)}
      {dot(18, 11, 1.3)}
    </>
  ),
  "🎸": (
    <g transform="rotate(40 12 12)">
      <path d="M9.6 12.6a2.8 2.8 0 0 1 4.8 0c.6 1.2 2.6 2 2.8 4.4.4 2.8-1.6 4.6-5.2 4.6s-5.6-1.8-5.2-4.6c.2-2.4 2.2-3.2 2.8-4.4z" />
      <circle cx="12" cy="16.8" r="1.6" />
      <path d="M10.9 10.6V4.2M13.1 10.6V4.2M10.2 4.2V1.8h3.6v2.4" />
    </g>
  ),
  "🎧": (
    <>
      <path d="M5.5 13.6V12a6.5 6.5 0 0 1 13 0v1.6" />
      <rect x="3" y="13.6" width="5" height="7.4" rx="2" />
      <rect x="16" y="13.6" width="5" height="7.4" rx="2" />
    </>
  ),
  "🎬": (
    <>
      <path d="M3.4 10.6h17.2v8.8a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6z" />
      <path d="M3.2 10.6L2.6 6.6 20.4 3.2l.8 4.2-.2 3.2z" />
      <path d="M8 9.6L7.4 5.6M13.4 8.6l-.6-3.8M18.6 7.6l-.4-3.4" strokeWidth="1.4" />
    </>
  ),
  "🏆": (
    <>
      <path d="M7.2 3.4h9.6v6a4.8 4.8 0 0 1-9.6 0z" />
      <path d="M7.2 5.4H4.4v1.6a3.4 3.4 0 0 0 3.2 3.4M16.8 5.4h2.8v1.6a3.4 3.4 0 0 1-3.2 3.4" />
      <path d="M12 14.2v3.6" />
      <path d="M8.6 17.8h6.8V21H8.6z" />
    </>
  ),
  "🥇": (
    <>
      <circle cx="12" cy="14.6" r="6.2" />
      <path d="M7.4 2.8l3.4 6.4M16.6 2.8l-3.4 6.4M7.4 2.8h9.2" />
      <path d="M10.4 13.2l1.9-1.4v5.6" />
    </>
  ),
};

/** Short names of the drawn activities emoji (keyed by the emoji as the picker lists it, with its variation selector). */
export const activityInkNames: Record<string, string> = {
  "⚽": "Soccer ball",
  "🏀": "Basketball",
  "🏈": "American football",
  "⚾": "Baseball",
  "🎾": "Tennis ball",
  "🏐": "Volleyball",
  "🏓": "Ping pong",
  "🏸": "Badminton",
  "🏏": "Cricket",
  "⛳": "Golf",
  "🏊": "Swimming",
  "🚴": "Cycling",
  "🧘": "Yoga",
  "🏋️": "Weight lifting",
  "🎯": "Target",
  "🎮": "Game controller",
  "🎲": "Dice",
  "🧩": "Puzzle piece",
  "🎨": "Art palette",
  "🎸": "Guitar",
  "🎧": "Headphones",
  "🎬": "Clapper board",
  "🏆": "Trophy",
  "🥇": "Gold medal",
};
