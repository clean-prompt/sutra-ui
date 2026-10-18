import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentStatusLine,
  BashToolBody,
  EditToolBody,
  ExpandableContent,
  ReadToolBody,
  SearchToolBody,
  ToolGroup,
  ToolKeyValueBody,
  ToolTimeline,
  ToolTimelineItem,
  ToolTimelineText,
  WebToolBody,
} from "../src/kits/agent/tool-timeline";
import { DiffCard, DiffStat } from "../src/patterns/diff-viewer";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ThinkingExpandAllProvider,
  ThinkingToggle,
  formatTokenLabel,
} from "../src/kits/ai/chain-of-thought";
import { axeViolations } from "./a11y";

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* ToolTimeline                                                        */
/* ------------------------------------------------------------------ */

describe("ToolTimeline", () => {
  it("renders a labelled list with status dots", async () => {
    const { container } = render(
      <ToolTimeline>
        <ToolTimelineText>Let me look around.</ToolTimelineText>
        <ToolTimelineItem name="Read" arg="src/app.tsx" status="success" />
        <ToolTimelineItem name="Bash" arg="pnpm test" status="failure" exitCode={1} />
        <ToolTimelineItem name="Bash" arg="pnpm build" status="progress" />
        <ToolTimelineItem name="Edit" arg="a.ts" status="warning" />
        <ToolTimelineItem name="Write" arg="b.ts" status="pending" />
        plain narration
      </ToolTimeline>
    );
    const list = screen.getByRole("list", { name: "Agent steps" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(7);
    for (const name of ["Succeeded", "Failed", "In progress", "Warning", "Pending"])
      expect(screen.getByRole("img", { name })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="tool-timeline-dot"][data-status="progress"] [class*="animate-ping"]')).not.toBeNull();
    expect(screen.getByText("Running Bash…")).toBeInTheDocument();
    expect(screen.getByText("exit 1")).toBeInTheDocument();
    expect(screen.getByText("plain narration").closest('[data-slot="tool-timeline-text"]')).not.toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("expands and collapses an item body with the keyboard", async () => {
    const { container } = render(
      <ToolTimeline>
        <ToolTimelineItem name="Read" arg="src/app.tsx" duration={1200} diffStat={{ additions: 2, deletions: 1 }}>
          <p>Body text</p>
        </ToolTimelineItem>
      </ToolTimeline>
    );
    const trigger = screen.getByRole("button", { name: /Read.*src\/app\.tsx/ });
    expect(trigger).toHaveTextContent("1.2s");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Body text")).not.toBeInTheDocument();
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body text")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("rows without a body are not buttons", () => {
    render(
      <ToolTimeline>
        <ToolTimelineItem name="Glob" arg="**/*.ts" />
      </ToolTimeline>
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("**/*.ts")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* ToolGroup                                                           */
/* ------------------------------------------------------------------ */

describe("ToolGroup", () => {
  function Group({ running, label }: { running: boolean; label?: (i: { count: number }) => React.ReactNode }) {
    return (
      <ToolTimeline>
        <ToolGroup label={label}>
          <ToolTimelineItem name="Read" arg="a.ts" />
          <ToolTimelineItem name="Read" arg="b.ts" />
          <ToolTimelineItem name="Grep" arg="useState" status={running ? "progress" : "success"} />
        </ToolGroup>
      </ToolTimeline>
    );
  }

  it("counts children, opens while running and auto-collapses when complete", async () => {
    const { rerender, container } = render(<Group running />);
    const trigger = screen.getByRole("button", { name: /Exploring 3 files…/ });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("img", { name: "In progress" })).toBeInTheDocument();
    expect(screen.getByText("b.ts")).toBeInTheDocument();

    rerender(<Group running={false} />);
    const done = screen.getByRole("button", { name: /Explored 3 files/ });
    expect(done).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("b.ts")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Succeeded" })).toBeInTheDocument();

    fireEvent.click(done);
    expect(screen.getByText("b.ts")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("supports a custom label and nouns", () => {
    render(<Group running={false} label={({ count }) => `Searched ${count} patterns`} />);
    expect(screen.getByRole("button", { name: "Searched 3 patterns" })).toBeInTheDocument();
    render(
      <ToolTimeline>
        <ToolGroup verb="Searched" noun="pattern" status="success">
          <ToolTimelineItem name="Grep" arg="x" />
        </ToolGroup>
      </ToolTimeline>
    );
    expect(screen.getByRole("button", { name: "Searched 1 pattern" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* BashToolBody                                                        */
/* ------------------------------------------------------------------ */

describe("BashToolBody", () => {
  it("renders ANSI output, stderr, exit code and copies the command", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = render(
      <BashToolBody
        command="pnpm test"
        output={"\x1b[32m✓\x1b[0m 12 passed"}
        stderr="warning: deprecated"
        exitCode={1}
      />
    );
    expect(screen.getByText("pnpm test")).toBeInTheDocument();
    const ok = screen.getByText("✓");
    expect(ok.className).toContain("text-green-400");
    expect(container.textContent).not.toContain("\x1b");
    expect(screen.getByText("Error output")).toBeInTheDocument();
    expect(screen.getByText("warning: deprecated")).toBeInTheDocument();
    expect(screen.getByText("exit 1")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    });
    expect(writeText).toHaveBeenCalledWith("pnpm test");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("truncates long output with Show N more lines", () => {
    const output = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
    const { container } = render(<BashToolBody command="seq 20" output={output} maxLines={5} />);
    const pre = container.querySelector('[data-slot="bash-output"] pre')!;
    expect(pre.textContent).toContain("line 5");
    expect(pre.textContent).not.toContain("line 6");
    const more = screen.getByRole("button", { name: "Show 15 more lines" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    expect(pre.textContent).toContain("line 20");
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });
});

/* ------------------------------------------------------------------ */
/* DiffStat / DiffCard / EditToolBody                                  */
/* ------------------------------------------------------------------ */

describe("DiffStat", () => {
  it("has an accessible label and a proportional bar", async () => {
    const { container } = render(<DiffStat additions={12} deletions={3} />);
    const stat = screen.getByRole("img", { name: "12 additions, 3 deletions" });
    expect(stat).toHaveTextContent("+12");
    expect(stat).toHaveTextContent("−3");
    expect(container.querySelectorAll('[data-block="add"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-block="del"]')).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
    render(<DiffStat additions={1} deletions={0} />);
    expect(screen.getByRole("img", { name: "1 addition, 0 deletions" })).toBeInTheDocument();
  });
});

describe("DiffCard", () => {
  const oldValue = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
  const newValue = oldValue.replace("line 2\n", "line two\n").replace("line 28\n", "line 28!\n");

  it("shows header stats, caps the preview and expands inline", async () => {
    const { container } = render(<DiffCard path="src/lines.ts" oldValue={oldValue} newValue={newValue} collapsedLines={6} />);
    expect(screen.getByRole("group", { name: "Changes to src/lines.ts" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 additions, 2 deletions" })).toBeInTheDocument();
    const expand = screen.getByRole("button", { name: "Click to expand" });
    fireEvent.click(expand);
    expect(screen.queryByRole("button", { name: "Click to expand" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.getByRole("button", { name: "Click to expand" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("calls onOpen instead of expanding when given, and accept / reject", () => {
    const onOpen = vi.fn();
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(
      <DiffCard
        path="src/lines.ts"
        oldValue={oldValue}
        newValue={newValue}
        collapsedLines={6}
        onOpen={onOpen}
        onAccept={onAccept}
        onReject={onReject}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Click to expand" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Click to expand" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("shows new-file and deleted-file states", () => {
    const { container, rerender } = render(<DiffCard path="new.ts" newValue={"a\nb\n"} />);
    expect(screen.getByText("New file")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 additions, 0 deletions" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-line-type="insert"]')).toHaveLength(2);
    rerender(<DiffCard path="old.ts" oldValue={"a\n"} />);
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "0 additions, 1 deletion" })).toBeInTheDocument();
  });

  it("EditToolBody wraps DiffCard with a clickable path", async () => {
    const onPathClick = vi.fn();
    const { container } = render(
      <EditToolBody path="src/a.ts" oldValue={"const a = 1;\n"} newValue={"const a = 2;\n"} onPathClick={onPathClick} />
    );
    fireEvent.click(screen.getByRole("button", { name: "src/a.ts" }));
    expect(onPathClick).toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "1 addition, 1 deletion" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Other bodies                                                        */
/* ------------------------------------------------------------------ */

describe("tool bodies", () => {
  it("Read, Search, Web and key/value bodies render accessibly", async () => {
    const onOpenMatch = vi.fn();
    const { container } = render(
      <div>
        <ReadToolBody path="src/app.tsx" startLine={10} endLine={12} totalLines={80} snippet={"a\nb\nc"} />
        <SearchToolBody
          pattern="useState"
          scope="src"
          matches={[
            { file: "src/a.tsx", line: 3, text: "const [x] = useState()" },
            { file: "src/b.tsx", line: 9 },
          ]}
          onOpenMatch={onOpenMatch}
        />
        <WebToolBody url="https://example.com/docs" title="Example docs" snippet="An example." />
        <ToolKeyValueBody rows={[{ label: "query", value: "sutra ui" }, { label: "limit", value: "10" }]} />
      </div>
    );
    expect(screen.getByText("Lines 10–12 of 80")).toBeInTheDocument();
    expect(screen.getByText("2 matches")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /src\/a\.tsx/ }));
    expect(onOpenMatch).toHaveBeenCalledWith(expect.objectContaining({ file: "src/a.tsx", line: 3 }));
    expect(screen.getByRole("link", { name: "Example docs" })).toHaveAttribute("href", "https://example.com/docs");
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("query")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ExpandableContent                                                   */
/* ------------------------------------------------------------------ */

describe("ExpandableContent", () => {
  it("shows the toggle only when content overflows", async () => {
    const spy = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(400);
    const { container } = render(
      <ExpandableContent collapsedHeight={100}>
        <p>Long content</p>
      </ExpandableContent>
    );
    const btn = screen.getByRole("button", { name: "Show more" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    const region = document.getElementById(btn.getAttribute("aria-controls")!)!;
    expect(region.style.maxHeight).toBe("100px");
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    expect(region.style.maxHeight).toBe("");
    expect(await axeViolations(container)).toEqual([]);
    spy.mockRestore();
  });

  it("has no toggle for short content", () => {
    render(<ExpandableContent>Short</ExpandableContent>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* AgentStatusLine                                                     */
/* ------------------------------------------------------------------ */

describe("AgentStatusLine", () => {
  it("counts elapsed seconds and shows tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 12, 0, 0));
    const { container, rerender } = render(<AgentStatusLine state="running" tool="Bash" tokenCount={1234} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Running Bash…");
    expect(status).toHaveTextContent("0s");
    expect(status).toHaveTextContent("1.2k tokens");
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(status).toHaveTextContent("4s");

    rerender(<AgentStatusLine state="permission" />);
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for permission…");
    expect(screen.getByRole("status")).toHaveTextContent("0s");
    rerender(<AgentStatusLine state="question" />);
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for your answer…");
    rerender(<AgentStatusLine state="thinking" elapsed={75} />);
    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");
    expect(screen.getByRole("status")).toHaveTextContent("1m 15s");
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders nothing when idle", () => {
    const { container } = render(<AgentStatusLine state="idle" />);
    expect(container).toBeEmptyDOMElement();
  });
});

/* ------------------------------------------------------------------ */
/* ChainOfThought extensions                                           */
/* ------------------------------------------------------------------ */

describe("ChainOfThought extensions", () => {
  it("formats token labels", () => {
    expect(formatTokenLabel(950)).toBe("950 tokens");
    expect(formatTokenLabel(1234)).toBe("1.2k tokens");
    expect(formatTokenLabel(2_500_000)).toBe("2.5M tokens");
  });

  it("shows live elapsed and token count while streaming", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 12, 0, 0));
    const { rerender } = render(
      <ChainOfThought streaming tokenCount={1200}>
        <ChainOfThoughtContent>Body</ChainOfThoughtContent>
      </ChainOfThought>
    );
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    const trigger = screen.getByRole("button", { name: /Thinking…/ });
    expect(trigger).toHaveTextContent("Thinking…4s");
    expect(trigger).toHaveTextContent("1.2k tokens");
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    rerender(
      <ChainOfThought streaming={false} tokenCount={1500} summary="Compared two approaches">
        <ChainOfThoughtContent>Body</ChainOfThoughtContent>
      </ChainOfThought>
    );
    expect(screen.getByRole("button", { name: /Thought for 12s/ })).toHaveTextContent("1.5k tokens");
    expect(screen.getByText("Compared two approaches")).toBeInTheDocument();
  });

  it("hides the summary when open", () => {
    render(
      <ChainOfThought duration={3} summary="Short summary">
        <ChainOfThoughtContent>Body</ChainOfThoughtContent>
      </ChainOfThought>
    );
    expect(screen.getByText("Short summary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Thought for 3s/ }));
    expect(screen.queryByText("Short summary")).not.toBeInTheDocument();
  });

  it("expands and collapses every panel through the provider", async () => {
    const { container } = render(
      <ThinkingExpandAllProvider>
        <ThinkingToggle />
        <ChainOfThought duration={2}>
          <ChainOfThoughtContent>First body</ChainOfThoughtContent>
        </ChainOfThought>
        <ChainOfThought duration={5}>
          <ChainOfThoughtContent>Second body</ChainOfThoughtContent>
        </ChainOfThought>
      </ThinkingExpandAllProvider>
    );
    const toggle = screen.getByRole("button", { name: "Expand all thinking" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("First body")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("First body")).toBeInTheDocument();
    expect(screen.getByText("Second body")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText("First body")).not.toBeInTheDocument();
    expect(screen.queryByText("Second body")).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ThinkingToggle renders nothing outside a provider", () => {
    const { container } = render(<ThinkingToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});
