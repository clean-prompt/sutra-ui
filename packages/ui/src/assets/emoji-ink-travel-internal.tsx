import type * as React from "react";
import { dot } from "./emoji-ink-parts-internal";
import { C, G, L, O, P, R, Ring, pt, soft, type InkSolid } from "./emoji-ink-solid-internal";

/*
 * Ink drawings for the travel category (see emoji-ink-parts-internal for the shared parts and the style rules). Vehicles are
 * side views on one ground line (y about 19), places are simple flat silhouettes. Original shapes, nothing traced.
 */

/** A car seen from the side (body in pieces so the line breaks around the two wheels at x 7.5 and 16.5). */
const carBody = (roof: number) => (
  <>
    <path d={`M5.3 17H4a1 1 0 0 1-1-1v-3.2c0-.8.5-1.5 1.3-1.7L7 10l1.7-2.8A2 2 0 0 1 10.4 6.2h3.9c.8 0 1.4.4 1.8 1l1.9 2.8 2 .7c.7.2 1 .9 1 1.6V16a1 1 0 0 1-1 1h-1.3`.replace("6.2", String(roof))} />
    <path d="M9.7 17h4.6" />
    <circle cx="7.5" cy="17" r="2.2" />
    <circle cx="16.5" cy="17" r="2.2" />
    <path d="M7.4 10h9.3M12 10V6.4" />
  </>
);

/** Ink drawings for the travel category. */
export const travelInkArt: Record<string, React.ReactNode> = {
  "🚗": <g transform="translate(0 .6)">{carBody(6.2)}</g>,
  "🚕": (
    <g transform="translate(0 1.4)">
      {carBody(6.2)}
      <rect x="10" y="2.6" width="4" height="2.2" rx=".7" />
      <path d="M3.4 13.6h2.6M18 13.6h2.6" />
    </g>
  ),
  "🚌": (
    <>
      <rect x="4.5" y="2.8" width="15" height="16" rx="3" />
      <rect x="7" y="5.6" width="10" height="5.6" rx="1" />
      {dot(8.2, 15, 1.2)}
      {dot(15.8, 15, 1.2)}
      <path d="M8 19.4v2M16 19.4v2" strokeWidth="2.6" />
    </>
  ),
  "🚲": (
    <>
      <circle cx="5.8" cy="16" r="3.9" />
      <circle cx="18.2" cy="16" r="3.9" />
      <path d="M5.8 16l3.8-6.6h5.8L11.4 16zM15.4 9.4L18.2 16M15 6.8l.9 2.6M13.9 6.4h2.6M7.8 7.6h3.2M9.6 9.4V7.8" />
    </>
  ),
  "🛵": (
    <>
      <circle cx="5.6" cy="17.2" r="2.7" />
      <circle cx="18.4" cy="17.2" r="2.7" />
      <path d="M8.3 17.2h7.4M18 14.6L15.8 5.8h-2.4M13.6 17.2V13c0-.8-.6-1.4-1.4-1.4H4.6M3 11.6h8.4" />
      <path d="M8.6 9.6h4" />
    </>
  ),
  "🚆": (
    <>
      <path d="M5.6 18V9.4A6.4 6.4 0 0 1 12 3a6.4 6.4 0 0 1 6.4 6.4V18a1.5 1.5 0 0 1-1.5 1.5H7.1A1.5 1.5 0 0 1 5.6 18z" />
      <path d="M5.6 12.6h12.8M12 3v9.6" />
      {dot(8.8, 16, 1.2)}
      {dot(15.2, 16, 1.2)}
      <path d="M8 21.6l1.6-2.1M16 21.6l-1.6-2.1" />
    </>
  ),
  "🚇": (
    <>
      <rect x="2.5" y="4.6" width="19" height="12.6" rx="3.6" />
      <path d="M2.5 13h19M8.4 4.6V13M15.6 4.6V13" />
      {dot(6.4, 15.2, 0.9)}
      {dot(17.6, 15.2, 0.9)}
      <path d="M7 17.2v2M17 17.2v2M2.6 21.2h18.8" />
    </>
  ),
  "✈": (
    <g transform="rotate(45 12 12)">
      <path d="M12 2.2c1.2 1 1.6 2.4 1.6 4V10l7.4 4.6v2l-7.4-2.2V19l2 1.6v1.4L12 21l-3.6 1v-1.4l2-1.6v-4.6L3 16.6v-2L10.4 10V6.2c0-1.6.4-3 1.6-4z" />
    </g>
  ),
  "🛸": (
    <>
      <path d="M7.7 10.2a4.5 4.5 0 0 1 8.6 0" />
      <ellipse cx="12" cy="12.6" rx="9.5" ry="3.4" />
      {dot(7, 12.9, 1)}
      {dot(12, 13.8, 1)}
      {dot(17, 12.9, 1)}
      <path d="M8.4 17.2l-1.8 3.6M12 17.4v3.6M15.6 17.2l1.8 3.6" />
    </>
  ),
  "⛵": (
    <>
      <path d="M11 3.4v12H5.4C6 10.4 8.2 6.2 11 3.4z" />
      <path d="M13.2 6.6c3 2.2 4.8 5.2 5.4 8.8h-5.4z" />
      <path d="M3.4 18h17.2l-2.8 3.2H6.2z" />
    </>
  ),
  "🚢": (
    <>
      <path d="M3 13.6h18l-2.4 5.4H5.4z" />
      <path d="M6.4 13.6V9h11.2v4.6M9.8 9V5.4h4.4V9" />
      {dot(9, 11.4, 1)}
      {dot(12, 11.4, 1)}
      {dot(15, 11.4, 1)}
      <path d="M2.6 21.8c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
    </>
  ),
  "🗺": (
    <>
      <path d="M2.8 6.4L9 4l6 2.4L21.2 4v13.6L15 20l-6-2.4L2.8 20z" />
      <path d="M9 4v13.6M15 6.4V20" />
      {dot(12, 11.8, 1.3)}
    </>
  ),
  "🧭": (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M15.8 8.2l-2 5.6-5.6 2 2-5.6z" />
      {dot(12, 12, 1)}
    </>
  ),
  "🏔": (
    <>
      <path d="M2 19.5L9.5 6l3.3 5.8 2.3-3.3L22 19.5z" />
      <path d="M6.8 10.8l1.8 1.4 1.6-1.4 1.6 1.4" />
    </>
  ),
  "🏖": (
    <>
      <g transform="rotate(-14 12 12)">
        <path d="M4 11a8 8 0 0 1 16 0c-1.3-1.1-2.7-1.1-4 0-1.3-1.1-2.7-1.1-4 0s-2.7-1.1-4 0-2.7-1.1-4 0z" />
        <path d="M12 11.4V21" />
      </g>
      <path d="M2.6 21.2h18.8" />
    </>
  ),
  "🏝": (
    <>
      <path d="M11.2 17.4c.4-3.6.8-5.6 2-8.4" />
      <path d="M13.2 9c-.4-2.6-2.4-4.2-5.4-4.4M13.2 9c1.2-2.6 3.8-3.8 6.6-3M13.2 9c-2 .2-4 1.2-5 3.4M13.2 9c2 .2 3.8 1.4 4.6 3.6" />
      <path d="M5.2 20.4c1.6-2.2 3.8-3 6.2-3s4.6.8 6.2 3zM2.6 22.2" />
    </>
  ),
  "🏕": (
    <>
      <path d="M2.5 20.5L12 4l9.5 16.5z" />
      <path d="M12 11.6l-3.6 8.9M12 11.6l3.6 8.9" />
      <path d="M12 4V2.4" />
    </>
  ),
  "🏙": (
    <>
      <path d="M2.8 21V10.4h5V21M7.8 21V4.6h6.4V21M14.2 21v-8.6h7V21M1.8 21h20.4" />
      {dot(10, 8.4, 0.9)}
      {dot(12, 8.4, 0.9)}
      {dot(10, 12, 0.9)}
      {dot(12, 12, 0.9)}
      {dot(10, 15.6, 0.9)}
      {dot(12, 15.6, 0.9)}
      {dot(17.7, 16, 0.9)}
    </>
  ),
  "🗼": (
    <>
      <path d="M12 2.2V3.6M12 3.6L6.6 21M12 3.6L17.4 21" />
      <path d="M10 9.8h4M8.6 14.6h6.8" />
      <path d="M8.6 14.6l8.2 6.4M15.4 14.6L7.2 21" />
      <path d="M5.2 21h13.6" />
    </>
  ),
  "🗽": (
    <>
      <path d="M8 6.6l1 1M11 4.6v1.8M14 6.6l-1 1" />
      <circle cx="11" cy="9.4" r="2" />
      <path d="M8.2 12.8h5.6l1.8 5.6H6.4z" />
      <path d="M14 13.2l3.8-4.8M17.8 8.4V6" />
      <path d="M17.8 6c-1.2-1.2-1-2.6 0-3.8 1.1 1.2 1.2 2.6 0 3.8z" />
      <path d="M5.4 18.4h11.2v3H5.4z" />
    </>
  ),
  "🏠": (
    <>
      <path d="M3.2 11.6L12 4l8.8 7.6" />
      <path d="M5.6 10v10.6h12.8V10M9.8 20.6v-5.2h4.4v5.2" />
      <path d="M16.4 7.2V4.4h2.2v4.6" />
    </>
  ),
  "🏢": (
    <>
      <rect x="5.5" y="3" width="13" height="18.5" rx="1.5" />
      {dot(9.2, 7, 1)}
      {dot(14.8, 7, 1)}
      {dot(9.2, 10.8, 1)}
      {dot(14.8, 10.8, 1)}
      {dot(9.2, 14.6, 1)}
      {dot(14.8, 14.6, 1)}
      <path d="M10.4 21.5v-3.2h3.2v3.2" />
    </>
  ),
  "🌋": (
    <>
      <path d="M2.8 20.6l5.6-11.4h7.2l5.6 11.4z" />
      <path d="M8.6 9.2c2 1.2 4.8 1.2 6.8 0" />
      <path d="M12 12l-.2 3.4M9.8 20.6l.6-3.4" />
      <path d="M10 6.6L8.8 4.6M12 6V3.2M14 6.6l1.2-2" />
    </>
  ),
};

/** Short names of the drawn travel emoji. */
export const travelInkNames: Record<string, string> = {
  "🚗": "Car",
  "🚕": "Taxi",
  "🚌": "Bus",
  "🚲": "Bicycle",
  "🛵": "Scooter",
  "🚆": "Train",
  "🚇": "Metro",
  "✈️": "Airplane",
  "🛸": "Flying saucer",
  "⛵": "Sailboat",
  "🚢": "Ship",
  "🗺️": "Map",
  "🧭": "Compass",
  "🏔️": "Mountain",
  "🏖️": "Beach",
  "🏝️": "Island",
  "🏕️": "Camping",
  "🏙️": "City",
  "🗼": "Tower",
  "🗽": "Statue",
  "🏠": "House",
  "🏢": "Office building",
  "🌋": "Volcano",
};

/* ----- solid drawings (variants "solid" and "tint") ----- */

/** The car body closed along the bottom, its two windows cut out, the wheels keyed in front (hubs tinted in tint). */
const CAR = "M5.3 17H4a1 1 0 0 1-1-1v-3.2c0-.8.5-1.5 1.3-1.7L7 10l1.7-2.8A2 2 0 0 1 10.4 6.2h3.9c.8 0 1.4.4 1.8 1l1.9 2.8 2 .7c.7.2 1 .9 1 1.6V16a1 1 0 0 1-1 1H5.3z";
const car = (extra: InkSolid["layers"][number]["body"] = [], cuts: InkSolid["layers"][number]["cuts"] = []): InkSolid["layers"] => [
  { body: [P(CAR, 1.75), ...extra], cuts: [P("M8.7 9.4l1.1-1.8c.2-.3.5-.5.9-.5h.7V9.4zM13.2 7.1h1.1c.4 0 .7.2.9.5l1.3 1.8h-3.3z", 0.5), ...cuts] },
  { body: [C(7.5, 17, 2.4), C(16.5, 17, 2.4)], cuts: [soft(C(7.5, 17, 0.85)), soft(C(16.5, 17, 0.85))], key: 0.8 },
];
const drive = (layers: InkSolid["layers"], extra: Partial<InkSolid> = {}): InkSolid => ({ layers, move: "drive", origin: "12px 20px", ...extra });
const pop = (layers: InkSolid["layers"], extra: Partial<InkSolid> = {}): InkSolid => ({ layers, move: "pop", origin: "12px 20px", ...extra });

/** Solid drawings of this category (variants "solid" and "tint"); see emoji-ink-solid-internal. */
export const travelSolidArt: Record<string, InkSolid> = {
  "🚗": drive(car(), { tf: "translate(0 .6)" }),
  "🚕": drive(car([R(10, 2.6, 4, 2.2, 0.7)], [soft(L("M3.6 13.2h16.8", 1))]), { tf: "translate(0 1.4)" }),
  "🚌": drive([{ body: [R(4.5, 2.8, 15, 16, 3), L("M8 19.6v1.6M16 19.6v1.6", 2.6)], cuts: [R(7, 5.6, 10, 5.6, 1), C(8.2, 15, 1.25), C(15.8, 15, 1.25), soft(L("M5.4 13h13.2", 0.9))] }]),
  "🚲": { layers: [{ body: [Ring(5.8, 16, 3.9, 3.9, 1.9), Ring(18.2, 16, 3.9, 3.9, 1.9), L("M5.8 16l3.8-6.6h5.8L11.4 16zM15.4 9.4L18.2 16M15 6.8l.9 2.6M13.9 6.4h2.6M7.8 7.6h3.2M9.6 9.4V7.8", 1.8)] }], move: "crawl", origin: "12px 20px" },
  "🛵": drive([
    { body: [L("M8.3 17.2h7.4M18 14.6L15.8 5.8h-2.4M13.6 17.2V13c0-.8-.6-1.4-1.4-1.4H4.6M3 11.6h8.4", 2.1), R(8.4, 8.6, 4.6, 1.9, 0.95)] },
    { body: [C(5.6, 17.2, 2.9), C(18.4, 17.2, 2.9)], cuts: [soft(C(5.6, 17.2, 1)), soft(C(18.4, 17.2, 1))], key: 0.8 },
  ]),
  "🚆": drive([
    {
      body: [P("M5.6 18V9.4A6.4 6.4 0 0 1 12 3a6.4 6.4 0 0 1 6.4 6.4V18a1.5 1.5 0 0 1-1.5 1.5H7.1A1.5 1.5 0 0 1 5.6 18z", 1.75), L("M8 21.6l1.6-2.1M16 21.6l-1.6-2.1", 1.8)],
      cuts: [P("M7.2 11.8V9.4a4.8 4.8 0 0 1 4-4.7v7.1zM16.8 11.8V9.4a4.8 4.8 0 0 0-4-4.7v7.1z", 0.4), C(8.8, 16, 1.25), C(15.2, 16, 1.25)],
    },
  ]),
  "🚇": drive([
    {
      body: [R(2.5, 4.6, 19, 12.6, 3.6), L("M7 17.6v1.6M17 17.6v1.6M2.6 21.2h18.8", 1.8)],
      cuts: [R(4.3, 6.4, 3.3, 5.6, 1), R(9.6, 6.4, 4.8, 5.6, 1), R(16.4, 6.4, 3.3, 5.6, 1), C(6.4, 15, 0.95), C(17.6, 15, 0.95), soft(L("M3.6 13.2h16.8", 0.9))],
    },
  ]),
  "✈": {
    layers: [{ body: [P("M12 2.2c1.2 1 1.6 2.4 1.6 4V10l7.4 4.6v2l-7.4-2.2V19l2 1.6v1.4L12 21l-3.6 1v-1.4l2-1.6v-4.6L3 16.6v-2L10.4 10V6.2c0-1.6.4-3 1.6-4z", 1.2)], cuts: [soft(L("M12 4.8v3.6", 1))] }],
    tf: "rotate(45 12 12)",
    move: "launch",
    origin: "12px 12px",
  },
  /* Flying saucer: a glass dome over the saucer (a paper line between), its lights cut out, the beams below. */
  "🛸": {
    layers: [
      {
        body: [soft(P("M7.7 10.2a4.5 4.5 0 0 1 8.6 0z", 1.4)), O(12, 12.6, 9.6, 3.5)],
        cuts: [L("M5.6 10.5h12.8", 1), ...pt("light", "spark", [C(7, 12.9, 1.05), C(12, 13.8, 1.05), C(17, 12.9, 1.05)], undefined, true)],
      },
    ],
    lines: [L("M8.4 17.2l-1.8 3.6M12 17.4v3.6M15.6 17.2l1.8 3.6", 1.6)],
    move: "float",
    origin: "12px 12px",
  },
  "⛵": {
    layers: [{ body: [P("M11 3.4v12H5.4C6 10.4 8.2 6.2 11 3.4z", 1.3), soft(P("M13.2 6.6c3 2.2 4.8 5.2 5.4 8.8h-5.4z", 1.3)), P("M3.4 18h17.2l-2.8 3.2H6.2z", 1.3)] }],
    move: "rock",
    origin: "12px 20px",
  },
  "🚢": {
    layers: [
      {
        body: [P("M3 13.6h18l-2.4 5.4H5.4z", 1.5), P("M6.4 13.6V9h11.2v4.6z", 1.2), R(9.8, 5.4, 4.4, 3.8, 0.4)],
        cuts: [L("M2.6 14h18.8M6 9.2h12", 1), C(9, 11.4, 1), C(12, 11.4, 1), C(15, 11.4, 1)],
      },
    ],
    lines: [pt("waves", "crawl", L("M2.6 21.8c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0", 1.6))],
    move: "rock",
    origin: "12px 16px",
  },
  "🗺": pop([{ body: [P("M2.8 6.4L9 4l6 2.4L21.2 4v13.6L15 20l-6-2.4L2.8 20z", 1.5)], cuts: [L("M9 4.4v12.8M15 6.8v12.8", 1.2), soft(C(12, 11.8, 1.4))] }], { origin: "12px 12px" }),
  /* Compass: the needle cut out of the disc, its north half given back; the needle swings and settles. */
  "🧭": {
    layers: [
      {
        body: [C(12, 12, 10)],
        cuts: [pt("needle", "needle", P("M15.8 8.2l-2 5.6-5.6 2 2-5.6z", 0.7), "12px 12px"), soft(Ring(12, 12, 7.6, 7.6, 0.9))],
        restore: [pt("needle", "needle", P("M15.8 8.2l-2 5.6L10.2 10.2z", 0.3), "12px 12px")],
      },
    ],
  },
  "🏔": pop([{ body: [P("M2 19.5L9.5 6l3.3 5.8 2.3-3.3L22 19.5z", 1.4)], cuts: [soft(P("M7.2 10.4L9.5 6.4l2.2 3.8-1.5 1.1-1.4-1.1z", 0.5))] }]),
  "🏖": {
    layers: [
      { body: [G("rotate(-14 12 12)", [P("M4 11a8 8 0 0 1 16 0c-1.3-1.1-2.7-1.1-4 0-1.3-1.1-2.7-1.1-4 0s-2.7-1.1-4 0-2.7-1.1-4 0z", 1.4), L("M12 11.4V21", 1.7)]), L("M2.6 21.4h18.8", 1.8)], cuts: [G("rotate(-14 12 12)", [soft(L("M12 3.4V10.4M8.6 4.4l-.8 5.8M15.4 4.4l.8 5.8", 1))])] },
    ],
    move: "sway",
    origin: "12px 21px",
  },
  "🏝": {
    layers: [
      { body: [P("M5.2 20.4c1.6-2.2 3.8-3 6.2-3s4.6.8 6.2 3z", 1.4)] },
      { body: [L("M11.2 17.6c.4-3.6.8-5.6 2-8.4", 2), L("M13.2 9c-.4-2.6-2.4-4.2-5.4-4.4M13.2 9c1.2-2.6 3.8-3.8 6.6-3M13.2 9c-2 .2-4 1.2-5 3.4M13.2 9c2 .2 3.8 1.4 4.6 3.6", 2.1)], key: 0.6, part: { name: "palm", move: "sway", origin: "11.4px 17.4px" } },
    ],
  },
  "🏕": pop([{ body: [P("M2.5 20.5L12 4l9.5 16.5z", 1.4), L("M12 4V2.2", 1.6)], cuts: [P("M12 11.6l-3.6 8.9h7.2z", 0.6)] }]),
  "🏙": pop([
    {
      body: [R(2.8, 10.4, 5, 10.6), R(7.8, 4.6, 6.4, 16.4), R(14.2, 12.4, 7, 8.6), L("M1.8 21.4h20.4", 1.6)],
      cuts: [L("M7.8 9.6v11.4M14.2 11.6v9.4", 1), ...[[10, 7.8], [12, 7.8], [10, 11.4], [12, 11.4], [10, 15], [12, 15], [17.7, 15.4], [4.4, 13.4]].map(([x, y]) => soft(R(x! - 0.55, y!, 1.1, 1.6, 0.3)))],
    },
  ]),
  "🗼": { layers: [{ body: [L("M12 2.2V3.6M12 3.6L6.6 21M12 3.6L17.4 21M10 9.8h4M8.6 14.6h6.8M8.6 14.6l8.2 6.4M15.4 14.6L7.2 21M5.2 21h13.6", 1.9)] }], move: "sway", origin: "12px 21px" },
  /* Statue: the robed figure on its base, the torch flame flickers. */
  "🗽": {
    layers: [
      {
        body: [L("M8 6.6l1 1M11 4.6v1.8M14 6.6l-1 1", 1.6), C(11, 9.4, 2.3), P("M8.2 12.8h5.6l1.8 5.6H6.4z", 1.2), L("M14 13.2l3.8-4.8M17.8 8.4V6.4", 1.8), R(5.4, 18.4, 11.2, 3, 0.4)],
        cuts: [L("M5 18.6h12", 1)],
      },
    ],
    dots: [pt("flame", "flicker", P("M17.8 6c-1.2-1.2-1-2.6 0-3.8 1.1 1.2 1.2 2.6 0 3.8z", 1), "17.8px 6px")],
  },
  "🏠": pop([
    { body: [R(5.6, 10.4, 12.8, 10.6, 0.6), P("M2.4 11.6L12 3.4l9.6 8.2z", 1), R(16.4, 4.4, 2.2, 4.4, 0.3)], cuts: [L("M4.6 11.9h14.8", 1), R(9.8, 15.4, 4.4, 5.8, 0.6), soft(C(12, 8.6, 1))] },
  ]),
  "🏢": pop([
    {
      body: [R(5.5, 3, 13, 18.5, 1.5)],
      cuts: [...[[9.2, 7], [14.8, 7], [9.2, 10.8], [14.8, 10.8], [9.2, 14.6], [14.8, 14.6]].map(([x, y]) => soft(R(x! - 0.9, y! - 0.9, 1.8, 1.8, 0.4))), R(10.4, 18.3, 3.2, 3.6, 0.4)],
    },
  ]),
  /* Volcano: the cone with the crater and lava cut, the eruption bursts. */
  "🌋": {
    layers: [{ body: [P("M2.8 20.6l5.6-11.4h7.2l5.6 11.4z", 1.4)], cuts: [L("M8.6 9.4c2 1.2 4.8 1.2 6.8 0", 1.2), soft(L("M12 12l-.2 3.4M9.8 20.6l.6-3.4", 1.3))] }],
    lines: [pt("eruption", "burst", L("M10 6.6L8.8 4.6M12 6V3.2M14 6.6l1.2-2", 1.7), "12px 8px")],
  },
};
