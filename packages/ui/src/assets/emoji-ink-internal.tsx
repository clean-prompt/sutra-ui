import * as React from "react";
import { dot, heartEye, starPath, Face, thumb, normalizeEmoji } from "./emoji-ink-parts-internal";
import { smileyInkArt, smileyInkNames, smileySolidArt } from "./emoji-ink-smileys-internal";
import { peopleInkArt, peopleInkNames, peopleSolidArt } from "./emoji-ink-people-internal";
import { natureInkArt, natureInkNames, natureSolidArt } from "./emoji-ink-nature-internal";
import { foodInkArt, foodInkNames, foodSolidArt } from "./emoji-ink-food-internal";
import { activityInkArt, activityInkNames, activitySolidArt } from "./emoji-ink-activities-internal";
import { travelInkArt, travelInkNames, travelSolidArt } from "./emoji-ink-travel-internal";
import { objectInkArt, objectInkNames, objectSolidArt } from "./emoji-ink-objects-internal";
import { symbolInkArt, symbolInkNames, symbolSolidArt } from "./emoji-ink-symbols-internal";
import {
  C,
  FACE,
  FLAME,
  FLAME_CORE,
  FROWN,
  G,
  HEART,
  L,
  LAUGH,
  O,
  P,
  R,
  Ring,
  SMALL_GRIN,
  SQUINT,
  drop,
  eyes,
  face,
  heartAt,
  mouth,
  pl,
  pt,
  soft,
  starD,
  type InkSolid,
} from "./emoji-ink-solid-internal";

export { normalizeEmoji };

/*
 * Original monoline drawings for the emoji of the built-in set. The first twenty (the reaction presets and a dozen common
 * ones) are drawn here; the categories live in their own files and are merged below. Shared parts: emoji-ink-parts-internal.
 */

/** Art by emoji (variation selectors removed). */
const baseArt: Record<string, React.ReactNode> = {
  "👍": thumb,
  "👎": <g transform="matrix(1 0 0 -1 0 24)">{thumb}</g>,
  "❤": <path d="M12 20.3C7 17.2 3 13.6 3 9a4.6 4.6 0 0 1 9-1.6A4.6 4.6 0 0 1 21 9c0 4.6-4 8.2-9 11.3z" />,
  "😂": (
    <>
      <Face />
      <path d="M6.6 8.4l3.2 1.7-3.2 1.7M17.4 8.4l-3.2 1.7 3.2 1.7" />
      <path d="M7.4 14h9.2c0 2.9-2.1 4.7-4.6 4.7S7.4 16.9 7.4 14z" />
    </>
  ),
  "🎉": (
    <>
      <path d="M3.6 20.4L8 8.6a.9.9 0 0 1 1.5-.3l6.2 6.2a.9.9 0 0 1-.3 1.5z" />
      <path d="M5.8 15l3.4 3.4" />
      <path d="M13 5.4c.4-1.2 1.6-1.8 2.8-1.4M15 9.4c1.4-1.4 3-1.4 4.6-.4M16.4 13.2c1.4-.2 2.6.4 3.4 1.6" />
      {dot(11.4, 3.4, 1)}
      {dot(19.6, 5.2, 1)}
      {dot(20.4, 12, 1)}
    </>
  ),
  "😮": (
    <>
      <Face />
      {dot(8.6, 9.6)}
      {dot(15.4, 9.6)}
      <ellipse cx="12" cy="15.8" rx="2.2" ry="2.9" />
    </>
  ),
  "😢": (
    <>
      <Face />
      {dot(8.6, 9.2)}
      {dot(15.4, 9.2)}
      <path d="M10 17.4q2-1.8 4 0" />
      <path d="M7.4 12.2c-1 1.3-1.4 2-1.4 2.7a1.4 1.4 0 0 0 2.8 0c0-.7-.4-1.4-1.4-2.7z" fill="currentColor" strokeWidth="1" />
    </>
  ),
  "🔥": (
    <>
      <path d="M12 21.2c-4 0-6.6-2.8-6.6-6.2 0-2.6 1.5-4.2 2.8-5.9.5 1.6 1.3 2.4 2.2 2.8-.3-3.5 1.3-6.5 3.9-9 .4 3 2.1 4.6 3.1 6.4.8 1.5 1.2 2.4 1.2 3.6 0 3.4-2.6 6.3-6.6 6.3z" />
      <path d="M12 18.4c-1.1 0-1.9-.7-1.9-1.8 0-1.2 1.1-1.8 1.9-3.2.8 1.4 1.9 2 1.9 3.2 0 1.1-.8 1.8-1.9 1.8z" />
    </>
  ),
  "👀": (
    <>
      <ellipse cx="6.8" cy="12" rx="4" ry="5.6" />
      <ellipse cx="17.2" cy="12" rx="4" ry="5.6" />
      {dot(8.1, 13.1, 1.6)}
      {dot(18.5, 13.1, 1.6)}
    </>
  ),
  "🙏": (
    <>
      <path d="M12 2.8C9.4 5.6 7.4 8.6 7.4 12.4V18h9.2v-5.6c0-3.8-2-6.8-4.6-9.6z" />
      <path d="M12 6.4V18M9.4 12.2c.7.9 1.5 1.3 2.6 1.4" />
      <path d="M6.4 21.2h11.2" />
    </>
  ),
  "👏": (
    <>
      <rect x="-2.3" y="-6.6" width="4.6" height="13.2" rx="2.3" transform="translate(8.4 15) rotate(24)" />
      <rect x="-2.3" y="-6.6" width="4.6" height="13.2" rx="2.3" transform="translate(15.6 15) rotate(-24)" />
      <path d="M12 2.2v2.6M4.6 5.6l1.9 1.7M19.4 5.6l-1.9 1.7M3 11h2.2M18.8 11H21" />
    </>
  ),
  "😍": (
    <>
      <Face />
      {heartEye(8, 9.8)}
      {heartEye(16, 9.8)}
      <path d="M7.8 14.2h8.4c0 2.7-1.9 4.4-4.2 4.4s-4.2-1.7-4.2-4.4z" />
    </>
  ),
  "🤔": (
    <>
      <circle cx="12" cy="12" r="9.5" strokeDasharray="46.5 13.2" strokeDashoffset="-17.4" />
      <rect x="11.4" y="15.6" width="9" height="6" rx="3" />
      {dot(8.4, 9.8)}
      {dot(14.8, 9.8)}
      <path d="M12.6 6.4l3.6-1M7.8 15.2h2.6" />
    </>
  ),
  "✅": (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <path d="M7.6 12.4l3.1 3.1 5.7-6.3" />
    </>
  ),
  "🚀": (
    <g transform="rotate(45 12 12)">
      <path d="M12 1.6c2.6 2.2 3.6 4.9 3.6 8.2V15H8.4V9.8c0-3.3 1-6 3.6-8.2z" />
      <circle cx="12" cy="8.6" r="1.6" />
      <path d="M8.4 11.2L5.6 14v3.4l2.8-1.8M15.6 11.2L18.4 14v3.4l-2.8-1.8" />
      <path d="M10.4 17.4V19c0 1.2.6 2 1.6 2.8 1-.8 1.6-1.6 1.6-2.8v-1.6" />
    </g>
  ),
  "💯": (
    <>
      <path d="M4 7.4l2.7-2.1V14.4" />
      <ellipse cx="12" cy="9.8" rx="2.5" ry="4.7" />
      <ellipse cx="19" cy="9.8" rx="2.5" ry="4.7" />
      <path d="M3.4 18.4h17.2M5.6 21.2h12.6" />
    </>
  ),
  "😡": (
    <>
      <Face />
      <path d="M6 7.2l4.2 2.2M18 7.2l-4.2 2.2" />
      {dot(8.6, 11.8)}
      {dot(15.4, 11.8)}
      <path d="M8.6 17.8q3.4-3.2 6.8 0" />
    </>
  ),
  "⭐": <path d={starPath(12, 12.8, 9.6, 4.3)} />,
  "💡": (
    <>
      <path d="M9 17.4c0-1.8-3-3-3-6.6a6 6 0 0 1 12 0c0 3.6-3 4.8-3 6.6z" />
      <path d="M9.8 20.4h4.4M10.4 11.6l1.6 1.8 1.6-1.8M12 13.4v4" />
    </>
  ),
  "✨": (
    <>
      <path d="M10.5 3.2C11.2 8 12.5 9.3 17.2 10c-4.7.7-6 2-6.7 6.8C9.8 12 8.5 10.7 3.8 10 8.5 9.3 9.8 8 10.5 3.2z" />
      <path d="M18.5 14.6c.2 1.8.7 2.3 2.5 2.5-1.8.2-2.3.7-2.5 2.5-.2-1.8-.7-2.3-2.5-2.5 1.8-.2 2.3-.7 2.5-2.5z" />
      {dot(19, 4.6, 1)}
    </>
  ),
};

/** Short names of the drawn emoji, used as the default `title` and in the demo. */
const baseNames: Record<string, string> = {
  "👍": "Thumbs up",
  "👎": "Thumbs down",
  "❤️": "Heart",
  "😂": "Laughing with tears",
  "🎉": "Party popper",
  "😮": "Surprised",
  "😢": "Crying",
  "🔥": "Fire",
  "👀": "Eyes",
  "🙏": "Folded hands",
  "👏": "Clapping",
  "😍": "Heart eyes",
  "🤔": "Thinking",
  "✅": "Check",
  "🚀": "Rocket",
  "💯": "Hundred",
  "😡": "Angry",
  "⭐": "Star",
  "💡": "Light bulb",
  "✨": "Sparkles",
};

/** Art by emoji (variation selectors removed): the base set plus every category file. */
export const inkArt: Record<string, React.ReactNode> = {
  ...baseArt,
  ...smileyInkArt,
  ...peopleInkArt,
  ...natureInkArt,
  ...foodInkArt,
  ...activityInkArt,
  ...travelInkArt,
  ...objectInkArt,
  ...symbolInkArt,
};

/** Short names of the drawn emoji, used as the default `title` and in the demo. */
export const inkEmojiNames: Record<string, string> = {
  ...baseNames,
  ...smileyInkNames,
  ...peopleInkNames,
  ...natureInkNames,
  ...foodInkNames,
  ...activityInkNames,
  ...travelInkNames,
  ...objectInkNames,
  ...symbolInkNames,
};

/* ------------------------------------------------------------------ */
/* Solid drawings of the base twenty (variants "solid" and "tint")     */
/* ------------------------------------------------------------------ */

/** Thumb up: three curled fingers with round knuckles, the back of the hand, a cuff at the wrist. */
const thumbUp: InkSolid = {
  layers: [
    {
      body: [
        pt("thumb", "flick", L("M9.7 10L11.3 3.7", 4.6), "9.7px 10.5px"),
        L("M6.9 12.1H13M6.9 15.9H13M6.9 19.7H13", 3.8),
        R(10.4, 10.2, 9, 11.4, 3.2),
        soft(R(18.6, 10.8, 3.8, 10.2, 1.4)),
      ],
      cuts: [L("M3.5 14H10.8M3.5 17.8H10.8", 1.5), L("M3.5 10.2H8.6", 1.4), L("M19.5 9V23", 1.3)],
    },
  ],
  move: "spring",
  origin: "14px 21.5px",
};
const heart: InkSolid = { layers: [{ body: [P(HEART, 0.6)] }], move: "beat", origin: "12px 12.5px" };
const clapHand = [R(-3, -12.6, 6, 12.6, 3), L("M-3-4.8L-5.4-8", 2.4)];
const prayNear = "translate(10.9 20) rotate(-6)";

const baseSolid: Record<string, InkSolid> = {
  "👍": thumbUp,
  "👎": { ...thumbUp, tf: "matrix(1 0 0 -1 0 24)" },
  "❤": { ...heart, tint: { ...heart, layers: [{ body: [P(HEART, 0.6)], cuts: [soft(L("M5.6 10.4c-.5-2.2.6-4.1 2.7-4.6", 1.6))] }] } },
  "😂": face(
    [
      SQUINT,
      mouth(LAUGH, "laugh-mouth"),
      pt("tear", "tear-l", soft(drop(5.25, 14.7, 1.3, 6.2, 12.2)), undefined, true),
      pt("tear", "tear-r", soft(drop(18.75, 14.7, 1.3, 17.8, 12.2)), undefined, true),
    ],
    { move: "laugh", origin: "12px 14px" }
  ),
  "🎉": {
    layers: [
      {
        body: [P("M2.7 21.3L7.3 8.7 15.3 16.7z", 1.6), O(11.3, 12.7, 5.7, 1.9, 45)],
        cuts: [soft(L("M3.7 15.8L8.2 20.3M5.5 12L12 18.5", 1.5))],
        part: { name: "cone", move: "cock", origin: "3px 21px" },
      },
    ],
    lines: pt("burst", "burst", [L("M12.6 6.6c-.5-1.7.3-3.2 1.9-3.9M15.9 9.2c1.1-2.1 3.3-2.8 5.3-1.8M17.9 13.4c1.7-.5 3.1.1 3.9 1.6", 1.9)], "11.5px 12.5px"),
    dots: pt("burst", "burst", [C(9.8, 3, 1.1), C(20.4, 3.2, 1.1), C(21.4, 19, 1.1), C(17, 21.2, 1)], "11.5px 12.5px"),
  },
  "😮": face([...pt("eye", "eye-pop", eyes(9), undefined, true), pt("mouth", "o-pop", O(12, 15.7, 2.3, 2.9), undefined, true)], { move: "jolt", origin: "12px 21px" }),
  "😢": face(
    [
      ...pt("eye", "droop", eyes(9.3, 1.3, 1.8), undefined, true),
      pt("mouth", "tremble", L("M9.5 17.6q2.5-2.2 5 0", 1.8), undefined, true),
      pt("tear", "tear-fall", soft(drop(7, 15, 1.5, 7, 11.9)), undefined, true),
    ],
    { move: "" }
  ),
  "🔥": {
    layers: [
      {
        body: [P(FLAME, 0.4, "translate(12 12.5) scale(1.1) translate(-12 -12.5)")],
        cuts: [pt("core", "core", soft(P(FLAME_CORE, 0.3, "translate(12 17.4) scale(1.3) translate(-12 -17.4)")), "50% 85%", true)],
      },
    ],
    move: "flicker",
    origin: "12px 22px",
  },
  /* Eyes: solid eyeballs, the white cut as a crescent, so the pupils keep looking right. */
  "👀": {
    layers: [
      {
        body: [O(6.7, 12, 4.4, 6.2), O(17.3, 12, 4.4, 6.2)],
        cuts: [O(6.7, 12, 2.75, 4.55), O(17.3, 12, 2.75, 4.55)],
        restore: pt("pupil", "dart", [C(8.05, 13.3, 2.2), C(18.65, 13.3, 2.2)]),
      },
    ],
    move: "blink-all",
    origin: "12px 12px",
  },
  /* Folded hands, seen from the side: the near hand shows three fingers and its thumb, the far hand peeks out behind. */
  "🙏": {
    layers: [
      { body: [G("translate(13.3 19.4) rotate(-6)", [R(-3.3, -16.2, 6.6, 16.2, 3.3)])] },
      {
        body: [G(prayNear, [R(-4.1, -14.2, 8.2, 14.2, 3.7), L("M-4.1-4.6L-5.6-8.6", 2.5)]), soft(G(prayNear, [R(-4.9, -0.9, 10.4, 3.6, 1.4)]))],
        cuts: [G(prayNear, [L("M-1.37-15V-9M1.37-15V-9", 1.2), L("M-7-1.1H7", 1.2)])],
        part: { name: "near", move: "press" },
      },
    ],
    move: "bow",
    origin: "12px 22px",
  },
  "👏": {
    layers: [
      { body: [G("translate(7.8 21.4) rotate(24)", clapHand)], part: { name: "back", move: "clap-back", origin: "7.8px 21.4px" } },
      { body: [G("translate(16.2 21.4) rotate(-24) scale(-1 1)", clapHand)], part: { name: "front", move: "clap-front", origin: "16.2px 21.4px" } },
    ],
    lines: pt("marks", "marks", [L("M12 1.6v2.6M7.2 2.8l1.1 1.9M16.8 2.8l-1.1 1.9", 1.7)], "12px 5px"),
  },
  "😍": face([...pt("heye", "heye", [heartAt(8.2, 9.6, 0.25), heartAt(15.8, 9.6, 0.25)], undefined, true), mouth(SMALL_GRIN)], { move: "swoon", origin: "12px 21px" }),
  /* Thinking: one brow up, a flat mouth, the hand at the chin in front of the face (a paper gap around it). */
  "🤔": {
    layers: [
      {
        body: [FACE],
        cuts: [
          ...pt("eye", "look-up", [O(8.3, 9.6, 1.25, 1.75), O(15.3, 9.2, 1.25, 1.75)], undefined, true),
          pt("brow", "brow", L("M13.3 5.6q2.1-1.6 4.5-.7", 1.6), undefined, true),
          mouth(L("M6.9 15.3l3.4-.5", 1.8)),
        ],
      },
      { body: [O(16.4, 19.3, 4.6, 3, -16), L("M13.4 18.4L11.6 15.4", 2.6)], part: { name: "hand", move: "tap" } },
    ],
  },
  "✅": { layers: [{ body: [R(2.6, 2.6, 18.8, 18.8, 5.4)], cuts: [pt("tick", "draw", pl(L("M7.3 12.3l3.3 3.3 6.2-6.9", 2.3)))] }], move: "squash", origin: "12px 12px" },
  "🚀": {
    tf: "rotate(45 12 12)",
    layers: [
      {
        body: [
          P("M12 .9c3.2 2.6 4.4 5.8 4.4 9.8v5.6H7.6v-5.6c0-4 1.2-7.2 4.4-9.8z", 0.6),
          soft(P("M7.6 11.4L4.2 14.8v4.2l3.4-2z", 0.9)),
          soft(P("M16.4 11.4l3.4 3.4v4.2l-3.4-2z", 0.9)),
          R(9.5, 16, 5, 2.2, 0.8),
        ],
        cuts: [C(12, 8.6, 2), L("M7.6 12.4v4.4M16.4 12.4v4.4", 1)],
        inks: [pt("flame", "thrust", soft(P("M12 19.4c-1.2 1.4-1.8 2.4-1.8 3.2a1.8 1.8 0 0 0 3.6 0c0-.8-.6-1.8-1.8-3.2z", 0.4)), "12px 19.4px")],
      },
    ],
    move: "launch",
    origin: "12px 12px",
  },
  "💯": {
    layers: [],
    lines: [
      G("translate(1.6 0) skewX(-9)", [
        pt("digit", "digit", L("M4.4 7.4l2.4-2v10", 2.3)),
        pt("digit", "digit", Ring(11.4, 10.4, 2.4, 4.9, 2.3), undefined, false, 1),
        pt("digit", "digit", Ring(18, 10.4, 2.4, 4.9, 2.3), undefined, false, 2),
      ]),
      pt("underline", "swipe", pl(L("M3 18.6h17.6", 2.2))),
      pt("underline", "swipe-late", pl(L("M5.2 21.6h12.8", 2.2))),
    ],
  },
  "😡": face(
    [pt("brows", "brows-drop", L("M6.2 7l4.2 2.1M17.8 7l-4.2 2.1", 2), undefined, true), O(8.8, 11.4, 1.2, 1.35), O(15.2, 11.4, 1.2, 1.35), mouth(FROWN)],
    { move: "fume", origin: "12px 12px" }
  ),
  "⭐": { layers: [{ body: [P(starD(12, 12.9, 10.4, 4.8), 1.8)] }], move: "twinkle", origin: "12px 12.9px" },
  "💡": {
    layers: [
      {
        body: [P("M9 17.4c0-1.8-3-3-3-6.6a6 6 0 0 1 12 0c0 3.6-3 4.8-3 6.6z", 1.75), R(9.4, 19.3, 5.2, 2.4, 1.1)],
        cuts: [L("M10.4 11.6l1.6 1.8 1.6-1.8M12 13.4v3.2", 1.4), soft(L("M8.6 9.4c.3-1.5 1.3-2.6 2.8-3", 1.4))],
      },
    ],
    move: "pop",
    origin: "12px 14px",
  },
  "✨": {
    layers: [
      {
        body: [
          pt("star", "twinkle-4", P("M10.5 3.2C11.2 8 12.5 9.3 17.2 10c-4.7.7-6 2-6.7 6.8C9.8 12 8.5 10.7 3.8 10 8.5 9.3 9.8 8 10.5 3.2z", 1.4), "10.5px 10px"),
          pt("spark", "spark", soft(P("M18.5 14.6c.2 1.8.7 2.3 2.5 2.5-1.8.2-2.3.7-2.5 2.5-.2-1.8-.7-2.3-2.5-2.5 1.8-.2 2.3-.7 2.5-2.5z", 1.2)), "18.5px 17.1px"),
        ],
      },
    ],
    dots: [pt("spark", "spark", C(19, 4.6, 1.25), "19px 4.6px", false, 1)],
  },
};

/** Solid drawings by emoji (variation selectors removed): the base set plus every category file. */
export const solidInkArt: Record<string, InkSolid> = {
  ...baseSolid,
  ...smileySolidArt,
  ...peopleSolidArt,
  ...natureSolidArt,
  ...foodSolidArt,
  ...activitySolidArt,
  ...travelSolidArt,
  ...objectSolidArt,
  ...symbolSolidArt,
};
