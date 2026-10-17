import * as React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ShortcutProvider, useShortcut } from "../src/components/shortcuts";
import {
  ConnectionRegistry,
  GatewayStatusPopover,
  ProfileScopeBanner,
  WorkspaceProfileSwitcher,
  type WorkspaceGateway,
} from "../src/components/workspace-switcher";
import { RotatingNoticeBar, useNoticeQueue, type NoticeItem } from "../src/components/notice-bar";
import { CoachmarkTour, TipBubble, type CoachmarkStep } from "../src/components/coachmarks";
import { KeybindEditor, recordKeyCombo, type KeybindItem } from "../src/components/keybind-editor";
import { TranscriptTimelineRail, type TimelineRailTurn } from "../src/components/timeline-rail";
import { axeViolations } from "./a11y";

/* ------------------------------------------------------------------ */
/* WorkspaceProfileSwitcher                                            */
/* ------------------------------------------------------------------ */

const gateways: WorkspaceGateway[] = [
  {
    id: "local",
    name: "This Mac",
    kind: "local",
    reachability: "reachable",
    latencyMs: 2,
    profiles: [
      { id: "default", name: "Personal", isDefault: true },
      { id: "work", name: "Work" },
    ],
  },
  {
    id: "lab",
    name: "Lab server",
    kind: "remote",
    host: "lab.internal",
    reachability: "unreachable",
    profiles: [{ id: "research", name: "Research" }],
  },
];

describe("WorkspaceProfileSwitcher", () => {
  it("shows the current selection in the trigger", () => {
    render(<WorkspaceProfileSwitcher gateways={gateways} defaultValue={{ gatewayId: "local", profileId: "work" }} />);
    const trigger = screen.getByRole("button", { name: /current: Work on This Mac/ });
    expect(trigger).toHaveTextContent("Work");
    expect(trigger).toHaveTextContent("This Mac");
  });

  it("lists gateways and profiles with reachability and default badge", async () => {
    render(<WorkspaceProfileSwitcher gateways={gateways} defaultOpen />);
    const list = await screen.findByRole("listbox");
    expect(within(list).getByText("This Mac")).toBeInTheDocument();
    expect(within(list).getByText("Lab server")).toBeInTheDocument();
    expect(within(list).getByText("2 ms")).toBeInTheDocument();
    expect(within(list).getAllByText("Unreachable").length).toBeGreaterThan(0);
    expect(within(list).getByText("Default")).toBeInTheDocument();
    const research = document.querySelector('[data-profile="research"]')!;
    expect(research).toHaveAttribute("aria-disabled", "true");
    expect(document.querySelector('[data-profile="work"]')).toHaveAttribute("aria-disabled", "false");
  });

  it("selects a profile and closes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<WorkspaceProfileSwitcher gateways={gateways} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Switch profile" }));
    await user.click(await screen.findByText("Work"));
    expect(onValueChange).toHaveBeenCalledWith(
      { gatewayId: "local", profileId: "work" },
      expect.objectContaining({ gateway: expect.objectContaining({ id: "local" }) })
    );
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /current: Work/ })).toBeInTheDocument();
  });

  it("does not select profiles on unreachable gateways", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<WorkspaceProfileSwitcher gateways={gateways} defaultOpen onValueChange={onValueChange} />);
    await user.click(await screen.findByText("Research"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("filters by search and runs footer actions", async () => {
    const user = userEvent.setup();
    const onManage = vi.fn();
    const onNew = vi.fn();
    render(
      <WorkspaceProfileSwitcher
        gateways={gateways}
        defaultOpen
        defaultValue={{ gatewayId: "local", profileId: "default" }}
        onManageConnections={onManage}
        onNewProfile={onNew}
      />
    );
    const input = await screen.findByRole("combobox", { name: "Search gateways and profiles" });
    await user.type(input, "work");
    await waitFor(() => expect(document.querySelector('[data-profile="default"]')).not.toBeInTheDocument());
    expect(document.querySelector('[data-profile="work"]')).toBeInTheDocument();
    await user.clear(input);
    await user.click(await screen.findByText("New profile"));
    expect(onNew).toHaveBeenCalledWith("local");
    await user.click(screen.getByRole("button", { name: /Switch profile/ }));
    await user.click(await screen.findByText("Manage connections"));
    expect(onManage).toHaveBeenCalled();
  });

  it("has no axe violations when open", async () => {
    render(<WorkspaceProfileSwitcher gateways={gateways} defaultOpen onManageConnections={() => {}} />);
    await screen.findByRole("listbox");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("ProfileScopeBanner", () => {
  it("names the profile and switches back", async () => {
    const onSwitchBack = vi.fn();
    const { container } = render(<ProfileScopeBanner profileName="Work" gatewayName="Lab" onSwitchBack={onSwitchBack} />);
    const region = screen.getByRole("region", { name: "Profile scope" });
    expect(region).toHaveTextContent("You're acting on profile Work on Lab — changes apply there.");
    expect(region.className).toContain("sticky");
    fireEvent.click(screen.getByRole("button", { name: "Switch back" }));
    expect(onSwitchBack).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ConnectionRegistry                                                  */
/* ------------------------------------------------------------------ */

describe("ConnectionRegistry", () => {
  it("adds a connection after testing it", async () => {
    const user = userEvent.setup();
    const onTest = vi.fn(async () => ({ ok: true, latencyMs: 41, version: "1.4.0" }));
    const onSave = vi.fn();
    const onChange = vi.fn();
    render(<ConnectionRegistry onTest={onTest} onSave={onSave} onConnectionsChange={onChange} createId={() => "new1"} />);
    expect(screen.getByText("No saved connections yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    const form = screen.getByRole("form", { name: "New connection" });
    await user.click(within(form).getByRole("button", { name: "Save connection" }));
    expect(within(form).getByText("Name is required")).toBeInTheDocument();
    await user.type(within(form).getByLabelText("Name"), "Lab");
    await user.type(within(form).getByLabelText("URL or host"), "https://lab.example.com");
    await user.click(within(form).getByRole("radio", { name: "Token" }));
    await user.type(within(form).getByLabelText("Access token"), "secret");
    await user.click(within(form).getByRole("button", { name: "Add header" }));
    await user.type(within(form).getByLabelText("Header 1 name"), "X-Team");
    await user.type(within(form).getByLabelText("Header 1 value"), "core");
    await user.click(within(form).getByRole("button", { name: "Test connection" }));
    expect(await within(form).findByText(/Connected · 41 ms · v1.4.0/)).toBeInTheDocument();
    expect(onTest).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://lab.example.com", auth: "token", token: "secret", headers: [{ key: "X-Team", value: "core" }] })
    );
    await user.click(within(form).getByRole("button", { name: "Save connection" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "new1", name: "Lab", isDefault: true }), true);
    const list = screen.getByRole("list", { name: "Saved connections" });
    expect(within(list).getByText("Lab")).toBeInTheDocument();
    expect(within(list).getByText("Default")).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: "new1" })]);
  });

  it("shows failed tests", async () => {
    const user = userEvent.setup();
    render(<ConnectionRegistry onTest={() => Promise.reject(new Error("ECONNREFUSED"))} />);
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    await user.type(screen.getByLabelText("URL or host"), "http://nowhere");
    await user.click(screen.getByRole("button", { name: "Test connection" }));
    expect(await screen.findByText(/Connection failed/)).toBeInTheDocument();
    expect(screen.getByText(/ECONNREFUSED/)).toBeInTheDocument();
  });

  it("sets default and removes after confirmation", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onSetDefault = vi.fn();
    render(
      <ConnectionRegistry
        defaultConnections={[
          { id: "a", name: "Alpha", url: "https://a", auth: "none", isDefault: true },
          { id: "b", name: "Beta", url: "ssh://b", auth: "ssh-key" },
        ]}
        onRemove={onRemove}
        onSetDefault={onSetDefault}
      />
    );
    await user.click(screen.getByRole("button", { name: "Set Beta as default" }));
    expect(onSetDefault).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
    expect(screen.getByRole("button", { name: "Set Alpha as default" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Alpha" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Remove Alpha?");
    expect(onRemove).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    await waitFor(() => expect(screen.queryByText("Alpha")).not.toBeInTheDocument());
  });

  it("edits an existing entry and has no axe violations", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ConnectionRegistry defaultConnections={[{ id: "a", name: "Alpha", url: "https://a", auth: "none", isDefault: true }]} onTest={() => ({ ok: true })} />
    );
    await user.click(screen.getByRole("button", { name: "Edit Alpha" }));
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Alpha 2");
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Alpha 2")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* GatewayStatusPopover                                                */
/* ------------------------------------------------------------------ */

describe("GatewayStatusPopover", () => {
  it("shows details and runs actions", async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();
    const onStop = vi.fn();
    render(
      <GatewayStatusPopover state="running" uptime={3725} version="1.4.0" host="127.0.0.1:8642" onRestart={onRestart} onStop={onStop} logLines={["boot ok", "listening"]} />
    );
    await user.click(screen.getByRole("button", { name: /Gateway/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("1h 2m")).toBeInTheDocument();
    expect(within(dialog).getByText("1.4.0")).toBeInTheDocument();
    expect(within(dialog).getByRole("region", { name: "Recent logs" })).toHaveTextContent("listening");
    await user.click(within(dialog).getByRole("button", { name: "Restart" }));
    await user.click(within(dialog).getByRole("button", { name: "Stop" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("offers start when stopped and disables while busy", async () => {
    const onStart = vi.fn();
    const { rerender } = render(<GatewayStatusPopover state="stopped" defaultOpen onStart={onStart} onStop={() => {}} onRestart={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalled();
    rerender(<GatewayStatusPopover state="starting" defaultOpen onStart={onStart} onStop={() => {}} onRestart={() => {}} />);
    expect(screen.getByRole("button", { name: "Restart" })).toBeDisabled();
  });
});

/* ------------------------------------------------------------------ */
/* RotatingNoticeBar                                                   */
/* ------------------------------------------------------------------ */

const notices: NoticeItem[] = [
  { id: "a", message: "First notice", tone: "info" },
  { id: "b", message: "Second notice", tone: "warn", action: { label: "Fix", href: "#fix" } },
  { id: "c", message: "Third notice", tone: "promo" },
];

const currentNotice = () => document.querySelector("[data-notice]")?.getAttribute("data-notice");

describe("RotatingNoticeBar", () => {
  afterEach(() => vi.useRealTimers());

  it("auto-rotates and pauses on hover", () => {
    vi.useFakeTimers();
    render(<RotatingNoticeBar notices={notices} interval={2} />);
    expect(currentNotice()).toBe("a");
    act(() => vi.advanceTimersByTime(2000));
    expect(currentNotice()).toBe("b");
    const bar = screen.getByRole("region", { name: "Notices" });
    fireEvent.mouseEnter(bar);
    act(() => vi.advanceTimersByTime(6000));
    expect(currentNotice()).toBe("b");
    fireEvent.mouseLeave(bar);
    act(() => vi.advanceTimersByTime(2000));
    expect(currentNotice()).toBe("c");
    act(() => vi.advanceTimersByTime(2000));
    expect(currentNotice()).toBe("a");
  });

  it("pauses while focused", () => {
    vi.useFakeTimers();
    render(<RotatingNoticeBar notices={notices} interval={1} />);
    fireEvent.focus(screen.getByRole("button", { name: "Next notice" }));
    act(() => vi.advanceTimersByTime(5000));
    expect(currentNotice()).toBe("a");
  });

  it("does not auto-rotate with reduced motion", () => {
    vi.useFakeTimers();
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...original(q), matches: q.includes("reduce") })) as typeof window.matchMedia;
    try {
      render(<RotatingNoticeBar notices={notices} interval={1} />);
      act(() => vi.advanceTimersByTime(5000));
      expect(currentNotice()).toBe("a");
    } finally {
      window.matchMedia = original;
    }
  });

  it("navigates with prev/next and the dot pager", () => {
    const onIndexChange = vi.fn();
    render(<RotatingNoticeBar notices={notices} autoRotate={false} onIndexChange={onIndexChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous notice" }));
    expect(currentNotice()).toBe("c");
    fireEvent.click(screen.getByRole("button", { name: "Next notice" }));
    expect(currentNotice()).toBe("a");
    fireEvent.click(screen.getByRole("button", { name: "Show notice 2 of 3" }));
    expect(currentNotice()).toBe("b");
    expect(screen.getByRole("button", { name: "Show notice 2 of 3" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Fix" })).toHaveAttribute("href", "#fix");
    expect(onIndexChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ id: "b" }));
  });

  it("dismisses with a persistence callback", async () => {
    const onDismiss = vi.fn();
    const { container } = render(<RotatingNoticeBar notices={notices} autoRotate={false} onDismiss={onDismiss} />);
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(onDismiss).toHaveBeenCalledWith("a");
    expect(currentNotice()).toBe("b");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(screen.queryByRole("region", { name: "Notices" })).not.toBeInTheDocument();
  });
});

describe("useNoticeQueue", () => {
  it("dedupes by id, sorts by priority and tracks dismissals", () => {
    const onDismiss = vi.fn();
    const source: NoticeItem[] = [
      { id: "low", message: "low", priority: 0 },
      { id: "high", message: "high", priority: 5 },
      { id: "low", message: "low v2", priority: 0 },
    ];
    const { result } = renderHook(() => useNoticeQueue(source, { initialDismissed: ["gone"], onDismiss }));
    expect(result.current.notices.map((n) => [n.id, n.message])).toEqual([
      ["high", "high"],
      ["low", "low v2"],
    ]);
    act(() => result.current.push({ id: "urgent", message: "urgent", priority: 10 }));
    act(() => result.current.push({ id: "gone", message: "back", priority: 1 }));
    expect(result.current.notices.map((n) => n.id)).toEqual(["urgent", "high", "gone", "low"]);
    act(() => result.current.dismiss("high"));
    expect(onDismiss).toHaveBeenCalledWith("high", ["high"]);
    expect(result.current.notices.map((n) => n.id)).toEqual(["urgent", "gone", "low"]);
    expect(result.current.dismissed.has("high")).toBe(true);
    act(() => result.current.remove("urgent"));
    act(() => result.current.clearDismissed());
    expect(result.current.notices.map((n) => n.id)).toEqual(["high", "gone", "low"]);
  });
});

/* ------------------------------------------------------------------ */
/* CoachmarkTour + TipBubble                                           */
/* ------------------------------------------------------------------ */

function TourHarness(props: Partial<React.ComponentProps<typeof CoachmarkTour>> & { steps?: CoachmarkStep[] }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const steps: CoachmarkStep[] = props.steps ?? [
    { target: "#tour-a", title: "Search", body: "Find anything." },
    { target: ref, title: "Create", body: "Make something new.", placement: "right" },
    { target: "#tour-c", title: "Settings" },
  ];
  return (
    <div>
      <input id="tour-a" aria-label="Search" />
      <button ref={ref}>Create</button>
      <div id="tour-c">Settings</div>
      <CoachmarkTour defaultOpen {...props} steps={steps} />
    </div>
  );
}

describe("CoachmarkTour", () => {
  it("navigates steps with buttons and finishes", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const onComplete = vi.fn();
    render(<TourHarness onFinish={onFinish} onComplete={onComplete} />);
    const dialog = screen.getByRole("dialog", { name: "Search" });
    expect(dialog).toHaveTextContent("Step 1 of 3");
    expect(document.querySelector("[data-coachmark-spotlight]")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "Create" })).toHaveTextContent("Step 2 of 3");
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "Search" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith("finish");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports arrow keys and Escape to skip", () => {
    const onSkip = vi.fn();
    const onComplete = vi.fn();
    const onStepChange = vi.fn();
    render(<TourHarness onSkip={onSkip} onComplete={onComplete} onStepChange={onStepChange} />);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Create" })).toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByRole("dialog", { name: "Search" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onSkip).toHaveBeenCalledWith(1);
    expect(onComplete).toHaveBeenCalledWith("skip");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("skips via the Skip button and scrolls targets into view", async () => {
    const spy = vi.spyOn(Element.prototype, "scrollIntoView");
    const onSkip = vi.fn();
    render(<TourHarness onSkip={onSkip} />);
    expect(spy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalledWith(0);
    spy.mockRestore();
  });

  it("handles a missing target with a centered card", async () => {
    render(<TourHarness steps={[{ target: "#does-not-exist", title: "Ghost", body: "Nowhere" }, { title: "No target" }]} />);
    const dialog = screen.getByRole("dialog", { name: "Ghost" });
    expect(dialog).toHaveAttribute("data-side", "center");
    expect(document.querySelector("[data-coachmark-missing]")).toBeInTheDocument();
    expect(document.querySelector("[data-coachmark-spotlight]")).not.toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "No target" })).toBeInTheDocument();
  });
});

describe("TipBubble", () => {
  const tips = [
    { id: "t1", title: "Quick search", body: "Press / to search." },
    { id: "t2", title: "Pin chats", body: "Pin important chats." },
  ];

  it("rotates tips and dismisses", async () => {
    const onDismiss = vi.fn();
    render(
      <TipBubble tips={tips} onDismiss={onDismiss}>
        <button>Anchor</button>
      </TipBubble>
    );
    const dialog = await screen.findByRole("dialog", { name: "Quick search" });
    expect(dialog).toHaveTextContent("1/2");
    fireEvent.click(screen.getByRole("button", { name: "Next tip" }));
    expect(screen.getByRole("dialog", { name: "Pin chats" })).toHaveTextContent("2/2");
    fireEvent.click(screen.getByRole("button", { name: "Next tip" }));
    expect(screen.getByRole("dialog", { name: "Quick search" })).toBeInTheDocument();
    expect(await axeViolations(document.body)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss tip" }));
    expect(onDismiss).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("supports don't show again with a target selector", async () => {
    const onDontShowAgain = vi.fn();
    render(
      <div>
        <span id="tip-target">target</span>
        <TipBubble tips={[tips[0]!]} target="#tip-target" onDontShowAgain={onDontShowAgain} accent="info" />
      </div>
    );
    await screen.findByRole("dialog", { name: "Quick search" });
    expect(screen.queryByRole("button", { name: "Next tip" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Don't show again" }));
    expect(onDontShowAgain).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

/* ------------------------------------------------------------------ */
/* recordKeyCombo + KeybindEditor                                      */
/* ------------------------------------------------------------------ */

const ev = (init: Partial<KeyboardEventInit> & { key: string }) =>
  ({ code: "", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...init }) as KeyboardEvent;

describe("recordKeyCombo", () => {
  it("records the primary modifier as mod per platform", () => {
    expect(recordKeyCombo(ev({ key: "k", code: "KeyK", metaKey: true }), { platform: "mac" })).toBe("mod+k");
    expect(recordKeyCombo(ev({ key: "k", code: "KeyK", ctrlKey: true }), { platform: "other" })).toBe("mod+k");
    expect(recordKeyCombo(ev({ key: "k", code: "KeyK", ctrlKey: true }), { platform: "mac" })).toBe("ctrl+k");
    expect(recordKeyCombo(ev({ key: "k", code: "KeyK", metaKey: true }), { platform: "other" })).toBe("meta+k");
    expect(recordKeyCombo(ev({ key: "k", code: "KeyK", ctrlKey: true }), { platform: "other", useMod: false })).toBe("ctrl+k");
  });

  it("normalizes shift, alt and special keys", () => {
    expect(recordKeyCombo(ev({ key: "K", code: "KeyK", metaKey: true, shiftKey: true }), { platform: "mac" })).toBe("mod+shift+k");
    expect(recordKeyCombo(ev({ key: "˚", code: "KeyK", altKey: true }), { platform: "mac" })).toBe("alt+k");
    expect(recordKeyCombo(ev({ key: " ", code: "Space", ctrlKey: true }), { platform: "other" })).toBe("mod+space");
    expect(recordKeyCombo(ev({ key: "ArrowUp", code: "ArrowUp", altKey: true }), { platform: "other" })).toBe("alt+arrowup");
    expect(recordKeyCombo(ev({ key: "F5", code: "F5" }), { platform: "other" })).toBe("f5");
    expect(recordKeyCombo(ev({ key: "?", code: "Slash", shiftKey: true }), { platform: "other" })).toBe("shift+?");
    expect(recordKeyCombo(ev({ key: "Enter", code: "Enter", metaKey: true }), { platform: "mac" })).toBe("mod+enter");
  });

  it("returns null for modifier-only presses", () => {
    expect(recordKeyCombo(ev({ key: "Shift", shiftKey: true }), { platform: "mac" })).toBeNull();
    expect(recordKeyCombo(ev({ key: "Meta", metaKey: true }), { platform: "mac" })).toBeNull();
    expect(recordKeyCombo(ev({ key: "Control", ctrlKey: true }), { platform: "other" })).toBeNull();
  });
});

const keybinds: KeybindItem[] = [
  { id: "palette", label: "Command palette", group: "General", keys: "mod+k" },
  { id: "new-chat", label: "New chat", group: "Chat", keys: "mod+n" },
  { id: "search", label: "Search", group: "Chat", keys: "/", description: "Focus search" },
];

describe("KeybindEditor", () => {
  it("lists categorized shortcuts and filters by search", async () => {
    const user = userEvent.setup();
    const { container } = render(<KeybindEditor shortcuts={keybinds} platform="other" />);
    expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chat" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    await user.type(screen.getByRole("searchbox", { name: "Search shortcuts" }), "chat");
    expect(screen.queryByText("Command palette")).not.toBeInTheDocument();
    expect(screen.getByText("New chat")).toBeInTheDocument();
  });

  it("records a new combo, cancels with Escape and clears with Backspace", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KeybindEditor shortcuts={keybinds} platform="other" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Edit shortcut for New chat" }));
    let recorder = screen.getByText("Press keys…");
    expect(recorder).toHaveFocus();
    fireEvent.keyDown(recorder, { key: "Shift", shiftKey: true });
    expect(screen.getByText("Press keys…")).toBeInTheDocument();
    fireEvent.keyDown(recorder, { key: "j", code: "KeyJ", ctrlKey: true, altKey: true });
    expect(onChange).toHaveBeenCalledWith("new-chat", "mod+alt+j");
    expect(document.querySelector('[data-keybind="new-chat"] [data-shortcut]')).toHaveAttribute("data-shortcut", "mod+alt+j");

    await user.click(screen.getByRole("button", { name: "Edit shortcut for Search" }));
    recorder = screen.getByText("Press keys…");
    fireEvent.keyDown(recorder, { key: "Escape" });
    expect(screen.queryByText("Press keys…")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Edit shortcut for Search" }));
    fireEvent.keyDown(screen.getByText("Press keys…"), { key: "Backspace" });
    expect(onChange).toHaveBeenLastCalledWith("search", "");
    expect(within(document.querySelector('[data-keybind="search"]') as HTMLElement).getByText("Not set")).toBeInTheDocument();
  });

  it("detects conflicts and replaces", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    render(<KeybindEditor shortcuts={keybinds} platform="other" onChange={onChange} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Edit shortcut for New chat" }));
    fireEvent.keyDown(screen.getByText("Press keys…"), { key: "k", code: "KeyK", ctrlKey: true });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("is already used by Command palette");
    expect(onChange).not.toHaveBeenCalled();
    await user.click(within(alert).getByRole("button", { name: "Replace" }));
    expect(onChange).toHaveBeenCalledWith("new-chat", "mod+k");
    expect(onChange).toHaveBeenCalledWith("palette", "");
    expect(onValueChange).toHaveBeenLastCalledWith({ "new-chat": "mod+k", palette: "" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("cancels a conflict, resets a row and resets all", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onResetAll = vi.fn();
    render(
      <KeybindEditor
        shortcuts={keybinds}
        platform="other"
        defaultValue={{ palette: "mod+p", search: "mod+f" }}
        onChange={onChange}
        onResetAll={onResetAll}
      />
    );
    await user.click(screen.getByRole("button", { name: "Edit shortcut for New chat" }));
    fireEvent.keyDown(screen.getByText("Press keys…"), { key: "p", code: "KeyP", ctrlKey: true });
    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reset Command palette to default" }));
    expect(onChange).toHaveBeenCalledWith("palette", "mod+k");
    expect(screen.getByRole("button", { name: "Reset Command palette to default" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reset all" }));
    expect(onChange).toHaveBeenLastCalledWith("search", "/");
    expect(onResetAll).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reset all" })).toBeDisabled();
  });

  it("reads shortcuts from the registry inside a ShortcutProvider", () => {
    function Registered() {
      useShortcut("mod+b", () => {}, { id: "toggle-sidebar", label: "Toggle sidebar", group: "View" });
      return null;
    }
    render(
      <ShortcutProvider platform="mac">
        <Registered />
        <KeybindEditor />
      </ShortcutProvider>
    );
    expect(screen.getByText("Toggle sidebar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "View" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* TranscriptTimelineRail                                              */
/* ------------------------------------------------------------------ */

const turns: TimelineRailTurn[] = [
  { id: "turn-1", preview: "How do I deploy?", time: "9:01 AM" },
  { id: "turn-2", preview: "Add tests", bookmarked: true },
  { id: "turn-3", preview: "Fix the flaky one", flagged: true },
  { id: "turn-4", preview: "Ship it" },
];

describe("TranscriptTimelineRail", () => {
  it("renders one tick per turn with markers and positions", async () => {
    const { container } = render(<TranscriptTimelineRail turns={turns} />);
    const toolbar = screen.getByRole("toolbar", { name: "Transcript timeline" });
    const ticks = within(toolbar).getAllByRole("button");
    expect(ticks).toHaveLength(4);
    expect(ticks[0]).toHaveStyle({ top: "0%" });
    expect(ticks[3]).toHaveStyle({ top: "100%" });
    expect(ticks[1]).toHaveAttribute("data-marker", "bookmarked");
    expect(ticks[2]).toHaveAttribute("data-marker", "flagged");
    expect(ticks[1]).toHaveAccessibleName("Turn 2: Add tests (bookmarked)");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("jumps on click via onJump and marks the active tick", () => {
    const onJump = vi.fn();
    const onActiveChange = vi.fn();
    render(<TranscriptTimelineRail turns={turns} onJump={onJump} onActiveChange={onActiveChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Turn 3/ }));
    expect(onJump).toHaveBeenCalledWith("turn-3");
    expect(onActiveChange).toHaveBeenCalledWith("turn-3");
    expect(screen.getByRole("button", { name: /Turn 3/ })).toHaveAttribute("aria-current", "location");
  });

  it("scrolls the turn element when no onJump is given", () => {
    render(
      <div>
        {turns.map((t) => (
          <div key={t.id} id={t.id}>
            {t.preview}
          </div>
        ))}
        <TranscriptTimelineRail turns={turns} />
      </div>
    );
    const target = document.getElementById("turn-2")!;
    const spy = vi.fn();
    target.scrollIntoView = spy;
    fireEvent.click(screen.getByRole("button", { name: /Turn 2/ }));
    expect(spy).toHaveBeenCalled();
  });

  it("moves focus between turns with arrow keys", async () => {
    const user = userEvent.setup();
    render(<TranscriptTimelineRail turns={turns} onJump={() => {}} />);
    const ticks = screen.getAllByRole("button");
    expect(ticks[0]).toHaveAttribute("tabindex", "0");
    expect(ticks[1]).toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(ticks[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(ticks[1]).toHaveFocus();
    await user.keyboard("{End}");
    expect(ticks[3]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(ticks[2]).toHaveFocus();
    expect(ticks[2]).toHaveAttribute("tabindex", "0");
  });

  it("syncs the active turn from IntersectionObserver", () => {
    const original = globalThis.IntersectionObserver;
    let callback: IntersectionObserverCallback | null = null;
    const observed: Element[] = [];
    class IO {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = IO as unknown as typeof IntersectionObserver;
    try {
      render(
        <div>
          {turns.map((t) => (
            <div key={t.id} id={t.id} />
          ))}
          <TranscriptTimelineRail turns={turns} />
        </div>
      );
      expect(observed).toHaveLength(4);
      act(() => {
        callback!([{ target: observed[2]!, isIntersecting: true } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
      });
      expect(screen.getByRole("button", { name: /Turn 3/ })).toHaveAttribute("aria-current", "location");
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });
});
