/**
 * Ink art for the nature, food and activities categories of the built-in emoji set (assets/emoji-ink-nature-internal,
 * -food-, -activities-): every emoji of the three categories has a name and a drawing that renders through `InkEmoji`
 * with `currentColor` only, no two drawings are alike and the files hold no stray entries.
 */
import * as React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InkEmoji, hasInkEmoji, inkEmojiNames } from "../src/assets/emoji-ink";
import { emojiCategories } from "../src/assets/emoji-reactions";
import { natureInkArt, natureInkNames } from "../src/assets/emoji-ink-nature-internal";
import { foodInkArt, foodInkNames } from "../src/assets/emoji-ink-food-internal";
import { activityInkArt, activityInkNames } from "../src/assets/emoji-ink-activities-internal";

const strip = (emoji: string) => emoji.replace(/[︎️]/g, "");
/** Drawn in the base file (reaction presets and common ones), so these categories do not repeat them. */
const inBase = new Set(["⭐"]);

const groups = [
  { id: "nature", art: natureInkArt, names: natureInkNames },
  { id: "food", art: foodInkArt, names: foodInkNames },
  { id: "activities", art: activityInkArt, names: activityInkNames },
];

describe.each(groups)("ink emoji: $id", ({ id, art, names }) => {
  const category = emojiCategories.find((entry) => entry.id === id)!;
  const emojis = category.emojis.map((entry) => entry.emoji);
  const own = emojis.filter((emoji) => !inBase.has(strip(emoji)));

  it("draws every emoji of the category and names it", () => {
    expect(own.length).toBeGreaterThan(20);
    for (const emoji of emojis) {
      expect(hasInkEmoji(emoji), `${emoji} has art`).toBe(true);
      expect(inkEmojiNames[emoji] ?? inkEmojiNames[strip(emoji)], `${emoji} has a name`).toBeTruthy();
    }
    for (const emoji of own) {
      expect(art[strip(emoji)], `${emoji} is drawn in the ${id} file`).toBeTruthy();
      expect(names[emoji], `${emoji} is named in the ${id} file`).toBeTruthy();
    }
  });

  it("has no stray entries", () => {
    const known = new Set(emojis.map(strip));
    for (const key of Object.keys(art)) expect(known.has(key), `${key} is an emoji of ${id}`).toBe(true);
    for (const key of Object.keys(names)) {
      expect(known.has(strip(key)), `${key} is an emoji of ${id}`).toBe(true);
      expect(key, `${key} is spelled as the picker lists it`).toBe(emojis.find((emoji) => strip(emoji) === strip(key)));
      expect(art[strip(key)], `${key} has art`).toBeTruthy();
    }
    expect(Object.keys(art).length).toBe(Object.keys(names).length);
  });

  it.each(own)("%s renders a 24 box svg that only uses currentColor", (emoji) => {
    const { container } = render(<InkEmoji emoji={emoji} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg.querySelector("path, circle, ellipse, rect")).toBeInTheDocument();
    const paint = [svg, ...Array.from(svg.querySelectorAll("*"))].flatMap((node) =>
      ["fill", "stroke"].map((name) => node.getAttribute(name)).filter((value): value is string => value !== null)
    );
    for (const value of paint) expect(["currentColor", "none"]).toContain(value);
    expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|style="[^"]*(color|fill|stroke)/i);
    expect(svg.outerHTML).not.toMatch(/NaN|undefined/);
    expect(svg.querySelectorAll("*").length).toBeLessThan(40);
  });

  it("draws every emoji differently", () => {
    const drawings = own.map((emoji) => render(<InkEmoji emoji={emoji} />).container.querySelector("svg")!.innerHTML);
    expect(new Set(drawings).size).toBe(drawings.length);
  });
});

it("keeps the three categories apart", () => {
  const seen = new Set<string>();
  for (const { art } of groups) {
    for (const key of Object.keys(art)) {
      expect(seen.has(key), `${key} is drawn once`).toBe(false);
      seen.add(key);
    }
  }
});
