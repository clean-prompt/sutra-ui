/**
 * Ink art for the travel, objects and symbols categories of the built-in emoji set (assets/emoji-ink-travel-internal,
 * -objects-, -symbols-): every emoji of these categories has a drawing and a name, each drawing renders an svg that only
 * uses currentColor, no two drawings are the same, and the files hold no strays.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InkEmoji, hasInkEmoji, inkEmojiNames } from "../src/assets/emoji-ink";
import { emojiCategories } from "../src/assets/emoji-reactions";
import { travelInkArt, travelInkNames } from "../src/assets/emoji-ink-travel-internal";
import { objectInkArt, objectInkNames } from "../src/assets/emoji-ink-objects-internal";
import { symbolInkArt, symbolInkNames } from "../src/assets/emoji-ink-symbols-internal";

const strip = (emoji: string) => emoji.replace(/[︎️]/g, "");
const baseTwenty = ["👍", "👎", "❤", "😂", "🎉", "😮", "😢", "🔥", "👀", "🙏", "👏", "😍", "🤔", "✅", "🚀", "💯", "😡", "⭐", "💡", "✨"];

const groups = [
  { id: "travel", art: travelInkArt, names: travelInkNames },
  { id: "objects", art: objectInkArt, names: objectInkNames },
  { id: "symbols", art: symbolInkArt, names: symbolInkNames },
];

describe.each(groups)("ink art of the $id category", ({ id, art, names }) => {
  const emojis = emojiCategories.find((category) => category.id === id)!.emojis.map((entry) => entry.emoji);

  it("draws every emoji of the category and names it", () => {
    expect(emojis).toHaveLength(24);
    for (const emoji of emojis) {
      expect(hasInkEmoji(emoji), emoji).toBe(true);
      expect(inkEmojiNames[emoji] ?? inkEmojiNames[strip(emoji)], emoji).toBeTruthy();
    }
  });

  it("holds no strays and does not redraw the first twenty", () => {
    const set = new Set(emojis.map(strip));
    for (const key of Object.keys(art)) {
      expect(key, key).toBe(strip(key));
      expect(set.has(key), key).toBe(true);
      expect(baseTwenty.includes(key), key).toBe(false);
    }
    for (const key of Object.keys(names)) {
      expect(emojis.includes(key), key).toBe(true);
      expect(names[key].length, key).toBeGreaterThan(2);
    }
    expect(Object.keys(names).map(strip).sort()).toEqual(Object.keys(art).sort());
  });

  it("renders each drawing as a 24 box svg that only uses currentColor", () => {
    for (const emoji of emojis) {
      const { container, unmount } = render(<InkEmoji emoji={emoji} />);
      const svg = container.querySelector("svg")!;
      expect(svg, emoji).toHaveAttribute("viewBox", "0 0 24 24");
      expect(svg.querySelector("path, circle, ellipse, rect, line, polyline"), emoji).toBeInTheDocument();
      const paint = [svg, ...Array.from(svg.querySelectorAll("*"))].flatMap((node) =>
        ["fill", "stroke"].map((name) => node.getAttribute(name)).filter((value): value is string => value !== null)
      );
      for (const value of paint) expect(["currentColor", "none"], emoji).toContain(value);
      expect(svg.outerHTML, emoji).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|style="[^"]*(color|fill|stroke)/i);
      unmount();
    }
  });

  it("draws every emoji differently, also from the other categories", () => {
    const seen = new Map<string, string>();
    for (const emoji of emojis) {
      const markup = render(<InkEmoji emoji={emoji} />).container.querySelector("svg")!.innerHTML;
      expect(seen.get(markup), `${emoji} is the same as ${seen.get(markup)}`).toBeUndefined();
      seen.set(markup, emoji);
    }
  });
});

it("keeps the three groups apart", () => {
  const keys = [...Object.keys(travelInkArt), ...Object.keys(objectInkArt), ...Object.keys(symbolInkArt)];
  // 🚀 (travel), 💡 (objects) and ❤ 💯 🔥 ✨ 🎉 ✅ (symbols) are drawn in the base file and must stay out of the group files
  expect(new Set(keys).size).toBe(keys.length);
});
