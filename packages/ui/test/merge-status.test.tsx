import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RiStarLine } from "@remixicon/react";
import { StatusBadge, StatusDot } from "../src/primitives/status-badge";
import { Spinner, spinnerGlyphFrames } from "../src/primitives/spinner";
import { ChatLoader, type ChatLoaderVariant } from "../src/kits/ai/chat-loader";
import { GlyphSpinner, glyphSpinnerFrames } from "../src/kits/ai/primitives-extra";
import { JobStatePill } from "../src/kits/agent-admin/agent-jobs";
import { ChatToolStateBadge } from "../src/kits/ai/chat-tool";
import { BackendHealthPill } from "../src/kits/agent-admin/backends";
import { SubagentStatusGlyph } from "../src/kits/agent-admin/subagents";
import { axeViolations } from "./helpers/a11y";

describe("StatusDot: variant + icon", () => {
  it("keeps the solid dot markup by default", () => {
    const { container } = render(<StatusDot status="online" />);
    const root = container.firstElementChild!;
    expect(root).toHaveClass("relative", "inline-flex", "shrink-0", "rounded-full", "size-2");
    expect(root.children).toHaveLength(1);
    expect(root.firstElementChild).toHaveClass("bg-success");
  });

  it("draws hollow and dashed rings in the tone's border colour", () => {
    const { container, rerender } = render(<StatusDot tone="info" variant="hollow" label="Elsewhere" />);
    const inner = () => container.firstElementChild!.lastElementChild!;
    expect(screen.getByRole("img", { name: "Elsewhere" })).toBeInTheDocument();
    expect(inner()).toHaveClass("border-[1.5px]", "border-info", "bg-transparent");
    expect(inner()).not.toHaveClass("border-dashed");
    rerender(<StatusDot tone="neutral" variant="dashed" label="Queued" />);
    expect(inner()).toHaveClass("border-dashed", "border-muted-foreground");
  });

  it("renders a round glyph for an icon or spinner, labelled as one image", () => {
    const { container, rerender } = render(<StatusDot tone="success" icon={<RiStarLine aria-hidden />} label="Starred" />);
    const glyph = screen.getByRole("img", { name: "Starred" });
    expect(glyph).toHaveClass("size-4", "bg-success-soft", "text-success");
    expect(glyph).not.toHaveClass("text-success-soft-foreground");
    expect(glyph.querySelector("svg")).not.toBeNull();
    rerender(<StatusDot tone="primary" icon="spinner" variant="hollow" label="Working" />);
    const spinning = screen.getByRole("img", { name: "Working" });
    expect(spinning).toHaveClass("text-primary");
    expect(spinning).not.toHaveClass("bg-primary-soft");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });
});

describe("StatusBadge: icon slot", () => {
  it("defaults to the dot and keeps the existing markup", () => {
    const { container } = render(<StatusBadge status="online" />);
    const root = container.firstElementChild!;
    expect(root.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(root.firstElementChild).toHaveClass("size-1.5");
    expect(root).toHaveTextContent("Online");
  });

  it("swaps in a decorative spinner, an icon, or nothing", () => {
    const { container, rerender } = render(<StatusBadge tone="info" icon="spinner" label="Syncing" />);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<StatusBadge tone="info" icon={<RiStarLine />} label="Pinned" />);
    const wrap = container.querySelector("svg")!.parentElement!;
    expect(wrap).toHaveAttribute("aria-hidden");
    rerender(<StatusBadge tone="info" icon={null} label="Plain" />);
    expect(container.firstElementChild!.children).toHaveLength(0);
    expect(container.firstElementChild).toHaveTextContent("Plain");
  });
});

describe("domain pills on StatusBadge / StatusDot", () => {
  it("JobStatePill: rounded-control, spinner while running, decorative indicator", () => {
    const { container } = render(
      <div>
        <JobStatePill state="running" />
        <JobStatePill state="paused" size="sm" />
      </div>
    );
    const running = screen.getByText("Running").closest("[data-state]")!;
    expect(running).toHaveAttribute("data-state", "running");
    expect(running).toHaveClass("rounded-control", "bg-primary-soft", "h-6");
    expect(running).not.toHaveClass("rounded-full");
    expect(running.querySelector(".animate-spin")).not.toBeNull();
    const paused = screen.getByText("Paused").closest("[data-state]")!;
    expect(paused).toHaveClass("h-5", "bg-warning-soft");
    expect(paused.querySelector(".bg-warning")).not.toBeNull();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    return axeViolations(container).then((v) => expect(v).toEqual([]));
  });

  it("ChatToolStateBadge: per-state icon, spinner while running", () => {
    const { container } = render(
      <div>
        <ChatToolStateBadge state="running" data-testid="run" />
        <ChatToolStateBadge state="pending" data-testid="pend" />
        <ChatToolStateBadge state="error">Boom</ChatToolStateBadge>
      </div>
    );
    expect(screen.getByTestId("run")).toHaveTextContent("Running");
    expect(screen.getByTestId("run")).toHaveClass("bg-info-soft", "rounded-control");
    expect(screen.getByTestId("run").querySelector(".animate-spin")).not.toBeNull();
    expect(screen.getByTestId("pend").querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Boom").closest("[data-state]")).toHaveAttribute("data-state", "error");
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(0);
  });

  it("BackendHealthPill: one live status pill per state", () => {
    const { rerender } = render(<BackendHealthPill health={{ state: "checking" }} />);
    const pill = () => screen.getByRole("status");
    expect(pill()).toHaveTextContent("Checking…");
    expect(pill()).toHaveAttribute("data-health", "checking");
    expect(pill()).toHaveAttribute("data-slot", "backend-health");
    expect(pill().querySelector(".animate-spin")).not.toBeNull();
    rerender(<BackendHealthPill health={{ state: "healthy", latencyMs: 12.4 }} />);
    expect(pill()).toHaveClass("bg-success-soft", "text-2xs", "max-w-full");
    expect(screen.getByText("· 12 ms")).toBeInTheDocument();
    rerender(<BackendHealthPill health={{ state: "unreachable", reason: "timeout" }} />);
    expect(screen.getByText("Unreachable: timeout")).toHaveClass("truncate");
    expect(pill()).toHaveClass("bg-destructive-soft");
    rerender(<BackendHealthPill health={{ state: "not-configured" }} />);
    expect(pill()).toHaveTextContent("Not configured");
    expect(pill().children).toHaveLength(0);
    rerender(<BackendHealthPill health={{ state: "unknown" }} />);
    expect(pill()).toHaveTextContent("Not checked");
  });

  it("SubagentStatusGlyph: StatusDot glyphs with the old look", () => {
    render(
      <div>
        <SubagentStatusGlyph status="done" />
        <SubagentStatusGlyph status="failed" />
        <SubagentStatusGlyph status="running" />
        <SubagentStatusGlyph status="waiting" />
      </div>
    );
    const done = screen.getByRole("img", { name: "Done" });
    expect(done).toHaveAttribute("data-status", "done");
    expect(done).toHaveClass("size-4", "rounded-full", "bg-success-soft", "text-success");
    expect(screen.getByRole("img", { name: "Failed" })).toHaveClass("bg-destructive-soft", "text-destructive");
    const running = screen.getByRole("img", { name: "Running" });
    expect(running).toHaveClass("text-primary");
    expect(running.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Waiting" })).toHaveClass("text-muted-foreground");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("Spinner: decorative label and glyph variant", () => {
  it('label="" hides the spinner from assistive tech', () => {
    const { container } = render(<Spinner label="" variant="dots" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).not.toHaveAttribute("role");
    expect(container.firstElementChild).not.toHaveAttribute("aria-label");
  });

  it("dots scale with the box, so className can shape a row", () => {
    const { container } = render(<Spinner variant="dots" className="h-1.5 w-6 text-current" label="Typing" />);
    const root = screen.getByRole("status", { name: "Typing" });
    expect(root).toHaveClass("h-1.5", "w-6", "text-current");
    expect(root).not.toHaveClass("text-primary");
    expect(container.querySelectorAll(".animate-dot-bounce")).toHaveLength(3);
    expect(container.querySelector(".animate-dot-bounce")).toHaveClass("w-[26%]", "aspect-square");
  });

  it("glyph variant cycles frames; GlyphSpinner is a preset of it", () => {
    vi.useFakeTimers();
    try {
      render(<Spinner variant="glyph" frames="circle" interval={100} label="Thinking" size="lg" />);
      const s = screen.getByRole("status");
      expect(s).toHaveTextContent(spinnerGlyphFrames.circle[0]);
      expect(s).toHaveTextContent("Thinking");
      expect(s).toHaveClass("font-mono", "text-lg");
      act(() => vi.advanceTimersByTime(100));
      expect(s).toHaveAttribute("data-frame", "1");
    } finally {
      vi.useRealTimers();
    }
    expect(glyphSpinnerFrames).toBe(spinnerGlyphFrames);
  });

  it("GlyphSpinner keeps custom frames and its markup", () => {
    const { container } = render(<GlyphSpinner frames={["a", "b"]} paused />);
    const s = screen.getByRole("status");
    expect(s).toHaveTextContent("a");
    expect(s).toHaveAttribute("data-frame", "0");
    expect(s).not.toHaveClass("text-primary");
    expect(container.querySelector(".sr-only")).toHaveTextContent("Loading");
  });
});

describe("ChatLoader on Spinner", () => {
  const variants: ChatLoaderVariant[] = ["dots", "pulse", "spinner", "wave", "glyph"];

  it("renders one live region with a decorative Spinner per variant", async () => {
    const { container } = render(
      <div>
        {variants.map((v) => (
          <ChatLoader key={v} variant={v} data-testid={v} />
        ))}
      </div>
    );
    for (const v of variants) {
      const el = screen.getByTestId(v);
      expect(el).toHaveAttribute("role", "status");
      expect(el.firstElementChild).toHaveAttribute("aria-hidden", "true");
      expect(el).toHaveTextContent("Assistant is typing");
      expect(el.querySelectorAll('[role="status"]')).toHaveLength(0);
    }
    expect(screen.getByTestId("dots").querySelectorAll(".animate-dot-bounce")).toHaveLength(3);
    expect(screen.getByTestId("dots").firstElementChild).toHaveClass("h-2", "w-8", "text-muted-foreground");
    expect(screen.getByTestId("wave").querySelectorAll(".animate-bar-scale").length).toBeGreaterThan(0);
    expect(screen.getByTestId("pulse").firstElementChild).toHaveClass("text-foreground", "size-3");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("shows a visible label and keeps the shimmer variant", () => {
    render(
      <div>
        <ChatLoader variant="wave" label="Listening" size="lg" />
        <ChatLoader variant="shimmer" />
      </div>
    );
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });
});
