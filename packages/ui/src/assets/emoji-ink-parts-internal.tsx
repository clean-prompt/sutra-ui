import * as React from "react";

/*
 * Shared parts for the ink emoji drawings (24 box, drawn with the stroke of the parent svg: 1.75, round caps and joins,
 * `currentColor`, flat). Small solid accents (pupils, tears, sparks) use `fill="currentColor" stroke="none"`.
 * Nothing here is traced from an emoji font or an icon set.
 */

/** Strips variation selectors so that "❤" and "❤️" match. */
export function normalizeEmoji(emoji: string): string {
  return emoji.replace(/[︎️]/g, "");
}

export const dot = (cx: number, cy: number, r = 1.1) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

export const Face = () => <circle cx="12" cy="12" r="9.5" />;

/** A five-point star as a polygon path around (cx, cy). */
export function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (-90 + i * 36) * (Math.PI / 180);
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join("L")}z`;
}

export const thumb = (
  <>
    <rect x="3" y="11" width="4" height="9" rx="1" />
    <path d="M7 11.6l3.4-7a1.6 1.6 0 0 1 3 1.1L13 9.6h5.9a2 2 0 0 1 1.95 2.45l-1.4 6.5A2 2 0 0 1 17.5 20H7" />
  </>
);

export const heartEye = (cx: number, cy: number) => (
  <path
    transform={`translate(${cx} ${cy})`}
    d="M0 2.6C-1.6 1.6-3 .4-3-1.1a1.6 1.6 0 0 1 3-.7 1.6 1.6 0 0 1 3 .7C3 .4 1.6 1.6 0 2.6z"
    fill="currentColor"
    strokeWidth="1"
  />
);
