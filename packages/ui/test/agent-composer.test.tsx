import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PromptInput,
  PromptInputAddContextMenu,
  PromptInputContextChip,
  PromptInputDropOverlay,
  PromptInputModelPill,
  PromptInputModelSelect,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  formatContextRange,
  highlightTextSegments,
  mentionHighlightRules,
} from "../src/kits/ai/prompt-input";
import {
  AttachmentThumbnails,
  ComposerToolbar,
  QueuedMessages,
  SideThread,
  useComposerHistory,
  type QueuedMessage,
  type SideThreadExchange,
} from "../src/kits/agent/agent-composer";
import { axeViolations } from "./helpers/a11y";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const IMG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>')}`;

function dragEvent(types: string[] = ["Files"], files: File[] = []) {
  return { dataTransfer: { types, files, dropEffect: "none" } };
}

/* ------------------------------------------------------------------ */

describe("highlightTextSegments", () => {
  it("finds @mentions, #tags and a leading /command", () => {
    const segs = highlightTextSegments("/review @src/app.tsx#L10-20, see #perf and a@b.com", mentionHighlightRules);
    const marked = segs.filter((s) => s.kind).map((s) => [s.kind, s.text]);
    expect(marked).toEqual([
      ["command", "/review"],
      ["mention", "@src/app.tsx#L10-20"],
      ["tag", "#perf"],
    ]);
    expect(segs.map((s) => s.text).join("")).toBe("/review @src/app.tsx#L10-20, see #perf and a@b.com");
  });

  it("supports explicit ranges and custom patterns", () => {
    const segs = highlightTextSegments("fix TODO now", [
      { ranges: [[0, 3]], kind: "verb" },
      { pattern: /TODO/, kind: "todo" },
    ]);
    expect(segs.filter((s) => s.kind).map((s) => s.text)).toEqual(["fix", "TODO"]);
  });
});

describe("PromptInputTextarea highlight", () => {
  function Composer(props: { defaultValue?: string; onSubmit?: (v: string) => void }) {
    return (
      <PromptInput defaultValue={props.defaultValue} onSubmit={props.onSubmit}>
        <PromptInputTextarea highlight />
        <PromptInputToolbar>
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    );
  }

  it("renders mirror spans and stays in sync with the value", async () => {
    const user = userEvent.setup();
    const { container } = render(<Composer defaultValue="/plan " />);
    const mirror = container.querySelector("[data-slot=prompt-input-mirror]")!;
    expect(mirror).toHaveAttribute("aria-hidden");
    expect(mirror.querySelector("[data-highlight=command]")).toHaveTextContent("/plan");

    const textarea = screen.getByRole("textbox", { name: "Message" });
    await user.type(textarea, "check @src/app.tsx and #bug");
    expect(textarea).toHaveValue("/plan check @src/app.tsx and #bug");
    expect(mirror.textContent).toBe("/plan check @src/app.tsx and #bug");
    expect(mirror.querySelector("[data-highlight=mention]")).toHaveTextContent("@src/app.tsx");
    expect(mirror.querySelector("[data-highlight=tag]")).toHaveTextContent("#bug");

    await user.clear(textarea);
    expect(mirror.querySelectorAll("[data-highlight]")).toHaveLength(0);
  });

  it("keeps the textarea editable and submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Composer onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message" });
    expect(textarea.className).toContain("text-transparent");
    await user.type(textarea, "hi @README.md{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("hi @README.md", expect.anything());
    expect(textarea).toHaveValue("");
  });

  it("does not render a mirror without highlight", () => {
    const { container } = render(
      <PromptInput>
        <PromptInputTextarea />
      </PromptInput>
    );
    expect(container.querySelector("[data-slot=prompt-input-mirror]")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Composer defaultValue="@a.ts #x" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("PromptInputDropOverlay", () => {
  it("shows during drag and hides on dragleave / drop", () => {
    const onFilesAdded = vi.fn();
    const { container } = render(
      <PromptInput onFilesAdded={onFilesAdded}>
        <PromptInputTextarea />
        <PromptInputDropOverlay />
      </PromptInput>
    );
    const form = container.querySelector("form")!;
    expect(screen.queryByText("Drop to attach as context")).toBeNull();
    fireEvent.dragEnter(form, dragEvent());
    expect(screen.getByText("Drop to attach as context")).toBeInTheDocument();
    expect(screen.queryByText("Drop files to attach")).toBeNull();
    fireEvent.dragLeave(form, dragEvent());
    expect(screen.queryByText("Drop to attach as context")).toBeNull();

    const file = new File(["x"], "a.txt", { type: "text/plain" });
    fireEvent.dragEnter(form, dragEvent());
    fireEvent.drop(form, dragEvent(["Files"], [file]));
    expect(screen.queryByText("Drop to attach as context")).toBeNull();
    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it("accepts non-file drops through onContextDrop", () => {
    const onContextDrop = vi.fn();
    const { container } = render(
      <PromptInput onContextDrop={onContextDrop}>
        <PromptInputTextarea />
        <PromptInputDropOverlay label="Drop to mention" />
      </PromptInput>
    );
    const form = container.querySelector("form")!;
    fireEvent.dragEnter(form, dragEvent(["text/uri-list"]));
    expect(screen.getByText("Drop to mention")).toBeInTheDocument();
    fireEvent.drop(form, dragEvent(["text/uri-list"]));
    expect(onContextDrop).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Drop to mention")).toBeNull();
  });

  it("keeps the built-in hint without the overlay part", () => {
    const { container } = render(
      <PromptInput onFilesAdded={() => {}}>
        <PromptInputTextarea />
      </PromptInput>
    );
    fireEvent.dragEnter(container.querySelector("form")!, dragEvent());
    expect(screen.getByText("Drop files to attach")).toBeInTheDocument();
  });
});

describe("PromptInputContextChip", () => {
  it("formats ranges", () => {
    expect(formatContextRange("src/app.tsx", [10, 20])).toBe("src/app.tsx#L10-20");
    expect(formatContextRange("src/app.tsx", 4)).toBe("src/app.tsx#L4");
    expect(formatContextRange("src/app.tsx")).toBe("src/app.tsx");
  });

  it("toggles include / exclude and removes", async () => {
    const user = userEvent.setup();
    const onIncludedChange = vi.fn();
    const onRemove = vi.fn();
    render(<PromptInputContextChip path="src/app.tsx" lines={[10, 20]} onIncludedChange={onIncludedChange} onRemove={onRemove} />);
    const chip = screen.getByRole("group", { name: "Context: src/app.tsx#L10-20" });
    expect(chip).toHaveTextContent("app.tsx#L10-20");
    const eye = within(chip).getByRole("button", { name: "Exclude src/app.tsx#L10-20 from context" });
    expect(eye).toHaveAttribute("aria-pressed", "true");
    await user.click(eye);
    expect(onIncludedChange).toHaveBeenCalledWith(false);
    expect(within(chip).getByRole("button", { name: "Include src/app.tsx#L10-20 in context" })).toHaveAttribute("aria-pressed", "false");
    expect(chip).not.toHaveAttribute("data-included");
    await user.click(within(chip).getByRole("button", { name: "Remove src/app.tsx#L10-20" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("has no axe violations", async () => {
    const { container } = render(<PromptInputContextChip path="src/app.tsx" lines={[10, 20]} onRemove={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("PromptInputAddContextMenu", () => {
  it("lists the default items and runs them", async () => {
    const user = userEvent.setup();
    const onAttachFile = vi.fn();
    const onMentionFile = vi.fn();
    const onPasteImage = vi.fn();
    render(
      <PromptInput onFilesAdded={() => {}}>
        <PromptInputTextarea />
        <PromptInputAddContextMenu onAttachFile={onAttachFile} onMentionFile={onMentionFile} onPasteImage={onPasteImage} />
      </PromptInput>
    );
    await user.click(screen.getByRole("button", { name: "Add context" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Attach file…",
      "Mention a file from this project…@",
      "Upload from computer",
      "Paste image",
    ]);
    await user.click(within(menu).getByRole("menuitem", { name: /Mention a file/ }));
    expect(onMentionFile).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Add context" }));
    await user.click(await screen.findByRole("menuitem", { name: "Paste image" }));
    expect(onPasteImage).toHaveBeenCalledTimes(1);
  });

  it("inserts @ at the caret by default and accepts custom items", async () => {
    const user = userEvent.setup();
    const onTerminal = vi.fn();
    render(
      <PromptInput defaultValue="look at">
        <PromptInputTextarea />
        <PromptInputAddContextMenu
          items={(defaults) => [...defaults, { id: "term", label: "Terminal output", onSelect: onTerminal }]}
        />
      </PromptInput>
    );
    const textarea = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
    textarea.setSelectionRange(7, 7);
    await user.click(screen.getByRole("button", { name: "Add context" }));
    const items = within(await screen.findByRole("menu")).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Mention a file from this project…@", "Terminal output"]);
    await user.click(items[0]);
    expect(textarea).toHaveValue("look at @");
    await user.click(screen.getByRole("button", { name: "Add context" }));
    await user.click(await screen.findByRole("menuitem", { name: "Terminal output" }));
    expect(onTerminal).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <PromptInput>
        <PromptInputTextarea />
        <PromptInputAddContextMenu />
      </PromptInput>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Model pill", () => {
  it("counts down the fast-mode cooldown", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"] });
    const onEnd = vi.fn();
    render(<PromptInputModelPill model="Opus" effort="High" fast="cooldown" fastCooldown={3} onFastCooldownEnd={onEnd} />);
    const pill = screen.getByRole("button");
    expect(pill).toHaveTextContent("Opus");
    expect(pill).toHaveTextContent("High");
    expect(screen.getByText("Fast mode cooling down, 3s left")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Fast mode cooling down, 2s left")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Fast mode off")).toBeInTheDocument();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("shows fast on in the model select and keeps the existing menu", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <PromptInputModelSelect
        models={[
          { id: "a", name: "Alpha" },
          { id: "b", name: "Beta" },
        ]}
        fast="on"
        effort="Max"
        onValueChange={onValueChange}
      />
    );
    const trigger = screen.getByRole("button", { name: /Alpha/ });
    expect(trigger).toHaveTextContent("Fast mode on");
    expect(trigger).toHaveTextContent("Max");
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitemradio", { name: "Beta" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("has no axe violations", async () => {
    const { container } = render(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={12} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */

describe("QueuedMessages", () => {
  function Harness(props: { onSendNow?: (id: string) => void }) {
    const [items, setItems] = React.useState<QueuedMessage[]>([
      { id: "1", text: "Also update the README" },
      { id: "2", text: "Then run the tests" },
    ]);
    return (
      <QueuedMessages
        items={items}
        onEdit={(id, text) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, text } : x)))}
        onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
        onSendNow={props.onSendNow}
        onReorder={(ids) => setItems((xs) => ids.map((id) => xs.find((x) => x.id === id)!))}
      />
    );
  }

  it("edits inline, removes, sends now, reorders and collapses", async () => {
    const user = userEvent.setup();
    const onSendNow = vi.fn();
    render(<Harness onSendNow={onSendNow} />);
    const region = screen.getByRole("region", { name: "Queued messages" });
    expect(within(region).getAllByText("Queued")).toHaveLength(2);

    const rows = () => within(region).getAllByRole("listitem");
    await user.click(within(rows()[0]).getByRole("button", { name: "Edit" }));
    const editor = screen.getByRole("textbox", { name: "Edit queued message" });
    await user.clear(editor);
    await user.type(editor, "Update the CHANGELOG{Enter}");
    expect(rows()[0]).toHaveTextContent("Update the CHANGELOG");

    await user.click(within(rows()[0]).getByRole("button", { name: "Edit" }));
    await user.type(screen.getByRole("textbox", { name: "Edit queued message" }), " nope{Escape}");
    expect(rows()[0]).toHaveTextContent("Update the CHANGELOG");
    expect(rows()[0]).not.toHaveTextContent("nope");

    await user.click(within(rows()[1]).getByRole("button", { name: "Send now" }));
    expect(onSendNow).toHaveBeenCalledWith("2");

    await user.click(within(rows()[1]).getByRole("button", { name: "Move up" }));
    expect(rows()[0]).toHaveTextContent("Then run the tests");

    const pill = within(region).getByRole("button", { name: "2 queued" });
    expect(pill).toHaveAttribute("aria-expanded", "true");
    await user.click(pill);
    expect(pill).toHaveAttribute("aria-expanded", "false");
    expect(within(region).queryAllByRole("listitem")).toHaveLength(0);
    await user.click(pill);

    await user.click(within(rows()[0]).getByRole("button", { name: "Remove" }));
    expect(rows()).toHaveLength(1);
    expect(within(region).getByRole("button", { name: "1 queued" })).toBeInTheDocument();
  });

  it("renders nothing when empty", () => {
    const { container } = render(<QueuedMessages items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Harness onSendNow={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("QueuedMessages steer", () => {
  it("adds a Steer action next to Send now", async () => {
    const onSteer = vi.fn();
    const onSendNow = vi.fn();
    const { container } = render(
      <QueuedMessages items={[{ id: "a", text: "Use pnpm instead" }]} onSteer={onSteer} onSendNow={onSendNow} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Steer" }));
    expect(onSteer).toHaveBeenCalledWith("a");
    expect(onSendNow).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByRole("button", { name: "Steer" }));
    expect((await screen.findAllByText(/without stopping/)).length).toBeGreaterThan(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("omits Steer when onSteer is unset", () => {
    render(<QueuedMessages items={[{ id: "a", text: "x" }]} onSendNow={() => {}} />);
    expect(screen.queryByRole("button", { name: "Steer" })).toBeNull();
  });
});

describe("SideThread", () => {
  const exchanges: SideThreadExchange[] = [
    { id: "a", question: "What does useMemo do?", answer: "It caches a computed value." },
    { id: "b", question: "And useCallback?", status: "pending" },
  ];

  it("asks a side question", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    const onClose = vi.fn();
    render(<SideThread exchanges={[exchanges[0]]} onAsk={onAsk} onClose={onClose} />);
    expect(screen.getByRole("region", { name: "Side question" })).toBeInTheDocument();
    expect(screen.getByText("It caches a computed value.")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Side question" }), "Is it free?{Enter}");
    expect(onAsk).toHaveBeenCalledWith("Is it free?");
    await user.click(screen.getByRole("button", { name: "Close side question" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows pending answers and disables asking", () => {
    render(<SideThread exchanges={exchanges} onAsk={() => {}} />);
    expect(screen.getByText("Answering…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop generating" })).toBeDisabled();
  });

  it("resizes with the keyboard and pointer", () => {
    const onHeightChange = vi.fn();
    render(<SideThread exchanges={[]} defaultHeight={200} minHeight={120} maxHeight={260} step={20} onHeightChange={onHeightChange} />);
    const handle = screen.getByRole("separator", { name: "Resize side question" });
    const region = screen.getByRole("region", { name: "Side question" });
    expect(handle).toHaveAttribute("aria-valuenow", "200");
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(handle).toHaveAttribute("aria-valuenow", "220");
    expect(region.style.height).toBe("220px");
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(handle).toHaveAttribute("aria-valuenow", "180");
    fireEvent.keyDown(handle, { key: "Home" });
    expect(handle).toHaveAttribute("aria-valuenow", "260");
    fireEvent.keyDown(handle, { key: "End" });
    expect(handle).toHaveAttribute("aria-valuenow", "120");
    expect(onHeightChange).toHaveBeenLastCalledWith(120);

    fireEvent.pointerDown(handle, { button: 0, clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 250, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(handle).toHaveAttribute("aria-valuenow", "170");
  });

  it("has no axe violations", async () => {
    const { container } = render(<SideThread exchanges={exchanges} onAsk={() => {}} onClose={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ComposerToolbar", () => {
  const slots = {
    addContext: <button type="button">Add</button>,
    mode: <button type="button">Mode</button>,
    effort: <button type="button">Effort</button>,
    model: <button type="button">Model</button>,
    submit: <button type="button">Send</button>,
  };

  it("lays out all slots inline", () => {
    render(<ComposerToolbar {...slots} collapse={false} />);
    for (const name of ["Add", "Mode", "Effort", "Model", "Send"]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More options" })).toBeNull();
  });

  it("collapses extras into an overflow popover", async () => {
    const user = userEvent.setup();
    render(<ComposerToolbar {...slots} collapse />);
    expect(screen.queryByRole("button", { name: "Mode" })).toBeNull();
    expect(screen.getByRole("button", { name: "Model" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More options" }));
    expect(await screen.findByRole("button", { name: "Mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Effort" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ComposerToolbar {...slots} collapse />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("AttachmentThumbnails", () => {
  const items = [
    { id: "i1", name: "screenshot.png", url: IMG, mimeType: "image/png" },
    { id: "f1", name: "spec.pdf", size: 1_400_000, pages: 12 },
    { id: "f2", name: "data.csv", status: "uploading" as const, progress: 40 },
    { id: "f3", name: "big.zip", status: "failed" as const, error: "Too large" },
  ];

  it("shows meta and states, previews images and removes", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onRetry = vi.fn();
    render(<AttachmentThumbnails items={items} onRemove={onRemove} onRetry={onRetry} />);
    const list = screen.getByRole("list", { name: "Attachments" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("12 pages · 1.3 MB")).toBeInTheDocument();
    expect(screen.getByText("Uploading… 40%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Uploading data.csv" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("Too large")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry big.zip" }));
    expect(onRetry).toHaveBeenCalledWith("f3");

    await user.click(screen.getByRole("button", { name: "Preview screenshot.png" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "screenshot.png" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Remove spec.pdf" }));
    expect(onRemove).toHaveBeenCalledWith("f1");
  });

  it("has no axe violations", async () => {
    const { container } = render(<AttachmentThumbnails items={items} onRemove={() => {}} onRetry={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("useComposerHistory", () => {
  function HistoryComposer({ initial = ["first", "second"] }: { initial?: string[] }) {
    const [value, setValue] = React.useState("");
    const history = useComposerHistory({ value, onValueChange: setValue, initialEntries: initial });
    return (
      <PromptInput value={value} onValueChange={setValue} onSubmit={(v) => history.push(v)}>
        <PromptInputTextarea onKeyDown={history.onKeyDown} />
        <output data-testid="index">{String(history.index)}</output>
      </PromptInput>
    );
  }

  it("recalls with ↑ at the start and returns to the draft with ↓ at the end", async () => {
    const user = userEvent.setup();
    render(<HistoryComposer />);
    const textarea = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
    await user.type(textarea, "draft");
    // Caret at the end: ↑ does not recall.
    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(textarea).toHaveValue("draft");

    textarea.setSelectionRange(0, 0);
    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(textarea).toHaveValue("second");
    expect(textarea.selectionStart).toBe(0);
    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(textarea).toHaveValue("first");
    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(textarea).toHaveValue("first");
    expect(screen.getByTestId("index")).toHaveTextContent("0");

    textarea.setSelectionRange(5, 5);
    fireEvent.keyDown(textarea, { key: "ArrowDown" });
    expect(textarea).toHaveValue("second");
    expect(textarea.selectionStart).toBe(6);
    fireEvent.keyDown(textarea, { key: "ArrowDown" });
    expect(textarea).toHaveValue("draft");
    expect(screen.getByTestId("index")).toHaveTextContent("null");
  });

  it("pushes submitted prompts and skips duplicates", async () => {
    const user = userEvent.setup();
    render(<HistoryComposer initial={[]} />);
    const textarea = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
    await user.type(textarea, "one{Enter}");
    await user.type(textarea, "two{Enter}");
    await user.type(textarea, "two{Enter}");
    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(textarea).toHaveValue("two");
    fireEvent.keyDown(textarea, { key: "ArrowUp" });
    expect(textarea).toHaveValue("one");
    await user.type(textarea, "!");
    expect(screen.getByTestId("index")).toHaveTextContent("null");
  });

  it("has no axe violations", async () => {
    const { container } = render(<HistoryComposer />);
    expect(await axeViolations(container)).toEqual([]);
  });
});
