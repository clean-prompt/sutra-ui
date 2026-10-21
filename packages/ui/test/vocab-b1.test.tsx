/** Vocabulary aliases (b1): tone on AlertBanner and Badge, controlled FAQ and NowPlaying, usePlayerQueue, density and status aliases. */
import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { AppSidebar } from "../src/blocks/sidebar-navigation-blocks";
import { JobList, RunHistory } from "../src/kits/agent-admin/agent-jobs";
import { EffortSlider } from "../src/kits/agent/agent-mode";
import { AgentTodoList } from "../src/kits/agent/agent-tasks";
import { ChainOfThoughtStep } from "../src/kits/ai/chain-of-thought";
import { JobBanner } from "../src/kits/ai/job-banner";
import { BillingBanner, UsageInvoiceTable } from "../src/kits/billing/billing";
import { NowPlaying, usePlayerQueue, type PlayerTrack } from "../src/kits/media/audio-player";
import { AppLauncher } from "../src/kits/workspace/app-launcher";
import { SidebarProvider } from "../src/patterns/sidebar-navigation";
import { FAQ } from "../src/primitives/accordion";
import { AlertBanner } from "../src/primitives/alert-banner";
import { Badge } from "../src/primitives/badge";

describe("AlertBanner tone", () => {
  it("tone and the deprecated variant render the same", () => {
    const { container } = render(
      <div>
        <AlertBanner data-testid="a" tone="destructive" message="A" />
        <AlertBanner data-testid="b" variant="destructive" message="B" />
      </div>
    );
    const a = screen.getByTestId("a");
    const b = screen.getByTestId("b");
    expect(a.className).toBe(b.className);
    expect(a).toHaveAttribute("role", "alert");
    expect(a).toHaveAttribute("data-tone", "destructive");
    expect(container.querySelectorAll('[data-tone="destructive"]')).toHaveLength(2);
  });

  it("maps brand to primary and accepts legacy tone spellings", () => {
    render(
      <div>
        <AlertBanner data-testid="brand" variant="brand" message="Brand" />
        <AlertBanner data-testid="primary" tone="primary" message="Primary" />
        <AlertBanner data-testid="danger" tone="danger" message="Danger" />
      </div>
    );
    expect(screen.getByTestId("brand").className).toBe(screen.getByTestId("primary").className);
    expect(screen.getByTestId("brand")).toHaveAttribute("data-variant", "brand");
    expect(screen.getByTestId("danger")).toHaveAttribute("data-tone", "destructive");
  });
});

describe("Badge tone", () => {
  it("tone matches the legacy semantic color and wins over color", () => {
    render(
      <div>
        <Badge data-testid="tone">A</Badge>
        <Badge data-testid="t" tone="primary">T</Badge>
        <Badge data-testid="c" color="brand">C</Badge>
        <Badge data-testid="both" tone="success" color="purple">B</Badge>
        <Badge data-testid="cat" color="purple">P</Badge>
      </div>
    );
    expect(screen.getByTestId("t").className).toBe(screen.getByTestId("c").className);
    expect(screen.getByTestId("both").className).toContain("bg-success-soft");
    expect(screen.getByTestId("cat").className).toContain("purple");
  });
});

describe("FAQ controlled", () => {
  const items = [
    { question: "One?", answer: "First answer" },
    { question: "Two?", answer: "Second answer" },
  ];

  it("follows value and reports onValueChange", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<FAQ items={items} value="0" onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "One?" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Two?" }));
    expect(onValueChange).toHaveBeenLastCalledWith("1");
    // Still controlled: nothing changes until the parent updates `value`.
    expect(screen.getByRole("button", { name: "Two?" })).toHaveAttribute("aria-expanded", "false");
    rerender(<FAQ items={items} value="1" onValueChange={onValueChange} />);
    expect(screen.getByRole("button", { name: "Two?" })).toHaveAttribute("aria-expanded", "true");
  });

  it("supports controlled multiple mode and keeps defaultValue working", () => {
    const onValueChange = vi.fn();
    render(<FAQ items={items} multiple value={["0"]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Two?" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["0", "1"]);
  });

  it("keeps uncontrolled defaultValue working", () => {
    render(<FAQ items={items} defaultValue="1" />);
    expect(screen.getByRole("button", { name: "Two?" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "One?" }));
    expect(screen.getByRole("button", { name: "One?" })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("NowPlaying defaultOpen", () => {
  const track: PlayerTrack = { id: "2", title: "Bravo", artist: "Ben", duration: 200 };

  it("opens uncontrolled from defaultOpen and closes itself from the chevron", () => {
    const onOpenChange = vi.fn();
    render(<NowPlaying defaultOpen onOpenChange={onOpenChange} track={track} playing={false} currentTime={0} duration={200} />);
    const dialog = screen.getByRole("dialog", { name: "Now playing: Bravo" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Close now playing" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays closed by default", () => {
    render(<NowPlaying track={track} playing={false} currentTime={0} duration={200} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("usePlayerQueue onValueChange", () => {
  it("calls onValueChange and the deprecated onChange", () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    let api: ReturnType<typeof usePlayerQueue> | null = null;
    function Probe({ legacy }: { legacy?: boolean }) {
      api = usePlayerQueue({
        items: [{ id: "a" }, { id: "b" }],
        ...(legacy ? { onChange } : { onValueChange }),
      });
      return null;
    }
    const { unmount } = render(<Probe />);
    act(() => {
      api!.next();
    });
    expect(onValueChange).toHaveBeenCalled();
    unmount();
    render(<Probe legacy />);
    act(() => {
      api!.next();
    });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("AppLauncher density", () => {
  const items = [
    { id: "notes", label: "Notes", app: "notes" as const },
    { id: "tasks", label: "Tasks", app: "tasks" as const },
  ];

  it("defaults to compact tiles for the dock and normal for the grid, and accepts density", () => {
    const { rerender } = render(<AppLauncher items={items} variant="dock" />);
    expect(screen.getByRole("list", { name: "Apps" })).toHaveAttribute("data-density", "compact");
    expect(screen.getByRole("button", { name: "Notes" }).className).toMatch(/(^|\s)p-1\.5(\s|$)/);
    rerender(<AppLauncher items={items} />);
    expect(screen.getByRole("list", { name: "Apps" })).toHaveAttribute("data-density", "normal");
    expect(screen.getByRole("button", { name: "Notes" }).className).not.toMatch(/(^|\s)p-1\.5(\s|$)/);
    rerender(<AppLauncher items={items} density="compact" />);
    expect(screen.getByRole("button", { name: "Notes" }).className).toMatch(/(^|\s)p-1\.5(\s|$)/);
  });
});

describe("density aliases", () => {
  it("AgentTodoList density matches variant", () => {
    const items = [{ id: "1", content: "Run tests", status: "pending" as const }];
    render(
      <div>
        <AgentTodoList data-testid="d" items={items} density="compact" />
        <AgentTodoList data-testid="v" items={items} variant="compact" />
      </div>
    );
    expect(screen.getByTestId("d").className).toBe(screen.getByTestId("v").className);
    expect(screen.getByTestId("d")).toHaveAttribute("data-variant", "compact");
  });

  it("EffortSlider density compact renders the pill", () => {
    const { container } = render(<EffortSlider density="compact" />);
    expect(container.querySelector('[data-variant="compact"]')).toBeInTheDocument();
  });
});

describe("lifecycle status aliases", () => {
  it("AgentTodoList accepts canonical and legacy statuses alike", () => {
    render(
      <AgentTodoList
        items={[
          { id: "1", content: "A", status: "succeeded" },
          { id: "2", content: "B", status: "completed" },
          { id: "3", content: "C", status: "running" },
          { id: "4", content: "D", status: "pending" },
        ]}
      />
    );
    expect(document.querySelector('[data-slot="todo-progress-text"]')).toHaveTextContent("2 of 4 done");
    expect(screen.getAllByText("(Completed)", { exact: false })).toHaveLength(2);
    expect(screen.getByText("(In progress)", { exact: false })).toBeInTheDocument();
  });

  it("JobBanner treats canceled and cancelled the same", () => {
    const { rerender } = render(<JobBanner title="Research" status="cancelled" />);
    expect(screen.getByText("Canceled")).toBeInTheDocument();
    rerender(<JobBanner title="Research" status="canceled" />);
    expect(screen.getByText("Canceled")).toBeInTheDocument();
    rerender(<JobBanner title="Research" status="succeeded" onOpenResult={() => {}} />);
    expect(screen.getByRole("button", { name: "Open result" })).toBeInTheDocument();
  });

  it("RunHistory labels legacy and canonical run statuses", () => {
    render(
      <RunHistory
        runs={[
          { id: "r1", startedAt: 1_700_000_000_000, durationMs: 1000, status: "success" },
          { id: "r2", startedAt: 1_700_000_100_000, durationMs: 1000, status: "succeeded" },
          { id: "r3", startedAt: 1_700_000_200_000, durationMs: 1000, status: "cancelled" },
        ]}
      />
    );
    expect(screen.getAllByText("Succeeded")).toHaveLength(2);
    expect(screen.getByText("Canceled")).toBeInTheDocument();
  });

  it("ChainOfThoughtStep maps running/succeeded onto active/complete", () => {
    const { container } = render(
      <div>
        <ChainOfThoughtStep label="Searching" status="running" />
        <ChainOfThoughtStep label="Done" status="succeeded" />
        <ChainOfThoughtStep label="Legacy" status="active" />
      </div>
    );
    expect(screen.getByText("Searching").closest("[data-status]")).toHaveAttribute("data-status", "running");
    expect(container.querySelectorAll(".text-primary")).not.toHaveLength(0);
  });
});

describe("emptyState aliases", () => {
  it("uses emptyState, the deprecated alias, and the period-free default", () => {
    const { rerender } = render(<JobList jobs={[]} />);
    expect(screen.getByText("No scheduled jobs yet")).toBeInTheDocument();
    rerender(<JobList jobs={[]} empty="Legacy empty" />);
    expect(screen.getByText("Legacy empty")).toBeInTheDocument();
    rerender(<JobList jobs={[]} emptyState="Canonical empty" empty="Legacy empty" />);
    expect(screen.getByText("Canonical empty")).toBeInTheDocument();
    rerender(<UsageInvoiceTable invoices={[]} emptyLabel="Old label" />);
    expect(screen.getByText("Old label")).toBeInTheDocument();
  });
});

describe("BillingBanner kind", () => {
  it("kind and the deprecated kind-as-tone render the same", () => {
    render(
      <div>
        <BillingBanner data-testid="k" kind="payment-failed" />
        <BillingBanner data-testid="t" tone="payment-failed" />
      </div>
    );
    expect(screen.getByTestId("k").className).toBe(screen.getByTestId("t").className);
    expect(screen.getByTestId("k")).toHaveAttribute("data-kind", "payment-failed");
    expect(screen.getByTestId("k")).toHaveAttribute("data-tone", "destructive");
  });

  it("tone overrides the colour when kind is set", () => {
    render(<BillingBanner data-testid="b" kind="info" tone="success" />);
    expect(screen.getByTestId("b").className).toContain("bg-success-soft");
  });
});

describe("AppSidebar value triad", () => {
  it("accepts value/onValueChange and still calls onNavigate", () => {
    const onValueChange = vi.fn();
    const onNavigate = vi.fn();
    render(
      <SidebarProvider>
        <AppSidebar value="home" onValueChange={onValueChange} onNavigate={onNavigate} />
      </SidebarProvider>
    );
    const today = screen.getAllByRole("button").find((b) => b.textContent?.includes("Today"));
    expect(today).toBeDefined();
    fireEvent.click(today!);
    expect(onValueChange).toHaveBeenLastCalledWith("today");
    expect(onNavigate).toHaveBeenLastCalledWith("today");
  });
});
