import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SutraAppIcon, SutraLogo, SutraMark } from "../src/assets/brand";
import { CountryFlag, getFlagEmoji } from "../src/assets/country-flags";
import { EmojiReaction, EmojiReactionBar } from "../src/assets/emoji-reactions";
import { FileFormatIcon, getFileCategory, getFileExtension } from "../src/assets/file-format";
import { AcmeLogo, LogoCloud, placeholderLogos } from "../src/assets/placeholder-logos";
import { axeViolations } from "./helpers/a11y";

/* ------------------------------------------------------------------ */
/* EmojiReaction                                                       */
/* ------------------------------------------------------------------ */

describe("EmojiReaction", () => {
  it("increments and presses on click, decrements on second click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<EmojiReaction emoji="👍" count={2} onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: "thumbs reaction, 2 people" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("2");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("thumbs reaction, 3 people, including you");
    expect(button).toHaveTextContent("3");
    expect(onToggle).toHaveBeenLastCalledWith(true);

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAccessibleName("thumbs reaction, 2 people");
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  it("does not double count when defaultReacted is set", async () => {
    const user = userEvent.setup();
    render(<EmojiReaction emoji="🔥" count={1} defaultReacted />);
    const button = screen.getByRole("button", { name: "fire reaction, 1 person, including you" });
    await user.click(button);
    expect(button).toHaveAccessibleName("fire reaction, 0 people");
    // A zero count hides the number.
    expect(button).toHaveTextContent(/^🔥$/);
  });

  it("shows the given count when controlled", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<EmojiReaction emoji="🦖" count={5} reacted={false} onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: "🦖 reaction, 5 people" });
    await user.click(button);
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("5");
  });

  it("updates counts inside EmojiReactionBar and removes empty reactions", async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(
      <EmojiReactionBar
        readOnly
        onReact={onReact}
        defaultReactions={[
          { emoji: "🎉", count: 1, reacted: true },
          { emoji: "❤️", count: 2 },
        ]}
      />
    );
    expect(screen.getByRole("group", { name: "Reactions" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^red reaction, 2 people/ }));
    expect(screen.getByRole("button", { name: "red reaction, 3 people, including you" })).toBeInTheDocument();
    expect(onReact).toHaveBeenLastCalledWith("❤️", true);

    await user.click(screen.getByRole("button", { name: /^tada reaction/ }));
    expect(screen.queryByRole("button", { name: /^tada reaction/ })).not.toBeInTheDocument();
    expect(onReact).toHaveBeenLastCalledWith("🎉", false);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <EmojiReaction emoji="👍" count={3} />
        <EmojiReaction emoji="😂" count={1} defaultReacted />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Country flags                                                       */
/* ------------------------------------------------------------------ */

describe("getFlagEmoji", () => {
  it("builds regional-indicator flags", () => {
    expect(getFlagEmoji("US")).toBe("🇺🇸");
    expect(getFlagEmoji("gb")).toBe("🇬🇧");
    expect(getFlagEmoji(" kr ")).toBe("🇰🇷");
    // Any two letters work, even without a drawn flag.
    expect(getFlagEmoji("FO")).toBe("🇫🇴");
  });

  it("returns a white flag for invalid input", () => {
    const white = "\u{1F3F3}\u{FE0F}";
    expect(getFlagEmoji("")).toBe(white);
    expect(getFlagEmoji("USA")).toBe(white);
    expect(getFlagEmoji("1A")).toBe(white);
    expect(getFlagEmoji("é")).toBe(white);
  });
});

describe("CountryFlag", () => {
  it("draws known flags as SVG with the country name", () => {
    const { container } = render(<CountryFlag code="in" />);
    const flag = screen.getByRole("img", { name: "India" });
    expect(flag).toHaveAttribute("data-code", "IN");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("falls back to an emoji for unknown codes", () => {
    const { container } = render(<CountryFlag code="fo" />);
    const flag = screen.getByRole("img", { name: "FO" });
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(flag).toHaveTextContent("🇫🇴");
  });

  it("supports custom and empty labels", () => {
    const { container, rerender } = render(<CountryFlag code="US" label="English (US)" />);
    expect(screen.getByRole("img", { name: "English (US)" })).toBeInTheDocument();
    rerender(<CountryFlag code="US" label="" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("sizes by token and shape", () => {
    const { container } = render(<CountryFlag code="JP" size="lg" shape="square" />);
    expect(container.firstElementChild).toHaveStyle({ width: "24px", height: "24px" });
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <CountryFlag code="DE" />
        <CountryFlag code="zz" />
        <CountryFlag code="FR" label="" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* File formats                                                        */
/* ------------------------------------------------------------------ */

describe("getFileCategory / getFileExtension", () => {
  it.each([
    ["report.pdf", "document"],
    ["Q3 Report.DOCX", "document"],
    ["data.xlsx", "spreadsheet"],
    ["export.csv", "spreadsheet"],
    ["deck.pptx", "presentation"],
    ["notes.md", "text"],
    ["config.yaml", "data"],
    ["index.tsx", "code"],
    ["backup.tar.gz", "archive"],
    ["photo.JPEG", "image"],
    ["song.flac", "audio"],
    ["clip.mov", "video"],
    ["mock.fig", "design"],
    ["setup.exe", "executable"],
    ["Inter.woff2", "font"],
    ["png", "image"],
    ["/path/to/file.svg?v=2#top", "image"],
    ["C:\\docs\\memo.txt", "text"],
  ] as const)("%s -> %s", (input, category) => {
    expect(getFileCategory(input)).toBe(category);
  });

  it("returns unknown for unrecognised or missing extensions", () => {
    expect(getFileCategory("archive.xyz")).toBe("unknown");
    expect(getFileCategory("Makefile")).toBe("unknown");
    expect(getFileCategory("")).toBe("unknown");
  });

  it("extracts lowercase extensions", () => {
    expect(getFileExtension("Photo.HEIC")).toBe("heic");
    expect(getFileExtension("a/b.c/readme")).toBe("");
    expect(getFileExtension("Dockerfile")).toBe("");
    expect(getFileExtension("pdf")).toBe("pdf");
    expect(getFileExtension(" .env ")).toBe("env");
  });
});

describe("FileFormatIcon", () => {
  it("renders the extension label and is hidden without a title", () => {
    const { container } = render(<FileFormatIcon ext="Q3 report.pdf" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-ext", "pdf");
    expect(svg).toHaveAttribute("data-category", "document");
    expect(svg).toHaveTextContent("PDF");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("exposes an accessible name when titled", () => {
    render(<FileFormatIcon ext="xlsx" title="Excel spreadsheet" variant="solid" />);
    const icon = screen.getByRole("img", { name: "Excel spreadsheet" });
    expect(icon).toHaveAttribute("data-category", "spreadsheet");
  });

  it("supports custom labels (truncated to 5 chars) and unknown types", () => {
    const { container, rerender } = render(<FileFormatIcon ext="bin" label="binary" variant="minimal" />);
    expect(container.querySelector("text")).toHaveTextContent(/^BINAR$/);
    expect(container.querySelector("svg")).toHaveAttribute("data-category", "unknown");
    rerender(<FileFormatIcon ext="" />);
    expect(container.querySelector("text")).toHaveTextContent(/^FILE$/);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <FileFormatIcon ext="pdf" title="PDF document" />
        <FileFormatIcon ext="zip" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Logos                                                               */
/* ------------------------------------------------------------------ */

describe("brand logos", () => {
  it("SutraMark is decorative by default and named with a title", () => {
    const { container, rerender } = render(<SutraMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(<SutraMark title="Sutra" variant="glyph" />);
    expect(screen.getByRole("img", { name: "Sutra" })).toBeInTheDocument();
  });

  it("SutraLogo has an accessible name including the product", () => {
    const { rerender } = render(<SutraLogo />);
    expect(screen.getByRole("img", { name: "Sutra" })).toBeInTheDocument();
    rerender(<SutraLogo product="notes" />);
    const logo = screen.getByRole("img", { name: "Sutra notes" });
    // Inner mark is hidden so the lockup is announced once.
    expect(logo.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("SutraAppIcon uses unique gradient ids per instance", () => {
    const { container } = render(
      <div>
        <SutraAppIcon app="notes" title="Notes" />
        <SutraAppIcon app="notes" />
      </div>
    );
    expect(screen.getByRole("img", { name: "Notes" })).toBeInTheDocument();
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("placeholder logos expose their names", () => {
    render(
      <div>
        {placeholderLogos.map(({ name, Logo }) => (
          <Logo key={name} />
        ))}
      </div>
    );
    for (const { name } of placeholderLogos) {
      expect(screen.getByRole("img", { name })).toBeInTheDocument();
    }
  });

  it("placeholder mark-only logo keeps its name", () => {
    render(<AcmeLogo markOnly />);
    expect(screen.getByRole("img", { name: "Acme" })).not.toHaveTextContent("Acme");
  });

  it("LogoCloud hides the duplicated marquee row from assistive tech", () => {
    render(<LogoCloud marquee limit={3} title="Trusted by" />);
    expect(screen.getByText("Trusted by")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(6);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <SutraLogo product="tasks" />
        <SutraMark />
        <SutraAppIcon app="mail" title="Mail" />
        <LogoCloud limit={4} />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
