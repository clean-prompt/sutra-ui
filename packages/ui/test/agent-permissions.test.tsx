import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PermissionPendingHint, PermissionPrompt, RuleScopePicker } from "../src/components/permission-prompt";
import { ChatToolApproval } from "../src/components/chat-tool";
import { EffortSlider, PermissionModeSwitcher } from "../src/components/agent-mode";
import { PlanReviewCard, truncatePlanQuote } from "../src/components/plan-review";
import { CheckpointMarker, RewindButton, RewindDialog } from "../src/components/rewind";
import { QuestionCard, type QuestionItem } from "../src/components/ai-extras";
import { axeViolations } from "./a11y";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* PermissionPrompt                                                    */
/* ------------------------------------------------------------------ */

describe("PermissionPrompt", () => {
  it("renders a labelled group with numbered radio options and passes axe", async () => {
    const { container } = render(
      <PermissionPrompt tool="edit" target="src/app.tsx" onCancel={() => {}} preview={<pre>diff</pre>} />
    );
    const group = screen.getByRole("group", { name: /Make this edit to src\/app.tsx\s?\?/ });
    expect(group).toHaveAttribute("data-tool", "edit");
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveAccessibleName("Yes");
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("to cancel")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("selects by number key only while focused (or active)", () => {
    const onDecision = vi.fn();
    render(
      <>
        <button>outside</button>
        <PermissionPrompt tool="bash" target="npm test" onDecision={onDecision} />
      </>
    );
    screen.getByText("outside").focus();
    fireEvent.keyDown(document.activeElement!, { key: "1" });
    expect(onDecision).not.toHaveBeenCalled();
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: "2" });
    expect(onDecision).toHaveBeenCalledWith({ choice: "always", scope: "session" });
    expect(screen.getByRole("status")).toHaveTextContent("Always allowed · this session");
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("arrow keys move the highlight and Enter confirms; active prop captures keys globally", () => {
    const onDecision = vi.fn();
    render(<PermissionPrompt tool="fetch" target="https://example.com" active onDecision={onDecision} />);
    expect(screen.getByRole("group", { name: "Fetch this URL?" })).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(screen.getAllByRole("radio")[1]).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(document.body, { key: "ArrowUp" });
    fireEvent.keyDown(document.body, { key: "ArrowUp" });
    expect(screen.getAllByRole("radio")[2]).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(onDecision).toHaveBeenCalledWith({ choice: "allow" });
  });

  it("deny reveals a feedback field: Esc cancels, Enter submits", async () => {
    const onDecision = vi.fn();
    const { container } = render(<PermissionPrompt tool="bash" target="rm -rf build" active onDecision={onDecision} />);
    fireEvent.click(screen.getAllByRole("radio")[2]);
    const field = screen.getByRole("textbox", { name: "What should the agent do instead?" });
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onDecision).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "3" });
    const again = screen.getByRole("textbox");
    // number keys typed into the field do not pick options
    fireEvent.keyDown(again, { key: "1" });
    expect(onDecision).not.toHaveBeenCalled();
    fireEvent.change(again, { target: { value: "Only delete build/tmp" } });
    fireEvent.keyDown(again, { key: "Enter" });
    expect(onDecision).toHaveBeenCalledWith({ choice: "deny", feedback: "Only delete build/tmp" });
    expect(screen.getByRole("status")).toHaveTextContent("Denied");
  });

  it("scope picker changes the saved rule scope", async () => {
    const user = userEvent.setup();
    const onDecision = vi.fn();
    const onScopeChange = vi.fn();
    render(<PermissionPrompt tool="bash" target="npm test" onDecision={onDecision} onScopeChange={onScopeChange} />);
    const trigger = screen.getByRole("button", { name: "Save rule to" });
    expect(trigger).toHaveTextContent("this session");
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitemradio", { name: /this project \(shared\)/ }));
    expect(onScopeChange).toHaveBeenCalledWith("projectShared");
    expect(trigger).toHaveTextContent("this project (shared)");
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onDecision).toHaveBeenCalledWith({ choice: "always", scope: "projectShared" });
  });

  it("folds to a title bar and expands", () => {
    const onFoldedChange = vi.fn();
    render(<PermissionPrompt tool="bash" target="ls" defaultFolded onFoldedChange={onFoldedChange} active onDecision={() => {}} />);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByRole("group")).toHaveAttribute("data-folded");
    const expand = screen.getByRole("button", { name: "Expand permission request" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expand);
    expect(onFoldedChange).toHaveBeenCalledWith(false);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Collapse permission request" }));
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("supports custom options and Escape cancel", () => {
    const onDecision = vi.fn();
    const onCancel = vi.fn();
    render(
      <PermissionPrompt
        title="Use the GitHub tool?"
        active
        onCancel={onCancel}
        onDecision={onDecision}
        options={[
          { value: "once", label: "Allow once" },
          { value: "never", label: "Never", tone: "destructive" },
        ]}
      />
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: "2" });
    expect(onDecision).toHaveBeenCalledWith({ choice: "never" });
    expect(screen.getByRole("status")).toHaveTextContent("Denied");
  });

  it("RuleScopePicker works standalone", async () => {
    const { container } = render(<RuleScopePicker defaultValue="user" />);
    expect(screen.getByRole("button", { name: "Save rule to" })).toHaveTextContent("all projects (user)");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("PermissionPendingHint", () => {
  it("scrolls the target into view and focuses its option", async () => {
    const target = document.createElement("div");
    target.innerHTML = '<div role="radio" tabindex="0" aria-checked="true">Yes</div>';
    document.body.appendChild(target);
    const scroll = vi.fn();
    target.scrollIntoView = scroll;
    const { container } = render(<PermissionPendingHint target={target} />);
    const btn = screen.getByRole("button", { name: "Waiting for permission…" });
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(btn);
    expect(scroll).toHaveBeenCalled();
    expect(document.activeElement).toBe(target.firstChild);
    target.remove();
  });
});

describe("ChatToolApproval numbered variant", () => {
  it("keeps the default variant unchanged", () => {
    const onApprove = vi.fn();
    render(<ChatToolApproval name="send_email" onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalled();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("renders a PermissionPrompt and maps decisions", async () => {
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    const onDecision = vi.fn();
    const { container, rerender } = render(
      <ChatToolApproval
        variant="numbered"
        name="send_email"
        input={{ to: "a@b.c" }}
        onApprove={onApprove}
        onDeny={onDeny}
        onDecision={onDecision}
      />
    );
    expect(screen.getByRole("group", { name: "Allow send_email to run?" })).toBeInTheDocument();
    expect(screen.getByText("Arguments")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: "1" });
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onDecision).toHaveBeenCalledWith({ choice: "allow" });
    rerender(<ChatToolApproval variant="numbered" name="send_email" status="denied" />);
    expect(screen.getByRole("status")).toHaveTextContent("Denied");
  });
});

/* ------------------------------------------------------------------ */
/* PermissionModeSwitcher / EffortSlider                               */
/* ------------------------------------------------------------------ */

describe("PermissionModeSwitcher", () => {
  it("opens a menu with descriptions and switches mode", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<PermissionModeSwitcher defaultValue="manual" onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button", { name: /Ask before edits/ });
    expect(await axeViolations(container)).toEqual([]);
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText(/explores read-only/)).toBeInTheDocument();
    await user.click(within(menu).getByRole("menuitemradio", { name: /Plan mode/ }));
    expect(onValueChange).toHaveBeenCalledWith("plan");
    expect(trigger).toHaveAttribute("data-mode", "plan");
  });

  it("cycles with Shift+Tab (also from inputs), skipping confirm-only modes", () => {
    const onValueChange = vi.fn();
    render(
      <form>
        <textarea aria-label="Prompt" />
        <PermissionModeSwitcher defaultValue="manual" onValueChange={onValueChange} />
      </form>
    );
    const ta = screen.getByRole("textbox", { name: "Prompt" });
    ta.focus();
    const seq: string[] = [];
    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(ta, { key: "Tab", shiftKey: true });
      seq.push(onValueChange.mock.calls.at(-1)![0]);
    }
    expect(seq).toEqual(["acceptEdits", "plan", "auto", "manual"]);
  });

  it("respects a custom cycleShortcut and custom modes", () => {
    const onValueChange = vi.fn();
    render(
      <PermissionModeSwitcher
        cycleShortcut="alt+m"
        modes={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
        onValueChange={onValueChange}
      />
    );
    fireEvent.keyDown(document.body, { key: "Tab", shiftKey: true });
    expect(onValueChange).not.toHaveBeenCalled();
    screen.getByRole("button", { name: /Alpha/ }).focus();
    fireEvent.keyDown(document.activeElement!, { key: "m", code: "KeyM", altKey: true });
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("leaves Shift+Tab alone outside its composer by default, and listens everywhere with cycleScope=global", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <>
        <input aria-label="Search" />
        <form>
          <textarea aria-label="Prompt" />
          <PermissionModeSwitcher defaultValue="manual" onValueChange={onValueChange} />
        </form>
      </>
    );
    const search = screen.getByRole("textbox", { name: "Search" });
    search.focus();
    fireEvent.keyDown(search, { key: "Tab", shiftKey: true });
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(
      <>
        <input aria-label="Search" />
        <form>
          <textarea aria-label="Prompt" />
          <PermissionModeSwitcher defaultValue="manual" onValueChange={onValueChange} cycleScope="global" />
        </form>
      </>
    );
    search.focus();
    fireEvent.keyDown(search, { key: "Tab", shiftKey: true });
    expect(onValueChange).toHaveBeenCalledWith("acceptEdits");
  });

  it("asks for confirmation before bypassing permissions", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<PermissionModeSwitcher defaultValue="manual" onValueChange={onValueChange} />);
    const trigger = screen.getByRole("button", { name: /Ask before edits/ });
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitemradio", { name: /Bypass permissions/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Bypass all permission checks?");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(await axeViolations(dialog)).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onValueChange).not.toHaveBeenCalled();
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitemradio", { name: /Bypass permissions/ }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Enable bypass" }));
    expect(onValueChange).toHaveBeenCalledWith("bypass");
    expect(trigger).toHaveAttribute("data-tone", "destructive");
  });
});

describe("EffortSlider", () => {
  it("is a slider controlled by arrow keys", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<EffortSlider defaultValue="medium" onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider", { name: "Effort" });
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    expect(slider).toHaveAttribute("aria-valuetext", "Medium");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith("high");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuetext", "Max");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "3");
    fireEvent.keyDown(slider, { key: "Home" });
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider).toHaveAttribute("aria-valuetext", "Low");
  });

  it("sets the level by clicking a bar or the legend; compact pill variant", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <EffortSlider variant="compact" levels={[{ value: "x", label: "X" }, { value: "y", label: "Y" }, { value: "z", label: "Z" }]} defaultValue="x" onValueChange={onValueChange} />
    );
    const slider = screen.getByRole("slider");
    expect(container.querySelector('[data-variant="compact"]')).toBeInTheDocument();
    fireEvent.pointerDown(container.querySelector('[data-effort-index="2"]')!, { pointerId: 1, button: 0 });
    fireEvent.pointerUp(slider, { pointerId: 1 });
    expect(onValueChange).toHaveBeenCalledWith("z");
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows the hint tooltip on focus", async () => {
    render(<EffortSlider />);
    act(() => screen.getByRole("slider").focus());
    expect((await screen.findAllByText("Click or drag to set effort level")).length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* PlanReviewCard                                                      */
/* ------------------------------------------------------------------ */

const plan = `## Add dark mode

1. Add a \`theme\` token map in \`src/theme.ts\` covering every surface, text and border color used today.
2. Wire a toggle into the settings page.`;

function mockSelection(node: Node, text: string) {
  vi.spyOn(window, "getSelection").mockReturnValue({
    isCollapsed: false,
    rangeCount: 1,
    anchorNode: node,
    toString: () => text,
    getRangeAt: () => ({ getBoundingClientRect: () => ({ top: 100, left: 50, width: 40, height: 10 }) }),
    removeAllRanges: () => {},
  } as unknown as Selection);
}

describe("PlanReviewCard", () => {
  it("adds a comment from a text selection, truncating the quote", async () => {
    const onCommentsChange = vi.fn();
    const { container } = render(<PlanReviewCard plan={plan} onCommentsChange={onCommentsChange} />);
    expect(await axeViolations(container)).toEqual([]);
    const content = container.querySelector('[data-slot="plan-content"]')!;
    const long = "Add a theme token map in src/theme.ts covering every surface, text and border color used today.";
    mockSelection(screen.getByText(/token map/), long);
    fireEvent.mouseUp(content);
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    const quote = truncatePlanQuote(long);
    expect(quote.length).toBe(80);
    expect(quote.endsWith("…")).toBe(true);
    expect(container.querySelector('[data-slot="comment-composer"] blockquote')).toHaveTextContent(quote);
    const field = screen.getByRole("textbox", { name: "Comment on plan" });
    fireEvent.change(field, { target: { value: "Also cover charts" } });
    fireEvent.keyDown(field, { key: "Enter", metaKey: true });
    expect(onCommentsChange).toHaveBeenCalledWith([expect.objectContaining({ quote: long, body: "Also cover charts" })]);
    expect(screen.getByRole("region", { name: "Comments (1)" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Remove comment/ }));
    expect(screen.queryByRole("region", { name: /Comments/ })).toBeNull();
  });

  it("ignores selections outside the plan", () => {
    render(
      <>
        <p>elsewhere</p>
        <PlanReviewCard plan={plan} />
      </>
    );
    mockSelection(screen.getByText("elsewhere"), "elsewhere");
    fireEvent.mouseUp(document.querySelector('[data-slot="plan-content"]')!);
    expect(screen.queryByRole("button", { name: "Comment" })).toBeNull();
  });

  it("keep planning sends comments and the note as feedback, then locks", () => {
    const onFeedback = vi.fn();
    const comments = [{ id: "c1", quote: "Wire a toggle", body: "Use the existing ThemeToggle" }];
    render(<PlanReviewCard plan={plan} defaultComments={comments} onFeedback={onFeedback} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Feedback for the agent" }), { target: { value: "Keep it small" } });
    fireEvent.click(screen.getByRole("button", { name: "Keep planning" }));
    expect(onFeedback).toHaveBeenCalledWith(comments, "Keep it small");
    expect(screen.getByRole("status")).toHaveTextContent("Kept planning · sent 1 comment and a note");
    expect(screen.queryByRole("button", { name: "Approve plan" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove comment/ })).toBeNull();
  });

  it("approve carries the chosen next mode", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<PlanReviewCard plan={plan} onApprove={onApprove} />);
    await user.click(screen.getByRole("button", { name: "After approval: Auto-accept edits" }));
    await user.click(await screen.findByRole("menuitemradio", { name: /Review each edit/ }));
    await user.click(screen.getByRole("button", { name: "Approve plan" }));
    expect(onApprove).toHaveBeenCalledWith({ mode: "manual", comments: [] });
    expect(screen.getByRole("status")).toHaveTextContent("Plan approved · Review each edit");
  });

  it("collapses and renders a recorded outcome read-only", () => {
    render(<PlanReviewCard plan={plan} defaultExpanded={false} outcome={{ type: "approved", mode: "acceptEdits" }} />);
    expect(screen.getByRole("button", { name: "Expand plan" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Show full plan" }));
    expect(screen.getByRole("button", { name: "Collapse plan" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Plan approved · Auto-accept edits");
  });
});

/* ------------------------------------------------------------------ */
/* Rewind                                                              */
/* ------------------------------------------------------------------ */

const files = [
  { path: "src/app.tsx", additions: 12, deletions: 3 },
  { path: "src/theme.ts", additions: 40, deletions: 0, status: "created" as const },
];

describe("RewindDialog", () => {
  it("chooses what to restore and confirms", async () => {
    const onRewind = vi.fn();
    render(
      <RewindDialog defaultOpen message="Add dark mode to the settings page" timestamp="2026-10-18T10:00:00Z" files={files} onRewind={onRewind} />
    );
    const dialog = screen.getByRole("dialog", { name: "Rewind" });
    expect(dialog).toHaveTextContent("Add dark mode to the settings page");
    expect(within(dialog).getByRole("radiogroup", { name: "What to restore" })).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /^Code and conversation/ })).toBeChecked();
    expect(dialog.querySelector('[data-slot="rewind-files"]')).toHaveTextContent("src/theme.ts");
    expect(dialog.querySelector('[data-slot="rewind-fork-notice"]')).toHaveTextContent("A new forked conversation will be created");
    expect(await axeViolations(dialog)).toEqual([]);
    fireEvent.click(within(dialog).getByRole("radio", { name: /^Code only/ }));
    expect(dialog.querySelector('[data-slot="rewind-fork-notice"]')).toBeNull();
    fireEvent.click(within(dialog).getByRole("radio", { name: /^Conversation only/ }));
    expect(dialog.querySelector('[data-slot="rewind-files"]')).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Rewind" }));
    await act(async () => {});
    expect(onRewind).toHaveBeenCalledWith({ scope: "conversation" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("RewindButton opens the dialog; Cancel closes without rewinding", async () => {
    const onRewind = vi.fn();
    render(<RewindButton message="Fix the tests" onRewind={onRewind} />);
    fireEvent.click(screen.getByRole("button", { name: "Rewind to here" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onRewind).not.toHaveBeenCalled();
  });
});

describe("CheckpointMarker", () => {
  it("shows the file summary and a rewind action", async () => {
    const onRewind = vi.fn();
    const { container } = render(<CheckpointMarker files={files} onRewind={onRewind} />);
    expect(container).toHaveTextContent("Checkpoint· 2 files changed");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Rewind" }));
    expect(onRewind).toHaveBeenCalled();
  });

  it("can open a RewindDialog", async () => {
    render(<CheckpointMarker files={3} dialog={{ message: "Refactor auth" }} />);
    expect(screen.getByText("· 3 files changed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rewind" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Refactor auth");
  });
});

/* ------------------------------------------------------------------ */
/* QuestionCard multi-question                                         */
/* ------------------------------------------------------------------ */

const questions: QuestionItem[] = [
  {
    id: "db",
    header: "Database",
    question: "Which database should we use?",
    options: [
      { value: "pg", label: "Postgres", description: "Relational, battle-tested" },
      { value: "sqlite", label: "SQLite" },
    ],
  },
  {
    id: "features",
    header: "Features",
    question: "Which features are in scope?",
    multiSelect: true,
    options: [
      { value: "auth", label: "Auth" },
      { value: "billing", label: "Billing" },
    ],
  },
];

describe("QuestionCard (multi-question)", () => {
  it("tabs, answered state, other text and submit all", async () => {
    const onSubmitAll = vi.fn();
    const { container } = render(<QuestionCard questions={questions} onSubmitAll={onSubmitAll} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Database", "Features", "Review"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(await axeViolations(container)).toEqual([]);

    // number key selects a single-choice option and advances
    fireEvent.keyDown(screen.getAllByRole("radio")[0], { key: "1" });
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("data-answered");
    expect(screen.getAllByRole("tab")[0]).toHaveAccessibleName("Database (answered)");
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");

    // multi: pick one + Other with text
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.map((b) => b.textContent)).toEqual(["1Auth", "2Billing", "3Other"]);
    fireEvent.click(boxes[1]);
    fireEvent.keyDown(boxes[1], { key: "3" });
    const other = screen.getByRole("textbox", { name: "Other answer" });
    expect(other).toHaveAttribute("placeholder", "Type your answer…");
    fireEvent.change(other, { target: { value: "Exports" } });
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.keyDown(other, { key: "Enter" });
    expect(screen.getAllByRole("tab")[2]).toHaveAttribute("aria-selected", "true");
    expect(container.querySelector('[data-slot="question-review"]')).toHaveTextContent("Database:Postgres");
    expect(container.querySelector('[data-slot="question-review"]')).toHaveTextContent("Features:Billing, Exports");

    fireEvent.click(screen.getByRole("button", { name: "Submit answers" }));
    expect(onSubmitAll).toHaveBeenCalledWith({
      db: { values: ["pg"] },
      features: { values: ["billing", "__other__"], text: "Exports" },
    });
    expect(screen.queryByRole("tab")).toBeNull();
    expect(container.querySelector('[data-slot="question-answers"]')).toHaveTextContent("Features:Billing, Exports");
  });

  it("Back/Next navigation, submit disabled until all answered, fold", () => {
    render(<QuestionCard questions={questions} />);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByRole("button", { name: "Submit answers" })).toBeDisabled();
    expect(screen.getAllByText("Not answered")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Collapse questions" }));
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand questions" }));
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders prior answers locked; the single-question API still works", () => {
    const { rerender, container } = render(
      <QuestionCard questions={questions} answers={{ db: { values: ["sqlite"] }, features: { values: ["auth"] } }} />
    );
    expect(container.querySelector('[data-slot="question-answers"]')).toHaveTextContent("Database:SQLite");
    const onAnswer = vi.fn();
    rerender(<QuestionCard question="Which database?" options={questions[0].options} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("radio", { name: /SQLite/ }));
    expect(onAnswer).toHaveBeenCalledWith({ values: ["sqlite"] });
  });
});
