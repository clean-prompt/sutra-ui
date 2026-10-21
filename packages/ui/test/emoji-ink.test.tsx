/**
 * Emoji as ink on paper (assets/emoji-ink, assets/emoji-reactions): every emoji the library renders sits in
 * span[data-slot="emoji"] with the character in [data-part="glyph"]; common reactions also carry hand-drawn art
 * (svg[data-part="ink"], currentColor). The last section of styles/sutra.css decides what shows: the filtered glyph or the art
 * in the paper style, or with `ink`; colour otherwise. These tests pin the markup, the art, the props and the stylesheet.
 */
import * as React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EmojiGlyph, InkEmoji, hasInkEmoji, inkEmojiNames, inkEmojiSet } from "../src/assets/emoji-ink";
import { EmojiPicker, EmojiReaction, EmojiReactionBar, emojiCategories, reactionPresets } from "../src/assets/emoji-reactions";
import { DirectionProvider } from "../src/primitives/direction-provider";
import { CommentThread } from "../src/patterns/comments";
import { axeViolations } from "./helpers/a11y";
import { readSutraCss } from "./helpers/css";

const css = readSutraCss();
const section = css.slice(css.indexOf("Emoji (assets/emoji-reactions): ink on paper"));
const strip = (emoji: string) => emoji.replace(/[︎️]/g, "");

describe("InkEmoji art", () => {
  it("covers the eight reaction presets, twelve more and every emoji of the built-in picker set", () => {
    const picker = emojiCategories.flatMap((category) => category.emojis.map((entry) => entry.emoji));
    expect(picker.length).toBeGreaterThan(190);
    for (const emoji of picker) expect(hasInkEmoji(emoji), `${emoji} has no ink art`).toBe(true);
    expect(inkEmojiSet.length).toBeGreaterThanOrEqual(picker.length);
    for (const preset of reactionPresets) expect(inkEmojiSet.map(strip)).toContain(strip(preset));
    for (const emoji of ["🙏", "👏", "😍", "🤔", "✅", "🚀", "💯", "👎", "😡", "⭐", "💡", "✨"]) expect(hasInkEmoji(emoji)).toBe(true);
    expect(new Set(inkEmojiSet.map(strip)).size).toBe(inkEmojiSet.length);
    for (const emoji of inkEmojiSet) expect(inkEmojiNames[emoji]).toBeTruthy();
  });

  it("matches with or without the variation selector and says no for the rest", () => {
    expect(hasInkEmoji("❤")).toBe(true);
    expect(hasInkEmoji("❤️")).toBe(true);
    expect(hasInkEmoji("⭐️")).toBe(true);
    expect(hasInkEmoji("🦖")).toBe(false); // outside the built-in set
    expect(hasInkEmoji("")).toBe(false);
    expect(hasInkEmoji("toString")).toBe(false);
  });

  it.each(inkEmojiSet)("%s renders a 24 box svg that only uses currentColor", (emoji) => {
    const { container } = render(<InkEmoji emoji={emoji} variant="outline" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("data-slot", "ink-emoji");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.75");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg).toHaveAttribute("stroke-linejoin", "round");
    expect(svg.querySelector("path, circle, ellipse, rect")).toBeInTheDocument();
    const paint = [svg, ...Array.from(svg.querySelectorAll("*"))].flatMap((node) =>
      ["fill", "stroke"].map((name) => node.getAttribute(name)).filter((value): value is string => value !== null)
    );
    for (const value of paint) expect(["currentColor", "none"]).toContain(value);
    expect(svg.outerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|style="[^"]*(color|fill|stroke)/i);
  });

  it("draws every emoji differently", () => {
    const drawings = inkEmojiSet.map((emoji) => render(<InkEmoji emoji={emoji} variant="outline" />).container.querySelector("svg")!.innerHTML);
    expect(new Set(drawings).size).toBe(inkEmojiSet.length);
  });

  it("is decorative by default, named with title (true uses the built-in name) and sized by number or css", () => {
    const { container, rerender } = render(<InkEmoji emoji="👍" />);
    const svg = () => container.querySelector("svg")!;
    expect(svg()).toHaveAttribute("aria-hidden", "true");
    expect(svg()).not.toHaveAttribute("role");
    expect(svg().style.width).toBe("1em");

    rerender(<InkEmoji emoji="👍" title="Approve" size={32} />);
    expect(screen.getByRole("img", { name: "Approve" })).toBe(svg());
    expect(svg()).not.toHaveAttribute("aria-hidden");
    expect(svg().style.width).toBe("32px");
    expect(svg().style.height).toBe("32px");

    rerender(<InkEmoji emoji="🔥" title size="2.5rem" />);
    expect(screen.getByRole("img", { name: "Fire" })).toBeInTheDocument();
    expect(svg().style.width).toBe("2.5rem");
  });

  it("renders nothing for an emoji without art unless fallback is set, then the glyph as ink text", () => {
    const { container, rerender } = render(<InkEmoji emoji="🦖" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<InkEmoji emoji="🦖" fallback size={20} />);
    const wrapper = container.querySelector('[data-slot="emoji"]')!;
    expect(wrapper).toHaveAttribute("data-ink", "true");
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper).toHaveTextContent("🦖");
    expect(wrapper.querySelector('[data-part="glyph"]')).toHaveTextContent("🦖");
    expect((wrapper as HTMLElement).style.fontSize).toBe("20px");
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    rerender(<InkEmoji emoji="🦖" fallback title="Dinosaur" />);
    expect(screen.getByRole("img", { name: "Dinosaur" })).toBeInTheDocument();
    rerender(<InkEmoji emoji="👍" fallback />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="emoji"]')).not.toBeInTheDocument();
  });

  it("forwards its ref and props to the svg", () => {
    const ref = React.createRef<SVGSVGElement>();
    const { container } = render(<InkEmoji ref={ref} emoji="⭐" className="text-primary" data-testid="star" />);
    expect(ref.current).toBe(container.querySelector("svg"));
    expect(ref.current).toHaveClass("text-primary");
    expect(screen.getByTestId("star")).toBe(ref.current);
  });
});

describe("EmojiGlyph", () => {
  it("wraps the character in a glyph part and keeps it as text", () => {
    const { container } = render(<EmojiGlyph emoji="🦖" />);
    const wrapper = container.querySelector('[data-slot="emoji"]')!;
    expect(wrapper).not.toHaveAttribute("data-ink");
    expect(wrapper).not.toHaveAttribute("data-art");
    expect(wrapper.querySelector('[data-part="glyph"]')).toHaveTextContent("🦖");
    expect(wrapper.querySelector('[data-part="ink"]')).not.toBeInTheDocument();
    expect(wrapper.textContent).toBe("🦖");
  });

  it("adds the hand-drawn art as an aria-hidden svg part when there is one, and the text stays the same", () => {
    const { container } = render(<EmojiGlyph emoji="❤️" />);
    const wrapper = container.querySelector('[data-slot="emoji"]')!;
    expect(wrapper).toHaveAttribute("data-art", "true");
    const art = wrapper.querySelector('svg[data-part="ink"]')!;
    expect(art).toHaveAttribute("aria-hidden", "true");
    expect(art).toHaveAttribute("viewBox", "0 0 24 24");
    expect(wrapper.querySelector('[data-part="glyph"]')).toHaveTextContent("❤️");
    expect(wrapper.textContent).toBe("❤️");
  });

  it("ink maps to data-ink: unset follows the style, true and false are explicit", () => {
    const attr = (ink?: boolean) =>
      render(<EmojiGlyph emoji="👍" ink={ink} />).container.querySelector('[data-slot="emoji"]')!.getAttribute("data-ink");
    expect(attr()).toBeNull();
    expect(attr(true)).toBe("true");
    expect(attr(false)).toBe("false");
  });

  it("defines the SVG filter once per document, however many glyphs there are", () => {
    render(
      <div>
        <EmojiGlyph emoji="🦖" />
        <EmojiGlyph emoji="🐼" />
        <EmojiGlyph emoji="👍" ink />
      </div>
    );
    expect(document.querySelectorAll("#sutra-emoji-ink")).toHaveLength(1);
    const filter = document.getElementById("sutra-emoji-ink")!;
    expect(filter.closest("svg")).toHaveAttribute("aria-hidden", "true");
    expect(filter.closest("svg")).toHaveAttribute("data-slot", "emoji-ink-filter");
    expect(filter.querySelector("feColorMatrix, feComponentTransfer, feComposite")).toBeInTheDocument();
  });
});

describe("EmojiReaction and the picker use the glyph parts", () => {
  it("EmojiReaction keeps its name and counts, wraps the emoji and passes ink on", () => {
    const { container, rerender } = render(<EmojiReaction emoji="👍" count={2} />);
    const button = screen.getByRole("button", { name: "thumbs reaction, 2 people" });
    const wrapper = button.querySelector('[data-slot="emoji"]')!;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper).toHaveAttribute("data-art", "true");
    expect(wrapper).not.toHaveAttribute("data-ink");
    expect(wrapper.querySelector('[data-part="glyph"]')).toHaveTextContent("👍");
    expect(button.textContent).toBe("👍2");

    rerender(<EmojiReaction emoji="🦖" count={1} ink={false} size="sm" />);
    const fox = container.querySelector('[data-slot="emoji"]')!;
    expect(fox).toHaveAttribute("data-ink", "false");
    expect(fox).not.toHaveAttribute("data-art");
    expect(fox).toHaveClass("text-sm");
  });

  it("keeps the layout classes of the old span (the size class replaces the line height, as before)", () => {
    const { container } = render(<EmojiReaction emoji="🔥" count={1} />);
    expect(container.querySelector('[data-slot="emoji"]')).toHaveClass("inline-block", "text-base");
  });

  it("EmojiReactionBar passes ink to its reactions and to the picker it opens", async () => {
    const user = userEvent.setup();
    render(<EmojiReactionBar ink defaultReactions={[{ emoji: "🎉", count: 1 }]} />);
    const bar = screen.getByRole("group", { name: "Reactions" });
    expect(bar.querySelector('[data-slot="emoji"]')).toHaveAttribute("data-ink", "true");
    await user.click(screen.getByRole("button", { name: "Add reaction" }));
    const picker = document.querySelector('[data-slot="emoji-picker"]')!;
    const wrappers = Array.from(picker.querySelectorAll('[data-slot="emoji"]'));
    expect(wrappers.length).toBeGreaterThan(100);
    for (const wrapper of wrappers) expect(wrapper).toHaveAttribute("data-ink", "true");
  });

  it("EmojiPicker wraps every emoji (quick picks, tabs, cells, preview, no results), keeping the characters and the names", async () => {
    const user = userEvent.setup();
    const onSelect = (emoji: string) => picked.push(emoji);
    const picked: string[] = [];
    const { container } = render(<EmojiPicker quickPicks={reactionPresets} onSelect={onSelect} />);
    const picker = container.querySelector('[data-slot="emoji-picker"]')!;
    const cells = Array.from(picker.querySelectorAll("[data-emoji-cell]"));
    expect(cells.length).toBeGreaterThan(100);
    for (const cell of cells) {
      expect(cell.querySelector('[data-slot="emoji"] > [data-part="glyph"]')).toBeInTheDocument();
      expect(cell.textContent).toBe(cell.querySelector('[data-part="glyph"]')!.textContent);
    }
    expect(within(picker as HTMLElement).getByRole("button", { name: "thumbs" })).toHaveTextContent("👍");
    expect(picker.querySelectorAll('[role="tab"] [data-slot="emoji"]')).toHaveLength(8);
    expect(within(picker as HTMLElement).getByRole("tab", { name: "Smileys" })).toHaveTextContent("😀");

    await user.hover(cells[0]!);
    expect(picker.querySelector('[aria-hidden="true"][data-slot="emoji"]')).toBeInTheDocument();

    await user.click(within(picker as HTMLElement).getByRole("button", { name: "thumbs" }));
    expect(picked).toEqual(["👍"]);

    await user.type(within(picker as HTMLElement).getByRole("searchbox"), "zzzz");
    expect(screen.getByText("No emoji found")).toBeInTheDocument();
    expect(screen.getByText("No emoji found").parentElement!.querySelector('[data-slot="emoji"]')).toHaveTextContent("🔍");
  });

  it("EmojiPicker ink reaches every emoji, and the default adds no attribute", () => {
    const { container, rerender } = render(<EmojiPicker ink={false} />);
    const all = () => Array.from(container.querySelectorAll('[data-slot="emoji"]'));
    expect(all().every((el) => el.getAttribute("data-ink") === "false")).toBe(true);
    rerender(<EmojiPicker />);
    expect(all().every((el) => !el.hasAttribute("data-ink"))).toBe(true);
  });

  it("CommentThread reactions and the reaction options use the glyph parts", async () => {
    const user = userEvent.setup();
    render(
      <CommentThread
        onReact={() => {}}
        thread={{
          id: "t1",
          comments: [
            {
              id: "c1",
              author: { id: "u1", name: "Ana" },
              body: "Looks good",
              createdAt: 0,
              reactions: [{ emoji: "👍", count: 2 }],
            },
          ],
        }}
      />
    );
    const chip = screen.getByRole("button", { name: "👍 2" });
    expect(chip.querySelector('[data-slot="emoji"][data-art="true"]')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add reaction" }));
    const option = await screen.findByRole("button", { name: "React with 🎉" });
    expect(option.querySelector('[data-slot="emoji"] > [data-part="glyph"]')).toHaveTextContent("🎉");
  });

  it("renders the same markup in right-to-left and has no axe violations", async () => {
    const { container } = render(
      <DirectionProvider dir="rtl">
        <div dir="rtl">
          <EmojiReactionBar defaultReactions={[{ emoji: "👍", count: 3, reacted: true }, { emoji: "🦖", count: 1 }]} />
          <InkEmoji emoji="🚀" title="Rocket" />
          <InkEmoji emoji="🦖" fallback />
          <EmojiGlyph emoji="💯" ink />
          <EmojiPicker />
        </div>
      </DirectionProvider>
    );
    expect(container.querySelectorAll('[data-slot="emoji"] > [data-part="glyph"]').length).toBeGreaterThan(100);
    expect(container.querySelector('svg[data-part="ink"]')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("the emoji section of the stylesheet", () => {
  const either = ':is([data-slot="emoji"][data-ink="true"], [data-style="paper"] [data-slot="emoji"]:not([data-ink="false"]))';

  it("exists and is the last section", () => {
    expect(section.length).toBeGreaterThan(500);
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "").trimEnd().endsWith("}")).toBe(true); // a trailing generated-region marker is a comment
    expect(css.indexOf("Emoji (assets/emoji-reactions): ink on paper")).toBeGreaterThan(css.indexOf("File format icons (assets/file-format): ink on paper"));
  });

  it("turns the glyph into ink in the paper style and with ink, unless ink is false, through the filter the component defines", () => {
    expect(section).toContain(either);
    expect(section).toMatch(/\[data-part="glyph"\]\s*\{[^}]*filter: url\(#sutra-emoji-ink\);/);
    expect(section).toMatch(/color: black;/);
    expect(readFileSync(path.join(__dirname, "../src/assets/emoji-ink.tsx"), "utf8")).toContain('FILTER_ID = "sutra-emoji-ink"');
  });

  it("inverts the ink to light on black in dark mode", () => {
    expect(section).toMatch(/:is\(\.dark, \[data-theme="dark"\]\) :is\(\[data-slot="emoji"\]\[data-ink="true"\][^{]*\[data-part="glyph"\]\s*\{\s*filter: url\(#sutra-emoji-ink\) invert\(1\);/);
  });

  it("shows the art instead and hides the glyph visually (clipped), never with display: none, and hides the art by default", () => {
    expect(section).toMatch(/\[data-slot="emoji"\] > \[data-part="ink"\]\s*\{\s*display: none;/);
    expect(section).toContain(`${either}[data-art] > [data-part="ink"] {\n  display: block;`);
    const hide = section.slice(section.indexOf(`${either}[data-art] > [data-part="glyph"]`));
    const rule = hide.slice(0, hide.indexOf("}"));
    expect(rule).toContain("clip-path: inset(50%)");
    expect(rule).toContain("position: absolute");
    expect(rule).toContain("filter: none");
    expect(rule).not.toContain("display: none");
  });

  it("uses no colour literal besides the black and white keywords", () => {
    expect(section).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
  });
});
