import * as React from "react";
import { dot, Face, starPath } from "./emoji-ink-parts-internal";

/*
 * Ink drawings for the smileys category (see emoji-ink-parts-internal for the shared parts and the style rules). The faces
 * are composed from the small helpers below (eyes, mouths, tears, hearts), so that they read as one family with the base set.
 */

/* ----- eyes ----- */

/** Two round pupils (the base set's eyes). */
const eyes = (y = 9.6, r = 1.1) => (
  <>
    {dot(8.6, y, r)}
    {dot(15.4, y, r)}
  </>
);
/** Two tall oval pupils (wide open eyes). */
const tallEyes = () => (
  <>
    <ellipse cx="8.6" cy="9.4" rx="1.15" ry="1.9" fill="currentColor" stroke="none" />
    <ellipse cx="15.4" cy="9.4" rx="1.15" ry="1.9" fill="currentColor" stroke="none" />
  </>
);
/** Closed, smiling eyes: two arches. */
const archEyes = (y = 10.6) => <path d={`M6.7 ${y}q1.7-2.6 3.8 0M13.5 ${y}q1.7-2.6 3.8 0`} />;
/** Peaceful closed eyes: two cups. */
const cupEyes = (y = 9.8) => <path d={`M6.7 ${y}q1.8 1.9 3.6 0M13.7 ${y}q1.8 1.9 3.6 0`} />;
/** Squeezed shut with laughter: two chevrons. */
const squintEyes = (y = 10.1) => (
  <path d={`M6.6 ${y - 1.8}l3.2 1.8-3.2 1.8M17.4 ${y - 1.8}l-3.2 1.8 3.2 1.8`} />
);
/** A star-shaped pupil, solid. */
const starEye = (cx: number, cy: number) => <path d={starPath(cx, cy, 3.3, 1.5)} fill="currentColor" strokeWidth="1" />;

/* ----- mouths ----- */

const smile = "M8 14.2q4 3.6 8 0";
const grin = "M7.6 13.4h8.8c0 2.9-2 4.9-4.4 4.9s-4.4-2-4.4-4.9z";
const wideGrin = "M6.5 12.9h11c0 3.3-2.4 5.7-5.5 5.7s-5.5-2.4-5.5-5.7z";
const teeth = "M6.9 15.5h10.2";

/* ----- extras ----- */

/** A small solid drop (tear, sweat) with its top at (x, y). */
const drop = (x: number, y: number) => (
  <path transform={`translate(${x} ${y})`} d="M0 0c-1 1.3-1.4 2-1.4 2.7a1.4 1.4 0 0 0 2.8 0c0-.7-.4-1.4-1.4-2.7z" fill="currentColor" strokeWidth="1" />
);
/** A small solid heart centred on (cx, cy). */
const miniHeart = (cx: number, cy: number, scale = 0.72) => (
  <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
    <path d="M0 2.6C-1.6 1.6-3 .4-3-1.1a1.6 1.6 0 0 1 3-.7 1.6 1.6 0 0 1 3 .7C3 .4 1.6 1.6 0 2.6z" fill="currentColor" strokeWidth="1.4" />
  </g>
);

const point = (degrees: number) => {
  const angle = (degrees * Math.PI) / 180;
  return `${(12 + 9.5 * Math.cos(angle)).toFixed(2)} ${(12 + 9.5 * Math.sin(angle)).toFixed(2)}`;
};
/** The face circle with a gap between two angles (degrees, clockwise from three o'clock) for a halo, a hat or sleep marks. */
const GappedFace = ({ from, to }: { from: number; to: number }) => (
  <path d={`M${point(to)}A9.5 9.5 0 ${360 - (to - from) > 180 ? 1 : 0} 1 ${point(from)}`} />
);

/* ----- the faces ----- */

export const smileyInkArt: Record<string, React.ReactNode> = {
  "😀": (
    <>
      <Face />
      {eyes()}
      <path d={grin} />
    </>
  ),
  "😃": (
    <>
      <Face />
      {tallEyes()}
      <path d={grin} />
    </>
  ),
  "😄": (
    <>
      <Face />
      {archEyes()}
      <path d={grin} />
    </>
  ),
  "😁": (
    <>
      <Face />
      {archEyes()}
      <path d={wideGrin} />
      <path d={teeth} />
    </>
  ),
  "😆": (
    <>
      <Face />
      {squintEyes()}
      <path d={wideGrin} />
      <path d={teeth} />
    </>
  ),
  "😅": (
    <>
      <Face />
      {eyes(11)}
      <path d="M8.4 14.8h7.2c0 2.3-1.6 3.9-3.6 3.9s-3.6-1.6-3.6-3.9z" />
      <g transform="translate(17.2 5.6) scale(0.85)">{drop(0, 0)}</g>
    </>
  ),
  "🤣": (
    <g transform="rotate(-72 12 12)">
      <Face />
      {squintEyes(9.2)}
      <path d="M7.4 13.2h9.2c0 3.1-2.1 5.2-4.6 5.2s-4.6-2.1-4.6-5.2z" />
    </g>
  ),
  "🙂": (
    <>
      <Face />
      {eyes()}
      <path d={smile} />
    </>
  ),
  "😉": (
    <>
      <Face />
      {dot(8.6, 9.8)}
      <path d="M13.4 10.6q2-2.8 4 0" />
      <path d={smile} />
    </>
  ),
  "😊": (
    <>
      <Face />
      {archEyes()}
      <path d={smile} />
      <path d="M5.2 13.6h2.2M16.6 13.6h2.2" strokeWidth="1.4" />
    </>
  ),
  "😇": (
    <>
      <GappedFace from={-132} to={-48} />
      <ellipse cx="12" cy="3.1" rx="4.6" ry="1.5" />
      {cupEyes(10)}
      <path d={smile} />
    </>
  ),
  "🥰": (
    <>
      <Face />
      {archEyes(9.8)}
      <path d={smile} />
      {miniHeart(5.9, 13.6)}
      {miniHeart(18.1, 13.6)}
    </>
  ),
  "🤩": (
    <>
      <Face />
      {starEye(8.2, 9.6)}
      {starEye(15.8, 9.6)}
      <path d={grin} />
    </>
  ),
  "😘": (
    <>
      <Face />
      {dot(8.6, 9.8)}
      <path d="M13 10.4q1.9-2.8 3.8 0" />
      <circle cx="10.8" cy="16" r="1.2" />
      {miniHeart(17.1, 15.1, 0.8)}
    </>
  ),
  "😋": (
    <>
      <Face />
      {eyes()}
      <path d="M7.6 13.6q4.4 4.2 8.8 0" />
      <path d="M13 15.9v2.1a1.7 1.7 0 0 0 3.4 0v-3.2" />
    </>
  ),
  "😜": (
    <>
      <Face />
      {dot(8.6, 10)}
      <path d="M13.4 10.4q2-2.8 4 0" />
      <path d="M7.6 13.6q4.4 3.8 8.8 0" />
      <path d="M10.3 15.6v3.4a1.7 1.7 0 0 0 3.4 0v-3.4" />
    </>
  ),
  "🤨": (
    <>
      <Face />
      {eyes(10.6)}
      <path d="M6.4 7.8h4.2M13.4 6.4l3.8-1.6" />
      <path d="M8.6 16.2h6.8" />
    </>
  ),
  "😐": (
    <>
      <Face />
      {eyes()}
      <path d="M8.4 15.6h7.2" />
    </>
  ),
  "😴": (
    <>
      <GappedFace from={-72} to={-12} />
      {cupEyes(11)}
      <path d="M10.6 16.2h2.8" />
      <path d="M13.8 6.2h3.6l-3.6 3.8h3.6" strokeWidth="1.5" />
      <path d="M18.6 2h2.4l-2.4 2.6H21" strokeWidth="1.4" />
    </>
  ),
  "😭": (
    <>
      <Face />
      {cupEyes(9.2)}
      <path d="M8.8 18.8c0-2.6 1.4-4.2 3.2-4.2s3.2 1.6 3.2 4.2z" />
      <path d="M6.2 11.6c-.5 1.5-.5 3 0 4.6M17.8 11.6c.5 1.5.5 3 0 4.6" />
    </>
  ),
  "🥳": (
    <>
      <GappedFace from={-121} to={-93} />
      <path d="M11.1 1.6L5.8 5.4l6.8 2.4z" />
      {dot(11.1, 1.4, 1)}
      {eyes(11)}
      <path d={grin} />
      {dot(18.2, 3.4, 0.9)}
      {dot(21.4, 6, 0.9)}
    </>
  ),
  "😎": (
    <>
      <Face />
      <path d="M5.2 8.6h5.2v1.8a2.6 2.6 0 0 1-5.2 0zM13.6 8.6h5.2v1.8a2.6 2.6 0 0 1-5.2 0z" fill="currentColor" strokeWidth="1.4" />
      <path d="M10.4 9.2h3.2M5.2 8.8L3.6 7.6M18.8 8.8l1.6-1.2" />
      <path d="M8.4 15q3.6 3 7.2 0" />
    </>
  ),
};

/** Short names of the drawn smileys emoji. */
export const smileyInkNames: Record<string, string> = {
  "😀": "Grinning face",
  "😃": "Smiling face",
  "😄": "Smiling face with smiling eyes",
  "😁": "Beaming face",
  "😆": "Squinting laugh",
  "😅": "Relieved smile",
  "🤣": "Rolling on the floor laughing",
  "🙂": "Slight smile",
  "😉": "Winking face",
  "😊": "Blushing smile",
  "😇": "Angel",
  "🥰": "Smiling face with hearts",
  "🤩": "Star-struck",
  "😘": "Blowing a kiss",
  "😋": "Yum",
  "😜": "Winking face with tongue",
  "🤨": "Raised eyebrow",
  "😐": "Neutral face",
  "😴": "Sleeping face",
  "😭": "Sobbing",
  "🥳": "Party face",
  "😎": "Cool face",
};
