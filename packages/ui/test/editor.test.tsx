import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentOutline, extractOutline, findActiveHeading } from "../src/components/document-outline";
import { EditorStatusBar, SaveStatus, countWords, formatSavedAgo, getTextStats } from "../src/components/editor-status";
import {
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarMenu,
  EditorToolbarSeparator,
} from "../src/components/editor-toolbar";
import { DiffViewer, SuggestionDiff, computeDiff } from "../src/components/diff-viewer";
import { VersionHistory, groupVersionsByDay, type DocumentVersion } from "../src/components/version-history";
import { CommentsPanel, type CommentThreadData } from "../src/components/comments";
import { CodeEditor, type CodeEditorHandle } from "../src/components/code-editor";
import { RichTextEditor, type RichTextEditorInstance } from "../src/components/rich-text-editor";
import { axeViolations } from "./a11y";

/* jsdom has no layout: CodeMirror and ProseMirror measure through Range/Element rects. */
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect;
const emptyRects = Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getClientRects ??= () => emptyRects;
Range.prototype.getBoundingClientRect ??= () => emptyRect;
Element.prototype.getClientRects ??= () => emptyRects;
(document as unknown as { elementFromPoint: () => null }).elementFromPoint ??= () => null;

/* ------------------------------------------------------------------ */
/* extractOutline                                                      */
/* ------------------------------------------------------------------ */

describe("extractOutline", () => {
  it("reads ATX and setext headings with levels, lines and slugs", () => {
    const md = ["# Title", "", "Intro text", "", "## Getting **started**", "", "Setext One", "===", "", "Setext Two", "---", "#### Deep ###"].join("\n");
    expect(extractOutline(md)).toEqual([
      { id: "title", line: 0, text: "Title", level: 1 },
      { id: "getting-started", line: 4, text: "Getting started", level: 2 },
      { id: "setext-one", line: 6, text: "Setext One", level: 1 },
      { id: "setext-two", line: 9, text: "Setext Two", level: 2 },
      { id: "deep", line: 11, text: "Deep", level: 4 },
    ]);
  });

  it("ignores fenced code (``` and ~~~), front matter and non-headings", () => {
    const md = [
      "---",
      "title: Doc",
      "---",
      "# Real",
      "```bash",
      "# not a heading",
      "```",
      "~~~~",
      "## also not",
      "```",
      "still code",
      "~~~~",
      "#nospace",
      "- item",
      "---",
      "## [Linked](https://x.y) `code`",
    ].join("\n");
    expect(extractOutline(md).map((h) => [h.text, h.level])).toEqual([
      ["Real", 1],
      ["Linked code", 2],
    ]);
  });

  it("dedupes ids and finds the active heading for a line", () => {
    const out = extractOutline("# A\n\n## Same\n\ntext\n\n## Same\n");
    expect(out.map((h) => h.id)).toEqual(["a", "same", "same-1"]);
    expect(findActiveHeading(out, 0)?.id).toBe("a");
    expect(findActiveHeading(out, 4)?.id).toBe("same");
    expect(findActiveHeading(out, 99)?.id).toBe("same-1");
  });
});

describe("DocumentOutline", () => {
  const headings = extractOutline("# One\n## Two\n### Three\n## Four");

  it("indents by level, highlights the active heading and navigates", () => {
    const onNavigate = vi.fn();
    render(<DocumentOutline headings={headings} activeId="two" onNavigate={onNavigate} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("data-level"))).toEqual(["1", "2", "3", "2"]);
    expect(screen.getByRole("button", { name: "Two" })).toHaveAttribute("aria-current", "location");
    expect(parseFloat(screen.getByRole("button", { name: "Three" }).style.paddingLeft)).toBeGreaterThan(
      parseFloat(screen.getByRole("button", { name: "One" }).style.paddingLeft)
    );
    fireEvent.click(screen.getByRole("button", { name: "Four" }));
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ text: "Four", line: 3 }));
  });

  it("filters and shows an empty hint", async () => {
    const { rerender, container } = render(<DocumentOutline headings={headings} filterable />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Filter headings" }), { target: { value: "th" } });
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Three"]);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<DocumentOutline headings={[]} emptyHint="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* countWords / stats                                                  */
/* ------------------------------------------------------------------ */

describe("countWords", () => {
  it.each([
    ["", 0],
    ["   ", 0],
    ["Hello, world! It's a test.", 5],
    ["state-of-the-art e.g. 3.14", 3],
    ["# Title\n\n**bold** _text_ > quote", 4],
    ["Ünïcödé café naïve", 3],
  ])("latin %j → %i", (text, n) => {
    expect(countWords(text)).toBe(n);
  });

  it.each([
    ["你好世界", 4],
    ["日本語のテキスト", 8],
    ["Hello 世界 test", 4],
    ["我爱 React 和 TypeScript。", 5],
    ["안녕하세요 세계", 2],
  ])("CJK %j → %i", (text, n) => {
    expect(countWords(text)).toBe(n);
  });

  it("derives reading time and pages", () => {
    const text = Array.from({ length: 1200 }, () => "word").join(" ");
    expect(getTextStats(text)).toMatchObject({ words: 1200, readingMinutes: 5, pages: 3 });
    expect(getTextStats("")).toMatchObject({ words: 0, readingMinutes: 0, pages: 0, characters: 0 });
    expect(getTextStats("a b").charactersNoSpaces).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/* SaveStatus / EditorStatusBar                                        */
/* ------------------------------------------------------------------ */

describe("SaveStatus", () => {
  const now = new Date("2026-03-03T12:00:00Z");

  it("formats relative saved times", () => {
    expect(formatSavedAgo(now.getTime() - 10_000, now)).toBe("Saved just now");
    expect(formatSavedAgo(now.getTime() - 120_000, now)).toBe("Saved 2m ago");
    expect(formatSavedAgo(now.getTime() - 3 * 3600_000, now)).toBe("Saved 3h ago");
    expect(formatSavedAgo(now.getTime() - 30 * 3600_000, now)).toBe("Saved yesterday");
  });

  it("renders each state", () => {
    const { rerender } = render(<SaveStatus status="saved" savedAt={now.getTime() - 120_000} now={now} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved 2m ago");
    rerender(<SaveStatus status="dirty" />);
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
    rerender(<SaveStatus status="saving" />);
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "saving");
  });

  it("offers retry on error and actions on conflict", () => {
    const onRetry = vi.fn();
    const onKeepMine = vi.fn();
    const onLoadTheirs = vi.fn();
    const { rerender } = render(<SaveStatus status="error" onRetry={onRetry} />);
    expect(screen.getByRole("status")).toHaveTextContent("Couldn’t save");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    rerender(<SaveStatus status="conflict" onKeepMine={onKeepMine} onLoadTheirs={onLoadTheirs} />);
    expect(screen.getByRole("status")).toHaveTextContent("Edit conflict");
    fireEvent.click(screen.getByRole("button", { name: "Keep mine" }));
    fireEvent.click(screen.getByRole("button", { name: "Load theirs" }));
    expect(onKeepMine).toHaveBeenCalled();
    expect(onLoadTheirs).toHaveBeenCalled();
  });
});

describe("EditorStatusBar", () => {
  it("shows counts, reading time, pages, cursor and mode", async () => {
    const { container } = render(
      <EditorStatusBar
        status={<SaveStatus status="dirty" />}
        presence={<span>2 here</span>}
        text="Hello brave new world"
        cursor={{ line: 3, column: 7 }}
        selectionLength={5}
        mode="Live"
        modeTone="live"
      />
    );
    const bar = screen.getByRole("group", { name: "Editor status" });
    await waitFor(() => expect(bar).toHaveTextContent("4 words"));
    expect(bar).toHaveTextContent("21 characters");
    expect(bar).toHaveTextContent("1 min read");
    expect(bar).toHaveTextContent("~1 page");
    expect(bar).toHaveTextContent("Ln 3, Col 7 (5 selected)");
    expect(bar).toHaveTextContent("Live");
    expect(bar).toHaveTextContent("2 here");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("accepts explicit counts and hides stats", () => {
    render(<EditorStatusBar words={1} characters={1200} showReadingTime={false} showPages={false} mode="Offline" modeTone="offline" />);
    const bar = screen.getByRole("group", { name: "Editor status" });
    expect(bar).toHaveTextContent("1 word");
    expect(bar).toHaveTextContent("1,200 characters");
    expect(bar).not.toHaveTextContent("min read");
  });
});

/* ------------------------------------------------------------------ */
/* EditorToolbar                                                       */
/* ------------------------------------------------------------------ */

function Toolbar({ onBold = () => {}, onInsert = () => {} }: { onBold?: () => void; onInsert?: () => void }) {
  return (
    <EditorToolbar aria-label="Formatting">
      <EditorToolbarButton label="Bold" shortcut="mod+b" icon={<b>B</b>} onClick={onBold} pressed={false} />
      <EditorToolbarButton label="Italic" icon={<i>I</i>} />
      <EditorToolbarButton label="Disabled" icon={<u>U</u>} disabled />
      <EditorToolbarSeparator />
      <EditorToolbarButton label="Quote" icon={<q>Q</q>} />
      <EditorToolbarMenu
        label="Insert"
        items={[
          { label: "Math", description: "Display equation", shortcut: "mod+shift+m", onSelect: onInsert },
          { type: "separator" },
          { label: "Page break" },
        ]}
      />
    </EditorToolbar>
  );
}

describe("EditorToolbar", () => {
  it("uses a roving tabindex with arrows, Home and End (skipping disabled tools)", async () => {
    const { container } = render(<Toolbar />);
    const bar = screen.getByRole("toolbar", { name: "Formatting" });
    const bold = screen.getByRole("button", { name: "Bold" });
    const italic = screen.getByRole("button", { name: "Italic" });
    const quote = screen.getByRole("button", { name: "Quote" });
    const insert = screen.getByRole("button", { name: /Insert/ });
    expect(bold.tabIndex).toBe(0);
    expect([italic, quote, insert].map((b) => b.tabIndex)).toEqual([-1, -1, -1]);
    expect(bold).toHaveAttribute("aria-pressed", "false");

    act(() => bold.focus());
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(italic).toHaveFocus();
    expect(italic.tabIndex).toBe(0);
    expect(bold.tabIndex).toBe(-1);
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(quote).toHaveFocus();
    fireEvent.keyDown(bar, { key: "End" });
    expect(insert).toHaveFocus();
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(bold).toHaveFocus();
    fireEvent.keyDown(bar, { key: "ArrowLeft" });
    expect(insert).toHaveFocus();
    fireEvent.keyDown(bar, { key: "Home" });
    expect(bold).toHaveFocus();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("opens a dropdown tool with descriptions and shortcuts", async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(<Toolbar onInsert={onInsert} />);
    await user.click(screen.getByRole("button", { name: /Insert/ }));
    const item = await screen.findByRole("menuitem", { name: /Math/ });
    expect(item).toHaveTextContent("Display equation");
    await user.click(item);
    expect(onInsert).toHaveBeenCalled();
  });

  describe("overflow", () => {
    const offset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")!;
    const client = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth")!;
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        get(this: HTMLElement) {
          if (this.dataset.toolbarKind === "separator") return 9;
          if (this.dataset.toolbarSlot) return 40;
          return 32;
        },
      });
      Object.defineProperty(Element.prototype, "clientWidth", {
        configurable: true,
        get(this: Element) {
          // The list is flex-1: it shrinks by the More button's width once that appears.
          if (this.parentElement?.getAttribute("role") !== "toolbar" || this.hasAttribute("data-toolbar-item")) return 0;
          return this.parentElement.querySelector("[data-toolbar-more]") ? 98 : 130;
        },
      });
    });
    afterEach(() => {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", offset);
      Object.defineProperty(Element.prototype, "clientWidth", client);
    });

    it("collapses tools that don't fit into a More menu", async () => {
      const user = userEvent.setup();
      const onBold = vi.fn();
      render(<Toolbar onBold={onBold} />);
      const more = await screen.findByRole("button", { name: "More tools" });
      // 130px fits two 40px tools plus the 32px More button.
      expect(screen.getByRole("button", { name: "Bold" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Italic" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "Quote" })).toBeNull();
      expect(screen.queryByRole("button", { name: /Insert/ })).toBeNull();

      await user.click(more);
      const menu = await screen.findByRole("menu");
      expect(within(menu).getByRole("menuitem", { name: /Disabled/ })).toHaveAttribute("data-disabled");
      expect(within(menu).getByRole("menuitem", { name: /Quote/ })).toBeInTheDocument();
      expect(within(menu).getByRole("menuitem", { name: /Insert/ })).toHaveAttribute("aria-haspopup", "menu");
      expect(within(menu).getAllByRole("separator")).toHaveLength(1);
      expect(onBold).not.toHaveBeenCalled();
    });

    it("runs the real tool from the More menu", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <EditorToolbar>
          <EditorToolbarButton label="A" icon={<span>A</span>} />
          <EditorToolbarButton label="B" icon={<span>B</span>} />
          <EditorToolbarButton label="C" icon={<span>C</span>} />
          <EditorToolbarButton label="Deep" icon={<span>D</span>} onClick={onClick} />
        </EditorToolbar>
      );
      await user.click(await screen.findByRole("button", { name: "More tools" }));
      await user.click(await screen.findByRole("menuitem", { name: /Deep/ }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

/* ------------------------------------------------------------------ */
/* DiffViewer                                                          */
/* ------------------------------------------------------------------ */

const OLD = "The quick brown fox\njumps over the dog\nand runs away.\n";
const NEW = "The quick red fox\njumps over the lazy dog\nand runs away.\n";

describe("computeDiff", () => {
  it("refines changed lines by word and numbers hunks", () => {
    const parts = computeDiff(OLD, NEW, "word");
    expect(parts.filter((p) => p.type === "delete").map((p) => p.text)).toEqual(["brown"]);
    expect(parts.filter((p) => p.type === "insert").map((p) => p.text.trim())).toEqual(["red", "lazy"]);
    expect(new Set(parts.filter((p) => p.change >= 0).map((p) => p.change))).toEqual(new Set([0]));
    const rebuiltNew = parts.filter((p) => p.type !== "delete").map((p) => p.text).join("");
    const rebuiltOld = parts.filter((p) => p.type !== "insert").map((p) => p.text).join("");
    expect(rebuiltNew).toBe(NEW);
    expect(rebuiltOld).toBe(OLD);
  });
});

describe("DiffViewer", () => {
  it("inline: insertions and struck deletions with word granularity", async () => {
    const { container } = render(<DiffViewer oldValue={OLD} newValue={NEW} />);
    expect(container.querySelectorAll("ins")).toHaveLength(2);
    expect(container.querySelectorAll("del")).toHaveLength(1);
    expect(container.querySelector("del")).toHaveTextContent("brown");
    expect(container.querySelectorAll("[data-line]")).toHaveLength(3);
    expect(screen.getByText("1 change")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("inline: line granularity marks whole lines", () => {
    const { container } = render(<DiffViewer oldValue={OLD} newValue={NEW} granularity="line" />);
    expect(container.querySelectorAll("del")).toHaveLength(2);
    expect(container.querySelectorAll("ins")).toHaveLength(2);
    expect(container.querySelector("del")).toHaveTextContent("The quick brown fox");
  });

  it("split: side-by-side rows with line numbers", async () => {
    const { container } = render(<DiffViewer oldValue={OLD} newValue={"New first line\n" + NEW} mode="split" />);
    const rows = container.querySelectorAll("tbody tr[data-row]");
    expect(rows.length).toBe(4);
    // Left column only has deletions, right only insertions.
    rows.forEach((r) => {
      const cells = r.querySelectorAll("td");
      expect(cells[1]!.querySelector("ins")).toBeNull();
      expect(cells[3]!.querySelector("del")).toBeNull();
    });
    expect(container.querySelectorAll("td del")).toHaveLength(1);
    expect(container.querySelectorAll("td ins").length).toBeGreaterThanOrEqual(3);
    const last = rows[rows.length - 1]!.querySelectorAll("td");
    expect(last[0]).toHaveTextContent("3");
    expect(last[2]).toHaveTextContent("4");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("collapses unchanged regions and expands them on demand", () => {
    const base = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`);
    const changed = [...base];
    changed[14] = "line fifteen";
    const { container } = render(<DiffViewer oldValue={base.join("\n") + "\n"} newValue={changed.join("\n") + "\n"} />);
    expect(screen.getByRole("button", { name: "Show 11 unchanged lines" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show 12 unchanged lines" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-line]")).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "Show 11 unchanged lines" }));
    expect(container.querySelectorAll("[data-line]")).toHaveLength(18);
  });

  it("collapses in split mode too", () => {
    const base = Array.from({ length: 20 }, (_, i) => `row ${i}`).join("\n");
    render(<DiffViewer oldValue={base} newValue={base.replace("row 0", "row zero")} mode="split" context={2} />);
    expect(screen.getByRole("button", { name: "Show 17 unchanged lines" })).toBeInTheDocument();
  });

  it("navigates changes with n / p and the buttons", () => {
    const base = Array.from({ length: 20 }, (_, i) => `row ${i}`);
    const next = [...base];
    next[1] = "row one";
    next[18] = "row eighteen";
    const onActive = vi.fn();
    render(<DiffViewer oldValue={base.join("\n")} newValue={next.join("\n")} onActiveChange={onActive} />);
    const region = screen.getByRole("region", { name: "Changes" });
    expect(screen.getByText("2 changes")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "n" });
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "j" });
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "n" });
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    fireEvent.keyDown(region, { key: "p" });
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous change" }));
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(onActive).toHaveBeenLastCalledWith(0);
    expect(document.querySelector('[data-change-start="0"]')).toHaveClass("border-l-primary");
  });

  it("colors changes by author", () => {
    const { container } = render(
      <DiffViewer
        oldValue="a b c"
        newValue="a x c y"
        granularity="word"
        authors={{ u1: { name: "Ana", color: "rgb(255, 0, 0)" } }}
        changeAuthors={["u1"]}
      />
    );
    expect(screen.getByLabelText("Authors")).toHaveTextContent("Ana");
    expect(container.querySelector("ins")).toHaveAttribute("title", "Added by Ana");
    expect(container.querySelector("del")).toHaveAttribute("title", "Deleted by Ana");
  });

  it("renders precomputed segments with per-segment authors", () => {
    const { container } = render(
      <DiffViewer
        segments={[
          { type: "equal", text: "Hello " },
          { type: "insert", text: "brave ", author: "a" },
          { type: "equal", text: "world " },
          { type: "delete", text: "again", author: "b" },
        ]}
        authors={{ a: { name: "Ana" }, b: { name: "Ben" } }}
      />
    );
    expect(screen.getByText("2 changes")).toBeInTheDocument();
    expect(container.querySelector("ins")).toHaveAttribute("title", "Added by Ana");
    expect(container.querySelector("del")).toHaveAttribute("title", "Deleted by Ben");
  });

  it("reports no changes for identical text", () => {
    render(<DiffViewer oldValue="same" newValue="same" />);
    expect(screen.getByText("No changes")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* SuggestionDiff                                                      */
/* ------------------------------------------------------------------ */

describe("SuggestionDiff", () => {
  const original = "The cat sat on the mat.";
  const suggestion = "The dog sat on the rug.";

  it("accepts the whole suggestion or discards it", async () => {
    const onAccept = vi.fn();
    const onDiscard = vi.fn();
    const { container } = render(<SuggestionDiff original={original} suggestion={suggestion} onAccept={onAccept} onDiscard={onDiscard} meta="gpt" />);
    expect(container.querySelectorAll("del")).toHaveLength(2);
    expect(container.querySelectorAll("ins")).toHaveLength(2);
    expect(screen.getByText("2 changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledWith(suggestion);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onDiscard).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("applies per-hunk decisions", () => {
    const onAccept = vi.fn();
    render(<SuggestionDiff original={original} suggestion={suggestion} onAccept={onAccept} />);
    fireEvent.click(screen.getByRole("button", { name: "Reject change 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept change 2" }));
    expect(screen.getByText("2 changes · 1 accepted · 1 rejected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenLastCalledWith("The cat sat on the rug.");

    fireEvent.click(screen.getByRole("button", { name: "Undo change 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenLastCalledWith(suggestion);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject change 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject change 2" }));
    expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled();
  });

  it("disables accept when nothing changed", () => {
    render(<SuggestionDiff original="same" suggestion="same" />);
    expect(screen.getByRole("button", { name: "No changes" })).toBeDisabled();
  });
});

/* ------------------------------------------------------------------ */
/* VersionHistory                                                      */
/* ------------------------------------------------------------------ */

const NOW = new Date("2026-03-03T15:00:00");
const ana = { id: "ana", name: "Ana Lee" };
const ben = { id: "ben", name: "Ben Ito" };
const versions: DocumentVersion[] = [
  { id: "v4", createdAt: new Date("2026-03-03T14:00:00"), contributors: [ana], content: "Hello brave new world.\nBye.", description: "Edited the text" },
  { id: "v3", createdAt: new Date("2026-03-03T10:00:00"), contributors: [ben], label: "Sent to review", content: "Hello new world.\nBye." },
  { id: "v2", createdAt: new Date("2026-03-02T18:00:00"), contributors: [ana, ben], content: "Hello world.\nBye." },
  { id: "v1", createdAt: new Date("2026-03-02T09:00:00"), contributors: [ana], label: "First draft", content: "Hello world." },
];

describe("VersionHistory", () => {
  it("groups versions by day", () => {
    expect(groupVersionsByDay(versions, NOW).map((g) => [g.label, g.versions.length])).toEqual([
      ["Today", 2],
      ["Yesterday", 2],
    ]);
    render(<VersionHistory versions={versions} now={NOW} />);
    expect(screen.getByRole("group", { name: "Today" })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Yesterday" })).getAllByRole("button", { pressed: false })).toHaveLength(2);
  });

  it("selects one version, then Shift-click compares a range", async () => {
    const onSelectionChange = vi.fn();
    const { container } = render(<VersionHistory versions={versions} now={NOW} onSelectionChange={onSelectionChange} />);
    const rows = () => Array.from(container.querySelectorAll<HTMLElement>("li[data-version] > button"));
    // Newest is selected by default and diffs against its predecessor.
    expect(rows()[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Changes since the previous version")).toBeInTheDocument();
    expect(container.querySelector("ins")).toHaveTextContent("brave");

    fireEvent.click(rows()[1]!);
    expect(onSelectionChange).toHaveBeenLastCalledWith({ from: "v3", to: "v3" });
    fireEvent.click(rows()[3]!, { shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ from: "v1", to: "v3" });
    expect(rows().map((r) => r.getAttribute("aria-pressed"))).toEqual(["false", "true", "true", "true"]);
    expect(screen.getByText("Comparing 3 versions")).toBeInTheDocument();
    // v1 is the first version: compared against an empty document, everything is new.
    expect(container.querySelector("del")).toBeNull();
    expect(screen.getByLabelText("Authors")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("filters named versions and names a version", () => {
    const onRename = vi.fn();
    const { container } = render(<VersionHistory versions={versions} now={NOW} onRename={onRename} />);
    fireEvent.click(screen.getByRole("radio", { name: "Named" }));
    expect(container.querySelectorAll("li[data-version]")).toHaveLength(2);
    expect(screen.getByText("Sent to review")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Name version from/ })[0]!);
    const input = screen.getByRole("textbox", { name: "Version name" });
    fireEvent.change(input, { target: { value: "Final" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
    expect(onRename).toHaveBeenCalledWith(expect.objectContaining({ id: "v4" }), "Final");
  });

  it("restores after confirmation (controlled selection)", async () => {
    const onRestore = vi.fn();
    render(<VersionHistory versions={versions} now={NOW} selection={{ from: "v2", to: "v2" }} onRestore={onRestore} />);
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: "v2" })));
  });
});

/* ------------------------------------------------------------------ */
/* CommentsPanel                                                       */
/* ------------------------------------------------------------------ */

const me = { id: "me", name: "Mia Chen" };
const threads: CommentThreadData[] = [
  {
    id: "t1",
    quote: "the quick brown fox",
    comments: [
      { id: "c1", author: ana, body: "Is **brown** right?", createdAt: NOW.getTime() - 600_000 },
      { id: "c2", author: me, body: "I think so.", createdAt: NOW.getTime() - 300_000 },
    ],
  },
  { id: "t2", quote: "lazy dog", comments: [{ id: "c3", author: me, body: "Rephrase", createdAt: NOW.getTime() - 60_000 }] },
  { id: "t3", quote: "Bye", resolved: true, resolvedBy: "Ana Lee", comments: [{ id: "c4", author: ben, body: "Done", createdAt: NOW.getTime() }] },
];

describe("CommentsPanel", () => {
  it("filters open / resolved / all", async () => {
    const { container } = render(<CommentsPanel threads={threads} currentUserId="me" now={NOW} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("radio", { name: /Resolved/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Resolved by Ana Lee")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("resolves, reopens, replies and focuses anchors", () => {
    const onResolve = vi.fn();
    const onReply = vi.fn();
    const onFocusAnchor = vi.fn();
    render(
      <CommentsPanel
        threads={threads}
        currentUserId="me"
        role="editor"
        defaultFilter="all"
        onResolve={onResolve}
        onReply={onReply}
        onFocusAnchor={onFocusAnchor}
        now={NOW}
      />
    );
    const t1 = screen.getByRole("article", { name: /Ana Lee$/ });
    expect(within(t1).getByText("brown").tagName).toBe("STRONG");
    fireEvent.click(within(t1).getByRole("button", { name: "Resolve" }));
    expect(onResolve).toHaveBeenCalledWith("t1", true);
    const t3 = screen.getByRole("article", { name: /resolved/ });
    fireEvent.click(within(t3).getByRole("button", { name: "Reopen" }));
    expect(onResolve).toHaveBeenCalledWith("t3", false);

    fireEvent.click(within(t1).getByRole("button", { name: "the quick brown fox" }));
    expect(onFocusAnchor).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));

    fireEvent.click(within(t1).getByRole("button", { name: "Reply" }));
    const box = within(t1).getByRole("textbox", { name: "Reply" });
    fireEvent.change(box, { target: { value: "Agreed" } });
    fireEvent.keyDown(box, { key: "Enter", metaKey: true });
    expect(onReply).toHaveBeenCalledWith("t1", "Agreed");
  });

  it("commenters can only resolve their own threads; viewers cannot reply", () => {
    const { rerender } = render(<CommentsPanel threads={threads} currentUserId="me" role="commenter" onResolve={() => {}} onReply={() => {}} />);
    const [t1, t2] = screen.getAllByRole("article");
    expect(within(t1!).queryByRole("button", { name: "Resolve" })).toBeNull();
    expect(within(t2!).getByRole("button", { name: "Resolve" })).toBeInTheDocument();
    rerender(<CommentsPanel threads={threads} currentUserId="me" role="viewer" onResolve={() => {}} onReply={() => {}} />);
    expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();
  });

  it("comments on the selection and shows an empty state", () => {
    const onCreateThread = vi.fn();
    const { rerender } = render(<CommentsPanel threads={[]} selection="  a quoted bit " onCreateThread={onCreateThread} />);
    expect(screen.getByText("No comments yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Comment on selection" }));
    expect(screen.getByText("a quoted bit")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), { target: { value: "Nice" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(onCreateThread).toHaveBeenCalledWith("Nice", "a quoted bit");
    rerender(<CommentsPanel threads={[threads[2]!]} />);
    expect(screen.getByText("All comments are resolved")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* CodeEditor (CodeMirror 6)                                           */
/* ------------------------------------------------------------------ */

describe("CodeEditor", () => {
  it("mounts and drives edits through the ref API", () => {
    const ref = React.createRef<CodeEditorHandle>();
    const onChange = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <div style={{ height: 300 }}>
        <CodeEditor ref={ref} defaultValue="hello" onChange={onChange} onSelectionChange={onSelectionChange} placeholder="Write" />
      </div>
    );
    expect(container.querySelector(".cm-editor")).not.toBeNull();
    expect(container.querySelector(".cm-content")).toHaveAttribute("aria-label", "Editor");
    expect(ref.current!.view).not.toBeNull();

    act(() => ref.current!.view!.dispatch({ selection: { anchor: 5 } }));
    act(() => ref.current!.insert(" world"));
    expect(onChange).toHaveBeenLastCalledWith("hello world", expect.anything());
    expect(ref.current!.getValue()).toBe("hello world");

    act(() => ref.current!.view!.dispatch({ selection: { anchor: 6, head: 11 } }));
    expect(ref.current!.getSelection()).toMatchObject({ from: 6, to: 11, text: "world", line: 1, column: 12 });
    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.objectContaining({ text: "world" }));
    act(() => ref.current!.wrapSelection("**"));
    expect(onChange).toHaveBeenLastCalledWith("hello **world**", expect.anything());
    act(() => ref.current!.wrapSelection("**"));
    expect(ref.current!.getValue()).toBe("hello world");

    act(() => ref.current!.insertBlock("## Block"));
    expect(ref.current!.getValue()).toBe("hello world\n\n## Block\n\n");
    expect(ref.current!.replaceRange(0, 5, "HELLO", "nope")).toBe(false);
    act(() => void ref.current!.replaceRange(0, 5, "HELLO", "hello"));
    expect(ref.current!.getValue().startsWith("HELLO world")).toBe(true);
    act(() => void ref.current!.selectText("Block"));
    expect(ref.current!.getSelection().text).toBe("Block");
    act(() => ref.current!.scrollToLine(3));
    expect(ref.current!.getSelection().line).toBe(3);
  });

  it("follows a controlled value without echoing onChange, and toggles readOnly", () => {
    const ref = React.createRef<CodeEditorHandle>();
    const onChange = vi.fn();
    const { rerender } = render(<CodeEditor ref={ref} value="one" onChange={onChange} />);
    rerender(<CodeEditor ref={ref} value="two" onChange={onChange} />);
    expect(ref.current!.getValue()).toBe("two");
    expect(onChange).not.toHaveBeenCalled();
    rerender(<CodeEditor ref={ref} value="two" onChange={onChange} readOnly />);
    expect(ref.current!.view!.state.readOnly).toBe(true);
    act(() => ref.current!.wrapSelection("_"));
    expect(ref.current!.getValue()).toBe("two");
  });
});

/* ------------------------------------------------------------------ */
/* RichTextEditor (TipTap 3)                                           */
/* ------------------------------------------------------------------ */

describe("RichTextEditor", () => {
  it("mounts with HTML content and toggles bold from the fixed toolbar", async () => {
    const editorRef = React.createRef<RichTextEditorInstance | null>();
    const onChange = vi.fn();
    render(<RichTextEditor defaultValue="<p>Hello world</p>" toolbar="fixed" editorRef={editorRef} onChange={onChange} />);
    expect(screen.getByRole("textbox", { name: "Rich text editor" })).toHaveTextContent("Hello world");
    expect(screen.getByRole("toolbar", { name: "Text formatting" })).toBeInTheDocument();
    const editor = editorRef.current!;
    act(() => {
      editor.commands.selectAll();
    });
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(editor.getHTML()).toContain("<strong>Hello world</strong>");
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining("<strong>"), editor);
    await waitFor(() => expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true"));
  });

  it("supports a controlled JSON value and readOnly", () => {
    const editorRef = React.createRef<RichTextEditorInstance | null>();
    const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
    const { rerender } = render(<RichTextEditor format="json" value={doc("one")} editorRef={editorRef} toolbar="none" />);
    expect(editorRef.current!.getText()).toBe("one");
    rerender(<RichTextEditor format="json" value={doc("two")} editorRef={editorRef} toolbar="none" readOnly />);
    expect(editorRef.current!.getText()).toBe("two");
    expect(editorRef.current!.isEditable).toBe(false);
  });
});
