import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineEditText } from "../src/primitives/inline-edit-text";
import {
  ConversationList,
  ConversationRow,
  groupConversationsByDate,
  type ConversationListItem,
} from "../src/kits/ai/conversation-list";
import { ChatListView, groupChatsByDate } from "../src/kits/ai/chat-list-view";
import { ConversationSidebarList } from "../src/kits/ai/conversation-sidebar";
import { AgentStatusDot } from "../src/kits/agent/agent-sessions";
import { detectSlashTrigger } from "../src/kits/ai/slash-menu";
import { MentionInput } from "../src/kits/workspace/entity-mention";
import { axeViolations } from "./helpers/a11y";

const IME = { isComposing: true, keyCode: 229 };

/* ------------------------------------------------------------------ */
/* InlineEditText                                                      */
/* ------------------------------------------------------------------ */

describe("InlineEditText", () => {
  it("focuses and selects on mount, commits the trimmed value on Enter", () => {
    const onCommit = vi.fn();
    render(<InlineEditText defaultValue="Old title" label="Title" onCommit={onCommit} />);
    const input = screen.getByRole("textbox", { name: "Title" }) as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("Old title".length);
    fireEvent.change(input, { target: { value: "  New title  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith("New title");
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("cancels on Escape, and treats empty or unchanged text as a cancel", () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const { unmount } = render(<InlineEditText defaultValue="Same" onCommit={onCommit} onCancel={onCancel} />);
    const input = screen.getByRole("textbox", { name: "Edit text" });
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("Same");
    unmount();

    render(<InlineEditText defaultValue="Same" onCommit={onCommit} onCancel={onCancel} />);
    const again = screen.getByRole("textbox");
    fireEvent.change(again, { target: { value: "   " } });
    fireEvent.blur(again);
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("commits on blur, works controlled, ignores IME Enter and keeps keys from reaching the row", () => {
    const onCommit = vi.fn();
    const onRowKey = vi.fn();
    function Harness() {
      const [value, setValue] = React.useState("a");
      return (
        <div onKeyDown={onRowKey}>
          <InlineEditText aria-label="Name" value={value} onValueChange={setValue} onCommit={onCommit} />
          <output data-testid="v">{value}</output>
        </div>
      );
    }
    render(<Harness />);
    const input = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(input, { target: { value: "가나" } });
    expect(screen.getByTestId("v")).toHaveTextContent("가나");
    fireEvent.keyDown(input, { key: "Enter", ...IME });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onRowKey).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith("가나");
  });
});

/* ------------------------------------------------------------------ */
/* ConversationList                                                    */
/* ------------------------------------------------------------------ */

const NOW = new Date(2026, 9, 18, 12, 0, 0);
const items: ConversationListItem[] = [
  { id: "a", title: "Trip plan", pinned: true, updatedAt: new Date(2026, 9, 1) },
  { id: "b", title: "Rust lifetimes", folderId: "work", updatedAt: new Date(2026, 9, 18, 9) },
  { id: "c", title: "Recipe ideas", updatedAt: new Date(2026, 9, 17, 9) },
  { id: "d", title: "Old thing", archived: true, updatedAt: new Date(2026, 9, 18, 10) },
];
const folders = [
  { id: "work", name: "Work" },
  { id: "home", name: "Home" },
];

describe("ConversationList", () => {
  it("groups by date with an archived section and menu row actions", async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const { container } = render(
      <ConversationList items={items} folders={folders} now={NOW} rowActions="menu" onArchive={onArchive} onPin={() => {}} />
    );
    const nav = screen.getByRole("navigation", { name: "Conversations" });
    expect(within(nav).getAllByRole("heading").map((h) => h.textContent)).toEqual(["Pinned", "Today", "Yesterday"]);
    expect(screen.queryByText("Old thing")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Archived/ }));
    expect(screen.getByText("Old thing")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions for Old thing" }));
    await user.click(await screen.findByRole("menuitem", { name: "Unarchive" }));
    expect(onArchive).toHaveBeenCalledWith("d", false);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("groups by folder, searches and opens matching folders", async () => {
    const user = userEvent.setup();
    render(
      <ConversationList items={items} folders={folders} groupBy="folder" searchable defaultExpandedFolders={[]} />
    );
    expect(screen.queryByText("Rust lifetimes")).toBeNull();
    await user.type(screen.getByRole("searchbox", { name: "Search conversations" }), "rust");
    expect(screen.getByText("Rust lifetimes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Home/ })).toBeNull();
    expect(screen.queryByText("Recipe ideas")).toBeNull();
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No matching chats")).toBeInTheDocument();
  });

  it("renders a flat list with pin icons for groupBy none, and names its landmark", () => {
    render(
      <>
        <ConversationList items={items} groupBy="none" archivedSection={false} aria-label="Recent chats" />
        <ChatListView items={[]} aria-label="All chats" />
        <ConversationSidebarList conversations={[]} aria-label="Folders" />
      </>
    );
    const nav = screen.getByRole("navigation", { name: "Recent chats" });
    expect(within(nav).queryByRole("heading")).toBeNull();
    expect(within(nav).getAllByRole("listitem")).toHaveLength(4);
    expect(within(nav).getByRole("button", { name: "Trip plan" }).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "All chats" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Folders" })).toBeInTheDocument();
  });

  it("renames inline from a double click in either row mode", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<ConversationList items={items} now={NOW} rowActions="menu" onRename={onRename} />);
    await user.dblClick(screen.getByRole("button", { name: "Recipe ideas" }));
    const input = screen.getByRole("textbox", { name: "Conversation title" });
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "Dinner{Enter}");
    expect(onRename).toHaveBeenCalledWith("c", "Dinner");
  });

  it("groupChatsByDate stays an alias of groupConversationsByDate", () => {
    const dated = items.filter((i) => !i.archived) as Array<ConversationListItem & { updatedAt: Date }>;
    expect(groupChatsByDate(dated, NOW)).toEqual(groupConversationsByDate(dated, NOW));
    const undated: ConversationListItem[] = [{ id: "x", title: "x" }];
    expect(groupConversationsByDate(undated, NOW).map((g) => g.key)).toEqual(["older"]);
  });
});

describe("ConversationRow", () => {
  it("hides the menu trigger when there are no menu actions", () => {
    render(
      <ul>
        <ConversationRow title="Plain" rowActions="menu" />
      </ul>
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("moves to a folder from the menu", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(
      <ul>
        <ConversationRow title="Row" rowActions="menu" folders={folders} folderId="work" onMove={onMove} />
      </ul>
    );
    await user.click(screen.getByRole("button", { name: "Actions for Row" }));
    await user.click(await screen.findByRole("menuitem", { name: "Move to" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Remove from folder" }));
    expect(onMove).toHaveBeenCalledWith(null);
  });
});

/* ------------------------------------------------------------------ */
/* AgentStatusDot over StatusDot                                       */
/* ------------------------------------------------------------------ */

describe("AgentStatusDot", () => {
  it("keeps data-status, pulses running / waiting and hides when decorative", async () => {
    const { container } = render(
      <div>
        <AgentStatusDot status="running" />
        <AgentStatusDot status="idle" />
        <AgentStatusDot status="failed" decorative />
      </div>
    );
    const running = screen.getByRole("img", { name: "Running" });
    expect(running).toHaveAttribute("data-status", "running");
    expect(running.children).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Idle" }).children).toHaveLength(1);
    const failed = container.querySelector('[data-status="failed"]')!;
    expect(failed).toHaveAttribute("aria-hidden", "true");
    expect(failed).not.toHaveAttribute("role");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* MentionInput on detectSlashTrigger                                  */
/* ------------------------------------------------------------------ */

describe("MentionInput trigger detection", () => {
  it("detectSlashTrigger can allow triggers inside the query", () => {
    expect(detectSlashTrigger("#notes/2024", 11, ["#", "/"])).toBeNull();
    expect(detectSlashTrigger("#notes/2024", 11, ["#", "/"], { allowTriggerInQuery: true })).toEqual({
      trigger: "#",
      query: "notes/2024",
      start: 0,
      end: 11,
    });
  });

  it("searches with the trigger and query, mid-sentence only at a word start", () => {
    const onSearch = vi.fn((_t: string, _q: string) => []);
    function Harness() {
      const [value, setValue] = React.useState("");
      return <MentionInput aria-label="Comment" value={value} onValueChange={setValue} onSearch={(t, q) => onSearch(t, q)} />;
    }
    render(<Harness />);
    const field = screen.getByLabelText("Comment");
    fireEvent.change(field, { target: { value: "mail a@b" } });
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "see #notes/2024" } });
    expect(onSearch).toHaveBeenLastCalledWith("#", "notes/2024");
  });
});
