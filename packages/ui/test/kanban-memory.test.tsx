import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  KANBAN_UNASSIGNED,
  KanbanBoard,
  KanbanCard,
  OrchestrationPanel,
  TaskDetailDialog,
  filterBoard,
  moveCard,
  moveColumn,
  type KanbanBoardModel,
  type KanbanCardData,
} from "../src/components/kanban";
import {
  MemoryMap,
  ShareCodeControls,
  TimeScrubber,
  bucketByTime,
  decodeMemoryShareCode,
  encodeMemoryShareCode,
  layoutMemoryGraph,
  memoryMapLegend,
  type MemoryNode,
} from "../src/components/memory-map";
import { axeViolations } from "./a11y";

// LogViewer scrolls its tail; jsdom has no Element.scrollTo.
Element.prototype.scrollTo ??= function () {};

afterEach(() => vi.useRealTimers());

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const NOW = new Date(2026, 9, 18, 12);

const board: KanbanBoardModel = {
  columns: [
    { id: "todo", title: "Todo", color: "#888" },
    { id: "doing", title: "In progress", wipLimit: 2 },
    { id: "done", title: "Done", done: true },
  ],
  cards: [
    { id: "a", title: "Card A", columnId: "todo", labels: ["bug"], assigneeId: "ada", description: "Fix the login form" },
    { id: "b", title: "Card B", columnId: "todo", assigneeId: "bot", priority: "high" },
    { id: "c", title: "Card C", columnId: "todo", labels: ["ui"] },
    { id: "d", title: "Card D", columnId: "doing", assigneeId: "bot", runStatus: "running" },
    { id: "e", title: "Card E", columnId: "doing", labels: ["bug", "ui"], assigneeId: "ada" },
  ],
  labels: [
    { id: "bug", name: "Bug", color: "destructive" },
    { id: "ui", name: "UI", color: "blue" },
  ],
  assignees: [
    { id: "ada", name: "Ada Lovelace" },
    { id: "bot", name: "Builder", kind: "agent", description: "Writes code" },
  ],
};

const ids = (b: KanbanBoardModel, col: string) => b.cards.filter((c) => c.columnId === col).map((c) => c.id);

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

describe("moveCard", () => {
  it("reorders within a column", () => {
    const r = moveCard(board, { cardId: "a", toColumn: "todo", toIndex: 2 });
    expect(r.moved).toBe(true);
    expect(ids(r.board, "todo")).toEqual(["b", "c", "a"]);
    expect(r).toMatchObject({ fromColumn: "todo", fromIndex: 0, toColumn: "todo", toIndex: 2, overLimit: false });
    expect(board.cards[0]!.id).toBe("a");
  });

  it("moves between columns and flags WIP over-limit", () => {
    const r = moveCard(board, { cardId: "a", toColumn: "doing", toIndex: 1 });
    expect(ids(r.board, "doing")).toEqual(["d", "a", "e"]);
    expect(ids(r.board, "todo")).toEqual(["b", "c"]);
    expect(r.board.cards.find((c) => c.id === "a")!.columnId).toBe("doing");
    expect(r.overLimit).toBe(true);
    expect(moveCard(board, { cardId: "a", toColumn: "done", toIndex: 0 }).overLimit).toBe(false);
  });

  it("clamps indexes and ignores no-ops and unknown ids", () => {
    expect(ids(moveCard(board, { cardId: "a", toColumn: "done", toIndex: 99 }).board, "done")).toEqual(["a"]);
    const end = moveCard(board, { cardId: "a", toColumn: "doing", toIndex: 99 });
    expect(end.toIndex).toBe(2);
    expect(ids(end.board, "doing")).toEqual(["d", "e", "a"]);
    const start = moveCard(board, { cardId: "e", toColumn: "todo", toIndex: -5 });
    expect(start.toIndex).toBe(0);
    expect(ids(start.board, "todo")).toEqual(["e", "a", "b", "c"]);
    expect(moveCard(board, { cardId: "c", toColumn: "todo", toIndex: Number.NaN }).toIndex).toBe(0);
    const same = moveCard(board, { cardId: "b", toColumn: "todo", toIndex: 1 });
    expect(same.moved).toBe(false);
    expect(same.board).toBe(board);
    expect(moveCard(board, { cardId: "zzz", toColumn: "todo", toIndex: 0 }).moved).toBe(false);
    expect(moveCard(board, { cardId: "a", toColumn: "nope", toIndex: 0 }).moved).toBe(false);
  });

  it("moveColumn reorders columns", () => {
    expect(moveColumn(board, { columnId: "done", toIndex: 0 }).columns.map((c) => c.id)).toEqual(["done", "todo", "doing"]);
  });
});

describe("filterBoard", () => {
  it("filters by search, assignee, label and priority", () => {
    expect(filterBoard(board, {})).toBe(board);
    expect(filterBoard(board, { search: "login" }).cards.map((c) => c.id)).toEqual(["a"]);
    expect(filterBoard(board, { search: "card bug" }).cards.map((c) => c.id)).toEqual(["a", "e"]);
    expect(filterBoard(board, { search: "builder" }).cards.map((c) => c.id)).toEqual(["b", "d"]);
    expect(filterBoard(board, { assignees: ["bot"] }).cards.map((c) => c.id)).toEqual(["b", "d"]);
    expect(filterBoard(board, { assignees: [KANBAN_UNASSIGNED] }).cards.map((c) => c.id)).toEqual(["c"]);
    expect(filterBoard(board, { labels: ["ui"] }).cards.map((c) => c.id)).toEqual(["c", "e"]);
    expect(filterBoard(board, { labels: ["bug"], assignees: ["ada"] }).cards.map((c) => c.id)).toEqual(["a", "e"]);
    expect(filterBoard(board, { priorities: ["high"] }).cards.map((c) => c.id)).toEqual(["b"]);
    expect(filterBoard(board, { search: "bug" }).columns).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ */
/* KanbanBoard                                                         */
/* ------------------------------------------------------------------ */

const tick = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

describe("KanbanBoard", () => {
  it("renders columns, counts, WIP state and cards", async () => {
    const { container } = render(<KanbanBoard defaultBoard={board} now={NOW} />);
    for (const t of ["Todo", "In progress", "Done"]) expect(screen.getByRole("heading", { name: t })).toBeInTheDocument();
    expect(screen.getByText("2 cards, WIP limit 2")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Card [A-E]$/ })).toHaveLength(5);
    expect(within(screen.getByRole("list", { name: "Todo cards" })).getAllByRole("listitem")).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("filters via the toolbar search", () => {
    render(<KanbanBoard defaultBoard={board} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search cards" }), { target: { value: "login" } });
    expect(screen.getAllByRole("button", { name: /^Card [A-E]$/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("button", { name: /^Card [A-E]$/ })).toHaveLength(5);
  });

  it("filters by assignee toggle and groups into swimlanes", () => {
    render(<KanbanBoard defaultBoard={board} defaultSwimlanes="assignee" />);
    expect(screen.getByRole("group", { name: "Swimlane Builder" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Swimlane Unassigned" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Builder", pressed: false }));
    expect(screen.getAllByRole("button", { name: /^Card [A-E]$/ }).map((b) => b.getAttribute("aria-label"))).toEqual(["Card B", "Card D"]);
  });

  it("moves a card with the dnd-kit keyboard sensor and announces it", async () => {
    const onMove = vi.fn();
    render(<KanbanBoard defaultBoard={board} onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Card A" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await tick();
    const region = () => document.querySelector('[id^="DndLiveRegion"]');
    await waitFor(() => expect(region()?.textContent).toMatch(/Picked up card Card A in column Todo, position 1 of 3/));
    fireEvent.keyDown(document, { code: "ArrowRight", key: "ArrowRight" });
    await tick();
    await waitFor(() => expect(region()?.textContent).toMatch(/Moved card Card A to column In progress, position 1 of 3/));
    fireEvent.keyDown(document, { code: "ArrowDown", key: "ArrowDown" });
    await tick();
    await waitFor(() => expect(region()?.textContent).toMatch(/position 2 of 3/));
    fireEvent.keyDown(document, { code: "Space", key: " " });
    await tick();
    expect(onMove).toHaveBeenCalledWith({ cardId: "a", toColumn: "doing", toIndex: 1 });
    await waitFor(() => expect(region()?.textContent).toMatch(/Dropped card Card A in column In progress, position 2 of 3. Column is over its WIP limit/));
    expect(within(screen.getByRole("list", { name: "In progress cards" })).getAllByRole("button", { name: /^Card/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Card D",
      "Card A",
      "Card E",
    ]);
  });

  it("Escape cancels a keyboard drag", async () => {
    const onMove = vi.fn();
    render(<KanbanBoard defaultBoard={board} onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Card B" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await tick();
    fireEvent.keyDown(document, { code: "ArrowUp", key: "ArrowUp" });
    await tick();
    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });
    await tick();
    expect(onMove).not.toHaveBeenCalled();
    expect(within(screen.getByRole("list", { name: "Todo cards" })).getAllByRole("button", { name: /^Card/ })[1]).toHaveAttribute("aria-label", "Card B");
  });

  it("moves a card through the accessible 'Move to…' menu", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const onCardOpen = vi.fn();
    render(<KanbanBoard defaultBoard={board} onMove={onMove} onCardOpen={onCardOpen} />);
    await user.click(screen.getByRole("button", { name: "Actions for Card A" }));
    await user.click(await screen.findByRole("menuitem", { name: "In progress" }));
    expect(onMove).toHaveBeenCalledWith({ cardId: "a", toColumn: "doing", toIndex: 2 });
    expect(document.querySelector("[data-kanban-announcer]")).toHaveTextContent(
      "Moved card Card A to column In progress, position 3 of 3. Column is over its WIP limit."
    );
    expect(document.querySelector('[data-kanban-column="doing"]')).toHaveAttribute("data-over-limit");
    await user.click(screen.getByRole("button", { name: "Actions for Card B" }));
    await user.click(await screen.findByRole("menuitem", { name: "Move down" }));
    expect(onMove).toHaveBeenLastCalledWith({ cardId: "b", toColumn: "todo", toIndex: 1 });
    await user.click(screen.getByRole("button", { name: "Card C" }));
    expect(onCardOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "c" }));
  });

  it("collapses a column and adds a card", async () => {
    const onAddCard = vi.fn();
    render(<KanbanBoard defaultBoard={board} onAddCard={onAddCard} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse Todo" }));
    expect(screen.queryByRole("button", { name: "Card A" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand Todo" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Add card to Done" }));
    const input = screen.getByRole("textbox", { name: "New card title in Done" });
    fireEvent.change(input, { target: { value: "Ship it" } });
    fireEvent.submit(input.closest("form")!);
    expect(onAddCard).toHaveBeenCalledWith({ columnId: "done", title: "Ship it" });
  });
});

describe("KanbanCard", () => {
  it("shows overdue, subtasks, comments and agent run badges", async () => {
    const card: KanbanCardData = {
      id: "x",
      title: "Write docs",
      columnId: "doing",
      dueDate: new Date(2026, 9, 10),
      subtasks: { done: 2, total: 5 },
      commentCount: 3,
      runStatus: "running",
      priority: "urgent",
      labels: ["bug"],
    };
    const { container, rerender } = render(
      <KanbanCard card={card} labels={board.labels} assignee={board.assignees![1]} now={NOW} locale="en-US" />
    );
    expect(container.querySelector("[data-overdue]")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-due")).toHaveClass("text-destructive");
    expect(screen.getByTestId("kanban-due")).toHaveTextContent("Overdue");
    expect(container).toHaveTextContent("2/5");
    expect(container).toHaveTextContent("3comments");
    expect(container.querySelector('[data-run-status="running"]')).toHaveTextContent("Agent running");
    expect(screen.getByRole("button", { name: "Write docs" })).toHaveAccessibleDescription(/Assigned to Builder/);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<KanbanCard card={{ ...card, runStatus: "failed" }} now={NOW} done />);
    expect(container.querySelector("[data-overdue]")).not.toBeInTheDocument();
    expect(container.querySelector('[data-run-status="failed"]')).toHaveTextContent("Run failed");
  });
});

/* ------------------------------------------------------------------ */
/* TaskDetailDialog & OrchestrationPanel                               */
/* ------------------------------------------------------------------ */

describe("TaskDetailDialog", () => {
  const task: KanbanCardData = { ...board.cards[3]!, description: "Some **markdown**", blockedBy: ["c"], estimate: 3 };
  const setup = (extra: Partial<React.ComponentProps<typeof TaskDetailDialog>> = {}) => {
    const onChange = vi.fn();
    const onAddDependency = vi.fn();
    const onRemoveDependency = vi.fn();
    render(
      <TaskDetailDialog
        open
        task={task}
        board={board}
        now={NOW}
        onChange={onChange}
        onAddDependency={onAddDependency}
        onRemoveDependency={onRemoveDependency}
        models={[{ value: "fast", label: "Fast model" }]}
        comments={{ id: "t", comments: [{ id: "c1", author: { id: "u", name: "Ada" }, body: "Looks good", createdAt: NOW.getTime() - 60_000 }] }}
        activity={[{ id: "a1", actor: "Builder", actorKind: "agent", action: "moved this to In progress", at: NOW.getTime() - 3600_000 }]}
        runs={[
          { id: "r1", agentId: "bot", status: "failed", startedAt: NOW.getTime() - 120_000, endedAt: NOW.getTime() - 30_000, log: ["starting", "ERROR boom"] },
        ]}
        {...extra}
      />
    );
    return { onChange, onAddDependency, onRemoveDependency };
  };

  it("edits the title inline", async () => {
    const { onChange } = setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(/Card D/);
    fireEvent.click(screen.getByRole("button", { name: "Card D, edit title" }));
    const input = screen.getByRole("textbox", { name: "Task title" });
    fireEvent.change(input, { target: { value: "Card D renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({ title: "Card D renamed" });
    expect(screen.queryByRole("textbox", { name: "Task title" })).not.toBeInTheDocument();
  });

  it("changes properties and adds/removes dependencies", async () => {
    const user = userEvent.setup();
    const { onChange, onAddDependency, onRemoveDependency } = setup();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Estimate" }), { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith({ estimate: 5 });
    await user.click(screen.getByRole("combobox", { name: "Priority" }));
    await user.click(await screen.findByRole("option", { name: "Urgent" }));
    expect(onChange).toHaveBeenCalledWith({ priority: "urgent" });
    expect(within(screen.getByRole("list", { name: "Blocked by" })).getByText("Card C")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Card C from blocked by" }));
    expect(onRemoveDependency).toHaveBeenCalledWith("blockedBy", "c");
    await user.click(screen.getByRole("combobox", { name: "Add blocks task" }));
    await user.click(await screen.findByRole("option", { name: "Card B" }));
    expect(onAddDependency).toHaveBeenCalledWith("blocks", "b");
  });

  it("switches tabs and opens a run log", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByText("Looks good")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Activity/ }));
    expect(screen.getByRole("list", { name: "Activity" })).toHaveTextContent("Builder moved this to In progress");
    await user.click(screen.getByRole("tab", { name: /Runs/ }));
    const runs = screen.getByRole("list", { name: "Agent runs" });
    expect(runs).toHaveTextContent("Run failed");
    expect(runs).toHaveTextContent("1m 30s");
    await user.click(within(runs).getByRole("button", { name: "Open log" }));
    expect(screen.getByLabelText("Log for run r1")).toBeInTheDocument();
    expect(screen.getByText("ERROR boom")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    setup();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("OrchestrationPanel", () => {
  it("toggles auto-decompose and lists participants", async () => {
    const onAutoDecomposeChange = vi.fn();
    const onDecompose = vi.fn();
    const agents = board.assignees!.filter((a) => a.kind === "agent");
    const { container } = render(
      <OrchestrationPanel
        profiles={agents}
        defaultOrchestratorId="bot"
        onAutoDecomposeChange={onAutoDecomposeChange}
        onDecompose={onDecompose}
        participants={[{ agent: agents[0]!, role: "Implements the change", status: "running" }]}
      />
    );
    const toggle = screen.getByRole("switch", { name: /Auto-decompose/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(onAutoDecomposeChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: /Decompose now/ }));
    expect(onDecompose).toHaveBeenCalled();
    expect(screen.getByRole("list", { name: "Participating agents" })).toHaveTextContent("Implements the change");
    expect(screen.getByRole("combobox", { name: "Orchestrator agent" })).toHaveTextContent("Builder");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Memory map                                                          */
/* ------------------------------------------------------------------ */

const DAY = 864e5;
const T0 = new Date(2026, 3, 1).getTime();
const kinds = ["memory", "skill", "fact", "person"] as const;
const memNodes: MemoryNode[] = Array.from({ length: 12 }, (_, i) => ({
  id: `n${i}`,
  label: `Node ${i}`,
  kind: kinds[i % 4]!,
  createdAt: T0 + i * 10 * DAY,
  weight: 1 + (i % 3),
  links: i > 0 ? [`n${i - 1}`] : [],
}));

describe("memory map helpers", () => {
  it("bucketByTime splits nodes into equal spans", () => {
    const nodes = Array.from({ length: 11 }, (_, i) => ({ id: `x${i}`, createdAt: i * 10 }));
    const b = bucketByTime(nodes, 5);
    expect(b.map((x) => x.count)).toEqual([2, 2, 2, 2, 3]);
    expect(b[0]).toMatchObject({ start: 0, end: 20, ids: ["x0", "x1"] });
    expect(b[4]!.end).toBe(100);
    expect(bucketByTime([], 4)).toEqual([]);
    expect(bucketByTime(nodes, 2, [0, 40]).map((x) => x.count)).toEqual([2, 3]);
    expect(bucketByTime([{ id: "s", createdAt: 5 }], 3).map((x) => x.count)).toEqual([1, 0, 0]);
  });

  it("memoryMapLegend orders known kinds and assigns colors/glyphs", () => {
    const legend = memoryMapLegend([...memNodes, { id: "z", label: "Z", kind: "recipe", createdAt: T0 }]);
    expect(legend.map((l) => l.kind)).toEqual(["memory", "skill", "fact", "person", "recipe"]);
    expect(legend[0]).toMatchObject({ label: "Memory", glyph: "circle", count: 3 });
    expect(legend[1]!.glyph).toBe("diamond");
    expect(legend[4]).toMatchObject({ label: "Recipe", count: 1 });
    expect(new Set(legend.map((l) => l.color)).size).toBe(5);
    expect(memoryMapLegend(["fact"], { fact: { label: "Facts" } })[0]).toMatchObject({ label: "Facts", count: 0 });
  });

  it("layout is deterministic for a seed", () => {
    const a = layoutMemoryGraph(memNodes, { seed: 7, ticks: 50, radialTime: true });
    const b = layoutMemoryGraph(memNodes, { seed: 7, ticks: 50, radialTime: true });
    const c = layoutMemoryGraph(memNodes, { seed: 8, ticks: 50, radialTime: true });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe("MemoryMap", () => {
  it("renders an accessible canvas and a fallback list with all nodes", async () => {
    const { container } = render(<MemoryMap nodes={memNodes} staticLayout seed={3} radialTime />);
    expect(screen.getByRole("img", { name: /Memory map: 12 of 12 nodes shown, arranged in time rings/ })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Memory map nodes" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(12);
    expect(list).toHaveTextContent("Node 5, Skill");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("staticLayout positions are deterministic across renders", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { unmount } = render(<MemoryMap nodes={memNodes} staticLayout={80} seed="abc" onLayout={first} />);
    unmount();
    render(<MemoryMap nodes={memNodes} staticLayout={80} seed="abc" onLayout={second} />);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0]![0]).toEqual(second.mock.calls[0]![0]);
    expect(Object.keys(first.mock.calls[0]![0])).toHaveLength(12);
  });

  it("selects via the list view, shows details and node actions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(<MemoryMap nodes={memNodes} staticLayout onSelect={onSelect} onDelete={onDelete} onOpen={() => {}} />);
    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(13);
    await user.click(screen.getByRole("button", { name: "Node 3" }));
    expect(onSelect).toHaveBeenCalledWith(memNodes[3]);
    const panel = screen.getByRole("complementary", { name: "Node details" });
    expect(within(panel).getByRole("heading", { name: "Node 3" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    await user.click(within(panel).getByRole("button", { name: "Actions for Node 3" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(memNodes[3]);
    await user.click(within(panel).getByRole("button", { name: "Node 4" }));
    expect(onSelect).toHaveBeenLastCalledWith(memNodes[4]);
  });

  it("filters by kind through the legend", () => {
    const onHiddenKindsChange = vi.fn();
    render(<MemoryMap nodes={memNodes} staticLayout onHiddenKindsChange={onHiddenKindsChange} />);
    const legend = screen.getByRole("group", { name: "Legend: filter by kind" });
    const skill = within(legend).getByRole("button", { name: /^Skill/ });
    expect(skill).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(skill);
    expect(onHiddenKindsChange).toHaveBeenCalledWith(["skill"]);
    expect(skill).toHaveAttribute("aria-pressed", "false");
    expect(within(screen.getByRole("list", { name: "Memory map nodes" })).getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByRole("img", { name: /9 of 12 nodes/ })).toBeInTheDocument();
  });

  it("draws on a canvas context when available", () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, prop) => (typeof prop === "string" && /^[a-z]/.test(prop) ? (...a: unknown[]) => void calls.push(prop) : undefined),
        set: () => true,
      }
    );
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.useFakeTimers();
    render(<MemoryMap nodes={memNodes} staticLayout radialTime showScrubber={false} />);
    act(() => vi.advanceTimersByTime(50));
    expect(calls).toContain("arc");
    expect(calls).toContain("fillText");
    spy.mockRestore();
  });

  it("still draws under StrictMode (mount → unmount → mount must not leave a stale frame)", () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, prop) => (typeof prop === "string" && /^[a-z]/.test(prop) ? (...a: unknown[]) => void calls.push(prop) : undefined),
        set: () => true,
      }
    );
    const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.useFakeTimers();
    render(
      <React.StrictMode>
        <MemoryMap nodes={memNodes} staticLayout radialTime showScrubber={false} />
      </React.StrictMode>
    );
    act(() => vi.advanceTimersByTime(50));
    expect(calls).toContain("arc");
    spy.mockRestore();
    vi.useRealTimers();
  });
});

describe("TimeScrubber", () => {
  const min = T0;
  const max = T0 + 110 * DAY;

  it("plays, pauses and toggles with Space (fake timers)", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    const onPlayingChange = vi.fn();
    render(
      <TimeScrubber
        nodes={memNodes}
        defaultValue={[min, min]}
        onValueChange={onValueChange}
        onPlayingChange={onPlayingChange}
        duration={1000}
        tickMs={100}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Play timeline" }));
    expect(onPlayingChange).toHaveBeenLastCalledWith(true);
    act(() => vi.advanceTimersByTime(300));
    expect(onValueChange).toHaveBeenCalledTimes(3);
    const end = onValueChange.mock.calls[2]![0][1] as number;
    expect(end).toBeCloseTo(min + (max - min) * 0.3, -3);
    fireEvent.click(screen.getByRole("button", { name: "Pause playback" }));
    act(() => vi.advanceTimersByTime(500));
    expect(onValueChange).toHaveBeenCalledTimes(3);
    const group = screen.getByRole("group", { name: "Time scrubber" });
    group.focus();
    fireEvent.keyDown(group, { key: " ", code: "Space" });
    expect(screen.getByRole("button", { name: "Pause playback" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(onPlayingChange).toHaveBeenLastCalledWith(false);
    expect(onValueChange).toHaveBeenLastCalledWith([min, max]);
    expect(screen.getByRole("button", { name: "Play timeline" })).toBeInTheDocument();
  });

  it("changes the range with the slider and has no axe violations", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<TimeScrubber nodes={memNodes} onValueChange={onValueChange} locale="en-US" />);
    const end = screen.getByRole("slider", { name: /^End:/ });
    act(() => end.focus());
    fireEvent.keyDown(end, { key: "PageDown" });
    expect(onValueChange).toHaveBeenCalled();
    const [a, b] = onValueChange.mock.calls[0]![0] as [number, number];
    expect(a).toBe(min);
    expect(b).toBeLessThan(max);
    expect(container.querySelectorAll("[data-bucket]")).toHaveLength(32);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ShareCodeControls", () => {
  const state = { hiddenKinds: ["skill"], range: [1_700_000_000_000, 1_710_000_000_000] as [number, number], selectedId: "n1", zoom: { k: 1.5, x: 10, y: -4 } };

  it("round-trips a view through a share code", async () => {
    const code = encodeMemoryShareCode(state);
    expect(code).toMatch(/^mm1\.[A-Za-z0-9_-]+$/);
    expect(decodeMemoryShareCode(code)).toEqual({ ok: true, state });
    const onImport = vi.fn();
    const { container } = render(<ShareCodeControls state={state} onImport={onImport} />);
    expect(screen.getByRole("textbox", { name: "Share code" })).toHaveValue(code);
    fireEvent.change(screen.getByRole("textbox", { name: "Load a share code" }), { target: { value: `  ${code} ` } });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onImport).toHaveBeenCalledWith(state);
    expect(screen.getByRole("status")).toHaveTextContent("View loaded.");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("rejects invalid codes", () => {
    const onImport = vi.fn();
    render(<ShareCodeControls state={{}} onImport={onImport} />);
    const input = screen.getByRole("textbox", { name: "Load a share code" });
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Not a memory map share code.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onImport).not.toHaveBeenCalled();
    expect(decodeMemoryShareCode("mm1.@@").ok).toBe(false);
    expect(decodeMemoryShareCode("mm1.abc")).toEqual({ ok: false, error: "The code is corrupted." });
    const badZoom = "mm1." + btoa(JSON.stringify({ z: [0, 1, 2] })).replace(/=+$/, "");
    expect(decodeMemoryShareCode(badZoom)).toEqual({ ok: false, error: "Invalid zoom." });
  });
});
