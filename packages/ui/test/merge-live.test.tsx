import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentStatusLine, ToolTimeline, ToolTimelineDot, ToolTimelineItem } from "../src/components/tool-timeline";
import { ContextBanner, SpinnerVerbs } from "../src/components/agent-transcript";
import { PresenceAvatars, PresenceIndicator, TypingIndicator } from "../src/components/presence";
import { StatusStrip } from "../src/components/status-strip";
import { axeViolations } from "./a11y";

afterEach(() => {
  vi.useRealTimers();
});

describe("AgentStatusLine (merged base)", () => {
  it("accepts tokens and the deprecated tokenCount alias with one formatter", () => {
    const { rerender } = render(<AgentStatusLine state="running" tool="Read" tokens={1} elapsed={3} />);
    expect(screen.getByRole("status")).toHaveTextContent("Running Read…3s · 1 token");
    rerender(<AgentStatusLine state="running" tool="Read" tokenCount={123_456} elapsed={3} />);
    expect(screen.getByRole("status")).toHaveTextContent("3s · 123k tokens");
    rerender(<AgentStatusLine state="running" tool="Read" tokens={5} tokenCount={9} elapsed={3} />);
    expect(screen.getByRole("status")).toHaveTextContent("5 tokens");
  });

  it("takes startedAt as a Date, epoch ms or ISO string", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:01:00Z"));
    const { rerender } = render(<AgentStatusLine state="thinking" startedAt={new Date("2026-01-01T00:00:00Z")} />);
    expect(screen.getByRole("status")).toHaveTextContent("1m 00s");
    rerender(<AgentStatusLine state="thinking" startedAt="2026-01-01T00:00:55Z" />);
    expect(screen.getByRole("status")).toHaveTextContent("5s");
    rerender(<AgentStatusLine state="thinking" startedAt={Date.now() - 2_000} />);
    expect(screen.getByRole("status")).toHaveTextContent("2s");
  });

  it("restarts its own clock when the state changes, without a stale frame", () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    function Probe({ state }: { state: "thinking" | "running" }) {
      const ref = React.useRef<HTMLDivElement>(null);
      React.useLayoutEffect(() => {
        seen.push(ref.current?.textContent ?? "");
      });
      return <AgentStatusLine ref={ref} state={state} tool="Bash" />;
    }
    const { rerender } = render(<Probe state="thinking" />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("status")).toHaveTextContent("5s");
    seen.length = 0;
    rerender(<Probe state="running" />);
    expect(seen.every((t) => t.includes("0s"))).toBe(true);
  });

  it("rotates verbs while thinking, announcing a stable label instead", async () => {
    vi.useFakeTimers();
    const { container } = render(
      <AgentStatusLine state="thinking" verbs={["Pondering", "Brewing…"]} verbOrder="sequential" verbInterval={1000} label="Working" />
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Pondering…")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Working")).toHaveClass("sr-only");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Brewing…")).toBeInTheDocument();
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ignores verbs outside the thinking state and can hide the clock", () => {
    render(<AgentStatusLine state="running" tool="Bash" verbs={["Pondering"]} showElapsed={false} tokens={2_000} tokensPrefix="↓" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Running Bash…");
    expect(status).not.toHaveTextContent("Pondering");
    expect(status).toHaveTextContent("↓ 2k tokens");
    expect(status).not.toHaveTextContent(/\ds/);
  });

  it("SpinnerVerbs is a preset: inline layout, ↓ tokens and the hint inside the stats", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    render(<SpinnerVerbs verbs={["A"]} startedAt={new Date(Date.now() - 4_000)} tokens={1_500} hint="esc to interrupt" />);
    const status = screen.getByRole("status", { name: "Working" });
    expect(status).toHaveAttribute("data-slot", "agent-status-line");
    expect(status).toHaveAttribute("data-layout", "inline");
    expect(status).toHaveTextContent("(4s · ↓ 1.5k tokens · esc to interrupt)");
  });

  it("SpinnerVerbs without startedAt shows no clock and falls back to the default verbs", () => {
    render(<SpinnerVerbs verbs={[]} />);
    const status = screen.getByRole("status", { name: "Working" });
    expect(status).not.toHaveTextContent("(");
    expect(status.querySelector('[data-slot="spinner-verb"]')?.textContent).toMatch(/…$/);
  });
});

describe("StatusStrip formatting", () => {
  it("formats long countdowns as durations", () => {
    vi.useFakeTimers();
    render(<StatusStrip status={{ kind: "retrying", retryIn: 90 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Retrying in 1m 30s");
  });
});

describe("ToolTimelineDot on StatusDot", () => {
  it("keeps data attributes, labels and the pulsing halo", () => {
    const { container } = render(
      <ToolTimeline>
        <ToolTimelineItem name="Bash" status="running" />
        <ToolTimelineItem name="Write" status="pending" />
      </ToolTimeline>
    );
    const dots = container.querySelectorAll('[data-slot="tool-timeline-dot"]');
    expect(Array.from(dots).map((d) => d.getAttribute("data-status"))).toEqual(["progress", "pending"]);
    expect(screen.getByRole("img", { name: "In progress" }).querySelector('[class*="animate-ping"]')).not.toBeNull();
    expect(screen.getByRole("img", { name: "Pending" }).querySelector(".border-dashed")).not.toBeNull();
  });

  it("is hidden from assistive tech without a status", () => {
    const { container } = render(<ToolTimelineDot />);
    const dot = container.querySelector('[data-slot="tool-timeline-dot"]')!;
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot).toHaveAttribute("data-status", "neutral");
    expect(dot).not.toHaveAttribute("role");
  });
});

describe("ContextBanner on InlineAlert", () => {
  it("composes InlineAlert and keeps its own data-variant", async () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <ContextBanner name="feat-x" onDismiss={onDismiss}>
        In worktree
      </ContextBanner>
    );
    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-variant", "info");
    expect(banner).toHaveAttribute("data-tone", "neutral");
    expect(banner.querySelector('[data-slot="inline-alert-icon"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("warning banners are alerts", () => {
    render(<ContextBanner variant="warning">Checkout failed</ContextBanner>);
    expect(screen.getByRole("alert")).toHaveAttribute("data-variant", "warning");
  });
});

describe("Presence dots and typing dots", () => {
  it("TypingIndicator renders decorative Spinner dots inside one live region", async () => {
    const { container } = render(<TypingIndicator users={["Aiko", "Ben"]} />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Aiko and Ben are typing…");
    expect(status.querySelectorAll(".animate-dot-bounce")).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("TypingIndicator hides the dots on request and when nobody types", () => {
    const { container, rerender } = render(<TypingIndicator users={["Aiko"]} hideDots />);
    expect(container.querySelector(".animate-dot-bounce")).toBeNull();
    rerender(<TypingIndicator users={[]} />);
    expect(container.querySelector(".animate-dot-bounce")).toBeNull();
  });

  it("PresenceIndicator uses a decorative pulsing StatusDot when live", async () => {
    const { container } = render(<PresenceIndicator status="live" />);
    const status = screen.getByRole("status");
    expect(status.querySelector('[aria-hidden="true"] .bg-success')).not.toBeNull();
    expect(status.querySelector('[class*="animate-ping"]')).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("PresenceAvatars status dots are StatusDots", () => {
    const { container } = render(<PresenceAvatars users={[{ id: "a", name: "Aiko", status: "idle" }]} />);
    expect(container.querySelector('[aria-hidden="true"] .bg-warning')).not.toBeNull();
  });
});
