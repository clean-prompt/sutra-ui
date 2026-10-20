import type * as React from "react";
import { dot } from "./emoji-ink-parts-internal";

/*
 * Ink drawings for the objects category (see emoji-ink-parts-internal for the shared parts and the style rules). Objects fill
 * roughly the 3..21 area, flat, one outline each; tilted ones are drawn upright and turned in a group.
 */

/** A pencil drawn upright around the origin (eraser up, tip down); the caller moves, turns and scales it. */
const pencil = (
  <>
    <path d="M-2.2 -9.8h4.4V5l-2.2 4.4L-2.2 5z" />
    <path d="M-2.2 5h4.4M-2.2 -6.2h4.4" />
  </>
);

/** A gear outline with `teeth` teeth between the radii `inner` and `outer`, as one closed path around (12, 12). */
function gearPath(teeth: number, inner: number, outer: number): string {
  const step = (Math.PI * 2) / teeth;
  const pt = (radius: number, angle: number) => `${(12 + radius * Math.cos(angle)).toFixed(2)} ${(12 + radius * Math.sin(angle)).toFixed(2)}`;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step - Math.PI / 2;
    parts.push(`${pt(inner, a - step * 0.5)}L${pt(inner, a - step * 0.24)}L${pt(outer, a - step * 0.15)}L${pt(outer, a + step * 0.15)}L${pt(inner, a + step * 0.24)}`);
  }
  return `M${parts.join("L")}z`;
}

/** Ink drawings for the objects category. */
export const objectInkArt: Record<string, React.ReactNode> = {
  "📌": (
    <g transform="rotate(40 12 12)">
      <path d="M8.8 3h6.4M10 3v6.4L7.4 12.8h9.2L14 9.4V3M12 12.8V21" />
    </g>
  ),
  "📎": (
    <g transform="rotate(40 12 12)">
      <path d="M16.6 9v7a4.6 4.6 0 0 1-9.2 0V7.4a3.1 3.1 0 0 1 6.2 0v8a1.6 1.6 0 0 1-3.2 0V9" />
    </g>
  ),
  "📝": (
    <>
      <path d="M13 20.5H5.5v-17h9l4 4V12" />
      <path d="M14.5 3.5v4h4M8.4 10.8h6.4M8.4 14.2h3" />
      <g transform="translate(16.6 16.6) rotate(45) scale(.62)">{pencil}</g>
    </>
  ),
  "📅": (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      {dot(8, 13.8, 1)}
      {dot(12, 13.8, 1)}
      {dot(16, 13.8, 1)}
      {dot(8, 17, 1)}
      {dot(12, 17, 1)}
    </>
  ),
  "📚": (
    <>
      <rect x="3.5" y="6" width="4.2" height="14.5" rx="1" />
      <rect x="8.4" y="3.8" width="4.2" height="16.7" rx="1" />
      <rect x="-2.1" y="-8" width="4.2" height="16" rx="1" transform="translate(17.9 12.6) rotate(-14)" />
      <path d="M3.5 10h4.2M8.4 8h4.2M2.6 21.4h18.8" />
    </>
  ),
  "📖": (
    <>
      <path d="M12 6.4C9.8 4.9 6.6 4.5 3.2 5.1v13c3.4-.6 6.6-.2 8.8 1.3 2.2-1.5 5.4-1.9 8.8-1.3v-13c-3.4-.6-6.6-.2-8.8 1.3zM12 6.4v13" />
      <path d="M6 8.6c1.4-.1 2.7 0 3.8.5M6 11.8c1.4-.1 2.7 0 3.8.5M14.2 9.1c1.1-.5 2.4-.6 3.8-.5" />
    </>
  ),
  "✏": <g transform="translate(12 12) rotate(45)">{pencil}</g>,
  "💻": (
    <>
      <rect x="4.6" y="4.6" width="14.8" height="12" rx="1.8" />
      <path d="M2.6 16.6h18.8v1a1.6 1.6 0 0 1-1.6 1.6H4.2a1.6 1.6 0 0 1-1.6-1.6z" />
    </>
  ),
  "🖥": (
    <>
      <rect x="3" y="3.6" width="18" height="12.6" rx="2" />
      <path d="M3 12.8h18M12 16.2v3.4M8 20.4h8" />
    </>
  ),
  "📱": (
    <>
      <rect x="6.8" y="2.6" width="10.4" height="18.8" rx="2.6" />
      <path d="M10.4 5.4h3.2" />
      {dot(12, 18.4, 1)}
    </>
  ),
  "⌨": (
    <>
      <rect x="2.6" y="6.2" width="18.8" height="11.6" rx="2.2" />
      {dot(6.2, 9.8, 0.9)}
      {dot(9.4, 9.8, 0.9)}
      {dot(12.6, 9.8, 0.9)}
      {dot(15.8, 9.8, 0.9)}
      {dot(18.2, 9.8, 0.9)}
      {dot(7.8, 12.8, 0.9)}
      {dot(11, 12.8, 0.9)}
      {dot(14.2, 12.8, 0.9)}
      {dot(17.4, 12.8, 0.9)}
      <path d="M8 15.2h8" />
    </>
  ),
  "📷": (
    <>
      <path d="M3 8.4a2 2 0 0 1 2-2h2.4l1.4-2.2h6.4l1.4 2.2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.7" />
      {dot(17.8, 9.8, 0.9)}
    </>
  ),
  "🔒": (
    <>
      <rect x="4.8" y="10.4" width="14.4" height="10.6" rx="2.4" />
      <path d="M8 10.4V7.8a4 4 0 0 1 8 0v2.6" />
      {dot(12, 14.6, 1.3)}
      <path d="M12 15v2.4" />
    </>
  ),
  "🔑": (
    <>
      <circle cx="7.4" cy="16.6" r="3.6" />
      <path d="M10 14L20.4 3.6M17.4 6.6l2.4 2.4M14.6 9.4l2 2" />
    </>
  ),
  "🛠": (
    <>
      <g transform="rotate(45 12 12)">
        <path d="M8.9 2.8v3.5l1.4 1.5h3.4l1.4-1.5V2.8a4.2 4.2 0 0 1 1.1 6.2c-.7 1-1.8 1.7-3 2v1.6h-2.6V11c-1.2-.3-2.3-1-3-2a4.2 4.2 0 0 1 1.1-6.2z" />
        <rect x="10.7" y="12.6" width="2.6" height="8.8" rx="1.3" />
      </g>
      <g transform="rotate(-45 12 12)">
        <rect x="10.4" y="13" width="3.2" height="8.4" rx="1.4" />
        <path d="M12 13V4.2M12 4.2V2.6" />
      </g>
    </>
  ),
  "⚙": (
    <>
      <path d={gearPath(8, 7.1, 9.6)} />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "📦": (
    <>
      <path d="M12 2.8l8.4 4.6v9.2L12 21.2l-8.4-4.6V7.4z" />
      <path d="M3.6 7.4L12 12l8.4-4.6M12 12v9.2M7.8 5.1l8.4 4.6" />
    </>
  ),
  "✉": (
    <>
      <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.4" />
      <path d="M3.4 7.6L12 13.6l8.6-6" />
    </>
  ),
  "📈": (
    <>
      <path d="M3.6 3.6v16.8h16.8" />
      <path d="M7 15.6l3.8-4.2 3 2.8 5.2-6M15.4 8.2H19v3.6" />
    </>
  ),
  "💰": (
    <>
      <path d="M9.6 7.2C6 9.6 3.8 12.6 3.8 15.8c0 3 2.4 5 8.2 5s8.2-2 8.2-5c0-3.2-2.2-6.2-5.8-8.6" />
      <path d="M9.6 7.2L8.4 3.6c1.2.8 2.4.8 3.6 0 1.2.8 2.4.8 3.6 0l-1.2 3.6z" />
      <path d="M13.9 13c-.4-.9-1.1-1.2-1.9-1.2-1 0-1.8.5-1.8 1.4 0 1.9 3.8 1 3.8 3 0 .9-.8 1.5-2 1.5-.9 0-1.6-.4-2-1.2M12 10.6v1.2M12 17.7v1.2" />
    </>
  ),
  "💳": (
    <>
      <rect x="2.6" y="5" width="18.8" height="14" rx="2.6" />
      <path d="M2.6 9.6h18.8M6 15h4M14 15h4" />
    </>
  ),
  "⏰": (
    <>
      <circle cx="12" cy="13" r="7.6" />
      <path d="M12 9v4.2l2.8 1.6" />
      <path d="M3.4 8.4A5 5 0 0 1 7.2 3M20.6 8.4A5 5 0 0 0 16.8 3M7 19.6l-1.6 2M17 19.6l1.6 2" />
    </>
  ),
  "🎁": (
    <>
      <rect x="3" y="7.8" width="18" height="3.6" rx="1.2" />
      <path d="M4.4 11.4v8.1a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-8.1M12 7.8v13.3" />
      <path d="M12 7.8C11 4.4 6.6 3.6 6.6 6.2c0 1.6 2.6 1.6 5.4 1.6zM12 7.8c1-3.4 5.4-4.2 5.4-1.6 0 1.6-2.6 1.6-5.4 1.6z" />
    </>
  ),
};

/** Short names of the drawn objects emoji. */
export const objectInkNames: Record<string, string> = {
  "📌": "Pushpin",
  "📎": "Paperclip",
  "📝": "Memo",
  "📅": "Calendar",
  "📚": "Books",
  "📖": "Open book",
  "✏️": "Pencil",
  "💻": "Laptop",
  "🖥️": "Desktop computer",
  "📱": "Phone",
  "⌨️": "Keyboard",
  "📷": "Camera",
  "🔒": "Lock",
  "🔑": "Key",
  "🛠️": "Tools",
  "⚙️": "Gear",
  "📦": "Package",
  "✉️": "Envelope",
  "📈": "Chart going up",
  "💰": "Money bag",
  "💳": "Credit card",
  "⏰": "Alarm clock",
  "🎁": "Gift",
};
