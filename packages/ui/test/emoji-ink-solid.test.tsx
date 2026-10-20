/**
 * Solid ink emoji (assets/emoji-ink, assets/emoji-ink-solid-internal): every emoji of the built-in set has a filled drawing
 * ("solid") and its tint ("tint") next to the monoline one ("outline"). Holes are real cut-outs (an SVG mask per instance,
 * painted only in white and black inside the mask), the drawings name their moving parts, and the motion is CSS keyframes in
 * the emoji section of styles/sutra.css that the script starts by setting `data-play`. These tests pin all of that, and the
 * props that carry it through EmojiGlyph, EmojiReaction, EmojiReactionBar and EmojiPicker.
 */
import * as React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmojiGlyph, InkEmoji, hasInkEmoji, inkEmojiSet, playInkEmoji } from "../src/assets/emoji-ink";
import { EmojiPicker, EmojiReaction, EmojiReactionBar, emojiCategories } from "../src/assets/emoji-reactions";
import { solidInkArt } from "../src/assets/emoji-ink-internal";
import { INK_TINT, movesOf } from "../src/assets/emoji-ink-solid-internal";

const css = readFileSync(path.join(__dirname, "../src/styles/sutra.css"), "utf8");
const motion = css.slice(css.indexOf("Ink emoji motion (InkEmoji"));
const strip = (emoji: string) => emoji.replace(/[︎️]/g, "");
const picker = emojiCategories.flatMap((category) => category.emojis.map((entry) => entry.emoji));
/** The svg markup without the per-instance ids, so two renders of one drawing compare equal. */
const shape = (svg: Element) => svg.innerHTML.replace(/sutra-emoji-[\w-]+/g, "ID");

afterEach(() => {
  document.documentElement.removeAttribute("data-motion");
});

describe("solid and tint art", () => {
  it("covers every emoji of the built-in set (and every emoji that has an outline drawing)", () => {
    expect(picker.length).toBeGreaterThan(190);
    for (const emoji of picker) {
      expect(hasInkEmoji(emoji, "solid"), `${emoji} solid`).toBe(true);
      expect(hasInkEmoji(emoji, "tint"), `${emoji} tint`).toBe(true);
      expect(hasInkEmoji(emoji, "outline"), `${emoji} outline`).toBe(true);
    }
    for (const emoji of inkEmojiSet) expect(hasInkEmoji(emoji, "solid"), emoji).toBe(true);
    expect(Object.keys(solidInkArt).length).toBe(inkEmojiSet.length);
    expect(hasInkEmoji("🦖", "solid")).toBe(false);
  });

  it.each(inkEmojiSet)("%s: solid is filled art with real holes and only ink, white and black", (emoji) => {
    const { container } = render(<InkEmoji emoji={emoji} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("data-variant", "solid");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).not.toHaveAttribute("stroke");
    expect(svg.querySelector('[data-part="all"]')).toBeInTheDocument();
    for (const node of Array.from(svg.querySelectorAll("*"))) {
      for (const name of ["fill", "stroke"]) {
        const value = node.getAttribute(name);
        if (value === null) continue;
        if (node.closest("mask")) expect(["white", "black", "none"], `${emoji} ${node.tagName} ${name}`).toContain(value);
        else expect(["currentColor", "none"], `${emoji} ${node.tagName} ${name}`).toContain(value);
      }
    }
    expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
    /* every mask that is referenced is defined in the same svg */
    for (const user of Array.from(svg.querySelectorAll("[mask]"))) {
      const id = /^url\(#(.+)\)$/.exec(user.getAttribute("mask")!)![1]!;
      expect(svg.querySelector(`mask[id="${id}"]`), `${emoji} ${id}`).toBeInTheDocument();
    }
  });

  it("draws every emoji differently in solid", () => {
    const drawings = inkEmojiSet.map((emoji) => shape(render(<InkEmoji emoji={emoji} />).container.querySelector("svg")!));
    expect(new Set(drawings).size).toBe(inkEmojiSet.length);
  });

  it("gives each instance its own mask ids", () => {
    const { container } = render(
      <div>
        <InkEmoji emoji="😀" />
        <InkEmoji emoji="😀" />
      </div>
    );
    const ids = Array.from(container.querySelectorAll("mask")).map((m) => m.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tint paints the secondary parts with a tint of the ink; solid cuts them to paper", () => {
    let tinted = 0;
    for (const emoji of inkEmojiSet) {
      const solid = render(<InkEmoji emoji={emoji} />).container.querySelector("svg")!;
      const tint = render(<InkEmoji emoji={emoji} variant="tint" />).container.querySelector("svg")!;
      expect(tint).toHaveAttribute("data-variant", "tint");
      expect(solid.innerHTML).not.toContain(`opacity="${INK_TINT}"`);
      if (tint.innerHTML.includes(`opacity="${INK_TINT}"`)) tinted++;
      else expect(shape(tint), emoji).toBe(shape(solid));
    }
    expect(tinted).toBeGreaterThan(40);
  });

  it("keeps the monoline drawing as variant outline", () => {
    const { container } = render(<InkEmoji emoji="👍" variant="outline" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("data-variant", "outline");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.75");
    expect(svg.querySelector("mask")).not.toBeInTheDocument();
  });

  it("renders on the server", () => {
    const html = renderToStaticMarkup(<InkEmoji emoji="🔥" variant="tint" animate="loop" title />);
    expect(html).toContain('data-slot="ink-emoji"');
    expect(html).toContain('data-play="loop"');
    expect(html).toContain("<mask");
    expect(html).toContain("<title>Fire</title>");
  });
});

describe("named parts and moves", () => {
  it("every drawing moves: a move on the whole drawing or on a named part", () => {
    for (const emoji of inkEmojiSet) {
      const geo = solidInkArt[strip(emoji)]!;
      expect(movesOf(geo).length, emoji).toBeGreaterThan(0);
      const svg = render(<InkEmoji emoji={emoji} />).container.querySelector("svg")!;
      expect(svg.querySelectorAll("[data-move]").length, emoji).toBeGreaterThan(0);
    }
  });

  it("every move has its keyframes and its start rule in the emoji section of sutra.css", () => {
    const moves = new Set(inkEmojiSet.flatMap((emoji) => movesOf(solidInkArt[strip(emoji)]!)));
    expect(moves.size).toBeGreaterThan(40);
    for (const move of moves) {
      expect(motion, move).toContain(`@keyframes sutra-emoji-${move} {`);
      expect(motion, move).toContain(`[data-slot="ink-emoji"][data-play] [data-move="${move}"] { animation-name: sutra-emoji-${move};`);
    }
  });

  it("names the parts the presets move: faces, hands, hearts, bursts, strokes that draw on", () => {
    const moveOf = (emoji: string) => movesOf(solidInkArt[strip(emoji)]!);
    expect(moveOf("😀")).toEqual(expect.arrayContaining(["hop", "blink"]));
    expect(moveOf("👍")).toEqual(expect.arrayContaining(["spring", "flick"]));
    expect(moveOf("❤️")).toContain("beat");
    expect(moveOf("🎉")).toEqual(expect.arrayContaining(["cock", "burst"]));
    expect(moveOf("✅")).toEqual(expect.arrayContaining(["squash", "draw"]));
    expect(moveOf("💯")).toEqual(expect.arrayContaining(["digit", "swipe", "swipe-late"]));
    const tick = render(<InkEmoji emoji="✅" />).container.querySelector('[data-move="draw"] path')!;
    expect(tick).toHaveAttribute("pathLength", "1");
  });
});

describe("motion", () => {
  it("animate: off by default, loop plays from the markup, hover waits for the parent", () => {
    const { container, rerender } = render(<InkEmoji emoji="😀" />);
    const svg = () => container.querySelector("svg")!;
    expect(svg()).not.toHaveAttribute("data-animate");
    expect(svg()).not.toHaveAttribute("data-play");
    rerender(<InkEmoji emoji="😀" animate="loop" />);
    expect(svg()).toHaveAttribute("data-animate", "loop");
    expect(svg()).toHaveAttribute("data-play", "loop");
    rerender(<InkEmoji emoji="😀" animate="hover" />);
    expect(svg()).toHaveAttribute("data-animate", "hover");
    expect(svg()).not.toHaveAttribute("data-play");
    rerender(<InkEmoji emoji="😀" variant="outline" animate="loop" />);
    expect(svg()).not.toHaveAttribute("data-animate");
    expect(svg()).not.toHaveAttribute("data-play");
  });

  it("hover plays once when the nearest interactive parent is hovered or focused", () => {
    const { container } = render(
      <button type="button">
        <span>
          <InkEmoji emoji="🔥" animate="hover" />
        </span>
      </button>
    );
    const svg = container.querySelector("svg")!;
    const button = container.querySelector("button")!;
    fireEvent.pointerEnter(button);
    expect(svg).toHaveAttribute("data-play", "once");
    svg.removeAttribute("data-play");
    act(() => button.focus());
    expect(svg).toHaveAttribute("data-play", "once");
  });

  it("playKey plays once per truthy value, also on mount; reduced motion keeps the still drawing", () => {
    const { container, rerender } = render(<InkEmoji emoji="❤️" playKey={0} />);
    const svg = () => container.querySelector("svg")!;
    expect(svg()).not.toHaveAttribute("data-play");
    rerender(<InkEmoji emoji="❤️" playKey={1} />);
    expect(svg()).toHaveAttribute("data-play", "once");
    const fresh = render(<InkEmoji emoji="❤️" playKey={2} />).container.querySelector("svg")!;
    expect(fresh).toHaveAttribute("data-play", "once");
    document.documentElement.setAttribute("data-motion", "reduce");
    const still = render(<InkEmoji emoji="❤️" playKey={3} />).container.querySelector("svg")!;
    expect(still).not.toHaveAttribute("data-play");
  });

  it("playInkEmoji restarts a single play and leaves a loop alone", () => {
    const svg = render(<InkEmoji emoji="⭐" />).container.querySelector("svg")!;
    playInkEmoji(svg);
    expect(svg).toHaveAttribute("data-play", "once");
    const loop = render(<InkEmoji emoji="⭐" animate="loop" />).container.querySelector("svg")!;
    playInkEmoji(loop);
    expect(loop).toHaveAttribute("data-play", "loop");
    expect(() => playInkEmoji(null)).not.toThrow();
  });

  it("the stylesheet: one unit token, a 4.8 unit cycle, loops repeat, reduced motion removes the animation (both triggers)", () => {
    expect(motion).toContain("--sutra-emoji-unit: var(--sutra-duration-fill);");
    expect(motion).toMatch(/\[data-move\] \{[^}]*animation-duration: calc\(var\(--sutra-emoji-unit\) \* 4\.8\);/);
    expect(motion).toMatch(/\[data-play="loop"\] \[data-move\] \{\s*animation-iteration-count: infinite;/);
    expect(motion).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:where\(:root:not\(\[data-motion="full"\]\)\) \[data-slot="ink-emoji"\] \[data-move\] \{\s*animation: none !important;/);
    expect(motion).toMatch(/:where\(:root\[data-motion="reduce"\]\) \[data-slot="ink-emoji"\] \[data-move\] \{\s*animation: none !important;/);
    expect(motion).not.toMatch(/cubic-bezier\(|\b\d+(\.\d+)?s\b/);
  });
});

describe("through the emoji components", () => {
  it("EmojiGlyph passes the variant and plays on hover by default (inkMotion)", () => {
    const { container, rerender } = render(<EmojiGlyph emoji="👍" ink />);
    const art = () => container.querySelector('svg[data-part="ink"]')!;
    expect(art()).toHaveAttribute("data-variant", "solid");
    expect(art()).toHaveAttribute("data-animate", "hover");
    rerender(<EmojiGlyph emoji="👍" ink inkVariant="tint" inkMotion={false} />);
    expect(art()).toHaveAttribute("data-variant", "tint");
    expect(art()).not.toHaveAttribute("data-animate");
    rerender(<EmojiGlyph emoji="👍" ink inkVariant="outline" />);
    expect(art()).toHaveAttribute("data-variant", "outline");
  });

  it("EmojiReaction: the variant reaches the drawing; reacting pops it and plays its motion", () => {
    const { container, getByRole } = render(<EmojiReaction emoji="🎉" count={2} ink inkVariant="tint" />);
    const art = () => container.querySelector('svg[data-part="ink"]')!;
    expect(art()).toHaveAttribute("data-variant", "tint");
    expect(art()).not.toHaveAttribute("data-play");
    fireEvent.click(getByRole("button"));
    expect(container.querySelector('[data-slot="emoji"]')).toHaveClass("animate-pop");
    expect(art()).toHaveAttribute("data-play", "once");
  });

  it("EmojiReaction: inkMotion={false} pops without the motion; playKey pops from outside", () => {
    const { container, rerender } = render(<EmojiReaction emoji="❤️" count={1} ink inkMotion={false} />);
    const art = () => container.querySelector('svg[data-part="ink"]')!;
    expect(art()).not.toHaveAttribute("data-animate");
    rerender(<EmojiReaction emoji="❤️" count={1} ink playKey={1} />);
    expect(container.querySelector('[data-slot="emoji"]')).toHaveClass("animate-pop");
    expect(art()).toHaveAttribute("data-play", "once");
  });

  it("EmojiReactionBar and EmojiPicker carry inkVariant and inkMotion to every drawing", () => {
    const bar = render(<EmojiReactionBar ink inkVariant="outline" defaultReactions={[{ emoji: "👍", count: 2 }, { emoji: "🔥", count: 1 }]} />);
    const chips = Array.from(bar.container.querySelectorAll('svg[data-part="ink"]'));
    expect(chips).toHaveLength(2);
    for (const svg of chips) expect(svg).toHaveAttribute("data-variant", "outline");
    const pick = render(<EmojiPicker ink inkMotion={false} categories={emojiCategories.slice(0, 1)} />);
    const cells = Array.from(pick.container.querySelectorAll('[role="tabpanel"] svg[data-part="ink"], [data-slot="emoji"] svg[data-part="ink"]'));
    expect(cells.length).toBeGreaterThan(10);
    for (const svg of cells) {
      expect(svg).toHaveAttribute("data-variant", "solid");
      expect(svg).not.toHaveAttribute("data-animate");
    }
  });
});
