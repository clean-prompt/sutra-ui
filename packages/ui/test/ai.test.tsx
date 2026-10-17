import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChatAttachment,
  ChatConversation,
  ChatConversationContent,
  ChatCopyAction,
  ChatFeedbackActions,
  ChatListView,
  ChatMessage,
  ChatMessageActions,
  ChatMessageAvatar,
  ChatMessageBody,
  ChatMessageContent,
  ChatMessageHeader,
  ChatScrollButton,
  ChatSource,
  ChatSourceList,
  ChatTool,
  CodeBlock,
  Markdown,
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptSuggestion,
  PromptSuggestionGroup,
  TextShimmer,
  groupChatsByDate,
  type ChatListItemData,
} from "../src";
import { axeViolations } from "./a11y";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** user-event installs its own clipboard stub on setup, so install ours afterwards. */
function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText, readText: vi.fn(), write: vi.fn(), read: vi.fn() },
    configurable: true,
    writable: true,
  });
  return writeText;
}

/* ------------------------------------------------------------------ */
/* ChatConversation / useStickToBottom                                 */
/* ------------------------------------------------------------------ */

describe("ChatConversation", () => {
  const originalScrollTo = Element.prototype.scrollTo;
  let scrollTo: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
  });
  afterEach(() => {
    Element.prototype.scrollTo = originalScrollTo;
  });

  function setup() {
    const utils = render(
      <ChatConversation style={{ height: 200 }}>
        <ChatConversationContent>
          <p>First message</p>
          <p>Second message</p>
        </ChatConversationContent>
        <ChatScrollButton />
      </ChatConversation>
    );
    const log = screen.getByRole("log");
    let top = 0;
    Object.defineProperty(log, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(log, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(log, "scrollTop", {
      configurable: true,
      get: () => top,
      set: (v: number) => {
        top = v;
      },
    });
    const scrollToTop = (v: number) => {
      top = v;
      fireEvent.scroll(log);
    };
    return { ...utils, log, scrollToTop };
  }

  it("renders messages in a polite live log and jumps to the bottom on mount", () => {
    const { log } = setup();
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(within(log).getByText("First message")).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "instant" }));
  });

  it("hides the scroll button while at the bottom", () => {
    setup();
    const button = screen.getByTitle("Scroll to bottom");
    expect(button).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveAttribute("data-state", "hidden");
    expect(screen.queryByRole("button", { name: "Scroll to bottom" })).not.toBeInTheDocument();
  });

  it("shows the scroll button after scrolling up and scrolls back down when clicked", async () => {
    const user = userEvent.setup();
    const { scrollToTop } = setup();
    // Scroll down first (still stuck), then up past the threshold.
    act(() => scrollToTop(500));
    act(() => scrollToTop(100));
    const button = screen.getByRole("button", { name: "Scroll to bottom" });
    expect(button).toHaveAttribute("data-state", "visible");

    scrollTo.mockClear();
    await user.click(button);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "smooth" });
    expect(screen.getByTitle("Scroll to bottom")).toHaveAttribute(
      "data-state",
      "hidden"
    );
  });

  it("treats positions within the threshold as at bottom", () => {
    const { scrollToTop } = setup();
    act(() => scrollToTop(780));
    act(() => scrollToTop(760)); // distance 40 <= 64
    expect(screen.getByTitle("Scroll to bottom")).toHaveAttribute(
      "data-state",
      "hidden"
    );
  });
});

/* ------------------------------------------------------------------ */
/* PromptInput                                                         */
/* ------------------------------------------------------------------ */

describe("PromptInput", () => {
  function Composer(props: React.ComponentProps<typeof PromptInput>) {
    return (
      <PromptInput {...props}>
        <PromptInputTextarea />
        <PromptInputToolbar>
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    );
  }

  it("submits with Enter and clears the field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "Hello there{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toBe("Hello there");
    expect(textarea).toHaveValue("");
  });

  it("inserts a newline with Shift+Enter without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "line one{Shift>}{Enter}{/Shift}line two");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("line one\nline two");
  });

  it("disables the submit button for empty or whitespace input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const submit = screen.getByRole("button", { name: "Send message" });
    expect(submit).toBeDisabled();

    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "   ");
    expect(submit).toBeDisabled();
    await user.type(textarea, "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(textarea, "hi");
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith("   hi", expect.anything());
  });

  it("keeps the text when clearOnSubmit is false", async () => {
    const user = userEvent.setup();
    render(<Composer defaultValue="keep me" clearOnSubmit={false} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("keep me");
  });

  it("shows a stop button while loading that calls onStop, and Enter does not submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    render(<Composer isLoading onStop={onStop} onSubmit={onSubmit} defaultValue="pending" />);
    expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
    const stop = screen.getByRole("button", { name: "Stop generating" });
    expect(stop).toBeEnabled();
    expect(stop).toHaveAttribute("type", "button");

    await user.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: "Message" }), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the button while loading without onStop", () => {
    render(<Composer isLoading defaultValue="x" />);
    expect(screen.getByRole("button", { name: "Stop generating" })).toBeDisabled();
  });

  it("supports controlled value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Composer value="fixed" onValueChange={onValueChange} />);
    await user.type(screen.getByRole("textbox", { name: "Message" }), "!");
    expect(onValueChange).toHaveBeenCalledWith("fixed!");
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("fixed");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Composer defaultValue="Hi" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Message actions                                                     */
/* ------------------------------------------------------------------ */

describe("ChatCopyAction", () => {
  it("copies the text, shows Copied feedback, then resets", async () => {
    // RTL's async wrapper waits on setTimeout(0), which never fires under Vitest fake timers
    // (it only auto-advances Jest's), so this timer-driven test uses fireEvent instead of user-event.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const writeText = mockClipboard();
    const onCopy = vi.fn();
    render(
      <ChatMessageActions>
        <ChatCopyAction text="Answer text" onCopy={onCopy} />
      </ChatMessageActions>
    );
    expect(screen.getByRole("toolbar", { name: "Message actions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("Answer text");
    // findBy* would poll with the faked setTimeout; flush the clipboard promise instead.
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(onCopy).toHaveBeenCalledWith("Answer text");

    act(() => {
      vi.advanceTimersByTime(1700);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("does not show Copied when the clipboard write fails", async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    writeText.mockRejectedValueOnce(new Error("denied"));
    const onCopy = vi.fn();
    render(<ChatCopyAction text="x" onCopy={onCopy} />);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
    expect(onCopy).not.toHaveBeenCalled();
  });
});

describe("ChatFeedbackActions", () => {
  it("toggles thumbs up / down with aria-pressed and reports changes", async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();
    render(<ChatFeedbackActions onFeedback={onFeedback} />);
    const group = screen.getByRole("group", { name: "Rate this response" });
    const up = within(group).getByRole("button", { name: "Good response" });
    const down = within(group).getByRole("button", { name: "Bad response" });
    expect(up).toHaveAttribute("aria-pressed", "false");
    expect(down).toHaveAttribute("aria-pressed", "false");

    await user.click(up);
    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(onFeedback).toHaveBeenLastCalledWith("up");

    await user.click(down);
    expect(up).toHaveAttribute("aria-pressed", "false");
    expect(down).toHaveAttribute("aria-pressed", "true");
    expect(onFeedback).toHaveBeenLastCalledWith("down");

    await user.click(down);
    expect(down).toHaveAttribute("aria-pressed", "false");
    expect(onFeedback).toHaveBeenLastCalledWith(null);
    expect(onFeedback).toHaveBeenCalledTimes(3);
  });

  it("respects a controlled value", async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();
    render(<ChatFeedbackActions value="up" onFeedback={onFeedback} />);
    const up = screen.getByRole("button", { name: "Good response" });
    await user.click(up);
    expect(onFeedback).toHaveBeenCalledWith(null);
    expect(up).toHaveAttribute("aria-pressed", "true");
  });

  it("disables both buttons", () => {
    render(<ChatFeedbackActions disabled />);
    expect(screen.getByRole("button", { name: "Good response" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bad response" })).toBeDisabled();
  });
});

/* ------------------------------------------------------------------ */
/* ChatListView                                                        */
/* ------------------------------------------------------------------ */

describe("ChatListView / groupChatsByDate", () => {
  const NOW = new Date(2026, 9, 18, 12, 0, 0); // Oct 18 2026, local noon
  const at = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h, 0, 0);
  const items: ChatListItemData[] = [
    { id: "old", title: "Ancient chat", updatedAt: at(2026, 6, 1) },
    { id: "today2", title: "Morning chat", updatedAt: at(2026, 9, 18, 8) },
    { id: "today1", title: "Late morning chat", updatedAt: at(2026, 9, 18, 11) },
    { id: "yday", title: "Yesterday chat", updatedAt: at(2026, 9, 17, 22) },
    { id: "week", title: "Week chat", updatedAt: at(2026, 9, 14) },
    { id: "month", title: "Month chat", updatedAt: at(2026, 9, 1).toISOString() },
    { id: "pin", title: "Pinned chat", updatedAt: at(2025, 0, 1).getTime(), pinned: true },
  ];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  it("buckets by recency in a fixed order, newest first", () => {
    const groups = groupChatsByDate(items);
    expect(groups.map((g) => g.label)).toEqual([
      "Pinned",
      "Today",
      "Yesterday",
      "Previous 7 days",
      "Previous 30 days",
      "Older",
    ]);
    expect(groups.map((g) => g.key)).toEqual(["pinned", "today", "yesterday", "previous7", "previous30", "older"]);
    const today = groups.find((g) => g.key === "today")!;
    expect(today.items.map((i) => i.id)).toEqual(["today1", "today2"]);
    expect(groups.find((g) => g.key === "older")!.items.map((i) => i.id)).toEqual(["old"]);
  });

  it("treats midnight as the start of today and omits empty groups", () => {
    const groups = groupChatsByDate([
      { id: "a", title: "Midnight", updatedAt: new Date(2026, 9, 18, 0, 0, 0) },
      { id: "b", title: "Just before", updatedAt: new Date(2026, 9, 17, 23, 59, 59) },
    ]);
    expect(groups.map((g) => [g.key, g.items.map((i) => i.id)])).toEqual([
      ["today", ["a"]],
      ["yesterday", ["b"]],
    ]);
    expect(groupChatsByDate([])).toEqual([]);
  });

  it("accepts an explicit now", () => {
    const groups = groupChatsByDate(items, new Date(2026, 9, 19, 9));
    expect(groups.find((g) => g.key === "yesterday")!.items.map((i) => i.id)).toEqual(["today1", "today2"]);
  });

  it("renders labelled sections and filters by search", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChatListView items={items} activeId="week" onSelect={onSelect} />);
    const nav = screen.getByRole("navigation", { name: "Conversations" });
    const today = within(nav).getByRole("region", { name: "Today" });
    expect(within(today).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Late morning chat",
      "Morning chat",
    ]);
    expect(within(nav).getByRole("region", { name: "Previous 7 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week chat" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "Yesterday chat" }));
    expect(onSelect).toHaveBeenCalledWith("yday");

    await user.type(screen.getByRole("searchbox", { name: "Search conversations" }), "month");
    expect(screen.getByRole("button", { name: "Month chat" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Week chat" })).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No matching chats")).toBeInTheDocument();
  });

  it("renames inline and deletes", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    render(<ChatListView items={items.slice(0, 2)} onRename={onRename} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Rename Morning chat" }));
    const input = screen.getByRole("textbox", { name: "Conversation title" });
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "  Renamed  {Enter}");
    expect(onRename).toHaveBeenCalledWith("today2", "Renamed");

    await user.click(screen.getByRole("button", { name: "Delete Ancient chat" }));
    expect(onDelete).toHaveBeenCalledWith("old");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ChatListView items={items} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ChainOfThought                                                      */
/* ------------------------------------------------------------------ */

describe("ChainOfThought", () => {
  function Thought({ streaming }: { streaming: boolean }) {
    return (
      <ChainOfThought streaming={streaming}>
        <ChainOfThoughtContent>
          <ChainOfThoughtStep label="Searching the web" status={streaming ? "active" : "complete"} />
        </ChainOfThoughtContent>
      </ChainOfThought>
    );
  }

  it("is expanded while streaming and collapses when streaming ends", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 18, 12, 0, 0));
    const { rerender } = render(<Thought streaming />);
    const trigger = screen.getByRole("button", { name: /Thinking…/ });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Searching the web")).toBeInTheDocument();

    vi.setSystemTime(new Date(2026, 9, 18, 12, 0, 12));
    rerender(<Thought streaming={false} />);
    const done = screen.getByRole("button", { name: /Thought for 12s/ });
    expect(done).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Searching the web")).not.toBeInTheDocument();
  });

  it("can be reopened by the user and uses an explicit duration", async () => {
    const user = userEvent.setup();
    render(
      <ChainOfThought duration={75}>
        <ChainOfThoughtContent>Reasoning body</ChainOfThoughtContent>
      </ChainOfThought>
    );
    const trigger = screen.getByRole("button", { name: /Thought for 1m 15s/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Reasoning body")).toBeInTheDocument();
  });

  it("does not auto-collapse when autoCollapse is false", () => {
    const { rerender } = render(
      <ChainOfThought streaming autoCollapse={false} defaultOpen>
        <ChainOfThoughtContent>Body</ChainOfThoughtContent>
      </ChainOfThought>
    );
    rerender(
      <ChainOfThought streaming={false} autoCollapse={false} defaultOpen>
        <ChainOfThoughtContent>Body</ChainOfThoughtContent>
      </ChainOfThought>
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });
});

/* ------------------------------------------------------------------ */
/* Markdown                                                            */
/* ------------------------------------------------------------------ */

describe("Markdown", () => {
  const source = [
    "# Title",
    "",
    "Some **bold** text and a [link](https://example.com).",
    "",
    "| Name | Qty |",
    "| ---- | --: |",
    "| Apple | 3 |",
    "| Pear | 5 |",
    "",
    "```ts",
    "const a = 1;",
    "",
    "const b = 2;",
    "```",
  ].join("\n");

  it("renders a GFM table and a fenced code block", () => {
    render(<Markdown>{source}</Markdown>);
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Name", "Qty"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByRole("cell", { name: "5" })).toHaveStyle({ textAlign: "right" });

    const code = document.querySelector("pre code");
    // The blank line inside the fence must not split the block.
    expect(code?.textContent).toBe("const a = 1;\n\nconst b = 2;");
    expect(screen.getByText("ts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  });

  it("opens external links in a new tab", () => {
    render(<Markdown>{"[ext](https://example.com) and [int](/docs)"}</Markdown>);
    expect(screen.getByRole("link", { name: "ext" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "int" })).not.toHaveAttribute("target");
  });

  it("copies fenced code", async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<Markdown>{"```\nnpm i\n```"}</Markdown>);
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("npm i");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Markdown>{source}</Markdown>);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* CodeBlock                                                           */
/* ------------------------------------------------------------------ */

describe("CodeBlock", () => {
  const code = "const a = 1;\nconst b = 2;\nconst c = 3;\n";

  it("copies the code (without trailing newline)", async () => {
    const user = userEvent.setup();
    const writeText = mockClipboard();
    render(<CodeBlock code={code} language="ts" filename="example.ts" />);
    expect(screen.getByText("example.ts")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("const a = 1;\nconst b = 2;\nconst c = 3;");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByText("Copied to clipboard")).toBeInTheDocument();
  });

  it("highlights the requested lines and shows line numbers", () => {
    const { container } = render(
      <CodeBlock code={code} language="ts" showLineNumbers startLine={10} highlightLines={[11]} />
    );
    const lines = Array.from(container.querySelectorAll("pre code > span"));
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.firstElementChild?.textContent)).toEqual(["10", "11", "12"]);
    expect(lines[1].className).toContain("bg-primary/15");
    expect(lines[0].className).not.toContain("bg-primary/15");
    expect(lines[2].className).not.toContain("bg-primary/15");
  });

  it("toggles wrap and hides the copy button when not copyable", async () => {
    const user = userEvent.setup();
    const onWrapChange = vi.fn();
    render(<CodeBlock code="x" language="js" showWrapToggle onWrapChange={onWrapChange} copyable={false} />);
    expect(screen.queryByRole("button", { name: "Copy code" })).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Toggle line wrap" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(onWrapChange).toHaveBeenCalledWith(true);
  });

  it("has no axe violations", async () => {
    const { container } = render(<CodeBlock code={code} language="ts" filename="a.ts" highlightLines={[1]} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Sources, tools, attachments                                         */
/* ------------------------------------------------------------------ */

describe("ChatSource / ChatSourceList", () => {
  it("renders a citation chip linking to the source", () => {
    render(<ChatSource href="https://www.example.com/article" disablePreview />);
    const link = screen.getByRole("link", { name: "example.com" });
    expect(link).toHaveAttribute("href", "https://www.example.com/article");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows an index instead of the favicon and uses the title", () => {
    render(<ChatSource href="https://a.dev" title="A Dev" index={2} />);
    expect(screen.getByRole("link", { name: "2 A Dev" })).toBeInTheDocument();
  });

  it("expands the source list", async () => {
    const user = userEvent.setup();
    render(
      <ChatSourceList
        sources={[
          { href: "https://www.wikipedia.org/wiki/x", title: "Wikipedia" },
          { href: "https://mdn.dev/docs" },
        ]}
      />
    );
    const trigger = screen.getByRole("button", { name: "2 sources" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Wikipedia");
    expect(links[1]).toHaveTextContent("mdn.dev");
  });

  it("uses singular label and renders nothing for an empty list", () => {
    const { container, rerender } = render(<ChatSourceList sources={[{ href: "https://a.dev" }]} />);
    expect(screen.getByRole("button", { name: "1 source" })).toBeInTheDocument();
    rerender(<ChatSourceList sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <ChatSource href="https://a.dev" title="A" />
        <ChatSourceList sources={[{ href: "https://a.dev" }, { href: "https://b.dev" }]} defaultOpen />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ChatTool", () => {
  it("expands to show input and output", async () => {
    const user = userEvent.setup();
    render(<ChatTool name="web_search" duration={1500} input={{ q: "sutra" }} output={{ results: 3 }} />);
    const trigger = screen.getByRole("button", { name: /web_search/ });
    expect(trigger).toHaveTextContent("Completed");
    expect(trigger).toHaveTextContent("1.5s");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText(/"q": "sutra"/)).toBeInTheDocument();
    expect(screen.getByText(/"results": 3/)).toBeInTheDocument();
  });

  it("shows error text in the error state", () => {
    render(<ChatTool name="fetch" state="error" errorText="Timed out" defaultOpen output="ignored" />);
    expect(screen.getByRole("button", { name: /fetch/ })).toHaveTextContent("Error");
    expect(screen.getByText("Timed out")).toBeInTheDocument();
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });

  it("disables the trigger when there is no body and hides duration while running", () => {
    render(<ChatTool name="noop" state="running" duration={200} />);
    const trigger = screen.getByRole("button", { name: /noop/ });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent("Running");
    expect(trigger).not.toHaveTextContent("200ms");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ChatTool name="t" input={{ a: 1 }} defaultOpen />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ChatAttachment", () => {
  it("shows extension and size, and a remove button", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<ChatAttachment name="report.pdf" fileSize={1536} onRemove={onRemove} />);
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF · 1.5 KB")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove report.pdf" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows upload progress and errors", () => {
    const { rerender, container } = render(<ChatAttachment name="a.png" progress={42.4} />);
    expect(screen.getByText("Uploading… 42%")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-state", "uploading");
    rerender(<ChatAttachment name="a.png" progress={42} error="Too large" />);
    expect(screen.getByText("Too large")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-state", "error");
    rerender(<ChatAttachment name="a.png" error />);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("uses the MIME type for thumbnails when the name has no extension", () => {
    const { container } = render(
      <ChatAttachment name="pasted" mimeType="image/png" previewUrl="blob:x" variant="image" />
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "blob:x");
    expect(container.firstElementChild).toHaveAttribute("title", "pasted");
  });

  it("renders a chip variant", () => {
    render(<ChatAttachment name="notes.txt" variant="chip" onRemove={() => {}} />);
    expect(screen.getByText("notes.txt").closest("[data-variant]")).toHaveAttribute("data-variant", "chip");
    expect(screen.getByRole("button", { name: "Remove notes.txt" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* ChatMessage, TextShimmer, PromptSuggestion                          */
/* ------------------------------------------------------------------ */

describe("ChatMessage", () => {
  it("renders avatar, header and markdown content with role data", () => {
    const ts = new Date(2026, 9, 18, 9, 30);
    const { container } = render(
      <ChatMessage role="assistant">
        <ChatMessageAvatar />
        <ChatMessageBody>
          <ChatMessageHeader name="Sutra" timestamp={ts} />
          <ChatMessageContent markdown>{"Hello **world**"}</ChatMessageContent>
        </ChatMessageBody>
      </ChatMessage>
    );
    expect(container.firstElementChild).toHaveAttribute("data-role", "assistant");
    expect(screen.getByRole("img", { name: "Assistant" })).toBeInTheDocument();
    expect(screen.getByText("Sutra")).toBeInTheDocument();
    expect(container.querySelector("time")).toHaveAttribute("dateTime", ts.toISOString());
    expect(screen.getByText("world").tagName).toBe("STRONG");
  });

  it("shows user initials and plain text when markdown is off", () => {
    render(
      <ChatMessage role="user">
        <ChatMessageAvatar name="Ada Lovelace" />
        <ChatMessageContent>{"**not bold**"}</ChatMessageContent>
      </ChatMessage>
    );
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
    expect(screen.getByText("**not bold**")).toBeInTheDocument();
  });

  it("marks streaming messages", () => {
    const { container } = render(
      <ChatMessage streaming>
        <ChatMessageContent>Typing</ChatMessageContent>
      </ChatMessage>
    );
    expect(container.firstElementChild).toHaveAttribute("data-streaming", "true");
  });

  it("has no axe violations with actions", async () => {
    const { container } = render(
      <ChatMessage>
        <ChatMessageAvatar />
        <ChatMessageBody>
          <ChatMessageContent markdown>{"Answer"}</ChatMessageContent>
          <ChatMessageActions>
            <ChatCopyAction text="Answer" />
            <ChatFeedbackActions />
          </ChatMessageActions>
        </ChatMessageBody>
      </ChatMessage>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("TextShimmer", () => {
  it("renders the requested element with shimmer variables", () => {
    render(
      <TextShimmer as="p" duration={3} spread={80}>
        Thinking…
      </TextShimmer>
    );
    const el = screen.getByText("Thinking…");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("text-shimmer");
    expect(el.style.getPropertyValue("--shimmer-duration")).toBe("3s");
    // spread is clamped to 50%
    expect(el.style.getPropertyValue("--shimmer-spread")).toBe("50%");
  });
});

describe("PromptSuggestion", () => {
  it("calls the click handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PromptSuggestionGroup>
        <PromptSuggestion onClick={onClick}>Summarize this</PromptSuggestion>
      </PromptSuggestionGroup>
    );
    const button = screen.getByRole("button", { name: "Summarize this" });
    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("highlights the matching part in autocomplete mode", () => {
    render(<PromptSuggestion highlight="react">Explain React hooks</PromptSuggestion>);
    const mark = screen.getByText("React");
    expect(mark.tagName).toBe("MARK");
    expect(screen.getByRole("button", { name: "Explain React hooks" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <PromptSuggestionGroup aria-label="Suggestions" variant="list">
        <PromptSuggestion>One</PromptSuggestion>
        <PromptSuggestion>Two</PromptSuggestion>
      </PromptSuggestionGroup>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
