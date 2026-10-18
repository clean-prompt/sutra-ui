import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { isValidDate, safeISO, toValidDate } from "../src/lib/date";
import { MessageComposer, MessageList, groupMessages, type MessengerMessage } from "../src/kits/social/messenger";
import { JsonViewer, safeJsonStringify } from "../src/patterns/json-viewer";
import { CreditBalanceCard, CurrentPlanCard, projectRunOut } from "../src/kits/billing/billing";
import { CommentThread } from "../src/patterns/comments";
import { ActivityFeed } from "../src/kits/identity/connected-apps";
import { AlertGroup } from "../src/kits/ops/alert-group";
import { BrowserConsole } from "../src/kits/agent/agent-browser";
import { BlogPostHeader } from "../src/patterns/blog-content";
import { RequestInspector, RequestLogTable, type RequestLogRecord } from "../src/kits/ops/request-inspector";
import { WebhookRouteEditor } from "../src/kits/agent-admin/webhooks";
import { KanbanCard, isKanbanOverdue } from "../src/kits/workspace/kanban";
import { AppLauncher, type AppLauncherItem } from "../src/kits/workspace/app-launcher";
import { ChatListItem } from "../src/kits/ai/chat-list-view";
import { MentionInput } from "../src/kits/workspace/entity-mention";
import { CoachmarkTour, type CoachmarkStep } from "../src/patterns/coachmarks";
import { SearchInput } from "../src/primitives/input";
import { ContextMenuItem } from "../src/primitives/context-menu";

const BAD = "not a date";
const IME = { isComposing: true, keyCode: 229 };

/* ------------------------------------------------------------------ */
/* lib/date                                                            */
/* ------------------------------------------------------------------ */

describe("lib/date", () => {
  it("parses YYYY-MM-DD as a local calendar date", () => {
    const d = toValidDate("2026-10-18")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 18]);
    expect(d.getHours()).toBe(0);
  });

  it("returns undefined for bad input instead of throwing", () => {
    expect(toValidDate(BAD)).toBeUndefined();
    expect(toValidDate(new Date(NaN))).toBeUndefined();
    expect(toValidDate("2024-02-31")).toBeUndefined();
    expect(toValidDate(null)).toBeUndefined();
    expect(safeISO(BAD)).toBeUndefined();
    expect(safeISO(8.64e15 + 1)).toBeUndefined();
    expect(safeISO(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(isValidDate(new Date())).toBe(true);
    expect(isValidDate(new Date(NaN))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Bad timestamps render a fallback instead of crashing                */
/* ------------------------------------------------------------------ */

describe("invalid timestamps don't crash", () => {
  it("MessageList renders with a bad createdAt and emits no NaN day label", () => {
    const now = new Date(2026, 9, 18, 12);
    const messages: MessengerMessage[] = [
      { id: "1", senderId: "ana", text: "hello", createdAt: new Date(2026, 9, 18, 9) },
      { id: "2", senderId: "ana", text: "broken", createdAt: BAD },
    ];
    const entries = groupMessages(messages, { now });
    expect(entries.filter((e) => e.type === "date").map((e) => (e as { label: string }).label)).toEqual(["Today"]);
    const { container } = render(<MessageList messages={messages} currentUserId="me" now={now} />);
    expect(screen.getByText("broken")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined|Invalid Date/);
  });

  it("JsonViewer renders an invalid Date; safeJsonStringify survives a self-referencing Map/Set", () => {
    render(<JsonViewer data={{ when: new Date(NaN) }} defaultExpandDepth={2} />);
    expect(screen.getByText('"Invalid Date"')).toBeInTheDocument();
    const m = new Map<string, unknown>();
    m.set("self", m);
    expect(safeJsonStringify(m, 0)).toBe('{"self":"[Circular]"}');
    const s = new Set<unknown>();
    s.add(s);
    expect(safeJsonStringify(s, 0)).toBe('["[Circular]"]');
    const shared = new Map([["a", 1]]);
    expect(safeJsonStringify({ x: shared, y: shared }, 0)).toBe('{"x":{"a":1},"y":{"a":1}}');
  });

  it("projectRunOut returns null past the max Date and CreditBalanceCard renders", () => {
    expect(projectRunOut(1e12, 1e-12)).toBeNull();
    render(<CreditBalanceCard balance={1e12} dailyBurn={1e-12} />);
    expect(document.querySelector("[data-slot='run-out']")).toHaveTextContent("Not projected");
  });

  it("CreditBalanceCard formats the run-out day in local time", () => {
    render(<CreditBalanceCard balance={300} dailyBurn={100} now={new Date(2026, 9, 18, 8)} />);
    expect(document.querySelector("[data-slot='run-out']")).toHaveTextContent("Oct 21, 2026");
  });

  it("CurrentPlanCard renders an unparseable renewsAt", () => {
    render(<CurrentPlanCard planName="Pro" price={2000} renewsAt={BAD} />);
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    const time = document.querySelector("time")!;
    expect(time).not.toHaveAttribute("datetime");
    expect(time).toHaveTextContent("—");
  });

  it("CommentThread renders a bad createdAt", () => {
    render(
      <CommentThread
        thread={{ id: "t1", comments: [{ id: "c1", author: { id: "u1", name: "Ana" }, body: "Looks good", createdAt: BAD }] }}
      />
    );
    expect(screen.getByText("Looks good")).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveTextContent("—");
  });

  it("ActivityFeed renders a bad event time", () => {
    render(<ActivityFeed events={[{ id: "e1", type: "sign_in", description: "Signed in", at: BAD }]} now={Date.now()} />);
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(document.querySelector("time")).not.toHaveAttribute("datetime");
  });

  it("AlertGroup omits the time for a bad alert time", () => {
    render(<AlertGroup alerts={[{ id: "a1", severity: "warning", message: "Disk full", time: BAD }]} />);
    expect(screen.getByText("Disk full")).toBeInTheDocument();
    expect(document.querySelector("time")).toBeNull();
  });

  it("BrowserConsole shows local time and skips invalid timestamps", () => {
    const ts = new Date(2026, 9, 18, 9, 5, 7);
    render(
      <BrowserConsole
        defaultOpen
        entries={[
          { id: 1, level: "log", message: "ok", ts },
          { id: 2, level: "log", message: "bad", ts: NaN },
        ]}
      />
    );
    expect(screen.getByText("09:05:07")).toBeInTheDocument();
    expect(screen.getByText("bad")).toBeInTheDocument();
  });

  it("BlogPostHeader renders an invalid Date and shows date-only strings on their own day", () => {
    const { rerender } = render(<BlogPostHeader title="Post" date={new Date(NaN)} />);
    expect(document.querySelector("time")).not.toHaveAttribute("datetime");
    rerender(<BlogPostHeader title="Post" date="2024-03-15" />);
    const expected = new Date(2024, 2, 15).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    expect(document.querySelector("time")).toHaveTextContent(expected);
    expect(document.querySelector("time")).toHaveAttribute("datetime", "2024-03-15");
  });

  it("RequestInspector and RequestLogTable render a bad timestamp", () => {
    const record: RequestLogRecord = { id: "r1", timestamp: BAD, status: 200, latencyMs: 10 };
    const { unmount } = render(<RequestInspector record={record} />);
    expect(document.querySelector("time")).toHaveTextContent("—");
    unmount();
    render(<RequestLogTable records={[record]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("WebhookRouteEditor renders a delivery with a bad time", () => {
    render(
      <WebhookRouteEditor
        events={["push"]}
        route={{
          id: "w1",
          name: "Hook",
          url: "https://hooks.example.com/w/1",
          events: ["push"],
          delivery: { platform: "local" },
          enabled: true,
          deliveries: [{ id: "d1", event: "push", statusCode: 200, at: BAD }],
        }}
      />
    );
    const list = screen.getByRole("list", { name: "Recent deliveries" });
    expect(list.querySelector("time")).not.toHaveAttribute("datetime");
  });

  it("KanbanCard renders a bad due date", () => {
    render(<KanbanCard card={{ id: "k1", title: "Task", columnId: "todo", dueDate: BAD }} />);
    expect(screen.getByText("Task")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Date-only strings stay on their day                                 */
/* ------------------------------------------------------------------ */

describe("kanban due dates", () => {
  it("is not overdue on its due day", () => {
    const card = { dueDate: "2026-10-18" };
    expect(isKanbanOverdue(card, new Date(2026, 9, 18, 0, 30))).toBe(false);
    expect(isKanbanOverdue(card, new Date(2026, 9, 18, 23, 30))).toBe(false);
    expect(isKanbanOverdue(card, new Date(2026, 9, 19, 0, 30))).toBe(true);
    expect(isKanbanOverdue({ dueDate: BAD }, Date.now())).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* IME composition                                                     */
/* ------------------------------------------------------------------ */

const apps: AppLauncherItem[] = [
  { id: "notes", label: "Notes", app: "notes" },
  { id: "tasks", label: "Tasks", app: "tasks" },
  { id: "calendar", label: "Calendar", app: "calendar" },
  { id: "mail", label: "Mail", app: "mail" },
  { id: "files", label: "Files", app: "files" },
];

describe("IME Enter is ignored", () => {
  it("AppLauncher search", () => {
    const onSelect = vi.fn();
    render(<AppLauncher items={apps} searchable onSelect={onSelect} />);
    const search = screen.getByLabelText("Search apps");
    fireEvent.keyDown(search, { key: "Enter", ...IME });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("ChatListItem rename", () => {
    const onRename = vi.fn();
    render(
      <ul>
        <ChatListItem title="Old" onRename={onRename} />
      </ul>
    );
    fireEvent.click(screen.getByRole("button", { name: /rename/i }));
    const input = screen.getByLabelText("Conversation title");
    fireEvent.change(input, { target: { value: "새 제목" } });
    fireEvent.keyDown(input, { key: "Enter", ...IME });
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Conversation title")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("새 제목");
  });

  it("MentionInput doesn't pick a suggestion mid-composition", () => {
    function Harness() {
      const [value, setValue] = React.useState("");
      return (
        <>
          <MentionInput
            aria-label="Comment"
            value={value}
            onValueChange={setValue}
            suggestions={{ "@": [{ id: "u1", title: "Ana Lima", type: "person" }] }}
          />
          <output data-testid="value">{value}</output>
        </>
      );
    }
    render(<Harness />);
    const field = screen.getByLabelText("Comment");
    fireEvent.change(field, { target: { value: "@a" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(field, { key: "Enter", ...IME });
    fireEvent.keyDown(field, { key: "Tab", ...IME });
    expect(screen.getByTestId("value")).toHaveTextContent(/^@a$/);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(screen.getByTestId("value")).not.toHaveTextContent(/^@a$/);
  });

  it("MentionInput doesn't re-run the search when inline props change", () => {
    const onSearch = vi.fn((_trigger: string, _query: string) => [{ id: "u1", title: "Ana Lima", type: "person" as const }]);
    function Harness() {
      const [value, setValue] = React.useState("");
      const [, force] = React.useState(0);
      return (
        <>
          <MentionInput aria-label="Comment" value={value} onValueChange={setValue} onSearch={(t, q) => onSearch(t, q)} />
          <button type="button" onClick={() => force((n) => n + 1)}>
            rerender
          </button>
        </>
      );
    }
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Comment"), { target: { value: "@a" } });
    const calls = onSearch.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "rerender" }));
    fireEvent.click(screen.getByRole("button", { name: "rerender" }));
    expect(onSearch.mock.calls.length).toBe(calls);
  });

  it("MessageComposer", () => {
    const onSend = vi.fn();
    render(<MessageComposer onSend={onSend} emoji={false} />);
    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: "안녕" } });
    fireEvent.keyDown(field, { key: "Enter", keyCode: 229 });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("안녕");
  });
});

/* ------------------------------------------------------------------ */
/* Keyboard handlers that overreach                                    */
/* ------------------------------------------------------------------ */

describe("AppLauncher context menu keys", () => {
  it("arrow keys inside a tile's context menu don't move grid focus", async () => {
    render(
      <AppLauncher
        items={apps}
        columns={2}
        renderMenu={(item) => (
          <>
            <ContextMenuItem>Open {item.label}</ContextMenuItem>
            <ContextMenuItem>Remove {item.label}</ContextMenuItem>
          </>
        )}
      />
    );
    const notes = screen.getByRole("button", { name: "Notes" });
    notes.focus();
    fireEvent.contextMenu(notes);
    const item = await screen.findByRole("menuitem", { name: "Open Notes" });
    act(() => item.focus());
    for (const key of ["ArrowDown", "End"]) {
      fireEvent.keyDown(item, { key });
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(notes).toHaveAttribute("tabindex", "0");
      expect(document.querySelector("[data-launcher-tile='calendar']")).toHaveAttribute("tabindex", "-1");
      expect(document.querySelector("[data-launcher-tile='files']")).toHaveAttribute("tabindex", "-1");
    }
  });
});

describe("CoachmarkTour in text fields", () => {
  it("arrow keys in an input don't change the step", () => {
    const steps: CoachmarkStep[] = [
      { target: "#tour-a", title: "Search", body: "Find anything." },
      { target: "#tour-b", title: "Create" },
    ];
    render(
      <div>
        <input id="tour-a" aria-label="Search" />
        <button id="tour-b">Create</button>
        <CoachmarkTour defaultOpen steps={steps} />
      </div>
    );
    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    const input = document.getElementById("tour-a")!;
    input.focus();
    const right = fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(right).toBe(true); // not prevented: the caret can move
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Create" })).toBeInTheDocument();
  });
});

describe("SearchInput hotkey", () => {
  it('lets you type "/" in the field when hotkey is "/"', () => {
    render(
      <>
        <SearchInput hotkey="/" aria-label="Search files" />
        <button type="button">elsewhere</button>
      </>
    );
    const input = screen.getByLabelText("Search files");
    const outside = screen.getByRole("button", { name: "elsewhere" });
    outside.focus();
    expect(fireEvent.keyDown(outside, { key: "/" })).toBe(false);
    expect(input).toHaveFocus();
    expect(fireEvent.keyDown(input, { key: "/" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "/", ...IME })).toBe(true);
  });
});
