import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  AgentRoster,
  AgentRosterPanel,
  AgentTodoList,
  BackgroundTaskRow,
  FocusViewItem,
  FocusViewProvider,
  FocusViewToggle,
  formatAgentElapsed,
  formatAgentTokens,
  useFocusView,
  type AgentRosterAgent,
  type AgentTodoItem,
} from "../src/kits/agent/agent-tasks";
import { AgentSessionList, AgentStatusDot, type AgentSession, type AgentSessionGroup } from "../src/kits/agent/agent-sessions";
import {
  BookmarkButton,
  BookmarksPane,
  ContextBanner,
  ResponseRating,
  SpinnerVerbs,
  TranscriptSystemRow,
  TranscriptTurn,
  TurnStickyHeader,
  useTranscriptBookmarks,
} from "../src/kits/agent/agent-transcript";
import { ContextUsageBreakdown, SessionStats, UsageLimitBars, formatResetCaption } from "../src/kits/ai/agent-usage";
import { ConnectionState, OnboardingChecklist, PasteCodeAuth } from "../src/kits/agent/agent-onboarding";
import { axeViolations } from "./a11y";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* AgentTodoList                                                       */
/* ------------------------------------------------------------------ */

const todos: AgentTodoItem[] = [
  { id: "1", content: "Read the config", status: "completed" },
  { id: "2", content: "Fix the parser", status: "completed" },
  { id: "3", content: "Run the tests", activeForm: "Running the tests", status: "in_progress" },
  { id: "4", content: "Update docs", status: "pending" },
];

describe("AgentTodoList", () => {
  it("renders statuses, progress and the active form", async () => {
    const { container } = render(<AgentTodoList items={todos} />);
    expect(screen.getByText("2 of 4 done")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(screen.getByText("Running the tests")).toBeInTheDocument();
    expect(screen.queryByText("Run the tests")).not.toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-status"))).toEqual(["completed", "completed", "in_progress", "pending"]);
    expect(items[2]).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Read the config")).toHaveClass("line-through");
    expect(within(items[3]!).getByText(/Pending/)).toHaveClass("sr-only");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("collapses and supports the compact variant", () => {
    const onOpenChange = vi.fn();
    const { container } = render(<AgentTodoList items={todos} variant="compact" onOpenChange={onOpenChange} />);
    expect(container.firstChild).toHaveAttribute("data-variant", "compact");
    const toggle = screen.getByRole("button", { name: /Tasks/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* AgentRoster                                                         */
/* ------------------------------------------------------------------ */

describe("AgentRoster", () => {
  it("formats elapsed time and tokens", () => {
    expect(formatAgentElapsed(8_000)).toBe("8s");
    expect(formatAgentElapsed(65_000)).toBe("1m 05s");
    expect(formatAgentElapsed(3_780_000)).toBe("1h 03m");
    expect(formatAgentTokens(980)).toBe("980");
    expect(formatAgentTokens(12_400)).toBe("12.4k");
  });

  it("ticks elapsed time every second and fires stop / open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const start = Date.now() - 5_000;
    const agents: AgentRosterAgent[] = [
      { id: "a", name: "Explore repo", type: "Explore", status: "running", startedAt: start, tokens: 12_400, toolUses: 7 },
      { id: "b", name: "Write tests", status: "done", startedAt: start, endedAt: start + 3_000 },
    ];
    const onStop = vi.fn();
    const onOpen = vi.fn();
    const { container } = render(<AgentRosterPanel agents={agents} onStop={onStop} onOpenTranscript={onOpen} />);
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]!).getByText("5s")).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/7 tool uses/)).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/12.4k tokens/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(within(rows[0]!).getByText("7s")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("3s")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop Explore repo" }));
    expect(onStop).toHaveBeenCalledWith("a");
    expect(screen.queryByRole("button", { name: "Stop Write tests" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open transcript for Write tests" }));
    expect(onOpen).toHaveBeenCalledWith("b");
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("pill shows count and aggregate status and opens the panel", () => {
    const agents: AgentRosterAgent[] = [
      { id: "a", name: "One", status: "running", startedAt: Date.now() },
      { id: "b", name: "Two", status: "waiting", startedAt: Date.now() },
      { id: "c", name: "Three", status: "done", startedAt: Date.now(), endedAt: Date.now() },
    ];
    render(<AgentRoster agents={agents} />);
    const pill = screen.getByRole("button", { name: /3 agents/ });
    expect(pill).toHaveAttribute("data-status", "waiting");
    fireEvent.click(pill);
    expect(screen.getByText("Three")).toBeInTheDocument();
    expect(screen.getByText("2 active · 3 total")).toBeInTheDocument();
  });
});

describe("BackgroundTaskRow", () => {
  it("shows command, output tail, elapsed and kill", async () => {
    const onKill = vi.fn();
    const { container } = render(
      <BackgroundTaskRow
        command="npm run dev"
        status="running"
        startedAt={1_000}
        now={66_000}
        output={"line 1\nline 2\nline 3\nline 4\n"}
        tailLines={2}
        onKill={onKill}
      />
    );
    expect(screen.getByText("npm run dev")).toBeInTheDocument();
    expect(screen.getByText("1m 05s")).toBeInTheDocument();
    const out = screen.getByLabelText("Output of npm run dev");
    expect(out.textContent).toBe("line 3\nline 4");
    fireEvent.click(screen.getByRole("button", { name: "Kill npm run dev" }));
    expect(onKill).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("hides kill when finished and shows exit code", () => {
    render(<BackgroundTaskRow command="make" status="failed" exitCode={2} startedAt={0} endedAt={4_000} onKill={() => {}} />);
    expect(screen.getByText("Failed (exit 2)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kill/ })).not.toBeInTheDocument();
  });
});

describe("FocusViewToggle", () => {
  function Probe() {
    const { focused } = useFocusView();
    return <span data-testid="probe">{String(focused)}</span>;
  }
  it("shares state through context and hides tool rows", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <FocusViewProvider onFocusedChange={onChange}>
        <FocusViewToggle />
        <Probe />
        <FocusViewItem kind="assistant">
          <span>assistant row</span>
        </FocusViewItem>
        <FocusViewItem kind="tool">
          <span>tool row</span>
        </FocusViewItem>
      </FocusViewProvider>
    );
    const toggle = screen.getByRole("button", { name: "Focus" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("tool row")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("probe")).toHaveTextContent("true");
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText("tool row")).not.toBeInTheDocument();
    expect(screen.getByText("assistant row")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("works standalone", () => {
    const onPressedChange = vi.fn();
    render(<FocusViewToggle iconOnly onPressedChange={onPressedChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Focus view/ }));
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });
});

/* ------------------------------------------------------------------ */
/* AgentStatusDot                                                      */
/* ------------------------------------------------------------------ */

describe("AgentStatusDot", () => {
  it("labels every status", async () => {
    const { container } = render(
      <div>
        {(["running", "waiting", "idle", "unread", "failed", "elsewhere"] as const).map((s) => (
          <AgentStatusDot key={s} status={s} />
        ))}
        <AgentStatusDot status="idle" label="Paused" />
      </div>
    );
    for (const name of ["Running", "Needs input", "Idle", "Unread", "Failed", "Running elsewhere", "Paused"]) {
      expect(screen.getByRole("img", { name })).toBeInTheDocument();
    }
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* AgentSessionList                                                    */
/* ------------------------------------------------------------------ */

const NOW = new Date("2026-03-01T12:00:00Z").getTime();
const groups: AgentSessionGroup[] = [
  { id: "g1", name: "Payments" },
  { id: "g2", name: "Infra" },
];
const sessions: AgentSession[] = [
  { id: "s1", title: "Refactor checkout", status: "running", updatedAt: NOW - 2 * 60_000, groupId: "g1", branch: "feat/checkout" },
  { id: "s2", title: "Fix flaky test", status: "waiting", updatedAt: NOW - 60 * 60_000, groupId: "g1" },
  { id: "s3", title: "Bump deps", status: "unread", updatedAt: NOW - 3 * 3_600_000, groupId: "g2" },
  { id: "s4", title: "Investigate crash", status: "failed", updatedAt: NOW - 2 * 86_400_000 },
  { id: "s5", title: "Cloud run", status: "elsewhere", location: "remote" },
];

function rowButton(title: string) {
  return screen.getByText(title).closest("button") as HTMLButtonElement;
}

describe("AgentSessionList", () => {
  it("renders groups, relative time and local/remote tabs", async () => {
    const { container } = render(<AgentSessionList sessions={sessions} groups={groups} now={NOW} onNewSession={() => {}} />);
    expect(screen.getByRole("group", { name: "Payments" })).toBeInTheDocument();
    expect(screen.getByText("2m")).toBeInTheDocument();
    expect(screen.getByText("2d")).toBeInTheDocument();
    expect(screen.queryByText("Cloud run")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Remote/ }));
    expect(screen.getByText("Cloud run")).toBeInTheDocument();
    expect(screen.queryByText("Bump deps")).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("searches and filters by status", () => {
    const onFilter = vi.fn();
    render(<AgentSessionList sessions={sessions} groups={groups} now={NOW} onStatusFilterChange={onFilter} />);
    fireEvent.click(screen.getByRole("button", { name: "Search sessions" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search sessions" }), { target: { value: "checkout" } });
    expect(screen.getByText("Refactor checkout")).toBeInTheDocument();
    expect(screen.queryByText("Bump deps")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Infra" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No sessions match")).toBeInTheDocument();
  });

  it("applies a controlled status filter", () => {
    render(<AgentSessionList sessions={sessions} groups={groups} now={NOW} statusFilter={["waiting", "failed"]} />);
    expect(screen.getByText("Fix flaky test")).toBeInTheDocument();
    expect(screen.getByText("Investigate crash")).toBeInTheDocument();
    expect(screen.queryByText("Refactor checkout")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter by status, 2 selected" })).toBeInTheDocument();
  });

  it("opens the filter menu", () => {
    const onFilter = vi.fn();
    render(<AgentSessionList sessions={sessions} groups={groups} now={NOW} onStatusFilterChange={onFilter} />);
    const trigger = screen.getByRole("button", { name: "Filter by status" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Needs input" }));
    expect(onFilter).toHaveBeenCalledWith(["waiting"]);
  });

  it("collapses groups, renames groups and sessions", () => {
    const onRenameGroup = vi.fn();
    const onRenameSession = vi.fn();
    const onNew = vi.fn();
    render(
      <AgentSessionList
        sessions={sessions}
        groups={groups}
        now={NOW}
        onRenameGroup={onRenameGroup}
        onRenameSession={onRenameSession}
        onNewSession={onNew}
      />
    );
    const header = screen.getByRole("button", { name: /Payments/, expanded: true });
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Refactor checkout")).not.toBeInTheDocument();
    fireEvent.doubleClick(header);
    const input = screen.getByRole("textbox", { name: "Group name" });
    fireEvent.change(input, { target: { value: "Billing" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRenameGroup).toHaveBeenCalledWith("g1", "Billing");

    fireEvent.keyDown(rowButton("Bump deps"), { key: "F2" });
    const title = screen.getByRole("textbox", { name: "Session title" });
    fireEvent.change(title, { target: { value: "Bump all deps" } });
    fireEvent.blur(title);
    expect(onRenameSession).toHaveBeenCalledWith("s3", "Bump all deps");

    fireEvent.click(screen.getByRole("button", { name: "Start new session in Infra" }));
    expect(onNew).toHaveBeenCalledWith("g2");
  });

  it("multi-selects with ctrl and shift and runs bulk actions", async () => {
    const onArchive = vi.fn();
    const onDelete = vi.fn();
    const onMarkUnread = vi.fn();
    const onActive = vi.fn();
    const onSelected = vi.fn();
    const { container } = render(
      <AgentSessionList
        sessions={sessions}
        groups={groups}
        now={NOW}
        onArchive={onArchive}
        onDelete={onDelete}
        onMarkUnread={onMarkUnread}
        onActiveChange={onActive}
        onSelectedIdsChange={onSelected}
      />
    );
    fireEvent.click(rowButton("Investigate crash"));
    expect(onActive).toHaveBeenCalledWith("s4");
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    // order: s4 (ungrouped), s1, s2 (Payments), s3 (Infra)
    fireEvent.click(rowButton("Refactor checkout"), { ctrlKey: true });
    expect(onSelected).toHaveBeenLastCalledWith(["s1"]);
    fireEvent.click(rowButton("Bump deps"), { shiftKey: true });
    expect(onSelected).toHaveBeenLastCalledWith(["s1", "s2", "s3"]);
    const bar = screen.getByRole("toolbar", { name: "Bulk actions" });
    expect(within(bar).getByText("3 selected")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(within(bar).getByRole("button", { name: "Archive 3" }));
    expect(onArchive).toHaveBeenCalledWith(["s1", "s2", "s3"]);
    fireEvent.click(within(bar).getByRole("button", { name: "Mark unread" }));
    expect(onMarkUnread).toHaveBeenCalledWith(["s1", "s2", "s3"]);
    fireEvent.click(within(bar).getByRole("button", { name: "Delete 3" }));
    expect(onDelete).toHaveBeenCalledWith(["s1", "s2", "s3"]);
    fireEvent.click(rowButton("Fix flaky test"), { metaKey: true });
    expect(onSelected).toHaveBeenLastCalledWith(["s1", "s3"]);
    fireEvent.click(within(bar).getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("supports checkbox mode", () => {
    const onSelected = vi.fn();
    render(<AgentSessionList sessions={sessions} groups={groups} now={NOW} onSelectedIdsChange={onSelected} />);
    fireEvent.click(screen.getByRole("button", { name: "Select sessions" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Bump deps" }));
    expect(onSelected).toHaveBeenLastCalledWith(["s3"]);
    fireEvent.click(rowButton("Fix flaky test"));
    expect(onSelected).toHaveBeenLastCalledWith(["s3", "s2"]);
  });

  it("navigates with the keyboard", () => {
    const onSelected = vi.fn();
    render(<AgentSessionList sessions={sessions} groups={groups} now={NOW} onSelectedIdsChange={onSelected} />);
    const first = rowButton("Investigate crash");
    expect(first).toHaveAttribute("tabindex", "0");
    expect(rowButton("Refactor checkout")).toHaveAttribute("tabindex", "-1");
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(rowButton("Refactor checkout")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(rowButton("Bump deps")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: " " });
    expect(onSelected).toHaveBeenLastCalledWith(["s4"]);
    fireEvent.keyDown(first, { key: "ArrowDown", shiftKey: true });
    expect(onSelected).toHaveBeenLastCalledWith(["s4", "s1"]);
    fireEvent.keyDown(document.activeElement!, { key: "a", ctrlKey: true });
    expect(onSelected).toHaveBeenLastCalledWith(["s4", "s1", "s2", "s3"]);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onSelected).toHaveBeenLastCalledWith([]);
  });

  it("opens a context menu per row", () => {
    const onArchive = vi.fn();
    render(<AgentSessionList sessions={sessions} groups={groups} now={NOW} onArchive={onArchive} />);
    fireEvent.contextMenu(rowButton("Bump deps"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledWith(["s3"]);
  });
});

/* ------------------------------------------------------------------ */
/* Transcript                                                          */
/* ------------------------------------------------------------------ */

describe("TurnStickyHeader", () => {
  it("scrolls to the turn start and exposes a hidden heading", async () => {
    const scroll = vi.fn();
    const onJump = vi.fn();
    const { container } = render(
      <div>
        <div id="turn-1-start" />
        <TurnStickyHeader prompt="Add dark mode to settings" targetId="turn-1-start" index={1} onJump={onJump} />
      </div>
    );
    document.getElementById("turn-1-start")!.scrollIntoView = scroll;
    expect(screen.getByRole("heading", { name: "Turn 1: Add dark mode to settings" })).toHaveClass("sr-only");
    fireEvent.click(screen.getByRole("button", { name: /Scroll to start of turn/ }));
    expect(scroll).toHaveBeenCalled();
    expect(onJump).toHaveBeenCalled();
    expect(container.querySelector("[data-slot=turn-sticky-header]")).toHaveClass("sticky");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("TranscriptTurn wires the anchor", () => {
    render(
      <TranscriptTurn id="t2" prompt="Second" index={2}>
        <p>reply</p>
      </TranscriptTurn>
    );
    expect(document.getElementById("t2-start")).toBeInTheDocument();
    expect(screen.getByText("reply")).toBeInTheDocument();
  });
});

describe("TranscriptSystemRow", () => {
  it("renders compaction with expandable summary", async () => {
    const { container } = render(<TranscriptSystemRow kind="compaction" summary="We refactored the parser." />);
    expect(screen.getByText("Conversation compacted")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /Show summary/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("We refactored the parser.")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders the other variants", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <div>
        <TranscriptSystemRow kind="compacting" />
        <TranscriptSystemRow kind="interrupted" />
        <TranscriptSystemRow kind="command" command="/review" args="src/" result="3 issues found" />
        <TranscriptSystemRow kind="error" error="Rate limited" onRetry={onRetry} />
        <TranscriptSystemRow kind="divider" title="Teleported from web" />
        <TranscriptSystemRow kind="date" date={NOW - 86_400_000} now={NOW} />
      </div>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Compacting conversation…");
    expect(screen.getByText("Interrupted by user")).toBeInTheDocument();
    expect(screen.getByText("/review")).toBeInTheDocument();
    expect(screen.getByText("3 issues found")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Rate limited");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText("Teleported from web")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Bookmarks", () => {
  function Harness({ onJump }: { onJump: (id: string) => void }) {
    const bm = useTranscriptBookmarks();
    return (
      <div>
        <p id="m1">Use a reducer here</p>
        <BookmarkButton
          pressed={bm.isBookmarked("m1")}
          onPressedChange={() => bm.toggle({ id: "m1", snippet: "Use a reducer here", time: NOW })}
        />
        <BookmarksPane bookmarks={bm.bookmarks} onJump={onJump} onRemove={bm.remove} />
      </div>
    );
  }

  it("adds, jumps and removes", async () => {
    const onJump = vi.fn();
    const { container } = render(<Harness onJump={onJump} />);
    expect(screen.getByText("Bookmark a message to find it here")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Bookmark message" });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
    const pane = screen.getByRole("region", { name: "Bookmarks" });
    fireEvent.click(within(pane).getByText("Use a reducer here").closest("button")!);
    expect(onJump).toHaveBeenCalledWith("m1");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(within(pane).getByRole("button", { name: /Remove bookmark: Use a reducer/ }));
    expect(screen.getByText("Bookmark a message to find it here")).toBeInTheDocument();
  });

  it("scrolls to the message by id when no onJump", () => {
    const scroll = vi.fn();
    render(
      <div>
        <p id="x1">hello</p>
        <BookmarksPane bookmarks={[{ id: "x1", snippet: "hello snippet" }]} />
      </div>
    );
    document.getElementById("x1")!.scrollIntoView = scroll;
    fireEvent.click(screen.getByText("hello snippet").closest("button")!);
    expect(scroll).toHaveBeenCalled();
  });
});

describe("SpinnerVerbs", () => {
  it("rotates sequentially and shows elapsed and tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { container } = render(
      <SpinnerVerbs verbs={["Pondering", "Reticulating", "Brewing"]} order="sequential" interval={1000} startedAt={Date.now() - 3_000} tokens={1_200} />
    );
    expect(screen.getByRole("status", { name: "Working" })).toBeInTheDocument();
    expect(screen.getByText("Pondering…")).toBeInTheDocument();
    expect(screen.getByText(/3s · ↓ 1.2k tokens/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("Reticulating…")).toBeInTheDocument();
    expect(screen.getByText(/4s/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("Pondering…")).toBeInTheDocument();
    vi.useRealTimers();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("random order always changes the verb", () => {
    vi.useFakeTimers();
    render(<SpinnerVerbs verbs={["A", "B"]} interval={500} />);
    expect(screen.getByText("A…")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("B…")).toBeInTheDocument();
  });

  it("does not rotate with reduced motion", () => {
    vi.useFakeTimers();
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...original(q), matches: q.includes("reduce") })) as typeof window.matchMedia;
    try {
      render(<SpinnerVerbs verbs={["A", "B"]} interval={500} order="sequential" />);
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByText("A…")).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("ContextBanner", () => {
  it("shows a name pill, action and expandable output", async () => {
    const onCheckout = vi.fn();
    const { container } = render(
      <div>
        <ContextBanner name="feat-x" action={{ label: "Checkout", onClick: onCheckout }}>
          This session is in worktree
        </ContextBanner>
        <ContextBanner variant="warning" name="main" output={"error: Your local changes would be overwritten"}>
          Branch checkout failed
        </ContextBanner>
      </div>
    );
    expect(screen.getByText("feat-x")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(onCheckout).toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    const toggle = within(alert).getByRole("button", { name: /Show output/ });
    expect(screen.queryByText(/would be overwritten/)).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/would be overwritten/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ResponseRating", () => {
  it("collects reasons after a bad rating then thanks", async () => {
    const onSubmit = vi.fn();
    const { container } = render(<ResponseRating badReasons={["Incorrect", "Too slow"]} onSubmit={onSubmit} />);
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Bad response" }));
    expect(screen.getByRole("button", { name: "Bad response" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Too slow" }));
    expect(screen.getByRole("button", { name: "Too slow" })).toHaveAttribute("aria-pressed", "true");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({ rating: "bad", reasons: ["Too slow"] });
    expect(screen.getByRole("status")).toHaveTextContent("Thanks for the feedback");
  });

  it("submits a good rating immediately", () => {
    const onSubmit = vi.fn();
    render(<ResponseRating onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Good response" }));
    expect(onSubmit).toHaveBeenCalledWith({ rating: "good", reasons: [] });
    expect(screen.getByText("Thanks for the feedback")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

describe("ContextUsageBreakdown", () => {
  it("computes totals and percentages", async () => {
    const onCompact = vi.fn();
    const { container } = render(
      <ContextUsageBreakdown
        max={200_000}
        onCompact={onCompact}
        categories={[
          { key: "system", label: "System prompt", tokens: 20_000 },
          { key: "tools", label: "Tools", tokens: 10_000 },
          { key: "memory", label: "Memory", tokens: 5_000 },
          { key: "messages", label: "Messages", tokens: 65_000 },
        ]}
      />
    );
    expect(screen.getByText("100k / 200k tokens (50%)")).toBeInTheDocument();
    const meter = screen.getByRole("meter", { name: "Context window" });
    expect(meter).toHaveAttribute("aria-valuenow", "100000");
    expect(container.querySelectorAll("[data-slot=context-usage-segment]")).toHaveLength(4);
    const system = container.querySelector("[data-key=system]")!;
    expect(within(system as HTMLElement).getByText("10%")).toBeInTheDocument();
    const memory = container.querySelector("[data-key=memory]")!;
    expect(within(memory as HTMLElement).getByText("2.5%")).toBeInTheDocument();
    const free = container.querySelector("[data-key=free]")!;
    expect(within(free as HTMLElement).getByText("100k")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Compact now" }));
    expect(onCompact).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("flags high usage", () => {
    const { container } = render(<ContextUsageBreakdown max={100} categories={[{ key: "m", label: "Messages", tokens: 95 }]} />);
    expect(container.firstChild).toHaveAttribute("data-level", "danger");
  });
});

describe("UsageLimitBars", () => {
  it("colors by threshold, captions resets and toggles windows", async () => {
    const onView = vi.fn();
    const { container } = render(
      <UsageLimitBars
        now={NOW}
        views={[
          { value: "session", label: "Session" },
          { value: "weekly", label: "Weekly" },
        ]}
        onViewChange={onView}
        windows={[
          { id: "s", label: "Current session", percent: 40, resetsAt: NOW + (2 * 60 + 14) * 60_000, view: "session" },
          { id: "w", label: "Weekly", percent: 80, resetLabel: "Resets Mon", view: "weekly" },
          { id: "wm", label: "Weekly (Opus)", percent: 95, view: "weekly" },
        ]}
        models={[{ name: "Opus", percent: 62 }]}
      />
    );
    expect(container.querySelector("[data-window=s]")).toHaveAttribute("data-level", "ok");
    expect(screen.getByText("Resets in 2h 14m")).toBeInTheDocument();
    expect(screen.getByText("Opus")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    expect(onView).toHaveBeenCalledWith("weekly");
    expect(container.querySelector("[data-window=w]")).toHaveAttribute("data-level", "warn");
    expect(container.querySelector("[data-window=wm]")).toHaveAttribute("data-level", "danger");
    expect(screen.getByText("Resets Mon")).toBeInTheDocument();
    expect(container.querySelector("[data-window=s]")).toBeNull();
  });

  it("formats reset captions", () => {
    expect(formatResetCaption(NOW + 30 * 60_000, NOW)).toBe("Resets in 30m");
    expect(formatResetCaption(NOW - 1, NOW)).toBe("Resets now");
    expect(formatResetCaption(NOW + 3 * 86_400_000, NOW)).toMatch(/^Resets \w+/);
  });
});

describe("SessionStats", () => {
  it("summarizes cost, durations and code changes", async () => {
    const { container } = render(
      <SessionStats cost={1.2345} apiDurationMs={252_000} wallDurationMs={1_083_000} linesAdded={120} linesRemoved={34} />
    );
    expect(screen.getByText("$1.23")).toBeInTheDocument();
    expect(screen.getByText("4m 12s")).toBeInTheDocument();
    expect(screen.getByText("18m 03s")).toBeInTheDocument();
    expect(screen.getByText("+120")).toBeInTheDocument();
    expect(screen.getByText("−34")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

describe("OnboardingChecklist", () => {
  it("highlights the next milestone and fires actions", async () => {
    const onShowMe = vi.fn();
    const onDismiss = vi.fn();
    const { container } = render(
      <OnboardingChecklist
        onShowMe={onShowMe}
        onDismiss={onDismiss}
        items={[
          { id: "a", title: "Ask a question", completed: true },
          { id: "b", title: "Make an edit" },
          { id: "c", title: "Run a command" },
        ]}
      />
    );
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-state"))).toEqual(["completed", "next", "upcoming"]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("button", { name: "Show me: Ask a question" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show me: Make an edit" }));
    expect(onShowMe).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss checklist" }));
    expect(onDismiss).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ConnectionState", () => {
  it("renders unresponsive, reconnecting and error states", async () => {
    const onReconnect = vi.fn();
    const onRetry = vi.fn();
    const { container, rerender } = render(<ConnectionState state="unresponsive" onReconnect={onReconnect} />);
    expect(screen.getByText("Host isn't responding")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onReconnect).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
    rerender(<ConnectionState state="disconnected" reconnecting onReconnect={onReconnect} />);
    expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reconnect" })).not.toBeInTheDocument();
    rerender(<ConnectionState state="error" details="ECONNREFUSED" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("ECONNREFUSED");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("PasteCodeAuth", () => {
  it("validates, submits and shows success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PasteCodeAuth
        url="https://example.com/auth?x=1"
        onSubmit={onSubmit}
        validate={(c) => (c.length < 6 ? "Code looks too short" : null)}
      />
    );
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the code from your browser");
    const input = screen.getByLabelText("Paste the code shown after signing in");
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Code looks too short");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.change(input, { target: { value: "abc-123-xyz" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    });
    expect(onSubmit).toHaveBeenCalledWith("abc-123-xyz");
    expect(screen.getByRole("status")).toHaveTextContent("Signed in");
  });

  it("shows submit errors, pastes and opens the link", async () => {
    const onOpenUrl = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: vi.fn().mockResolvedValue(" pasted-code \n"), writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
    render(<PasteCodeAuth url="https://example.com/a" onOpenUrl={onOpenUrl} onSubmit={() => Promise.reject(new Error("Invalid code"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenUrl).toHaveBeenCalledWith("https://example.com/a");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Paste" }));
    });
    expect(screen.getByLabelText("Paste the code shown after signing in")).toHaveValue("pasted-code");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid code");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.com/a");
  });
});
