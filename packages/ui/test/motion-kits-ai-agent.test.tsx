/**
 * Motion for the ai, agent, agent-admin, editor, terminal and voice kits (audit group G3, items A1-A10): chevrons on the
 * shared `chevron-turn`, no per-site durations left on rotations, entrances that play for the newest item only, pops that
 * play when a value changes and never on the first render, and the per-site guards the global reduced-motion net does
 * not cover. jsdom runs no animations, so these tests assert the classes and keys the CSS acts on.
 */
import * as React from "react";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatConversation, ChatConversationContent } from "../src/kits/ai/chat-conversation";
import { ChainOfThoughtStep } from "../src/kits/ai/chain-of-thought";
import { ChatCopyAction, ChatFeedbackActions } from "../src/kits/ai/chat-message-actions";
import { ChatMessage, ChatMessageContent } from "../src/kits/ai/chat-message";
import { ChatToolStateBadge } from "../src/kits/ai/chat-tool";
import { PromptInput, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar } from "../src/kits/ai/prompt-input";
import { QuotaBars } from "../src/kits/ai/usage-quota";
import { AgentTodoList } from "../src/kits/agent/agent-tasks";
import { SaveStatus } from "../src/kits/editor/editor-status";
import { readSutraCss } from "./helpers/css";

const SRC = path.resolve(__dirname, "../src");
const KITS = ["ai", "agent", "agent-admin", "editor", "terminal", "voice"];

const read = (rel: string) => readFileSync(path.join(SRC, "kits", rel), "utf8");
const sutraCss = readSutraCss();
const kitFiles = KITS.flatMap((kit) =>
  readdirSync(path.join(SRC, "kits", kit))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ rel: `${kit}/${f}`, text: read(`${kit}/${f}`) }))
);

const tokens = (el: Element | null | undefined) => (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
const popped = (root: ParentNode) => root.querySelectorAll(".animate-pop");

/* ------------------------------------------------------------------ */
/* A7: chevrons                                                        */
/* ------------------------------------------------------------------ */

/** Disclosure chevrons that turn with `chevron-turn`, per file (26 sites in 19 files). */
const CHEVRONS: Record<string, number> = {
  "agent/agent-browser.tsx": 1,
  "agent/agent-processes.tsx": 1,
  "agent/agent-tasks.tsx": 1,
  "agent/agent-transcript.tsx": 2,
  "agent/git-review.tsx": 1,
  "agent/plan-review.tsx": 1,
  "agent/tool-timeline.tsx": 3,
  "agent-admin/agent-room.tsx": 1,
  "agent-admin/extensions-catalog.tsx": 1,
  "agent-admin/mcp.tsx": 2,
  "agent-admin/subagents.tsx": 2,
  "agent-admin/tool-toggles.tsx": 1,
  "ai/chain-of-thought.tsx": 1,
  "ai/chat-source.tsx": 1,
  "ai/chat-tool.tsx": 1,
  "ai/clarify-settled.tsx": 1,
  "ai/conversation-list.tsx": 2,
  "ai/model-select.tsx": 1,
  "voice/translate.tsx": 2,
};

describe("A7 chevrons", () => {
  it("every disclosure chevron uses chevron-turn (26 sites)", () => {
    const found = Object.fromEntries(
      kitFiles.flatMap(({ rel, text }) => {
        const n = (text.match(/\bchevron-turn\b/g) ?? []).length;
        return n ? [[rel, n]] : [];
      })
    );
    expect(found).toEqual(CHEVRONS);
    expect(Object.values(found).reduce((a, b) => a + b, 0)).toBe(26);
  });

  it("no rotation keeps a local transition, a per-site duration or a reduced-motion override", () => {
    for (const { rel, text } of kitFiles) {
      text.split("\n").forEach((line, i) => {
        if (/\brotate-(90|180)\b|-rotate-90\b/.test(line)) {
          expect(line, `${rel}:${i + 1}`).not.toMatch(/transition-transform|transition-\[transform/);
        }
        if (/\bchevron-turn\b/.test(line)) {
          expect(line, `${rel}:${i + 1}`).not.toMatch(/\bduration-\d+|\bease-|motion-reduce:transition-none|\btransition-/);
        }
      });
    }
  });

  it("the open chevron of a collapsible list carries chevron-turn and the state class", () => {
    render(<AgentTodoList items={[{ id: "1", content: "Read", status: "pending" }]} />);
    const toggle = screen.getByRole("button", { name: /Tasks/ });
    const chevron = toggle.querySelector("svg")!;
    expect(tokens(chevron)).toContain("chevron-turn");
    expect(tokens(chevron)).not.toContain("-rotate-90");
    fireEvent.click(toggle);
    expect(tokens(toggle.querySelector("svg"))).toEqual(expect.arrayContaining(["chevron-turn", "-rotate-90"]));
  });
});

/* ------------------------------------------------------------------ */
/* Consistency swaps (A8, voice)                                       */
/* ------------------------------------------------------------------ */

describe("scale and ease", () => {
  it("the local-models resource bar follows the fill speed and the shared ease", () => {
    expect(read("agent-admin/local-models.tsx")).toContain("transition-[width] duration-500 ease-out-quart motion-reduce:transition-none");
  });

  it("the swap button turns on the shared ease, not the plain ease-out keyword", () => {
    const text = read("voice/translate.tsx");
    expect(text).toContain("transition-transform duration-300 ease-out-quart motion-reduce:transition-none");
    expect(text).not.toMatch(/\bease-out\b(?!-)/);
  });

  it("no kit of the group uses a duration off the scale, a hand-written curve or a bare ease keyword", () => {
    const scale = new Set([75, 150, 200, 300, 500, 1000]);
    for (const { rel, text } of kitFiles) {
      for (const m of text.matchAll(/\bduration-(\d+)\b/g)) expect(scale.has(Number(m[1])), `${rel} duration-${m[1]}`).toBe(true);
      expect(text, rel).not.toMatch(/cubic-bezier\(|\bease-\[|\bease-out\b(?!-)|\bease-in\b(?!-)/);
    }
  });
});

/* ------------------------------------------------------------------ */
/* A1: the newest chat message rises in                                */
/* ------------------------------------------------------------------ */

describe("A1 ChatConversationContent", () => {
  // jsdom has no Element.scrollTo, which the stick-to-bottom hook calls on mount.
  const originalScrollTo = Element.prototype.scrollTo;
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  });
  afterEach(() => {
    Element.prototype.scrollTo = originalScrollTo;
  });

  it("puts the entrance on the last child of the message column only, behind motion-safe", () => {
    const { container } = render(
      <ChatConversation>
        <ChatConversationContent className="custom-column" viewportClassName="custom-viewport">
          <div>one</div>
          <div>two</div>
        </ChatConversationContent>
      </ChatConversation>
    );
    const viewport = container.querySelector('[role="log"]')!;
    const column = viewport.firstElementChild!;
    expect(tokens(column)).toContain("motion-safe:[&>:last-child:not([aria-hidden])]:animate-fade-up");
    expect(tokens(column)).toContain("custom-column");
    expect(tokens(viewport)).toContain("custom-viewport");
    expect(tokens(viewport)).not.toContain("motion-safe:[&>:last-child:not([aria-hidden])]:animate-fade-up");
    // No message carries the class itself: a history is never animated as a whole.
    expect(container.querySelectorAll(".animate-fade-up")).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* A2: a completed task pops                                           */
/* ------------------------------------------------------------------ */

describe("A2 AgentTodoList", () => {
  const items = (statuses: Array<"pending" | "running" | "succeeded">) => statuses.map((status, i) => ({ id: String(i), content: `Task ${i}`, status }));

  it("does not pop the checks of tasks that are already done on the first render", () => {
    const { container } = render(<AgentTodoList items={items(["succeeded", "succeeded", "running"])} />);
    expect(container.querySelectorAll(".bg-success")).toHaveLength(2);
    expect(popped(container)).toHaveLength(0);
  });

  it("pops only the check of the task that was just completed", () => {
    const { container, rerender } = render(<AgentTodoList items={items(["succeeded", "running", "pending"])} />);
    rerender(<AgentTodoList items={items(["succeeded", "succeeded", "running"])} />);
    const checks = [...container.querySelectorAll(".bg-success")];
    expect(checks).toHaveLength(2);
    expect(tokens(checks[0])).not.toContain("animate-pop");
    expect(tokens(checks[1])).toContain("animate-pop");
    expect(popped(container)).toHaveLength(1);
  });

  it("keeps the spinner on animate-spin, with no pop", () => {
    const { container, rerender } = render(<AgentTodoList items={items(["pending"])} />);
    rerender(<AgentTodoList items={items(["running"])} />);
    const spinner = container.querySelector('[data-slot="todo-spinner"]')!;
    expect(tokens(spinner)).toContain("animate-spin");
    expect(popped(container)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* A3: chain-of-thought step                                           */
/* ------------------------------------------------------------------ */

describe("A3 ChainOfThoughtStep", () => {
  const dotOf = (container: HTMLElement) => container.querySelector('[data-status] > span[aria-hidden]:nth-of-type(2)') ?? container.querySelectorAll('[data-status] > span[aria-hidden]')[1]!;

  it("fades the dot colours and pops the check only when a step completes", () => {
    const { container, rerender } = render(<ChainOfThoughtStep label="Search" status="complete" />);
    expect(tokens(dotOf(container))).toEqual(expect.arrayContaining(["transition-colors", "duration-200"]));
    expect(popped(container)).toHaveLength(0);

    rerender(<ChainOfThoughtStep label="Search" status="active" />);
    expect(popped(container)).toHaveLength(0);

    rerender(<ChainOfThoughtStep label="Search" status="complete" />);
    const pop = container.querySelectorAll(".animate-pop");
    expect(pop).toHaveLength(1);
    expect(pop[0]!.tagName.toLowerCase()).toBe("svg");
    expect(dotOf(container).contains(pop[0]!)).toBe(true);
  });

  it("pops the cross when a step fails, not the first time a failed step renders", () => {
    const { container, rerender } = render(<ChainOfThoughtStep label="Fetch" status="failed" />);
    expect(popped(container)).toHaveLength(0);
    rerender(<ChainOfThoughtStep label="Fetch" status="active" />);
    rerender(<ChainOfThoughtStep label="Fetch" status="failed" />);
    expect(popped(container)).toHaveLength(1);
  });

  it("does not pop a custom icon", () => {
    const { container, rerender } = render(<ChainOfThoughtStep label="Custom" status="active" icon={<i data-testid="icon" />} />);
    rerender(<ChainOfThoughtStep label="Custom" status="complete" icon={<i data-testid="icon" />} />);
    expect(popped(container)).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* A4: status pills and dots come free with the primitive              */
/* ------------------------------------------------------------------ */

describe("A4 tool status", () => {
  it("the tool state badge pops its icon when the state changes, not on mount", () => {
    const { container, rerender } = render(<ChatToolStateBadge state="running" />);
    expect(popped(container)).toHaveLength(0);
    rerender(<ChatToolStateBadge state="succeeded" />);
    expect(popped(container)).toHaveLength(1);
    expect(tokens(container.firstElementChild)).toContain("transition-colors");
  });
});

/* ------------------------------------------------------------------ */
/* A5: save status                                                     */
/* ------------------------------------------------------------------ */

describe("A5 SaveStatus", () => {
  it("fades the label colour and pops the icon when the status changes, not on the first render", () => {
    const { container, rerender } = render(<SaveStatus status="dirty" />);
    expect(popped(container)).toHaveLength(0);
    const body = container.querySelector('[data-slot="save-status"] > span')!;
    expect(tokens(body)).toContain("transition-colors");

    rerender(<SaveStatus status="saved" now={0} />);
    const pop = popped(container);
    expect(pop).toHaveLength(1);
    expect(tokens(pop[0])).toEqual(expect.arrayContaining(["size-3.5", "text-success"]));
  });

  it("leaves the saving spinner on animate-spin without a pop", () => {
    const { container, rerender } = render(<SaveStatus status="dirty" />);
    rerender(<SaveStatus status="saving" />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(popped(container)).toHaveLength(0);
    rerender(<SaveStatus status="error" />);
    expect(popped(container)).toHaveLength(1);
  });

  it("pops again on the next change", () => {
    const { container, rerender } = render(<SaveStatus status="dirty" />);
    rerender(<SaveStatus status="error" />);
    expect(popped(container)).toHaveLength(1);
    rerender(<SaveStatus status="conflict" />);
    expect(popped(container)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* A6: attachment tiles                                                */
/* ------------------------------------------------------------------ */

describe("A6 attachment tiles (skipped)", () => {
  it("the attachment slot does not animate its children: they are the consumer's, so new ones cannot be told from restored ones", () => {
    const text = read("ai/prompt-input-attachments.tsx");
    expect(text).not.toMatch(/\[&>\*\]:animate|\[&>\*\]:fade|\[&>\*\]:zoom/);
  });
});

/* ------------------------------------------------------------------ */
/* Icon swaps now on animate-pop                                       */
/* ------------------------------------------------------------------ */

describe("icon swaps use animate-pop", () => {
  it("the copy check pops and no ad-hoc zoom-in idiom is left in the group", () => {
    const { rerender } = render(<ChatCopyAction text="hi" />);
    rerender(<ChatCopyAction text="hi" />);
    for (const { rel, text } of kitFiles) expect(text, rel).not.toMatch(/animate-in zoom-in-\d+ duration-\d+/);
    expect(read("ai/chat-message-actions.tsx")).toContain('key="check" className="animate-pop"');
  });

  it("the filled thumb pops when a rating is given, not when a rated message first renders", () => {
    const { container } = render(<ChatFeedbackActions value="up" />);
    expect(popped(container)).toHaveLength(0);

    const { container: fresh } = render(<ChatFeedbackActions />);
    fireEvent.click(within(fresh).getByRole("button", { name: "Bad response" }));
    expect(popped(fresh)).toHaveLength(1);
    expect(within(fresh).getByRole("button", { name: "Bad response" }).querySelector(".animate-pop")).not.toBeNull();
    fireEvent.click(within(fresh).getByRole("button", { name: "Good response" }));
    expect(popped(fresh)).toHaveLength(1);
    expect(within(fresh).getByRole("button", { name: "Good response" }).querySelector(".animate-pop")).not.toBeNull();
  });

  it("the send icon pops when it swaps to stop and back, not when the composer first renders", () => {
    const Composer = ({ loading }: { loading: boolean }) => (
      <PromptInput loading={loading} onStop={() => {}}>
        <PromptInputTextarea />
        <PromptInputToolbar>
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    );
    const { container, rerender } = render(<Composer loading={false} />);
    expect(popped(container)).toHaveLength(0);
    rerender(<Composer loading />);
    expect(popped(container)).toHaveLength(1);
    rerender(<Composer loading={false} />);
    expect(popped(container)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* A9: popovers grow from their trigger                                */
/* ------------------------------------------------------------------ */

describe("A9 popper origin", () => {
  it("the base layer sets the transform origin of popper content, and the two sites are Radix popper content", () => {
    expect(sutraCss).toMatch(/\[data-radix-popper-content-wrapper\]\s*>\s*\[data-side\]\s*\{\s*transform-origin:\s*var\(--radix-popper-transform-origin\)/);
    expect(read("agent/agent-browser.tsx")).toContain("<PopoverPrimitive.Content");
    expect(read("ai/prompt-input-model.tsx")).toContain("<DropdownMenu.Content");
    for (const rel of ["agent/agent-browser.tsx", "ai/prompt-input-model.tsx"]) expect(read(rel), rel).not.toMatch(/\borigin-\[|\borigin-center\b/);
  });
});

/* ------------------------------------------------------------------ */
/* A10 and skeletons: guards                                           */
/* ------------------------------------------------------------------ */

describe("A10 guards", () => {
  it("the dead shimmer on the streaming artifact fade is gone", () => {
    const text = read("agent/artifacts.tsx");
    expect(text).not.toContain("animate-shimmer");
    expect(text).toContain("bg-gradient-to-t from-card to-transparent");
  });

  it("the caret that follows streaming markdown stops blinking under reduced motion", () => {
    const { container } = render(
      <ChatMessage streaming>
        <ChatMessageContent markdown>{"Hello **world**"}</ChatMessageContent>
      </ChatMessage>
    );
    const markdown = container.querySelector(".text-\\[15px\\]")!.firstElementChild!;
    const cls = tokens(markdown);
    expect(cls).toContain("[&>:last-child]:after:animate-caret-blink");
    expect(cls).toContain("motion-reduce:[&>:last-child]:after:animate-none");
  });

  it("the global net covers the unguarded loops of the group that carry a plain class", () => {
    const net = sutraCss.slice(sutraCss.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const name of ["animate-pulse", "animate-caret-blink"]) expect(net).toContain(name);
    expect(read("ai/permission-prompt.tsx")).toContain('className="animate-pulse"');
    expect(read("agent/tool-timeline.tsx")).toContain("animate-caret-blink");
    expect(read("voice/translate.tsx")).toContain("animate-caret-blink");
  });

  it("the placeholder bars of the quota strip use the shared Skeleton, not a raw pulse block", () => {
    const { container } = render(<QuotaBars quotas={[]} loading />);
    const row = container.querySelector('[data-slot="quota-bars-skeleton"]')!;
    expect(row.querySelectorAll(".animate-shimmer")).toHaveLength(2);
    expect(row.querySelector(".animate-pulse")).toBeNull();
    expect(tokens(row.querySelectorAll(".animate-shimmer")[1])).toEqual(expect.arrayContaining(["h-1", "flex-1", "rounded-full"]));
  });
});
