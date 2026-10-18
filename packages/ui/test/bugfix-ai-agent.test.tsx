import * as React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { AgentBrowserPane, BrowserConsole, normalizeBrowserInput } from "../src/kits/agent/agent-browser";
import { validateWorktreeName } from "../src/kits/agent/git-review";
import { resolveEmbed } from "../src/kits/ai/embeds";
import { StatusStrip, type StatusStripStatus } from "../src/kits/ai/status-strip";
import { QuestionCard, type QuestionItem } from "../src/kits/ai/question-card";
import { AgentSessionList, type AgentSession } from "../src/kits/agent/agent-sessions";
import { ArtifactCard, type ArtifactVersion } from "../src/kits/agent/artifacts";
import { PromptInput, PromptInputTextarea } from "../src/kits/ai/prompt-input";
import { EffortSlider } from "../src/kits/agent/agent-mode";
import { QueuedMessages, useComposerHistory } from "../src/kits/agent/agent-composer";
import { ClarifySettled } from "../src/kits/ai/clarify-settled";
import { ContextBanner, TranscriptSystemRow } from "../src/kits/agent/agent-transcript";
import { AgentTodoList } from "../src/kits/agent/agent-tasks";
import { ToolGroup } from "../src/kits/agent/tool-timeline";
import { ConversationGroupHeader } from "../src/kits/ai/conversation-list";

/* ------------------------------------------------------------------ */
/* agent-browser                                                       */
/* ------------------------------------------------------------------ */

describe("normalizeBrowserInput", () => {
  it("treats host:port as a host, not a URL scheme", () => {
    expect(normalizeBrowserInput("example.com:8080")).toBe("https://example.com:8080");
    expect(normalizeBrowserInput("example.com:8080/path?q=1")).toBe("https://example.com:8080/path?q=1");
    expect(normalizeBrowserInput("localhost:3000")).toBe("http://localhost:3000");
  });

  it("rejects input with spaces instead of building https://foo bar", () => {
    expect(normalizeBrowserInput("foo bar")).toBe("");
  });

  it("still blocks script URLs and keeps real schemes", () => {
    expect(normalizeBrowserInput("javascript:alert(1)")).toBe("");
    expect(normalizeBrowserInput("https://a.com")).toBe("https://a.com");
    expect(normalizeBrowserInput("example.com")).toBe("https://example.com");
  });
});

describe("AgentBrowserPane address bar", () => {
  it("does not navigate while the agent holds the lease", () => {
    const onNavigate = vi.fn();
    render(<AgentBrowserPane url="https://a.com" controller="agent" onNavigate={onNavigate} />);
    fireEvent.submit(screen.getByRole("search", { name: "Address bar" }));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not overwrite what the user types after a submit when the URL changes", () => {
    const onNavigate = vi.fn();
    const { rerender } = render(<AgentBrowserPane url="https://a.com" onNavigate={onNavigate} />);
    const input = screen.getByRole("textbox", { name: "Address" }) as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "b.com" } });
    fireEvent.submit(screen.getByRole("search", { name: "Address bar" }));
    expect(onNavigate).toHaveBeenCalledWith("https://b.com");
    rerender(<AgentBrowserPane url="https://b.com" onNavigate={onNavigate} />);
    expect(input.value).toBe("https://b.com");
    // still focused; the user keeps typing while the page redirects
    fireEvent.change(input, { target: { value: "c.co" } });
    rerender(<AgentBrowserPane url="https://b.com/redirected" onNavigate={onNavigate} />);
    expect(input.value).toBe("c.co");
  });
});

/* ------------------------------------------------------------------ */
/* git-review                                                          */
/* ------------------------------------------------------------------ */

describe("validateWorktreeName", () => {
  it("rejects components git refuses", () => {
    expect(validateWorktreeName("feat/.hidden")).not.toBeNull();
    expect(validateWorktreeName("a.lock/b")).not.toBeNull();
    expect(validateWorktreeName(".hidden")).not.toBeNull();
    expect(validateWorktreeName("a/b.lock")).not.toBeNull();
  });

  it("accepts normal names", () => {
    expect(validateWorktreeName("feat/login-form")).toBeNull();
    expect(validateWorktreeName("fix.v2/a.b")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* embeds                                                              */
/* ------------------------------------------------------------------ */

describe("YouTube start time", () => {
  const src = (t: string) => resolveEmbed(`https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=${t}`)?.src;
  it("parses h/m/s durations", () => {
    expect(src("1m30s")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
    expect(src("1h2m3s")).toContain("?start=3723");
    expect(src("90s")).toContain("?start=90");
    expect(src("90")).toContain("?start=90");
    expect(src("abc")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
});

/* ------------------------------------------------------------------ */
/* StatusStrip                                                         */
/* ------------------------------------------------------------------ */

/** Text a screen reader would read inside `el` (skips aria-hidden subtrees). */
function spokenText(el: Element) {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('[aria-hidden="true"], [aria-hidden=""]').forEach((n) => n.remove());
  return clone.textContent;
}

describe("StatusStrip", () => {
  afterEach(() => vi.useRealTimers());

  it("restarts the retry countdown when a new attempt repeats the same retryIn", () => {
    vi.useFakeTimers();
    const { rerender, container } = render(<StatusStrip status={{ kind: "retrying", retryIn: 5, attempt: 1 }} />);
    const line = () => container.querySelector('[data-slot="status-line"]')!.textContent;
    expect(line()).toContain("Retrying in 5s");
    act(() => vi.advanceTimersByTime(3000));
    expect(line()).toContain("Retrying in 2s");
    rerender(<StatusStrip status={{ kind: "retrying", retryIn: 5, attempt: 2 }} />);
    expect(line()).toContain("Retrying in 5s");
  });

  it.each<[string, StatusStripStatus]>([
    ["retry countdown", { kind: "retrying", retryIn: 30, attempt: 2, maxAttempts: 3 }],
    ["rate limit", { kind: "rate-limited", retryIn: 30 }],
    ["warm-up clock", { kind: "cold-start", startedAt: Date.now(), model: "llama" }],
  ])("keeps the ticking %s out of the live region", (_, status) => {
    vi.useFakeTimers();
    const s = { ...status, ...(status.kind === "cold-start" ? { startedAt: Date.now() } : {}) } as StatusStripStatus;
    render(<StatusStrip status={s} />);
    const region = screen.getByRole("status");
    const before = spokenText(region);
    expect(before).toBeTruthy();
    act(() => vi.advanceTimersByTime(3000));
    expect(spokenText(region)).toBe(before);
    expect(region.querySelector('[data-slot="status-line"]')!.textContent).toMatch(/\d/);
  });
});

/* ------------------------------------------------------------------ */
/* QuestionCard (multi)                                                */
/* ------------------------------------------------------------------ */

const questions: QuestionItem[] = [
  { id: "db", header: "Database", question: "Which database?", options: [{ value: "pg", label: "Postgres" }, { value: "sqlite", label: "SQLite" }] },
  { id: "f", header: "Features", question: "Which features?", multiSelect: true, options: [{ value: "auth", label: "Auth" }, { value: "billing", label: "Billing" }] },
];

describe("QuestionCard (multi) keyboard", () => {
  it("Enter on a focused option chooses it", () => {
    render(<QuestionCard questions={questions} />);
    const radios = screen.getAllByRole("radio");
    fireEvent.keyDown(radios[1], { key: "Enter" });
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("data-answered");
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");

    const boxes = screen.getAllByRole("checkbox");
    fireEvent.keyDown(boxes[0], { key: "Enter" });
    expect(screen.getAllByRole("checkbox")[0]).toHaveAttribute("aria-checked", "true");
    // Enter on an already-checked option continues instead of unticking it
    fireEvent.keyDown(screen.getAllByRole("checkbox")[0], { key: "Enter" });
    expect(screen.getAllByRole("tab")[2]).toHaveAttribute("aria-selected", "true");
  });
});

/* ------------------------------------------------------------------ */
/* AgentSessionList                                                    */
/* ------------------------------------------------------------------ */

const NOW = new Date("2026-03-01T12:00:00Z").getTime();
const sessions: AgentSession[] = [
  { id: "s1", title: "Refactor checkout", status: "running", updatedAt: NOW - 60_000 },
  { id: "s2", title: "Fix flaky test", status: "waiting", updatedAt: NOW - 120_000 },
  { id: "s3", title: "Bump deps", status: "unread", updatedAt: NOW - 180_000 },
  { id: "s4", title: "Investigate crash", status: "failed", updatedAt: NOW - 240_000 },
];
const row = (title: string) => screen.getByText(title).closest("button") as HTMLButtonElement;

describe("AgentSessionList range selection", () => {
  it("Shift+Arrow ignores an anchor that is no longer listed", () => {
    const onSelected = vi.fn();
    const { rerender } = render(<AgentSessionList sessions={sessions} now={NOW} onSelectedIdsChange={onSelected} />);
    fireEvent.click(row("Investigate crash"));
    rerender(<AgentSessionList sessions={sessions.slice(0, 3)} now={NOW} onSelectedIdsChange={onSelected} />);
    fireEvent.keyDown(row("Refactor checkout"), { key: "ArrowDown", shiftKey: true });
    expect(onSelected).toHaveBeenLastCalledWith(["s1", "s2"]);
  });

  it("Shift+Arrow extends from where plain arrows moved focus, not from an old click", () => {
    const onSelected = vi.fn();
    render(<AgentSessionList sessions={sessions} now={NOW} onSelectedIdsChange={onSelected} />);
    fireEvent.click(row("Refactor checkout"));
    fireEvent.keyDown(row("Refactor checkout"), { key: "ArrowDown" });
    fireEvent.keyDown(row("Fix flaky test"), { key: "ArrowDown", shiftKey: true });
    expect(onSelected).toHaveBeenLastCalledWith(["s2", "s3"]);
  });
});

/* ------------------------------------------------------------------ */
/* Artifacts                                                           */
/* ------------------------------------------------------------------ */

describe("ArtifactCard versions", () => {
  const v = (n: number): ArtifactVersion => ({ id: String(n), content: `const a = ${n};` });

  it("follows new versions while showing the latest", () => {
    const { rerender } = render(<ArtifactCard title="a.ts" kind="code" versions={[v(1), v(2)]} />);
    expect(screen.getByText("v2")).toBeInTheDocument();
    rerender(<ArtifactCard title="a.ts" kind="code" versions={[v(1), v(2), v(3)]} />);
    expect(screen.getByText("v3")).toBeInTheDocument();
  });

  it("stays on an older version the user picked", () => {
    const { rerender } = render(<ArtifactCard title="a.ts" kind="code" versions={[v(1), v(2)]} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous version" }));
    expect(screen.getByText("v1")).toBeInTheDocument();
    rerender(<ArtifactCard title="a.ts" kind="code" versions={[v(1), v(2), v(3)]} />);
    expect(screen.getByText("v1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next version" }));
    fireEvent.click(screen.getByRole("button", { name: "Next version" }));
    expect(screen.getByText("v3")).toBeInTheDocument();
    rerender(<ArtifactCard title="a.ts" kind="code" versions={[v(1), v(2), v(3), v(4)]} />);
    expect(screen.getByText("v4")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* PromptInput large paste undo                                        */
/* ------------------------------------------------------------------ */

describe("PromptInput large-paste undo", () => {
  const paste = (el: HTMLElement, text: string) =>
    fireEvent.paste(el, { clipboardData: { files: [], getData: (t: string) => (t === "text/plain" ? text : "") } });

  it("re-inserts at the paste position when nothing changed", () => {
    render(
      <PromptInput defaultValue="ab" largePasteThreshold={5} onLargePaste={() => {}}>
        <PromptInputTextarea />
      </PromptInput>
    );
    const ta = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
    ta.setSelectionRange(1, 1);
    paste(ta, "XXXXXXXX");
    fireEvent.click(screen.getByRole("button", { name: "Paste inline" }));
    expect(ta.value).toBe("aXXXXXXXXb");
  });

  it("re-inserts at the caret when the user typed after pasting", () => {
    render(
      <PromptInput defaultValue="ab" largePasteThreshold={5} onLargePaste={() => {}}>
        <PromptInputTextarea />
      </PromptInput>
    );
    const ta = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement;
    ta.setSelectionRange(1, 1);
    paste(ta, "XXXXXXXX");
    fireEvent.change(ta, { target: { value: "ab and more" } });
    ta.setSelectionRange(11, 11);
    fireEvent.click(screen.getByRole("button", { name: "Paste inline" }));
    expect(ta.value).toBe("ab and moreXXXXXXXX");
  });
});

/* ------------------------------------------------------------------ */
/* agent-mode / agent-composer edge cases                              */
/* ------------------------------------------------------------------ */

describe("EffortSlider", () => {
  it("does not throw on keyboard input with no levels", () => {
    const onValueChange = vi.fn();
    // React reports event-handler errors through window "error" rather than throwing from fireEvent.
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => {
      errors.push(e.error);
      e.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      render(<EffortSlider levels={[]} onValueChange={onValueChange} />);
      const slider = screen.getByRole("slider");
      fireEvent.keyDown(slider, { key: "ArrowRight" });
      fireEvent.keyDown(slider, { key: "End" });
    } finally {
      window.removeEventListener("error", onError);
    }
    expect(errors).toEqual([]);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("useComposerHistory", () => {
  it("max: 0 keeps no entries", () => {
    const { result } = renderHook(() =>
      useComposerHistory({ value: "", onValueChange: () => {}, initialEntries: ["a", "b"], max: 0 })
    );
    expect(result.current.entries).toEqual([]);
    act(() => result.current.push("c"));
    expect(result.current.entries).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* aria-controls must reference rendered content                       */
/* ------------------------------------------------------------------ */

function danglingControls(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[aria-controls]")).flatMap((el) =>
    el
      .getAttribute("aria-controls")!
      .split(/\s+/)
      .filter((id) => id && !document.getElementById(id))
  );
}

describe("collapsed disclosures don't point aria-controls at unmounted content", () => {
  it.each<[string, () => React.ReactElement]>([
    ["ClarifySettled", () => <ClarifySettled items={[{ id: "1", question: "Q", answer: "A" }]} />],
    ["BrowserConsole", () => <BrowserConsole entries={[{ id: 1, level: "log", message: "hi" }]} />],
    ["TranscriptSystemRow", () => <TranscriptSystemRow kind="compaction" summary="Earlier turns" />],
    ["ContextBanner", () => <ContextBanner output="npm ERR!">Setup failed</ContextBanner>],
    ["QueuedMessages", () => <QueuedMessages items={[{ id: "1", text: "next" }]} defaultCollapsed />],
    ["AgentTodoList", () => <AgentTodoList items={[{ id: "1", content: "Run tests", status: "pending" }]} defaultOpen={false} />],
    [
      "ToolGroup",
      () => (
        <ol>
          <ToolGroup defaultOpen={false} status="succeeded" />
        </ol>
      ),
    ],
    ["ConversationGroupHeader", () => <ConversationGroupHeader name="Work" expanded={false} controlsId="work-list" />],
  ])("%s", (_, ui) => {
    const { container } = render(ui());
    expect(container.querySelector("[aria-expanded]")).not.toBeNull();
    expect(danglingControls(container)).toEqual([]);
  });
});
