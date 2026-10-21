/**
 * Ink drawings of the smileys and people categories of the built-in emoji set (assets/emoji-ink-smileys-internal,
 * assets/emoji-ink-people-internal): every emoji of the two categories has art and a name, the art is flat and uses
 * currentColor only, no two drawings are the same, and no entry is a stray.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InkEmoji, hasInkEmoji, inkEmojiNames, inkEmojiSet } from "../src/assets/emoji-ink";
import { emojiCategories } from "../src/assets/emoji-reactions";
import { smileyInkArt, smileyInkNames } from "../src/assets/emoji-ink-smileys-internal";
import { peopleInkArt, peopleInkNames } from "../src/assets/emoji-ink-people-internal";

const strip = (emoji: string) => emoji.replace(/[︎️]/g, "");
/** The twenty emoji drawn in the base file (reaction presets and common ones). */
const base = new Set(["👍", "👎", "❤", "😂", "🎉", "😮", "😢", "🔥", "👀", "🙏", "👏", "😍", "🤔", "✅", "🚀", "💯", "😡", "⭐", "💡", "✨"]);

const groups = [
  { id: "smileys", art: smileyInkArt, names: smileyInkNames },
  { id: "people", art: peopleInkArt, names: peopleInkNames },
];

describe.each(groups)("ink emoji: $id", ({ id, art, names }) => {
  const category = emojiCategories.find((entry) => entry.id === id)!;
  const emojis = category.emojis.map((entry) => entry.emoji);
  const own = emojis.filter((emoji) => !base.has(strip(emoji)));

  it("has art and a name for every emoji that the base file does not draw", () => {
    expect(category).toBeTruthy();
    expect(own.length).toBeGreaterThan(15);
    for (const emoji of own) {
      expect(art[strip(emoji)], `art for ${emoji}`).toBeTruthy();
      expect(Object.keys(names).map(strip), `name for ${emoji}`).toContain(strip(emoji));
    }
    for (const emoji of emojis) {
      expect(hasInkEmoji(emoji), emoji).toBe(true);
      expect(inkEmojiSet.map(strip), emoji).toContain(strip(emoji));
    }
  });

  it("has no stray entries: every art and name is an emoji of the category, and each art has a name", () => {
    const inCategory = new Set(emojis.map(strip));
    for (const key of Object.keys(art)) {
      expect(inCategory.has(key), `art ${key}`).toBe(true);
      expect(key, `art key ${key} carries no variation selector`).toBe(strip(key));
    }
    for (const key of Object.keys(names)) {
      expect(inCategory.has(strip(key)), `name ${key}`).toBe(true);
      expect(names[key]).toMatch(/^[A-Z][A-Za-z' -]{2,}$/);
    }
    expect(Object.keys(names).map(strip).sort()).toEqual(Object.keys(art).sort());
  });

  it("renders an svg through InkEmoji in currentColor only, with no colour literals", () => {
    for (const emoji of own) {
      const { container, unmount } = render(<InkEmoji emoji={emoji} size={24} title variant="outline" />);
      const svg = container.querySelector("svg");
      expect(svg, emoji).not.toBeNull();
      expect(svg!.getAttribute("stroke")).toBe("currentColor");
      expect(svg!.querySelector("title")?.textContent, emoji).toBe(inkEmojiNames[emoji] ?? inkEmojiNames[strip(emoji)]);
      const html = svg!.outerHTML;
      expect(html, emoji).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|url\(|opacity/i);
      expect(html, emoji).not.toMatch(/<(text|image|linearGradient|radialGradient|filter)\b/);
      for (const match of html.matchAll(/\b(fill|stroke)="([^"]*)"/g)) expect(["none", "currentColor"], `${emoji} ${match[1]}`).toContain(match[2]);
      expect(svg!.querySelectorAll("path, circle, ellipse, rect, g").length, emoji).toBeGreaterThan(1);
      unmount();
    }
  });

  it("draws every emoji differently", () => {
    const markup = Object.entries(art).map(([key, node]) => [key, renderToStaticMarkup(<>{node}</>)] as const);
    expect(new Set(markup.map(([, svg]) => svg)).size).toBe(markup.length);
    for (const [key, svg] of markup) expect(svg.length, key).toBeGreaterThan(40);
  });
});
