import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EffortSlider } from "../src/kits/agent/agent-mode";
import { ChainOfThoughtSearchResult } from "../src/kits/ai/chain-of-thought";
import { SecretRow } from "../src/kits/agent-admin/secret-row";
import { KeyValueRowsInput } from "../src/kits/agent-admin/mcp";
import { CustomEndpointForm } from "../src/kits/agent-admin/llm-providers";
import { MessageTimestampHover } from "../src/kits/ai/chat-message-actions";
import { UsageSummary } from "../src/kits/ai/usage-summary";
import { PromptInputModelPill } from "../src/kits/ai/prompt-input-model";
import { ChatMessage } from "../src/kits/ai/chat-message";
import { ChatConversation, ChatConversationContent } from "../src/kits/ai/chat-conversation";
import { SessionStats } from "../src/kits/ai/agent-usage";
import { clampLevel } from "../src/kits/voice/assistant-orb-internal";

beforeAll(() => {
  // jsdom has no Element.scrollTo, which the stick-to-bottom hook calls on mount.
  Element.prototype.scrollTo ??= function scrollTo() {};
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.removeAttribute("dir");
});

describe("hrefs from data go through isSafeHref", () => {
  it("does not link a javascript: source chip", () => {
    render(<ChainOfThoughtSearchResult href="javascript:alert(1)" title="Bad" />);
    expect(screen.getByText("Bad").closest("a")).not.toHaveAttribute("href");
    render(<ChainOfThoughtSearchResult href="https://example.com/a" title="Good" />);
    expect(screen.getByText("Good").closest("a")).toHaveAttribute("href", "https://example.com/a");
  });

  it("does not render a javascript: get-a-key link", () => {
    const { container, rerender } = render(<SecretRow name="K" isSet={false} getKeyUrl="javascript:alert(1)" layout="stacked" />);
    expect(container.querySelector("a")).toBeNull();
    rerender(<SecretRow name="K" isSet={false} getKeyUrl="https://example.com/keys" layout="stacked" />);
    expect(container.querySelector("a")).toHaveAttribute("href", "https://example.com/keys");
  });
});

describe("KeyValueRowsInput", () => {
  it("keeps a revealed secret with its own row when an earlier row is removed", () => {
    const onChange = vi.fn();
    function Harness() {
      const [rows, setRows] = React.useState([
        { key: "A_TOKEN", value: "one" },
        { key: "B_TOKEN", value: "two" },
        { key: "C_TOKEN", value: "three" },
      ]);
      return <KeyValueRowsInput value={rows} onValueChange={(r) => (onChange(r), setRows(r))} />;
    }
    const { container } = render(<Harness />);
    const reveal = (n: number) => container.querySelectorAll<HTMLElement>("[data-row]")[n]!.querySelector<HTMLButtonElement>("button:not([aria-label^=Remove])");
    const revealButton = reveal(1);
    if (revealButton) fireEvent.click(revealButton);
    const valueOf = (key: string) => {
      const row = [...container.querySelectorAll<HTMLElement>("[data-row]")].find((r) => (r.querySelector("input") as HTMLInputElement).value === key)!;
      return (row.querySelectorAll("input")[1] as HTMLInputElement).type;
    };
    expect(valueOf("B_TOKEN")).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: "Remove Variables 1" }));
    expect(onChange).toHaveBeenCalled();
    expect(valueOf("B_TOKEN")).toBe("text");
    expect(valueOf("C_TOKEN")).toBe("password");
  });

  it("masks Authorization headers in the custom endpoint form", () => {
    render(<CustomEndpointForm defaultValues={{ headers: [{ key: "Authorization", value: "Bearer x" }, { key: "X-Team", value: "core" }] }} />);
    expect(screen.getByLabelText("Header 1 value")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Header 2 value")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Header 1 name")).toHaveValue("Authorization");
  });
});

describe("EffortSlider pointer mapping", () => {
  const levels = [{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C" }, { value: "d", label: "D" }];
  const rect = { left: 0, right: 400, top: 0, bottom: 20, width: 400, height: 20, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  const dragTo = (clientX: number) => {
    const slider = screen.getByRole("slider");
    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(rect);
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX });
  };

  it("maps the pointer from the left in LTR", () => {
    const onValueChange = vi.fn();
    render(<EffortSlider levels={levels} defaultValue="a" onValueChange={onValueChange} />);
    dragTo(390);
    expect(onValueChange).toHaveBeenLastCalledWith("d");
  });

  it("maps the pointer from the right in RTL", () => {
    const onValueChange = vi.fn();
    render(
      <div dir="rtl">
        <EffortSlider levels={levels} defaultValue="b" onValueChange={onValueChange} />
      </div>
    );
    dragTo(390);
    expect(onValueChange).toHaveBeenLastCalledWith("a");
    dragTo(10);
    expect(onValueChange).toHaveBeenLastCalledWith("d");
  });
});

describe("MessageTimestampHover", () => {
  it("shows a placeholder, not 'Invalid Date', for an unparsable date", () => {
    const { container } = render(<MessageTimestampHover date="not a date" now={Date.now()} alwaysVisible />);
    expect(container.textContent).not.toContain("Invalid Date");
  });
});

describe("locale props", () => {
  it("UsageSummary formats counts with the given locale", () => {
    const days = [{ date: "2026-01-01", requests: 1234567 }];
    const { container } = render(<UsageSummary days={days} locale="de-DE" />);
    expect(container.querySelector('[data-stat="requests"]')?.textContent).toContain("1.234.567");
  });

  it("SessionStats formats cost with the given locale", () => {
    const { container } = render(<SessionStats cost={1234.5} locale="de-DE" currency="EUR" />);
    expect(container.textContent).toContain("1.234,50");
  });
});

describe("fast-mode cooldown", () => {
  it("counts down from the wall clock and fires onFastCooldownEnd once", () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    render(<PromptInputModelPill model="Opus" fast="cooldown" fastCooldown={3} onFastCooldownEnd={onEnd} />);
    expect(screen.getByText("Fast mode cooling down, 3s left")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1100));
    expect(onEnd).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(2500));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

describe("data-slot hooks", () => {
  it("chat message parts and the conversation expose slots", () => {
    const { container } = render(
      <ChatConversation>
        <ChatConversationContent>
          <ChatMessage role="user" />
        </ChatConversationContent>
      </ChatConversation>
    );
    for (const slot of ["chat-conversation", "chat-conversation-viewport", "chat-conversation-content", "chat-message"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
  });
});

describe("clampLevel", () => {
  it("clamps to 0..1 and treats bad input as silence", () => {
    expect(clampLevel(2)).toBe(1);
    expect(clampLevel(-1)).toBe(0);
    expect(clampLevel(Number.NaN)).toBe(0);
    expect(clampLevel(undefined)).toBe(0);
    expect(clampLevel(0.4)).toBe(0.4);
  });
});
