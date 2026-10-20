import * as React from "react";

/*
 * Original monoline drawings for the most common emoji (24 box, drawn with the stroke of the parent svg: 1.75, round caps
 * and joins, `currentColor`, flat). Small solid accents (pupils, tears, sparks) use `fill="currentColor" stroke="none"`.
 * Nothing here is traced from an emoji font or an icon set.
 */

/** Strips variation selectors so that "❤" and "❤️" match. */
export function normalizeEmoji(emoji: string): string {
  return emoji.replace(/[︎️]/g, "");
}

const dot = (cx: number, cy: number, r = 1.1) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

const Face = () => <circle cx="12" cy="12" r="9.5" />;

/** A five-point star as a polygon path around (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (-90 + i * 36) * (Math.PI / 180);
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${points.join("L")}z`;
}

const thumb = (
  <>
    <rect x="3" y="11" width="4" height="9" rx="1" />
    <path d="M7 11.6l3.4-7a1.6 1.6 0 0 1 3 1.1L13 9.6h5.9a2 2 0 0 1 1.95 2.45l-1.4 6.5A2 2 0 0 1 17.5 20H7" />
  </>
);

const heartEye = (cx: number, cy: number) => (
  <path
    transform={`translate(${cx} ${cy})`}
    d="M0 2.6C-1.6 1.6-3 .4-3-1.1a1.6 1.6 0 0 1 3-.7 1.6 1.6 0 0 1 3 .7C3 .4 1.6 1.6 0 2.6z"
    fill="currentColor"
    strokeWidth="1"
  />
);

/** Art by emoji (variation selectors removed). */
export const inkArt: Record<string, React.ReactNode> = {
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
export const inkEmojiNames: Record<string, string> = {
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
