import * as React from "react";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { AppLauncher, filterLauncherItems, type AppLauncherItem } from "../src/kits/workspace/app-launcher";
import { IdentityMark, TextButton, identitySegments } from "../src/patterns/identity-mark";
import { InstallButton, useInstallPrompt } from "../src/kits/workspace/install-prompt";
import { CallScreen, IncomingCall, formatCallDuration } from "../src/kits/social/call-overlay";
import {
  ChatHeader,
  GroupInfoPanel,
  MessageBubble,
  MessageComposer,
  MessageList,
  formatLastSeen,
  formatMessageDay,
  groupMessages,
  type MessengerMessage,
} from "../src/kits/social/messenger";
import { Checklist, ReorderableList, reorderArray, reorderBy, useReorder, type ChecklistEntry } from "../src/patterns/reorderable-list";
import { Countdown, Stopwatch, TallyCounter, formatCompactDuration, splitDuration, useStopwatch } from "../src/patterns/counters";
import { RecurrencePicker, StatusCycle, describeRecurrence, toRRule, type StatusCycleOption } from "../src/patterns/status-cycle";
import { axeViolations } from "./a11y";

/* ------------------------------------------------------------------ */
/* AppLauncher                                                         */
/* ------------------------------------------------------------------ */

const apps: AppLauncherItem[] = [
  { id: "notes", label: "Notes", app: "notes", badge: 3 },
  { id: "tasks", label: "Tasks", app: "tasks" },
  { id: "calendar", label: "Calendar", app: "calendar" },
  { id: "mail", label: "Mail", app: "mail", keywords: ["inbox"] },
  { id: "files", label: "Files", app: "files" },
  { id: "journal", label: "Journal", app: "journal" },
  { id: "finance", label: "Finance", app: "finance" },
  { id: "habits", label: "Habits", app: "habits" },
];

describe("AppLauncher", () => {
  it("navigates the grid with arrow keys using a roving tabindex", () => {
    render(<AppLauncher items={apps} columns={4} />);
    const notes = screen.getByRole("button", { name: "Notes, 3 new" });
    expect(notes).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("tabindex", "-1");
    notes.focus();
    fireEvent.keyDown(notes, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Journal" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Journal" })).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Journal" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("button", { name: "Habits" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(notes).toHaveFocus();
    expect(screen.getByRole("button", { name: "Mail" })).toHaveAttribute("data-app", "mail");
  });

  it("filters by label and keywords, and selects", () => {
    const onSelect = vi.fn();
    render(<AppLauncher items={apps} searchable onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText("Search apps"), { target: { value: "inbox" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Mail" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "mail" }));
    fireEvent.change(screen.getByLabelText("Search apps"), { target: { value: "zzz" } });
    expect(screen.getByText(/No apps match/)).toBeInTheDocument();
    expect(filterLauncherItems(apps, "FIN").map((a) => a.id)).toEqual(["finance"]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<AppLauncher items={apps} searchable />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* IdentityMark                                                        */
/* ------------------------------------------------------------------ */

describe("identitySegments / IdentityMark", () => {
  it("is deterministic and lights exactly 5 distinct ticks of 12", () => {
    for (const seed of ["user:alice", "user:bob", "node:gpu", "app:notes", ""]) {
      const a = identitySegments(seed);
      expect(a).toEqual(identitySegments(seed));
      expect(a).toHaveLength(5);
      expect(new Set(a).size).toBe(5);
      expect(a.every((i) => i >= 0 && i < 12)).toBe(true);
      expect([...a].sort((x, y) => x - y)).toEqual(a);
    }
    const patterns = new Set(["a", "b", "c", "d", "e", "f"].map((s) => identitySegments(`user:${s}`).join()));
    expect(patterns.size).toBeGreaterThan(3);
  });

  it("renders lit ticks and state rings", () => {
    const { rerender, container } = render(<IdentityMark seed="user:alice" state="live" />);
    const mark = screen.getByRole("img", { name: "user:alice, live" });
    expect(mark).toHaveAttribute("data-state", "live");
    expect(container.querySelectorAll("line[data-lit]")).toHaveLength(5);
    expect(container.querySelector('[data-slot="pulse"]')).toBeInTheDocument();
    expect(mark).toHaveTextContent("A");
    rerender(<IdentityMark seed="user:alice" state="busy" label="Alice" />);
    expect(screen.getByRole("img", { name: "Alice, busy" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="pulse"]')).toBeNull();
    expect(container.querySelector('[data-slot="state-ring"]')).toBeInTheDocument();
    rerender(<IdentityMark seed="user:alice" />);
    expect(container.querySelector('[data-slot="state-ring"]')).toBeNull();
    rerender(<IdentityMark seed="user:alice" size="xs" />);
    expect(container.querySelectorAll("line")).toHaveLength(0);
  });

  it("TextButton renders a button or a link", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <p>
        Or <TextButton onClick={onClick}>start over</TextButton>, or open <TextButton href="/settings" tone="muted">settings</TextButton>.
      </p>
    );
    fireEvent.click(screen.getByRole("button", { name: "start over" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "start over" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("link", { name: "settings" })).toHaveAttribute("href", "/settings");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("marks gallery has no axe violations", async () => {
    const { container } = render(
      <div>
        <IdentityMark seed="user:alice" state="live" />
        <IdentityMark seed="node:gpu" kind="machine" state="offline" />
        <IdentityMark seed="app:notes" kind="app" size="lg" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Install prompt                                                      */
/* ------------------------------------------------------------------ */

function fakeInstallEvent(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  const prompt = vi.fn(async () => {});
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: "web" }) });
  return { event, prompt };
}

describe("useInstallPrompt / InstallButton", () => {
  it("captures beforeinstallprompt and prompts", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.installed).toBe(false);
    const { event, prompt } = fakeInstallEvent("accepted");
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.canInstall).toBe(true);
    let outcome = "";
    await act(async () => {
      outcome = await result.current.promptInstall();
    });
    expect(prompt).toHaveBeenCalled();
    expect(outcome).toBe("accepted");
    expect(result.current.canInstall).toBe(false);
    expect(result.current.installed).toBe(true);
  });

  it("marks installed on appinstalled and reports unavailable without an event", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    await act(async () => {
      expect(await result.current.promptInstall()).toBe("unavailable");
    });
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current.installed).toBe(true);
  });

  it("InstallButton is hidden until installable and after install", async () => {
    const onOutcome = vi.fn();
    const { container } = render(<InstallButton appName="Kunji" onOutcome={onOutcome} />);
    expect(screen.queryByRole("button")).toBeNull();
    const { event } = fakeInstallEvent("dismissed");
    act(() => {
      window.dispatchEvent(event);
    });
    const button = screen.getByRole("button", { name: "Install Kunji" });
    expect(await axeViolations(container)).toEqual([]);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onOutcome).toHaveBeenCalledWith("dismissed");
    expect(screen.queryByRole("button")).toBeNull();
    act(() => {
      window.dispatchEvent(fakeInstallEvent().event);
    });
    expect(screen.getByRole("button", { name: "Install Kunji" })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows iOS Add to Home Screen instructions when forced", async () => {
    render(<InstallButton appName="Kunji" platform="ios" />);
    fireEvent.click(screen.getByRole("button", { name: "Install Kunji" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Add to Home Screen");
    expect(dialog).toHaveTextContent("Share");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

describe("IncomingCall", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts, declines and messages", async () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    const onMessage = vi.fn();
    const { container } = render(
      <IncomingCall name="Ana Lima" type="video" onAccept={onAccept} onDecline={onDecline} onMessage={onMessage} ringFor={0} />
    );
    const dialog = screen.getByRole("alertdialog", { name: "Ana Lima" });
    expect(dialog).toHaveAccessibleDescription("Incoming video call");
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    fireEvent.click(screen.getByRole("button", { name: "Message" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onDecline).toHaveBeenCalledTimes(2);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("times out after ringFor", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const onDecline = vi.fn();
    render(<IncomingCall name="Ana" onDecline={onDecline} onTimeout={onTimeout} ringFor={5000} />);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it("falls back to onDecline on timeout", () => {
    vi.useFakeTimers();
    const onDecline = vi.fn();
    render(<IncomingCall name="Ana" onDecline={onDecline} ringFor={1000} variant="overlay" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});

describe("CallScreen", () => {
  afterEach(() => vi.useRealTimers());

  it("fires control callbacks and toggles pressed state", async () => {
    const onMutedChange = vi.fn();
    const onCameraOffChange = vi.fn();
    const onScreenSharingChange = vi.fn();
    const onSpeakerOnChange = vi.fn();
    const onEndCall = vi.fn();
    const onPipCornerChange = vi.fn();
    const { container } = render(
      <CallScreen
        name="Ana Lima"
        remote={<div className="size-full bg-gradient-to-br from-indigo-500 to-pink-500" />}
        local={<div />}
        quality="excellent"
        onMutedChange={onMutedChange}
        onCameraOffChange={onCameraOffChange}
        onScreenSharingChange={onScreenSharingChange}
        onSpeakerOnChange={onSpeakerOnChange}
        onEndCall={onEndCall}
        onPipCornerChange={onPipCornerChange}
      />
    );
    const mute = screen.getByRole("button", { name: "Mute" });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mute);
    expect(onMutedChange).toHaveBeenCalledWith(true);
    expect(mute).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Camera off" }));
    expect(onCameraOffChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Share screen" }));
    expect(onScreenSharingChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Speaker" }));
    expect(onSpeakerOnChange).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "End call" }));
    expect(onEndCall).toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Connection excellent" })).toBeInTheDocument();
    const pip = screen.getByRole("group", { name: /Your video/ });
    fireEvent.keyDown(pip, { key: "ArrowUp" });
    expect(onPipCornerChange).toHaveBeenCalledWith("top-right");
    expect(pip).toHaveAttribute("data-corner", "top-right");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("counts the call duration", () => {
    vi.useFakeTimers();
    render(<CallScreen name="Ana" type="audio" startedAt={Date.now() - 65_000} />);
    expect(screen.getByRole("timer")).toHaveTextContent("01:05");
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("01:07");
    expect(formatCallDuration(3725)).toBe("1:02:05");
  });
});

/* ------------------------------------------------------------------ */
/* Messenger                                                           */
/* ------------------------------------------------------------------ */

const NOW = new Date(2026, 9, 14, 12, 0);
const t = (dayOffset: number, h: number, m = 0) => new Date(2026, 9, 14 + dayOffset, h, m);

const conversation: MessengerMessage[] = [
  { id: "1", senderId: "ana", text: "Hey!", createdAt: t(-1, 9, 0) },
  { id: "2", senderId: "ana", text: "You around?", createdAt: t(-1, 9, 2) },
  { id: "3", senderId: "me", text: "Yes", createdAt: t(-1, 9, 3), status: "read" },
  { id: "4", senderId: "me", text: "Later", createdAt: t(-1, 9, 30), status: "read" },
  { id: "5", senderId: "ana", text: "Morning", createdAt: t(0, 8, 0) },
  { id: "6", senderId: "ana", text: "Shared a note", createdAt: t(0, 8, 1) },
  { id: "7", senderId: "ana", text: "And a file", createdAt: t(0, 8, 2) },
];

describe("groupMessages", () => {
  it("groups by sender within the window and inserts day separators", () => {
    const entries = groupMessages(conversation, { now: NOW });
    expect(entries.map((e) => e.type)).toEqual(["date", "group", "group", "group", "date", "group"]);
    const labels = entries.filter((e) => e.type === "date").map((e) => (e.type === "date" ? e.label : ""));
    expect(labels).toEqual(["Yesterday", "Today"]);
    const groups = entries.flatMap((e) => (e.type === "group" ? [e.messages.map((m) => m.id)] : []));
    expect(groups).toEqual([["1", "2"], ["3"], ["4"], ["5", "6", "7"]]);
  });

  it("respects windowMs and the unread divider", () => {
    const wide = groupMessages(conversation, { now: NOW, windowMs: 60 * 60_000 });
    expect(wide.filter((e) => e.type === "group").map((e) => (e.type === "group" ? e.messages.length : 0))).toEqual([2, 2, 3]);
    const unread = groupMessages(conversation, { now: NOW, firstUnreadId: "6" });
    const idx = unread.findIndex((e) => e.type === "unread");
    expect(unread[idx]).toMatchObject({ type: "unread", count: 2 });
    expect(unread[idx - 1]).toMatchObject({ type: "group", messages: [expect.objectContaining({ id: "5" })] });
    expect(unread[idx + 1]).toMatchObject({ type: "group", messages: [expect.objectContaining({ id: "6" }), expect.objectContaining({ id: "7" })] });
  });

  it("formats day labels and last seen", () => {
    expect(formatMessageDay(t(0, 1), NOW)).toBe("Today");
    expect(formatMessageDay(t(-3, 1), NOW)).toBe("Sunday");
    expect(formatMessageDay(new Date(2026, 0, 5), NOW)).toBe("Jan 5");
    expect(formatMessageDay(new Date(2025, 0, 5), NOW)).toBe("Jan 5, 2025");
    expect(formatLastSeen(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe("last seen 5m ago");
    expect(formatLastSeen(NOW, NOW)).toBe("last seen just now");
  });
});

describe("MessageBubble", () => {
  it("shows delivery states with accessible labels", () => {
    const { rerender, container } = render(<MessageBubble direction="outgoing" status="sending" timestamp={NOW}>Hi</MessageBubble>);
    expect(screen.getByText("Sending")).toHaveClass("sr-only");
    for (const [status, label] of [["sent", "Sent"], ["delivered", "Delivered"], ["read", "Read"]] as const) {
      rerender(<MessageBubble direction="outgoing" status={status} timestamp={NOW}>Hi</MessageBubble>);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(container.firstElementChild).toHaveAttribute("data-status", status);
    }
  });

  it("offers retry when failed, and renders reply, reactions, edited marker", async () => {
    const onRetry = vi.fn();
    const onReactionToggle = vi.fn();
    const { container } = render(
      <MessageBubble
        direction="outgoing"
        position="first"
        status="failed"
        onRetry={onRetry}
        edited
        replyTo={{ senderName: "Ana", text: "Lunch?" }}
        reactions={[{ emoji: "👍", count: 2 }]}
        onReactionToggle={onReactionToggle}
        attachment={<div>Shared note: Trip plan</div>}
      >
        Sure
      </MessageBubble>
    );
    expect(container.firstElementChild).toHaveAttribute("data-position", "first");
    expect(screen.getAllByText("Not delivered").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText("edited")).toBeInTheDocument();
    expect(screen.getByText("Lunch?")).toBeInTheDocument();
    expect(screen.getByText("Shared note: Trip plan")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reaction/ }));
    expect(onReactionToggle).toHaveBeenCalledWith("👍", true);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("conversation (header, list, composer, group panel) has no axe violations and sends on Enter", async () => {
    const onSend = vi.fn();
    const { container } = render(
      <div>
        <ChatHeader name="Ana Lima" presence="online" onVoiceCall={() => {}} onVideoCall={() => {}} onInfo={() => {}} />
        <MessageList messages={conversation} currentUserId="me" now={NOW} firstUnreadId="6" users={{ ana: { name: "Ana" } }} showSenders />
        <MessageComposer onSend={onSend} onAttach={() => {}} />
        <GroupInfoPanel
          name="Trip crew"
          members={[
            { id: "me", name: "Me", role: "owner" },
            { id: "ana", name: "Ana", role: "admin" },
            { id: "bo", name: "Bo" },
          ]}
          currentUserId="me"
          media={[{ id: "m1", alt: "Beach photo", preview: "🏖️" }]}
          onLeave={() => {}}
        />
      </div>
    );
    expect(screen.getByText("2 new messages")).toBeInTheDocument();
    expect(screen.getByText("online")).toBeInTheDocument();
    const box = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(box, { target: { value: "  Hello there " } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Hello there");
    expect(box).toHaveValue("");
    expect(within(screen.getByRole("complementary")).getByText("admin")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Reorder & Checklist                                                 */
/* ------------------------------------------------------------------ */

describe("reorder helpers", () => {
  it("moves items purely", () => {
    const src = ["a", "b", "c", "d"];
    expect(reorderArray(src, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(reorderArray(src, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(reorderArray(src, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(reorderArray(src, 9, 0)).toEqual(src);
    expect(reorderBy(src, 2, -1)).toEqual(["a", "c", "b", "d"]);
    expect(src).toEqual(["a", "b", "c", "d"]);
  });

  it("useReorder exposes move helpers", () => {
    const { result } = renderHook(() => useReorder({ defaultItems: [1, 2, 3] }));
    act(() => result.current.moveDown(0));
    expect(result.current.items).toEqual([2, 1, 3]);
    act(() => result.current.moveToBottom(0));
    expect(result.current.items).toEqual([1, 3, 2]);
    act(() => result.current.move(2, 0));
    expect(result.current.items).toEqual([2, 1, 3]);
  });
});

function ListHarness({ onReorder }: { onReorder?: (items: string[]) => void }) {
  const [items, setItems] = React.useState(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
  return (
    <ReorderableList
      label="Letters"
      items={items}
      getKey={(i) => i}
      getLabel={(i) => i}
      moveButtons
      onReorder={(next) => {
        setItems(next);
        onReorder?.(next);
      }}
      renderItem={(i) => <span>{i}</span>}
    />
  );
}

describe("ReorderableList", () => {
  const texts = () => screen.getAllByRole("listitem").map((li) => li.textContent);

  it("picks up with Space, moves with arrows, announces and drops", () => {
    const onReorder = vi.fn();
    render(<ListHarness onReorder={onReorder} />);
    const handle = screen.getByRole("button", { name: "Reorder Bravo" });
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    expect(screen.getByRole("status")).toHaveTextContent("Picked up Bravo. Position 2 of 5.");
    expect(handle).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(screen.getByRole("status")).toHaveTextContent("Moved Bravo to position 3 of 5.");
    expect(texts()).toEqual(["Alpha", "Charlie", "Bravo", "Delta", "Echo"]);
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reorder Bravo" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Bravo" }), { key: " " });
    expect(onReorder).toHaveBeenCalledWith(["Alpha", "Charlie", "Bravo", "Delta", "Echo"]);
    expect(screen.getByRole("status")).toHaveTextContent("Dropped Bravo at position 3 of 5.");
  });

  it("cancels with Escape and supports move buttons", async () => {
    const onReorder = vi.fn();
    const { container } = render(<ListHarness onReorder={onReorder} />);
    const handle = screen.getByRole("button", { name: "Reorder Delta" });
    fireEvent.keyDown(handle, { key: "Enter" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(texts()[1]).toBe("Delta");
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Delta" }), { key: "Escape" });
    expect(texts()).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
    expect(screen.getByRole("status")).toHaveTextContent("Reorder canceled. Delta returned to position 4 of 5.");
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Move Alpha up" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Move Alpha down" }));
    expect(texts()).toEqual(["Bravo", "Alpha", "Charlie", "Delta", "Echo"]);
    expect(screen.getByRole("status")).toHaveTextContent("Moved Alpha to position 2 of 5.");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Checklist", () => {
  const items: ChecklistEntry[] = [
    { id: "a", text: "Book flights", done: true },
    { id: "b", text: "Reserve hotel", done: true },
    { id: "c", text: "Pack", done: false },
    { id: "d", text: "Visa", done: false },
    { id: "e", text: "Insurance", done: false },
  ];

  it("shows n/m progress, toggles, adds, edits and hides completed", async () => {
    const onItemsChange = vi.fn();
    const { container } = render(<Checklist label="Subtasks" defaultItems={items} onItemsChange={onItemsChange} />);
    expect(container.querySelector("[data-checklist-count]")).toHaveTextContent("2/5");
    expect(screen.getByRole("progressbar", { name: "2 of 5 done" })).toHaveAttribute("aria-valuenow", "40");
    fireEvent.click(screen.getByRole("checkbox", { name: "Pack" }));
    expect(container.querySelector("[data-checklist-count]")).toHaveTextContent("3/5");
    const add = screen.getByRole("textbox", { name: "Add an item" });
    fireEvent.change(add, { target: { value: "Charge camera" } });
    fireEvent.keyDown(add, { key: "Enter" });
    expect(container.querySelector("[data-checklist-count]")).toHaveTextContent("3/6");
    fireEvent.click(screen.getByRole("button", { name: "Edit Visa" }));
    const edit = screen.getByRole("textbox", { name: "Edit Visa" });
    fireEvent.change(edit, { target: { value: "Visa (e-visa)" } });
    fireEvent.keyDown(edit, { key: "Enter" });
    expect(screen.getByRole("checkbox", { name: "Visa (e-visa)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Insurance" }));
    expect(container.querySelector("[data-checklist-count]")).toHaveTextContent("3/5");
    fireEvent.click(screen.getByRole("button", { name: "Hide completed" }));
    expect(screen.queryByRole("checkbox", { name: "Book flights" })).toBeNull();
    expect(screen.getByRole("button", { name: "Show completed (3)" })).toBeInTheDocument();
    expect(onItemsChange).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Counters                                                            */
/* ------------------------------------------------------------------ */

describe("Countdown", () => {
  afterEach(() => vi.useRealTimers());

  it("counts down and completes once", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<Countdown target={Date.now() + 3000} onComplete={onComplete} />);
    expect(screen.getByRole("timer")).toHaveAccessibleName("Time remaining: 3 seconds");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("timer")).toHaveAccessibleName("Time remaining: 2 seconds");
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("timer")).toHaveAccessibleName("Time is up");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("formats compact durations", async () => {
    expect(splitDuration(90_061_000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(formatCompactDuration((2 * 60 + 14) * 60_000)).toBe("2h 14m");
    expect(formatCompactDuration(45_000)).toBe("45s");
    const { container } = render(<Countdown target={Date.now() + 8_040_000} format="compact" />);
    expect(container).toHaveTextContent("2h 14m");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("useStopwatch / Stopwatch", () => {
  afterEach(() => vi.useRealTimers());

  it("starts, pauses, records laps and resets", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => result.current.lap());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => result.current.lap());
    expect(result.current.laps).toEqual([
      { index: 1, lap: 1000, total: 1000 },
      { index: 2, lap: 500, total: 1500 },
    ]);
    act(() => result.current.pause());
    const paused = result.current.elapsed;
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(paused);
    expect(result.current.running).toBe(false);
    act(() => result.current.reset());
    expect(result.current.elapsed).toBe(0);
    expect(result.current.laps).toEqual([]);
  });

  it("Stopwatch has no axe violations", async () => {
    const { container } = render(<Stopwatch />);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("TallyCounter", () => {
  it("increments, logs and undoes", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<TallyCounter label="Push-ups" goal={10} onValueChange={onValueChange} step={2} />);
    const plus = screen.getByRole("button", { name: "Increase by 2" });
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    const value = container.querySelector("[data-tally-value]")!;
    expect(value).toHaveTextContent("6");
    expect(within(screen.getByRole("list", { name: "Push-ups history" })).getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(value).toHaveTextContent("4");
    expect(onValueChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole("button", { name: "Decrease by 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Decrease by 2" }));
    expect(value).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Decrease by 2" })).toBeDisabled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("repeats on long press as one log entry", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<TallyCounter />);
      const plus = screen.getByRole("button", { name: "Increase by 1" });
      fireEvent.pointerDown(plus, { button: 0 });
      act(() => {
        vi.advanceTimersByTime(450 + 90 * 3);
      });
      fireEvent.pointerUp(plus);
      fireEvent.click(plus);
      expect(container.querySelector("[data-tally-value]")).toHaveTextContent("4");
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ------------------------------------------------------------------ */
/* StatusCycle & Recurrence                                            */
/* ------------------------------------------------------------------ */

const readingStatuses: StatusCycleOption[] = [
  { value: "unread", label: "Unread", color: "neutral" },
  { value: "reading", label: "Reading", color: "info" },
  { value: "read", label: "Read", color: "success" },
];

describe("StatusCycle", () => {
  it("advances on click, goes back on shift-click and arrows, and wraps", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<StatusCycle statuses={readingStatuses} onValueChange={onValueChange} label="Reading status" />);
    const pill = screen.getByRole("button", { name: /Reading status: Unread/ });
    expect(pill).toHaveAccessibleName("Reading status: Unread. Activate to change to Reading.");
    fireEvent.click(pill);
    expect(onValueChange).toHaveBeenLastCalledWith("reading");
    expect(container.firstElementChild).toHaveAttribute("data-status", "reading");
    fireEvent.click(pill, { shiftKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith("unread");
    fireEvent.keyDown(pill, { key: "ArrowLeft" });
    expect(onValueChange).toHaveBeenLastCalledWith("read");
    fireEvent.keyDown(pill, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith("unread");
    expect(screen.getByRole("button", { name: "Choose reading status" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("stops at the ends without loop", () => {
    render(<StatusCycle statuses={readingStatuses} defaultValue="read" loop={false} showMenu={false} />);
    const pill = screen.getByRole("button", { name: /Status: Read/ });
    fireEvent.click(pill);
    expect(pill).toHaveAccessibleName(/Status: Read/);
  });
});

describe("toRRule / describeRecurrence", () => {
  it.each([
    [{ freq: "none" as const }, "", "Does not repeat"],
    [{ freq: "daily" as const }, "FREQ=DAILY", "Every day"],
    [{ freq: "daily" as const, interval: 3 }, "FREQ=DAILY;INTERVAL=3", "Every 3 days"],
    [
      { freq: "weekly" as const, interval: 2, byWeekday: ["WE" as const, "MO" as const] },
      "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE",
      "Every 2 weeks on Monday and Wednesday",
    ],
    [
      { freq: "weekly" as const, byWeekday: ["MO", "TU", "WE", "TH", "FR"] as ("MO" | "TU" | "WE" | "TH" | "FR")[] },
      "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      "Every weekday",
    ],
    [{ freq: "monthly" as const, monthDay: 15 }, "FREQ=MONTHLY;BYMONTHDAY=15", "Every month on day 15"],
    [
      { freq: "monthly" as const, monthlyMode: "weekday" as const, nth: 1, nthWeekday: "MO" as const, end: { type: "after" as const, count: 10 } },
      "FREQ=MONTHLY;BYDAY=1MO;COUNT=10",
      "Every month on the first Monday, 10 times",
    ],
    [
      { freq: "monthly" as const, monthlyMode: "weekday" as const, nth: -1, nthWeekday: "FR" as const },
      "FREQ=MONTHLY;BYDAY=-1FR",
      "Every month on the last Friday",
    ],
    [
      { freq: "yearly" as const, month: 3, monthDay: 14, end: { type: "on" as const, date: new Date(2030, 11, 31) } },
      "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=14;UNTIL=20301231",
      "Every year on March 14, until Dec 31, 2030",
    ],
  ])("%j", (rule, rrule, text) => {
    expect(toRRule(rule)).toBe(rrule);
    expect(describeRecurrence(rule)).toBe(text);
  });

  it("supports the RRULE: prefix", () => {
    expect(toRRule({ freq: "daily", end: { type: "after", count: 1 } }, { prefix: true })).toBe("RRULE:FREQ=DAILY;COUNT=1");
    expect(describeRecurrence({ freq: "daily", end: { type: "after", count: 1 } })).toBe("Every day, 1 time");
  });

  it("RecurrencePicker edits weekdays and reports the rule", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <RecurrencePicker referenceDate={new Date(2026, 9, 14)} defaultValue={{ freq: "weekly", byWeekday: ["WE"] }} onValueChange={onValueChange} />
    );
    expect(container.querySelector("[data-recurrence-summary]")).toHaveTextContent("Every week on Wednesday");
    fireEvent.click(screen.getByRole("button", { name: "Friday" }));
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ byWeekday: ["WE", "FR"] }));
    expect(container.querySelector("[data-recurrence-summary]")).toHaveTextContent("Every week on Wednesday and Friday");
    fireEvent.click(screen.getByRole("radio", { name: /After/ }));
    expect(toRRule(onValueChange.mock.lastCall![0])).toBe("FREQ=WEEKLY;BYDAY=WE,FR;COUNT=10");
    expect(await axeViolations(container)).toEqual([]);
  });
});
