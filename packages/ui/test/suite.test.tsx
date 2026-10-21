import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Backlinks } from "../src/kits/workspace/backlinks";
import {
  EntityChip,
  MentionInput,
  MentionText,
  extractMentions,
  formatMention,
  mentionsToPlainText,
  parseMentions,
  type MentionSuggestion,
} from "../src/kits/workspace/entity-mention";
import { QuickCapture, parseCapture } from "../src/kits/workspace/quick-capture";
import { ConflictResolver, OfflineBanner, SyncStatus, type SyncState } from "../src/kits/workspace/sync-status";
import { TodayTimeline, layoutTimeline, type TimelineItem } from "../src/kits/workspace/today-timeline";
import { formatRelativeTime } from "../src/lib/relative-time";
import { ShortcutProvider } from "../src/patterns/shortcuts";
import { axeViolations } from "./helpers/a11y";

/** Wednesday, 14 October 2026, 10:00 local time. */
const NOW = new Date(2026, 9, 14, 10, 0);
const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m);

/* ------------------------------------------------------------------ */
/* Mentions                                                            */
/* ------------------------------------------------------------------ */

describe("parseMentions", () => {
  it("splits text and tokens with positions", () => {
    const text = "Ask @[Ana Lima](person:u1) about #[Trip plan](notes:n-7).";
    const segs = parseMentions(text);
    expect(segs.map((s) => s.kind)).toEqual(["text", "mention", "text", "mention", "text"]);
    expect(segs[1]).toMatchObject({ trigger: "@", title: "Ana Lima", type: "person", id: "u1", start: 4 });
    expect(segs[3]).toMatchObject({ trigger: "#", title: "Trip plan", type: "notes", id: "n-7" });
    expect(segs.map((s) => (s.kind === "text" ? s.text : s.raw)).join("")).toBe(text);
  });

  it("handles plain text, adjacent tokens and malformed tokens", () => {
    expect(parseMentions("")).toEqual([]);
    expect(parseMentions("no mentions")).toEqual([{ kind: "text", text: "no mentions", start: 0, end: 11 }]);
    expect(parseMentions("@[A](tasks:1)@[B](tasks:2)").filter((s) => s.kind === "mention")).toHaveLength(2);
    expect(parseMentions("@[broken](tasks 1)")).toHaveLength(1);
  });

  it("round-trips formatMention and extracts mentions", () => {
    const raw = formatMention({ trigger: "@", title: "Fix [bug]", type: "tasks", id: "42" });
    expect(raw).toBe("@[Fix  bug](tasks:42)");
    expect(extractMentions(`see ${raw}`)).toEqual([{ trigger: "@", title: "Fix  bug", type: "tasks", id: "42" }]);
    expect(mentionsToPlainText("Hi @[Ana](person:1) #[Trip](notes:2)")).toBe("Hi @Ana #Trip");
  });
});

describe("MentionText & EntityChip", () => {
  it("renders stored text with chips", () => {
    render(<MentionText value="Ping @[Ana](person:u1) re #[Q4 plan](notes:n1)" getHref={(m) => `/${m.type}/${m.id}`} />);
    const link = screen.getByRole("link", { name: /Q4 plan/ });
    expect(link).toHaveAttribute("href", "/notes/n1");
    expect(link).toHaveAttribute("data-app", "notes");
    expect(screen.getByText("Ana").closest("[data-entity-type]")).toHaveAttribute("data-entity-type", "person");
  });

  it("strikes through done tasks and shows event dates", () => {
    render(
      <>
        <EntityChip type="tasks" id="1" title="Ship it" status="done" />
        <EntityChip type="calendar" id="2" title="Standup" date={at(9, 30)} />
      </>
    );
    expect(screen.getByText("Ship it")).toHaveClass("line-through");
    expect(screen.getByText("(done)")).toHaveClass("sr-only");
    expect(screen.getByText("Standup").parentElement).toHaveTextContent(/Oct/);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <p>
        <EntityChip type="tasks" id="1" title="Task" href="/t/1" /> <EntityChip type="mail" id="2" title="Mail" onClick={() => {}} />{" "}
        <EntityChip type="tag" id="3" title="tag" />
      </p>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("MentionInput", () => {
  const suggestions: Partial<Record<"@" | "#" | "/", MentionSuggestion[]>> = {
    "@": [
      { id: "u1", title: "Ana Lima", type: "person" },
      { id: "u2", title: "Ben Okafor", type: "person" },
    ],
    "#": [{ id: "n1", title: "Trip plan", type: "notes" }],
    "/": [{ id: "today", title: "Today's date", type: "tag", insertText: "2026-10-14" }],
  };

  function Harness(props: Partial<React.ComponentProps<typeof MentionInput>>) {
    const [value, setValue] = React.useState("");
    return (
      <>
        <MentionInput aria-label="Comment" value={value} onValueChange={setValue} suggestions={suggestions} {...props} />
        <output data-testid="value">{value}</output>
      </>
    );
  }

  it("opens on @, filters, navigates and inserts a token", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByLabelText("Comment");
    await user.type(field, "Hi @");
    expect(await screen.findAllByRole("option")).toHaveLength(2);
    await user.type(field, "b");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Ben Okafor" })).toBeInTheDocument();
  });

  it("inserts the highlighted suggestion with Enter and keeps display text readable", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByLabelText("Comment") as HTMLTextAreaElement;
    await user.type(field, "Hi @ok");
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(1);
    expect(within(listbox).getByRole("option", { name: "Ben Okafor" })).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("value")).toHaveTextContent("Hi @[Ben Okafor](person:u2)");
    expect(field.value).toBe("Hi @Ben Okafor ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports arrow keys, # notes and Backspace removing a whole token", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByLabelText("Comment") as HTMLTextAreaElement;
    await user.type(field, "@");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(field).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[1].id);
    await user.keyboard("{Enter}");
    await user.type(field, "see #tr");
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("value").textContent).toBe("@[Ben Okafor](person:u2) see #[Trip plan](notes:n1) ");
    await user.keyboard("{Backspace}{Backspace}");
    expect(screen.getByTestId("value").textContent).toBe("@[Ben Okafor](person:u2) see ");
    expect(field.value).toBe("@Ben Okafor see ");
  });

  it("editing inside a token turns it back into plain text", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByLabelText("Comment") as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "x" } });
    await user.clear(field);
    await user.type(field, "@ana");
    await user.keyboard("{Enter}");
    fireEvent.change(field, { target: { value: "@AnaX Lima " } });
    expect(screen.getByTestId("value").textContent).toBe("@AnaX Lima ");
  });

  it("closes on Escape and runs / commands with insertText", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn();
    render(<Harness onCommand={onCommand} />);
    const field = screen.getByLabelText("Comment") as HTMLTextAreaElement;
    await user.type(field, "@");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(field, " due /tod");
    await user.keyboard("{Enter}");
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({ id: "today" }));
    expect(field.value).toBe("@ due 2026-10-14");
  });

  it("calls async onSearch with the trigger and query", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn(async (trigger: string, query: string) =>
      trigger === "#" ? [{ id: `t-${query}`, title: `Task ${query}`, type: "tasks" as const }] : []
    );
    render(<Harness onSearch={onSearch} suggestions={undefined} />);
    await user.type(screen.getByLabelText("Comment"), "#re");
    expect(await screen.findByRole("option", { name: "Task re" })).toBeInTheDocument();
    expect(onSearch).toHaveBeenLastCalledWith("#", "re");
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("value").textContent).toBe("#[Task re](tasks:t-re) ");
  });

  it("has no axe violations (closed and open)", async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(<Harness />);
    expect(await axeViolations(container)).toEqual([]);
    await user.type(screen.getByLabelText("Comment"), "@");
    await screen.findByRole("listbox");
    expect(await axeViolations(baseElement)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Backlinks                                                           */
/* ------------------------------------------------------------------ */

describe("Backlinks", () => {
  const items = [
    { id: "1", source: { type: "notes" as const, id: "n1", title: "Weekly review" }, snippet: "Follow up on the Launch plan with Ana." },
    { id: "2", source: { type: "tasks" as const, id: "t1", title: "Draft launch email", status: "done" }, snippet: "Part of launch plan" },
    { id: "3", source: { type: "notes" as const, id: "n2", title: "Ideas" }, snippet: "Nothing relevant" },
  ];

  it("groups by app, counts and highlights matches", () => {
    const { container } = render(<Backlinks items={items} highlight="launch plan" />);
    expect(screen.getByRole("button", { name: "Linked from 3 items" })).toHaveAttribute("aria-expanded", "true");
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Notes(2)", "Tasks(1)"]);
    const marks = [...container.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks).toEqual(["Launch plan", "launch plan"]);
  });

  it("collapses and shows an empty state", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Backlinks items={items} />);
    await user.click(screen.getByRole("button", { name: /Linked from/ }));
    expect(screen.queryByText("Weekly review")).not.toBeInTheDocument();
    rerender(<Backlinks items={[]} defaultOpen />);
    await user.click(screen.getByRole("button", { name: "Linked from 0 items" }));
    expect(screen.getByText("No backlinks yet")).toBeInTheDocument();
  });

  it("calls onSelect from the chip and has no axe violations", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(<Backlinks items={items} highlight="launch" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /Ideas/ }));
    expect(onSelect).toHaveBeenCalledWith(items[2]);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Quick capture                                                       */
/* ------------------------------------------------------------------ */

describe("parseCapture", () => {
  const p = (text: string) => parseCapture(text, NOW);

  it.each([
    ["task: Buy milk", { app: "tasks", title: "Buy milk", explicitApp: true }],
    ["todo: Water plants", { app: "tasks", title: "Water plants" }],
    ["note: Ideas for the trip #travel", { app: "notes", title: "Ideas for the trip", tags: ["travel"] }],
    ["journal: Felt great", { app: "journal", title: "Felt great" }],
    ["expense: Groceries $54.20", { app: "finance", title: "Groceries", amount: 54.2 }],
    ["mail: Reply to Ana", { app: "mail", title: "Reply to Ana" }],
    ["habit: Meditate", { app: "habits", title: "Meditate" }],
    ["event tomorrow 3pm Dentist", { app: "calendar", title: "Dentist", date: "2026-10-15", time: "15:00", explicitApp: true }],
    ["Call mom tomorrow", { app: "tasks", title: "Call mom", date: "2026-10-15", explicitApp: false }],
    ["Lunch with Sam at 12:30", { app: "calendar", title: "Lunch with Sam", date: "2026-10-14", time: "12:30" }],
    ["Party at 7pm", { app: "calendar", title: "Party", time: "19:00" }],
    ["Gym 6:15am", { time: "06:15", title: "Gym" }],
    ["Flight 12am", { time: "00:00" }],
    ["Lunch noon", { time: "12:00", title: "Lunch" }],
    ["Review 12pm", { time: "12:00" }],
    ["Dinner tonight", { date: "2026-10-14", time: "20:00", title: "Dinner" }],
    ["Pay rent !high #home #bills", { title: "Pay rent", priority: "high", tags: ["home", "bills"] }],
    ["Ship release !!", { priority: "high", title: "Ship release" }],
    ["Fix prod !!!", { priority: "urgent" }],
    ["Patch !1", { priority: "urgent" }],
    ["Tidy desk !low", { priority: "low" }],
    ["Read paper !m", { priority: "medium" }],
    ["Review PR fri", { date: "2026-10-16", title: "Review PR" }],
    ["Plan sprint on monday", { date: "2026-10-19", title: "Plan sprint" }],
    ["Standup wed", { date: "2026-10-14" }],
    ["Retro next fri", { date: "2026-10-23", title: "Retro" }],
    ["Quarterly plan next week", { date: "2026-10-19", title: "Quarterly plan" }],
    ["Budget next month", { date: "2026-11-01" }],
    ["Hike this weekend", { date: "2026-10-17", title: "Hike" }],
    ["Renew passport in 3 days", { date: "2026-10-17", title: "Renew passport" }],
    ["Dentist in 2 weeks", { date: "2026-10-28" }],
    ["Mom's birthday oct 20", { date: "2026-10-20", title: "Mom's birthday" }],
    ["New year plan jan 5", { date: "2027-01-05" }],
    ["Taxes 5th march", { date: "2027-03-05", title: "Taxes" }],
    ["2026-11-02 Dentist", { date: "2026-11-02", title: "Dentist" }],
    ["Pay rent due tomorrow", { title: "Pay rent", date: "2026-10-15" }],
    ["Coffee $4.50", { app: "finance", amount: 4.5, title: "Coffee" }],
    ["Email #a #b #a", { tags: ["a", "b"], title: "Email" }],
    ["Read #book/sci-fi", { tags: ["book/sci-fi"] }],
    ["event tomorrow 3pm Dentist #health !high", { app: "calendar", title: "Dentist", tags: ["health"], priority: "high" }],
  ])("%s", (text, expected) => {
    expect(p(text)).toMatchObject(expected);
  });

  it("returns a bare result for plain text and empty input", () => {
    expect(p("Random thought")).toEqual({ app: "tasks", title: "Random thought", tags: [], explicitApp: false });
    expect(p("")).toEqual({ app: "tasks", title: "", tags: [], explicitApp: false });
  });

  it("honours defaultApp and does not treat words or emails as tags/times", () => {
    expect(parseCapture("Random thought", NOW, { defaultApp: "notes" }).app).toBe("notes");
    const r = p("Email ana@example.com about issue#12 and 3 apples");
    expect(r).toMatchObject({ tags: [], title: "Email ana@example.com about issue#12 and 3 apples" });
    expect(r.time).toBeUndefined();
    expect(r.date).toBeUndefined();
  });
});

describe("QuickCapture", () => {
  it("shows a live preview and submits the parsed capture on Enter", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();
    render(<QuickCapture variant="inline" now={NOW} onCapture={onCapture} />);
    const input = screen.getByLabelText("Quick capture");
    await user.type(input, "event tomorrow 3pm Dentist #health !high");
    expect(screen.getByText("New in Calendar:")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("health")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(onCapture).toHaveBeenCalledWith({
      app: "calendar",
      title: "Dentist",
      date: "2026-10-15",
      time: "15:00",
      priority: "high",
      tags: ["health"],
      raw: "event tomorrow 3pm Dentist #health !high",
    });
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("cycles the target app with Alt+Down / Alt+Up and ignores empty submits", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();
    render(<QuickCapture variant="inline" now={NOW} onCapture={onCapture} />);
    const input = screen.getByLabelText("Quick capture");
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(onCapture).not.toHaveBeenCalled();
    await user.type(input, "Buy milk");
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-pressed", "true");
    expect(input).toHaveFocus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}{Alt>}{ArrowUp}{/Alt}");
    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ app: "notes", title: "Buy milk" }));
  });

  it("opens the dialog with mod+shift+space and closes after saving", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();
    render(
      <ShortcutProvider platform="other">
        <QuickCapture now={NOW} onCapture={onCapture} />
      </ShortcutProvider>
    );
    fireEvent.keyDown(document.body, { key: " ", ctrlKey: true, shiftKey: true });
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Quick capture"), "note: Idea{Enter}");
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ app: "notes", title: "Idea" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("has no axe violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<QuickCapture variant="inline" now={NOW} />);
    await user.type(screen.getByLabelText("Quick capture"), "task: Plan tomorrow #work");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

describe("layoutTimeline", () => {
  const ev = (id: string, s: Date, e?: Date, extra: Partial<TimelineItem> = {}): TimelineItem => ({
    id,
    app: "calendar",
    title: id,
    start: s,
    end: e,
    ...extra,
  });
  const cols = (items: TimelineItem[]) =>
    Object.fromEntries(layoutTimeline(items).timed.map((t) => [t.item.id, [t.column, t.columns]]));

  it("separates untimed and all-day items", () => {
    const { untimed, timed } = layoutTimeline([
      ev("a", at(9)),
      { id: "b", app: "tasks", title: "No time" },
      ev("c", at(0), undefined, { allDay: true }),
    ]);
    expect(untimed.map((i) => i.id)).toEqual(["b", "c"]);
    expect(timed.map((t) => t.item.id)).toEqual(["a"]);
  });

  it("defaults missing or invalid ends to 30 minutes", () => {
    const { timed } = layoutTimeline([ev("a", at(9)), ev("b", at(11), at(10))]);
    expect(timed[0].end).toEqual(at(9, 30));
    expect(timed[1].end).toEqual(at(11, 30));
  });

  it("puts non-overlapping items in a single column", () => {
    expect(cols([ev("a", at(9), at(10)), ev("b", at(10), at(11))])).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it("lays overlapping items side by side, per cluster", () => {
    expect(cols([ev("b", at(9, 30), at(10, 30)), ev("a", at(9), at(10)), ev("c", at(10, 30), at(11))])).toEqual({
      a: [0, 2],
      b: [1, 2],
      c: [0, 1],
    });
  });

  it("reuses freed columns inside a cluster", () => {
    expect(cols([ev("a", at(9), at(11)), ev("b", at(9, 30), at(10)), ev("c", at(10), at(10, 30))])).toEqual({
      a: [0, 2],
      b: [1, 2],
      c: [1, 2],
    });
  });

  it("handles three-way overlap and sorts by start", () => {
    const { timed } = layoutTimeline([ev("c", at(9, 20), at(10)), ev("a", at(9), at(10)), ev("b", at(9, 10), at(10))]);
    expect(timed.map((t) => [t.item.id, t.column, t.columns])).toEqual([
      ["a", 0, 3],
      ["b", 1, 3],
      ["c", 2, 3],
    ]);
  });
});

describe("TodayTimeline", () => {
  const items: TimelineItem[] = [
    { id: "1", app: "calendar", title: "Standup", start: at(9), end: at(9, 30) },
    { id: "2", app: "calendar", title: "Design review", start: at(9, 15), end: at(10) },
    { id: "3", app: "tasks", title: "Send invoice", start: at(11) },
    { id: "4", app: "habits", title: "Meditate", streak: 12, done: true },
    { id: "5", app: "tasks", title: "Inbox zero" },
  ];

  it("renders sections, now line, streaks and toggles tasks", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TodayTimeline items={items} now={NOW} onToggle={onToggle} title="Today" />);
    expect(within(screen.getByRole("region", { name: "All day" })).getByText("Inbox zero")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Schedule" })).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByTestId("timeline-now")).toBeInTheDocument();
    expect(screen.getByText("day streak", { exact: false })).toBeInTheDocument();
    const standup = screen.getByText("Standup").closest("li")!;
    expect(standup).toHaveAttribute("data-columns", "2");
    await user.click(screen.getByRole("checkbox", { name: /Send invoice/ }));
    expect(onToggle).toHaveBeenCalledWith(items[2], true);
    await user.click(screen.getByRole("checkbox", { name: /Meditate/ }));
    expect(onToggle).toHaveBeenLastCalledWith(items[3], false);
  });

  it("hides the now line outside the rail and shows an empty state", () => {
    const { rerender } = render(<TodayTimeline items={items} now={at(23, 30)} />);
    expect(screen.queryByTestId("timeline-now")).not.toBeInTheDocument();
    rerender(<TodayTimeline items={[]} now={NOW} />);
    expect(screen.getByText("Nothing planned today")).toBeInTheDocument();
  });

  it("updates the now line every minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(9, 0));
    try {
      render(<TodayTimeline items={items} density="compact" />);
      const line = screen.getByTestId("timeline-now");
      const before = line.style.top;
      React.act(() => {
        vi.setSystemTime(at(9, 30));
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.getByTestId("timeline-now").style.top).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it("has no axe violations", async () => {
    const { container } = render(<TodayTimeline items={items} now={NOW} onToggle={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

describe("formatRelativeTime", () => {
  const n = NOW.getTime();
  it.each([
    [n - 10_000, "just now"],
    [n - 5 * 60_000, "5 min ago"],
    [n - 2 * 3_600_000, "2 h ago"],
    [n - 26 * 3_600_000, "yesterday"],
    [n - 4 * 86_400_000, "4 days ago"],
  ])("%s → %s", (t, expected) => {
    expect(formatRelativeTime(t, n)).toBe(expected);
  });
});

describe("SyncStatus", () => {
  it.each<[SyncState, string]>([
    ["synced", "Synced"],
    ["syncing", "Syncing…"],
    ["offline", "Offline"],
    ["error", "Sync failed"],
    ["conflict", "Conflict"],
  ])("labels %s", (status, label) => {
    render(<SyncStatus status={status} />);
    expect(screen.getByRole("status")).toHaveTextContent(label);
    expect(screen.getByRole("button")).toHaveAttribute("data-status", status);
  });

  it("describes details when icon-only and wires retry / resolve", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onResolve = vi.fn();
    const { rerender } = render(
      <SyncStatus status="synced" showLabel={false} lastSyncedAt={NOW.getTime() - 5 * 60_000} now={NOW} />
    );
    expect(screen.getByRole("button", { name: "Synced. All changes saved" })).toHaveAccessibleDescription("Last synced 5 min ago");
    rerender(<SyncStatus status="error" onRetry={onRetry} onResolve={onResolve} />);
    await user.click(screen.getByRole("button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<SyncStatus status="conflict" onRetry={onRetry} onResolve={onResolve} />);
    await user.click(screen.getByRole("button"));
    expect(onResolve).toHaveBeenCalledTimes(1);
    rerender(<SyncStatus status="offline" pendingChanges={3} />);
    expect(screen.getByRole("button")).toHaveTextContent("3");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <SyncStatus status="syncing" pendingChanges={2} />
        <SyncStatus status="synced" showLabel={false} />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("OfflineBanner", () => {
  it("renders only while offline and can be dismissed", async () => {
    const user = userEvent.setup();
    const { rerender, container } = render(<OfflineBanner offline={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<OfflineBanner offline pendingChanges={2} dismissible />);
    expect(screen.getByRole("status")).toHaveTextContent("You’re offline.");
    expect(screen.getByRole("status")).toHaveTextContent("2 pending changes");
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ConflictResolver", () => {
  it("shows both versions with changed lines and resolves", async () => {
    const user = userEvent.setup();
    const onKeepMine = vi.fn();
    const onKeepTheirs = vi.fn();
    const onMerge = vi.fn();
    const { baseElement } = render(
      <ConflictResolver
        defaultOpen
        now={NOW}
        yours={{ content: "Buy milk\nBuy eggs", source: "This Mac", updatedAt: NOW.getTime() - 60_000 }}
        theirs={{ content: "Buy milk\nBuy bread", source: "iPhone", updatedAt: NOW.getTime() - 120_000 }}
        onKeepMine={onKeepMine}
        onKeepTheirs={onKeepTheirs}
        onMerge={onMerge}
      />
    );
    const dialog = await screen.findByRole("dialog");
    const yours = within(dialog).getByRole("region", { name: "Yours" });
    expect(yours).toHaveTextContent("This Mac · 1 min ago");
    expect(within(yours).getByText("Buy eggs")).toHaveClass("bg-primary-soft");
    expect(within(yours).getByText("Buy milk")).not.toHaveClass("bg-primary-soft");
    expect(within(dialog).getByRole("region", { name: "Theirs" })).toHaveTextContent("Buy bread");
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Keep mine" }));
    expect(onKeepMine).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
