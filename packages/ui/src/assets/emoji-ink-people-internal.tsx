import * as React from "react";
import { dot } from "./emoji-ink-parts-internal";

/*
 * Ink drawings for the people category: hands and gestures, people and body parts (see emoji-ink-parts-internal for the
 * shared parts and the style rules). Hands are simplified the way the base set's thumb is: rounded fingers, one outline.
 */

/** An open-bottom finger (a capsule) of width `w` and length `len`, standing on (x, y) and leaning `angle` degrees. */
const finger = (x: number, y: number, angle: number, len: number, w = 3.2) => {
  const r = w / 2;
  return <path transform={`translate(${x} ${y}) rotate(${angle})`} d={`M${-r} 0V${-(len - r)}a${r} ${r} 0 0 1 ${w} 0V0`} />;
};

/** The fist of the hand gestures with raised fingers: a rounded body whose top edge is open where the fingers stand. */
const fistBody = "M15.15 13.6h.55a3 3 0 0 1 3 3v1.2a3 3 0 0 1-3 3H8.9a3 3 0 0 1-3-3v-1.2a3 3 0 0 1 3-3h0";

/** A flat hand with four fingers up and the thumb out to the left (the outline of the hand). */
const openHandPath =
  "M7 12.6V7.1a1.5 1.5 0 0 1 3 0V5.3a1.5 1.5 0 0 1 3 0v1.2a1.5 1.5 0 0 1 3 0v2.4a1.5 1.5 0 0 1 3 0v6.5c0 3.4-2.2 5.6-5.6 5.6h-1.8c-2.4 0-4.2-1.2-5.4-2.9L2.8 13.5a1.5 1.5 0 0 1 2.4-1.8L7 14.1z";
const openHand = (
  <>
    <path d={openHandPath} />
    <path d="M10 7.2v4.4M13 6.6v5M16 8.8v2.8" />
  </>
);

/** A fist with the index finger up and the other fingers curled (pointing up). */
const pointingUp = (
  <>
    <path d="M9.4 11V5.2a1.6 1.6 0 0 1 3.2 0V11h3.4a2.8 2.8 0 0 1 2.8 2.8v4.4a3.2 3.2 0 0 1-3.2 3.2H9.2A3.4 3.4 0 0 1 5.8 17v-2.2a3.4 3.4 0 0 1 3.6-3.8z" />
    <path d="M12.8 15.2h5.4M12.8 18h5.4" />
  </>
);

const leftHalfHeart = "M12 20.4C7 17.3 3 13.7 3 9.2a4.5 4.5 0 0 1 9-1.6z";
const rightHalfHeart = "M12 20.4C17 17.3 21 13.7 21 9.2a4.5 4.5 0 0 0-9-1.6z";

/** A raised hand seen from the front (a mitten with a thumb on the inner side), standing at x and leaning outwards. */
const raisedHand = (x: number, angle: number, mirror = false) => (
  <g transform={`translate(${x} 13.6) rotate(${angle}) scale(${mirror ? -1 : 1} 1)`}>
    <rect x="-3" y="-7.4" width="6" height="15" rx="3" />
    <path d="M-1.4 -7.4v4M1.4 -7.4v2" />
  </g>
);

/** A person: a round head and shoulders, centred on x = 12. */
const bust = (headY: number, shouldersY: number, r = 3.2) => (
  <>
    <circle cx="12" cy={headY} r={r} />
    <path d={`M5.4 ${shouldersY + 5}c.4-3.2 2.8-5 6.6-5s6.2 1.8 6.6 5`} />
  </>
);

export const peopleInkArt: Record<string, React.ReactNode> = {
  "🙌": (
    <>
      <g transform="translate(7.1 17.9) rotate(-9) scale(.56) translate(-10.9 -21)" strokeWidth="3.12">
        <path d={openHandPath} />
        <path d="M10 7.4v3.6M13 6.8v4.4M16 9v2" />
      </g>
      <g transform="translate(16.9 17.9) rotate(9) scale(-.56 .56) translate(-10.9 -21)" strokeWidth="2.82">
        <path d={openHandPath} />
        <path d="M10 7.4v3.6M13 6.8v4.4M16 9v2" />
      </g>
      <path d="M12 1.8v2.4M6.6 2.6l1.2 1.8M17.4 2.6l-1.2 1.8" />
    </>
  ),
  "🤝": (
    <>
      <path d="M2.6 8.4h3.2v8H2.6zM18.2 8.4h3.2v8h-3.2z" />
      <path d="M5.8 9.4h3.4L12 7.4l2.8 2h3.4v6.2h-3l-2.8 3.4a1.5 1.5 0 0 1-2.2.1L8.8 15.6H5.8z" />
      <path d="M9.6 12.8l2.6 2.8M12.2 11.2l2.4 2.6" />
    </>
  ),
  "👋": (
    <>
      <g transform="translate(13 12) rotate(24) scale(.88) translate(-11 -13)">{openHand}</g>
      <path d="M3.6 6.2a6.4 6.4 0 0 1 3.2-3.6M2.4 10.2A9.4 9.4 0 0 1 5.4 3.6" />
    </>
  ),
  "✌": (
    <>
      {finger(10.4, 13.2, -14, 10.4)}
      {finger(13.6, 13.2, 14, 10.4)}
      <path d={fistBody} />
      <path d="M13.4 16.4h3.4" />
    </>
  ),
  "🤞": (
    <>
      {finger(9.8, 13.6, 20, 11.4, 3.4)}
      {finger(14.2, 13.6, -20, 11.4, 3.4)}
      <path d="M11.4 14h1.2M15.7 13.6h.5a2.4 2.4 0 0 1 2.4 2.4v2.6a2.8 2.8 0 0 1-2.8 2.8H8.2a2.8 2.8 0 0 1-2.8-2.8V16a2.4 2.4 0 0 1 2.4-2.4" />
      <path d="M12.6 17.4h3.4" />
    </>
  ),
  "👌": (
    <>
      <circle cx="7.4" cy="13.6" r="3.2" />
      {finger(12, 13.2, 4, 9.4, 3)}
      {finger(15, 13.6, 14, 8, 3)}
      {finger(17.8, 14.4, 24, 6.4, 3)}
      <path d="M10.6 17.2c1 2.2 2.6 3.8 5.2 3.8 2.6 0 4.2-1.8 4.2-4" />
    </>
  ),
  "🤙": (
    <>
      {finger(6.8, 17, -62, 6.2, 3.4)}
      {finger(15.6, 11.4, 36, 6.4, 3)}
      <path d="M9.8 10.6h3.2a3.2 3.2 0 0 1 3.2 3.2v4.2a3.2 3.2 0 0 1-3.2 3.2H9.8a3 3 0 0 1-3-3v-4.6a3 3 0 0 1 3-3z" />
      <path d="M9.6 14.2h3.4M9.6 17.4h3.4" />
    </>
  ),
  "💪": (
    <>
      <g transform="rotate(-10 12 12)">
        <path d="M21.6 17.6C17.4 19.8 12 20.2 8 19.6a4.6 4.6 0 0 1-4.6-4.6V6.6a3.4 3.4 0 0 1 6.8 0V10c.8-3.6 3.4-5.2 6.4-4.4 2.8.8 4.2 3.4 4.6 7.2" />
        <path d="M3.4 9.2h6.8" />
      </g>
    </>
  ),
  "🧠": (
    <>
      <path d="M12 4.4C11.2 3.4 10 3 8.8 3.2 7 3.5 6 5 6.2 6.6c-1.6.6-2.4 2-2.2 3.6.1.9.5 1.6 1.2 2.1-.4 1.4 0 2.8 1.2 3.6 1 .6 2.2.6 3 .1.2 1.2 1 2.2 2.4 2.4V4.4z" />
      <path d="M12 4.4C12.8 3.4 14 3 15.2 3.2 17 3.5 18 5 17.8 6.6c1.6.6 2.4 2 2.2 3.6-.1.9-.5 1.6-1.2 2.1.4 1.4 0 2.8-1.2 3.6-1 .6-2.2.6-3 .1-.2 1.2-1 2.2-2.4 2.4V4.4z" />
      <path d="M9.4 7.6c-1.8-.2-3.2 1-3.2 2.6M9.6 14.6c-1.8.2-3.2-.6-3.6-2M14.6 7.6c1.8-.2 3.2 1 3.2 2.6M14.4 14.6c1.8.2 3.2-.6 3.6-2" />
    </>
  ),
  "👉": <g transform="rotate(90 12 12)">{pointingUp}</g>,
  "👆": pointingUp,
  "✋": openHand,
  "🫶": (
    <>
      <path d="M3 11c0 5 3.4 8.4 9 9.6M21 11c0 5-3.4 8.4-9 9.6" />
      <path d="M3 11l2.6 1.8M21 11l-2.6 1.8" />
      <path d="M12 12.8C9.6 11.4 8 9.8 8 8a2.4 2.4 0 0 1 4-1.7A2.4 2.4 0 0 1 16 8c0 1.8-1.6 3.4-4 4.8z" fill="currentColor" strokeWidth="1.2" />
    </>
  ),
  "🧑‍💻": (
    <>
      <circle cx="12" cy="5.6" r="3.2" />
      <path d="M4.8 14.6c.5-2.4 2.4-3.6 4.2-3.8M19.2 14.6c-.5-2.4-2.4-3.6-4.2-3.8" />
      <rect x="6.6" y="11.8" width="10.8" height="6.8" rx="1.3" />
      <path d="M5.2 18.6h13.6l1.2 2.4H4z" />
    </>
  ),
  "🧑‍🎨": (
    <>
      {bust(6.4, 10.6)}
      <path d="M8.6 4.8a3.4 3.4 0 0 1 6.8 0z" />
      <path d="M12.6 21c-2.6 0-4.4-1.6-4.4-3.6 0-2.4 2-3.8 4.6-3.8 2.6 0 4.4 1.2 4.4 3 0 1-.8 1.4-1.8 1.4-1.2 0-1.2 1.2-.4 1.8.4.8-.4 2.2-2.4 2.2z" />
      {dot(10.6, 17, 0.8)}
      {dot(13.2, 16, 0.8)}
      {dot(15.6, 17.4, 0.8)}
    </>
  ),
  "🧑‍🚀": (
    <>
      <circle cx="12" cy="9.2" r="6.2" />
      <rect x="8" y="6.8" width="8" height="5" rx="2.5" />
      <path d="M5.2 21.4c0-3 2.8-5 6.8-5s6.8 2 6.8 5" />
      <path d="M10.4 19.4h3.2" />
    </>
  ),
  "🕺": (
    <>
      <circle cx="10.4" cy="4.4" r="2.4" />
      <path d="M10.8 8l.8 6.2M10.9 9.4L17.2 5.4M10.9 9.6l-4.6 3.6M11.6 14.2L8.2 21M11.6 14.2l5 3.2-.6 3.8" />
    </>
  ),
  "💃": (
    <>
      <circle cx="11.4" cy="4.4" r="2.4" />
      <path d="M11.4 7.8c-.6 2.6-1.6 5-3 7.2L6 18.8c3.4 1.6 8.4 1.6 11.8 0L15.4 15c-1.4-2.2-2.4-4.6-4-7.2z" />
      <path d="M12.6 9.2L17.8 4.4M10.2 9.4L5.4 12M9.8 19.4l-.8 2M14 19.6l.8 1.8" />
    </>
  ),
  "🤷": (
    <>
      <circle cx="12" cy="5.4" r="3" />
      <path d="M7.6 21v-5.6c0-2.4 1.6-3.8 4.4-3.8s4.4 1.4 4.4 3.8V21" />
      <path d="M8.2 12.8L4 15.4l-.8-4.6M15.8 12.8l4.2 2.6.8-4.6" />
      <circle cx="3" cy="9.4" r="1.3" />
      <circle cx="21" cy="9.4" r="1.3" />
    </>
  ),
};

/** Short names of the drawn people emoji. */
export const peopleInkNames: Record<string, string> = {
  "🙌": "Raised hands",
  "🤝": "Handshake",
  "👋": "Waving hand",
  "✌️": "Victory hand",
  "🤞": "Crossed fingers",
  "👌": "OK hand",
  "🤙": "Call me hand",
  "💪": "Flexed biceps",
  "🧠": "Brain",
  "👉": "Pointing right",
  "👆": "Pointing up",
  "✋": "Raised hand",
  "🫶": "Heart hands",
  "🧑‍💻": "Technologist",
  "🧑‍🎨": "Artist",
  "🧑‍🚀": "Astronaut",
  "🕺": "Man dancing",
  "💃": "Woman dancing",
  "🤷": "Shrug",
};
