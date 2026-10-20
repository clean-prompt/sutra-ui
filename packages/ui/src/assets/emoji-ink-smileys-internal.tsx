import * as React from "react";
import { dot, Face, starPath } from "./emoji-ink-parts-internal";
import {
  ARCH,
  C,
  CUP,
  FACE,
  FLAT,
  GRIN,
  L,
  O,
  P,
  R,
  Ring,
  SMILE,
  SQUINT,
  blinkEyes,
  drop as dropS,
  face,
  heartAt,
  mouth,
  pt,
  soft,
  starD,
  type InkSolid,
} from "./emoji-ink-solid-internal";

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

/* ----- solid drawings (variants "solid" and "tint"): the disc of the shared face, features cut out ----- */

/** A wide open grin and the line of the teeth (ink given back inside the hole). */
const WIDE = P("M6.5 12.9h11c0 3.3-2.4 5.7-5.5 5.7s-5.5-2.4-5.5-5.7z", 0.9);
const TEETH = L("M6.9 15.2h10.2", 1.2);
/** One open eye on the left and a closed arch on the right (a wink). */
const winkEyes = (y = 9.4) => [pt("eye", "blink", O(8.55, y, 1.35, 1.9), undefined, true), L(`M13.4 ${y + 1}q2-2.8 4 0`, 1.8)];
const partyHat = P("M1.8 1.4L9.6 4.2 4.4 9.6z", 1.2);

/** Solid drawings of this category (variants "solid" and "tint"); see emoji-ink-solid-internal. */
export const smileySolidArt: Record<string, InkSolid> = {
  "😀": face([...blinkEyes(), mouth(GRIN)]),
  "😃": face([...pt("eye", "blink", [O(8.55, 9.1, 1.3, 2.35), O(15.45, 9.1, 1.3, 2.35)], undefined, true), mouth(GRIN)]),
  "😄": face([pt("eyes", "squeeze", ARCH, undefined, true), mouth(GRIN)]),
  "😁": face([pt("eyes", "squeeze", ARCH, undefined, true), mouth(WIDE)], { restore: [TEETH] }),
  "😆": face([SQUINT, mouth(WIDE, "laugh-mouth")], { move: "laugh", origin: "12px 14px", restore: [TEETH] }),
  "😅": face([
    ...blinkEyes(11, 1.3, 1.75),
    mouth(P("M8.4 14.8h7.2c0 2.3-1.6 3.9-3.6 3.9s-3.6-1.6-3.6-3.9z", 0.9)),
    pt("sweat", "tear-fall", soft(dropS(17, 6.9, 1.3, 16.2, 4.2)), undefined, true),
  ]),
  "🤣": {
    ...face(
      [
        SQUINT,
        mouth(P("M7.4 13.2h9.2c0 3.1-2.1 5.2-4.6 5.2s-4.6-2.1-4.6-5.2z", 0.9), "laugh-mouth"),
        pt("tear", "tear-l", soft(dropS(5.3, 14.6, 1.25, 6.3, 12.2)), undefined, true),
        pt("tear", "tear-r", soft(dropS(18.7, 14.6, 1.25, 17.7, 12.2)), undefined, true),
      ],
      { move: "laugh", origin: "12px 14px" }
    ),
    tf: "rotate(-72 12 12)",
  },
  "🙂": face([...blinkEyes(), mouth(SMILE)]),
  "😉": face([...winkEyes(), mouth(SMILE)], { move: "nod", origin: "12px 21px" }),
  "😊": face(
    [
      pt("eyes", "squeeze", L("M6.6 10.3q1.95-2.8 3.9 0M13.5 10.3q1.95-2.8 3.9 0", 1.8), undefined, true),
      mouth(L("M8.4 14.2q3.6 3.5 7.2 0", 1.9)),
      pt("cheek", "blush", soft(O(5, 12.9, 1.25, 0.75)), undefined, true),
      pt("cheek", "blush", soft(O(19, 12.9, 1.25, 0.75)), undefined, true),
    ],
    { move: "tilt", origin: "12px 20px" }
  ),
  /* Angel: the halo floats in front of the brow, a paper gap where it crosses the face. */
  "😇": {
    layers: [
      { body: [FACE], cuts: [pt("eyes", "squeeze", L("M6.5 10q2 2.2 4 0M13.5 10q2 2.2 4 0", 1.8), undefined, true), mouth(SMILE)] },
      { body: [Ring(12, 2.9, 4.8, 1.5, 1.6)], key: 1, part: { name: "halo", move: "halo", origin: "12px 3px" } },
    ],
  },
  /* Smiling with hearts: heart cheeks cut out, one heart flying off the brow. */
  "🥰": {
    layers: [
      {
        body: [FACE],
        cuts: [
          L("M6.6 10q1.95-2.8 3.9 0M13.5 10q1.95-2.8 3.9 0", 1.8),
          mouth(SMILE),
          pt("heart", "heye", soft(heartAt(5.4, 13.6, 0.16)), undefined, true),
          pt("heart", "heye", soft(heartAt(18.6, 13.6, 0.16)), undefined, true),
        ],
      },
      { body: [heartAt(19.7, 4.3, 0.22)], key: 1, part: { name: "heart", move: "kiss", origin: "19.7px 4.3px" } },
    ],
    move: "swoon",
    origin: "12px 21px",
  },
  "🤩": face(
    [
      ...pt("star", "twinkle", [P(starD(8.3, 9.7, 3.1, 1.35), 0.7), P(starD(15.7, 9.7, 3.1, 1.35), 0.7)], undefined, true),
      mouth(GRIN),
    ]
  ),
  /* Blowing a kiss: a wink, puckered lips, the heart in front of the cheek. */
  "😘": {
    layers: [
      { body: [FACE], cuts: [...winkEyes(9.8), pt("mouth", "o-pop", O(10.6, 16, 1.15, 1.4), undefined, true)] },
      { body: [heartAt(18.4, 16.9, 0.24)], key: 1, part: { name: "heart", move: "kiss", origin: "18.4px 16.9px" } },
    ],
  },
  /* Yum: the tongue at the corner of the smile (a tint in "tint"). */
  "😋": face(
    [...blinkEyes(), mouth(L("M7.6 13.6q4.4 4.2 8.8 0", 1.9)), pt("tongue", "lick", soft(P("M12.9 15.3h3.5v2.7a1.75 1.75 0 0 1-3.5 0z", 0.5)), "14.6px 15.4px")],
    { move: "" }
  ),
  "😜": face(
    [...winkEyes(10), mouth(L("M7.6 13.6q4.4 3.8 8.8 0", 1.9)), pt("tongue", "lick", soft(P("M10.3 15.3h3.4v3.6a1.7 1.7 0 0 1-3.4 0z", 0.5)), "12px 15.4px")],
    { move: "tilt", origin: "12px 20px" }
  ),
  "🤨": face(
    [
      ...blinkEyes(10.6, 1.25, 1.7),
      L("M6.4 7.6h4.2", 1.7),
      pt("brow", "brow", L("M13.4 6.4l3.8-1.6", 1.7), undefined, true),
      mouth(L("M8.6 16.2h6.8", 1.9)),
    ],
    { move: "" }
  ),
  "😐": face([...blinkEyes(), mouth(FLAT)], { move: "" }),
  /* Sleeping: closed eyes, a small mouth, a paper z cut into the brow and a small ink z rising off it. */
  "😴": {
    ...face([L("M6.5 11.2q2 1.8 4 0M13.5 11.2q2 1.8 4 0", 1.8), mouth(L("M10.4 16.4h3.2", 1.8)), pt("zzz", "zzz", L("M12.9 5.4h3.8l-3.8 3.9h3.8", 1.5), "15px 7.4px")], {
      move: "breathe",
      origin: "12px 20px",
    }),
    lines: [pt("zzz", "zzz", L("M18.8 1.6h2.6l-2.6 2.8h2.6", 1.4), "20px 3px", false, 1)],
  },
  "😭": face(
    [
      CUP,
      pt("stream", "stream", soft(L("M7.1 11.4v7M16.9 11.4v7", 2))),
      pt("mouth", "wail", P("M10 18.6c0-2.6.9-4.3 2-4.3s2 1.7 2 4.3z", 1), "50% 100%", true),
    ],
    { move: "sob", origin: "12px 20px" }
  ),
  /* Party face: the hat sits in front of the head (a paper gap where it crosses), confetti off the other side. */
  "🥳": {
    layers: [
      { body: [FACE], cuts: [pt("eyes", "squeeze", L("M7.6 11.3q1.8-2.6 3.6 0M13.6 11.3q1.8-2.6 3.6 0", 1.8), undefined, true), mouth(P("M8 14.2h8c0 2.8-1.8 4.6-4 4.6s-4-1.8-4-4.6z", 0.9))] },
      { body: [partyHat, C(1.9, 1.5, 1.5)], cuts: [L("M3.4 7.3L7.6 2.9", 1.3)], part: { name: "hat", move: "hat", origin: "7px 7px" } },
    ],
    dots: pt("confetti", "confetti", [R(18.6, 1.6, 1.7, 3.2, 0.6, "rotate(32 19.45 3.2)"), C(22.2, 7.6, 1.05)], "20.4px 5px"),
    tint: {
      layers: [
        { body: [FACE], cuts: [pt("eyes", "squeeze", L("M7.6 11.3q1.8-2.6 3.6 0M13.6 11.3q1.8-2.6 3.6 0", 1.8), undefined, true), mouth(P("M8 14.2h8c0 2.8-1.8 4.6-4 4.6s-4-1.8-4-4.6z", 0.9))] },
        { body: [soft(partyHat)], inks: [C(1.9, 1.5, 1.5)], part: { name: "hat", move: "hat", origin: "7px 7px" } },
      ],
      dots: pt("confetti", "confetti", [R(18.6, 1.6, 1.7, 3.2, 0.6, "rotate(32 19.45 3.2)"), C(22.2, 7.6, 1.05)], "20.4px 5px"),
    },
  },
  /* Cool: lenses cut to paper (dark glasses in tint), a glint that runs across them when it moves. */
  "😎": face(
    [
      soft(P("M4.9 8.3h6.1v1.7a3.05 3.05 0 0 1-6.1 0z", 0.8)),
      soft(P("M13 8.3h6.1v1.7a3.05 3.05 0 0 1-6.1 0z", 0.8)),
      L("M10.6 8.9h2.8", 1.6),
      mouth(L("M8.6 15.2q3.4 2.9 6.8-.3", 1.9)),
    ],
    { move: "nod", origin: "12px 21px", restore: [pt("glint", "glint", L("M-2.6 13.6L.8 7.2", 1.2))] }
  ),
};
