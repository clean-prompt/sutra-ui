import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  AgentProcessCard,
  AgentProcessList,
  agentSessionMemory,
  formatAgentRunTime,
  type AgentProcessSession,
} from "../src/kits/agent/agent-processes";
import { axeViolations } from "./a11y";

/** Decimal megabytes, matching formatMemory (the system screens use base-1000 units). */
const MB = 1_000_000;
const NOW = Date.UTC(2026, 9, 19, 12, 0, 0);
const MIN = 60_000;

const checkout: AgentProcessSession = {
  id: "s1",
  agent: "Claude Code",
  icon: <svg data-testid="logo" />,
  title: "Checkout flow tests",
  project: "storefront",
  status: "waiting",
  startedAt: NOW - 48 * MIN,
  memoryBytes: 411 * MB,
  processes: [
    { pid: 101, name: "vitest", kind: "command", cpu: 0, memoryBytes: 516 * MB },
    { pid: 102, name: "node", kind: "server", port: 3001, memoryBytes: 235 * MB },
    { pid: 103, name: "Google Chrome for Testing", kind: "browser", memoryBytes: 308 * MB },
    { pid: 104, name: "mcp-server-fetch", kind: "tool-server", memoryBytes: 65 * MB },
  ],
};

const codex: AgentProcessSession = {
  id: "s2",
  agent: "Codex",
  project: "docs",
  host: "in Terminal",
  status: "idle",
  statusSince: NOW - 48 * MIN,
  memoryBytes: 290 * MB,
};

describe("formatters", () => {
  it("formats run time coarsely", () => {
    expect(formatAgentRunTime(20_000)).toBe("<1 min");
    expect(formatAgentRunTime(48 * MIN)).toBe("48 min");
    expect(formatAgentRunTime(125 * MIN)).toBe("2 hr 5 min");
    expect(formatAgentRunTime(26 * 60 * MIN)).toBe("1 d 2 hr");
    expect(formatAgentRunTime(Number.NaN)).toBe("—");
  });

  it("sums process memory when the session has none", () => {
    expect(agentSessionMemory({ memoryBytes: 5, processes: [{ name: "a", kind: "other", memoryBytes: 9 }] })).toBe(5);
    expect(
      agentSessionMemory({
        processes: [
          { name: "a", kind: "other", memoryBytes: 100 * MB },
          { name: "b", kind: "other" },
          { name: "c", kind: "other", memoryBytes: 50 * MB },
        ],
      })
    ).toBe(150 * MB);
    expect(agentSessionMemory({ processes: [{ name: "a", kind: "other" }] })).toBeUndefined();
  });
});

describe("AgentProcessList", () => {
  it("renders sessions, subtitles, memory and process rows", () => {
    render(<AgentProcessList sessions={[checkout, codex]} now={NOW} />);
    const sessions = within(screen.getByRole("list", { name: "Agent sessions" })).getAllByRole("article");
    expect(sessions).toHaveLength(2);

    const first = within(sessions[0]);
    expect(first.getByText("Checkout flow tests")).toBeInTheDocument();
    expect(first.getByText("Claude Code · storefront · running 48 min")).toBeInTheDocument();
    expect(first.getByText("411 MB")).toBeInTheDocument();
    expect(first.getByText("Started · 4")).toBeInTheDocument();
    expect(first.getByTestId("logo").closest("[aria-hidden]")).not.toBeNull();

    const rows = within(first.getByRole("list", { name: "Processes started by Checkout flow tests" })).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("vitest")).toBeInTheDocument();
    expect(within(rows[0]).getByText("command · 0% CPU")).toBeInTheDocument();
    expect(within(rows[0]).getByText("516 MB")).toBeInTheDocument();
    expect(within(rows[1]).getByText("server · port 3001")).toBeInTheDocument();
    expect(within(rows[2]).getByText("browser")).toBeInTheDocument();
    expect(within(rows[3]).getByText("tool server")).toBeInTheDocument();

    const second = within(sessions[1]);
    expect(second.getByText("Codex")).toBeInTheDocument();
    expect(second.getByText("docs · in Terminal · Nothing started")).toBeInTheDocument();
    expect(second.getByText("290 MB")).toBeInTheDocument();
    expect(second.queryByRole("list")).not.toBeInTheDocument();
  });

  it("sums the children's memory when the session total is absent", () => {
    const { memoryBytes: _omit, ...rest } = checkout;
    render(<AgentProcessCard session={rest} now={NOW} />);
    expect(screen.getByText("1.12 GB")).toBeInTheDocument();
  });

  it("shows a pill per status", () => {
    const make = (status: AgentProcessSession["status"], extra: Partial<AgentProcessSession> = {}) =>
      ({ id: status, agent: `Agent ${status}`, status, ...extra }) as AgentProcessSession;
    render(
      <AgentProcessList
        now={NOW}
        sessions={[
          make("waiting"),
          make("working"),
          make("idle", { statusSince: NOW - 48 * MIN }),
          make("done"),
          make("error"),
        ]}
      />
    );
    const cards = screen.getAllByRole("article");
    expect(cards.map((c) => c.getAttribute("data-status"))).toEqual(["waiting", "working", "idle", "done", "error"]);
    expect(within(cards[0]).getByText("Waiting for you").className).toContain("--sutra-accent");
    expect(within(cards[1]).getByText("working").className).toContain("success");
    expect(within(cards[2]).getByText("idle 48 min")).toBeInTheDocument();
    expect(within(cards[3]).getByText("done")).toBeInTheDocument();
    expect(within(cards[4]).getByText("error").className).toContain("destructive");
  });

  it("keeps durations out of live regions and announces waiting only on change", async () => {
    const working = { ...checkout, status: "working" as const };
    const { container, rerender } = render(<AgentProcessList sessions={[working, codex]} now={NOW} />);
    const live = container.querySelector("[aria-live]")!;
    expect(live).toHaveTextContent("");
    expect(live).not.toContainElement(screen.getByText(/running 48 min/));

    rerender(<AgentProcessList sessions={[working, codex]} now={NOW + MIN} />);
    expect(screen.getByText(/running 49 min/)).toBeInTheDocument();
    expect(live).toHaveTextContent("");

    rerender(<AgentProcessList sessions={[checkout, codex]} now={NOW + MIN} />);
    await waitFor(() => expect(live).toHaveTextContent("Checkout flow tests is waiting for you"));
  });

  it("does not announce sessions that were already waiting on mount", () => {
    const { container } = render(<AgentProcessList sessions={[checkout]} now={NOW} />);
    expect(container.querySelector("[aria-live]")).toHaveTextContent("");
  });

  it("quits a session after confirmation", async () => {
    const onQuit = vi.fn();
    render(<AgentProcessList sessions={[checkout, codex]} now={NOW} onQuit={onQuit} />);
    expect(screen.getAllByRole("button", { name: "Quit Session…" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Quit Session…" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Quit this session?")).toBeInTheDocument();
    expect(within(dialog).getByText("It will stop 4 processes it started.")).toBeInTheDocument();
    expect(onQuit).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Quit Session" }));
    });
    expect(onQuit).toHaveBeenCalledWith("s1");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("cancels the quit dialog without quitting", async () => {
    const onQuit = vi.fn();
    render(<AgentProcessCard session={checkout} now={NOW} onQuit={onQuit} />);
    fireEvent.click(screen.getByRole("button", { name: "Quit Session…" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onQuit).not.toHaveBeenCalled();
  });

  it("stops a single process", () => {
    const onStopProcess = vi.fn();
    render(<AgentProcessList sessions={[checkout]} now={NOW} onStopProcess={onStopProcess} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop node" }));
    expect(onStopProcess).toHaveBeenCalledWith("s1", checkout.processes![1]);
  });

  it("opens a session from its title", () => {
    const onOpen = vi.fn();
    render(<AgentProcessList sessions={[checkout, codex]} now={NOW} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Codex" }));
    expect(onOpen).toHaveBeenCalledWith("s2");
    expect(screen.getByRole("article", { name: "Checkout flow tests" })).toBeInTheDocument();
  });

  it("collapses process lists (uncontrolled and controlled)", () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(<AgentProcessList sessions={[checkout]} now={NOW} collapsible />);
    const toggle = screen.getByRole("button", { name: "Started · 4" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("vitest")).not.toBeInTheDocument();

    rerender(<AgentProcessList sessions={[checkout]} now={NOW} collapsible expanded={[]} onExpandedChange={onExpandedChange} />);
    expect(screen.queryByText("vitest")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Started · 4" }));
    expect(onExpandedChange).toHaveBeenCalledWith(["s1"]);
    expect(screen.queryByText("vitest")).not.toBeInTheDocument();
  });

  it("shows the empty state", () => {
    render(<AgentProcessList sessions={[]} emptyState="No agents running" />);
    expect(screen.getByText("No agents running")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AgentProcessList
        sessions={[checkout, codex]}
        now={NOW}
        onQuit={() => {}}
        onStopProcess={() => {}}
        onOpen={() => {}}
        collapsible
      />
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
