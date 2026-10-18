import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  AccessRequestQueue,
  GuidedSetupSteps,
  PlatformConfigForm,
  PlatformConnectorCard,
  PlatformConnectorList,
  PlatformIcon,
  RotatingQRPairing,
  formatChannelAgo,
  validateChannelId,
  type PlatformConnector,
  type PlatformConnectorState,
} from "../src/kits/agent-admin/channels";
import { AgentMessageNotice, AgentRoom, AgentRoomMembers, parseAgentMentions, type AgentRoomMember } from "../src/kits/agent-admin/agent-room";
import { DelegateToolBody, RunTicker, SubagentTree, subagentRollup, type SubagentNode } from "../src/kits/agent-admin/subagents";
import { AgentAvatar, AgentAvatarBuilder, CreateAgentDialog, PersonaEditor, randomAvatarSpec, validateAgentName } from "../src/kits/agent-admin/agent-persona";
import { PermissionPreflightCard, RemoteScreenViewer } from "../src/kits/agent-admin/remote-screen";
import { axeViolations } from "./a11y";

afterEach(() => vi.useRealTimers());

/* ------------------------------------------------------------------ */
/* Channels                                                            */
/* ------------------------------------------------------------------ */

const tg = (state: PlatformConnectorState, extra: Partial<PlatformConnector> = {}): PlatformConnector => ({
  id: `tg-${state}`,
  platform: "telegram",
  state,
  ...extra,
});

describe("channels", () => {
  it("validates per-platform ids", () => {
    expect(validateChannelId("telegram", "123456789")).toBe(true);
    expect(validateChannelId("telegram", "-1001234567890")).toBe(true);
    expect(validateChannelId("telegram", "abc")).toBe(false);
    expect(validateChannelId("discord", "80351110224678912")).toBe(true);
    expect(validateChannelId("matrix", "@ada:matrix.org")).toBe(true);
    expect(validateChannelId("whatsapp", "+14155550123")).toBe(true);
    expect(validateChannelId("slack", "u123")).toBe(false);
    expect(formatChannelAgo(Date.now() - 5 * 60_000)).toBe("5m ago");
  });

  it("PlatformIcon has an accessible name", () => {
    render(<PlatformIcon platform="signal" />);
    expect(screen.getByRole("img", { name: "Signal" })).toBeInTheDocument();
  });

  it("PlatformConnectorCard renders every state", () => {
    const labels: Record<PlatformConnectorState, string> = {
      connected: "Connected",
      starting: "Starting",
      stopped: "Stopped",
      not_configured: "Not configured",
      fatal: "Fatal error",
      startup_failed: "Startup failed",
    };
    for (const s of Object.keys(labels) as PlatformConnectorState[]) {
      const { unmount, container } = render(
        <PlatformConnectorCard connector={tg(s, { error: s === "startup_failed" ? "401 Unauthorized: bad token" : undefined })} onEnabledChange={() => {}} />
      );
      expect(screen.getByText(labels[s])).toBeInTheDocument();
      expect(container.querySelector(`[data-state="${s}"]`)).not.toBeNull();
      if (s === "startup_failed") expect(screen.getByText("401 Unauthorized: bad token")).toBeInTheDocument();
      if (s === "not_configured") expect(screen.getByRole("switch", { name: "Enable Telegram" })).toBeDisabled();
      unmount();
    }
  });

  it("toggles, copies the ingress URL and shows a test result", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const onEnabled = vi.fn();
    const onTest = vi.fn().mockResolvedValue({ ok: true, latencyMs: 42 });
    render(
      <PlatformConnectorCard
        connector={tg("connected", { enabled: true, ingressUrl: "https://hooks.example.com/tg/abc" })}
        onEnabledChange={onEnabled}
        onTest={onTest}
      />
    );
    fireEvent.click(screen.getByRole("switch", { name: "Enable Telegram" }));
    expect(onEnabled).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Copy ingress URL" }));
    expect(writeText).toHaveBeenCalledWith("https://hooks.example.com/tg/abc");
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    expect(await screen.findByText("Test passed")).toBeInTheDocument();
    expect(screen.getByText(/42 ms/)).toBeInTheDocument();
  });

  it("shows a failed test result", async () => {
    render(<PlatformConnectorCard connector={tg("connected")} onTest={() => ({ ok: false, message: "Chat not found" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    expect(await screen.findByText("Chat not found")).toBeInTheDocument();
  });

  it("validates the config form (bad chat id) before saving", async () => {
    const onSave = vi.fn();
    render(<PlatformConnectorCard connector={tg("stopped")} onSaveConfig={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Configure" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Bot token/), { target: { value: "123456789:AAEabcdefghijklmnopqrstuvwxyz" } });
    fireEvent.change(within(dialog).getByLabelText(/Home chat ID/), { target: { value: "general" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByText(/Enter a numeric chat ID/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Home chat ID/), { target: { value: "-1001234567890" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ TELEGRAM_HOME_CHANNEL: "-1001234567890" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("requires secrets", async () => {
    const onSubmit = vi.fn();
    render(<PlatformConfigForm platform="slack" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findAllByText("Required.")).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("splits a pasted allowlist and rejects invalid ids", async () => {
    const onSubmit = vi.fn();
    render(<PlatformConfigForm platform="telegram" fields={[{ name: "TELEGRAM_ALLOWED_USERS", label: "Allowed users", type: "allowlist" }]} onSubmit={onSubmit} />);
    const input = screen.getByLabelText(/Allowed users/);
    fireEvent.paste(input, { clipboardData: { getData: () => "123456789, 987654321\nnot-an-id" } });
    expect(screen.getByText("123456789")).toBeInTheDocument();
    expect(screen.getByText("987654321")).toBeInTheDocument();
    expect(screen.getByText(/"not-an-id" isn't a valid numeric chat ID/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ TELEGRAM_ALLOWED_USERS: ["123456789", "987654321"] }));
  });

  it("PlatformConnectorList header counts configured connectors", async () => {
    const { container } = render(
      <PlatformConnectorList
        gatewayStatus="stopped"
        connectors={[tg("connected"), { id: "wa", platform: "whatsapp", state: "not_configured" }, { id: "sl", platform: "slack", state: "fatal", error: "invalid_auth" }]}
        onEnabledChange={() => {}}
      />
    );
    expect(screen.getByText("2 of 3 configured")).toBeInTheDocument();
    expect(screen.getByText(/Gateway stopped/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  describe("RotatingQRPairing", () => {
    it("re-renders when the payload rotates and counts down to expiry", () => {
      vi.useFakeTimers();
      let payload = "pair:AAA";
      const getPayload = vi.fn(() => payload);
      const onRefresh = vi.fn();
      const { container } = render(<RotatingQRPairing getPayload={getPayload} pollInterval={1000} ttl={5} onRefresh={onRefresh} />);
      const current = () => container.querySelector("[data-payload]")?.getAttribute("data-payload");
      expect(current()).toBe("pair:AAA");
      expect(screen.getByRole("timer")).toHaveTextContent("Expires in 0:05");

      payload = "pair:BBB";
      act(() => vi.advanceTimersByTime(1000));
      expect(current()).toBe("pair:BBB");
      expect(screen.getByRole("timer")).toHaveTextContent("Expires in 0:04");
      act(() => vi.advanceTimersByTime(600));
      expect(container.querySelectorAll("[data-slot='rotating-qr-pairing'] span.absolute.inset-1")).toHaveLength(1);

      act(() => vi.advanceTimersByTime(5000));
      expect(container.querySelector("[data-phase]")).toHaveAttribute("data-phase", "expired");
      expect(screen.getByText("Code expired")).toBeInTheDocument();
      const calls = getPayload.mock.calls.length;
      act(() => vi.advanceTimersByTime(3000));
      expect(getPayload.mock.calls.length).toBe(calls);

      fireEvent.click(screen.getByRole("button", { name: "Refresh code" }));
      expect(onRefresh).toHaveBeenCalled();
      expect(container.querySelector("[data-phase]")).toHaveAttribute("data-phase", "waiting");
      expect(screen.getByRole("timer")).toHaveTextContent("Expires in 0:05");
    });

    it("moves to connected when the poll reports it", () => {
      vi.useFakeTimers();
      let result: string | { value: string; connected?: boolean } = "pair:1";
      const onConnected = vi.fn();
      const { container } = render(<RotatingQRPairing getPayload={() => result} pollInterval={500} onConnected={onConnected} connectedLabel="Linked +1 415" />);
      result = { value: "", connected: true };
      act(() => vi.advanceTimersByTime(500));
      expect(container.querySelector("[data-phase]")).toHaveAttribute("data-phase", "connected");
      expect(screen.getByText("Linked +1 415")).toBeInTheDocument();
      expect(onConnected).toHaveBeenCalledTimes(1);
    });

    it("shows installing and error phases", async () => {
      const getPayload = vi.fn(() => "x");
      const { rerender, container } = render(<RotatingQRPairing getPayload={getPayload} phase="installing" installingLabel="Installing bridge" />);
      expect(screen.getByText("Installing bridge")).toBeInTheDocument();
      expect(getPayload).not.toHaveBeenCalled();
      const onPhase = vi.fn();
      rerender(<RotatingQRPairing getPayload={getPayload} phase="error" error="Bridge crashed" onPhaseChange={onPhase} />);
      expect(screen.getByText("Bridge crashed")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(onPhase).toHaveBeenCalledWith("waiting");
      rerender(<RotatingQRPairing getPayload={getPayload} phase="waiting" caption="Scan with WhatsApp" />);
      expect(await axeViolations(container)).toEqual([]);
    });
  });

  it("GuidedSetupSteps checks steps off and completes", async () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const { container } = render(
      <GuidedSetupSteps
        onValueChange={onChange}
        onComplete={onComplete}
        steps={[
          { id: "open", title: "Open BotFather", href: "https://t.me/BotFather", linkLabel: "Open BotFather" },
          { id: "new", title: "Send /newbot", copyValue: "/newbot" },
        ]}
      />
    );
    const items = container.querySelectorAll("li");
    expect(items[0]).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("link", { name: /Open BotFather/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("button", { name: "Copy /newbot" })).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]!);
    expect(onChange).toHaveBeenLastCalledWith(["open"]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    fireEvent.click(boxes[1]!);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("AccessRequestQueue approves, denies and revokes with confirmation", async () => {
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    const onRevoke = vi.fn();
    const now = Date.now();
    const { container, rerender } = render(
      <AccessRequestQueue
        now={now}
        requests={[{ id: "r1", handle: "@ada", name: "Ada", platform: "telegram", code: "K7Q2PX", requestedAt: now - 120_000 }]}
        approved={[{ id: "u1", handle: "@grace", name: "Grace", platform: "discord", approvedAt: now - 3_600_000 }]}
        onApprove={onApprove}
        onDeny={onDeny}
        onRevoke={onRevoke}
      />
    );
    expect(screen.getByText("K7Q2PX")).toBeInTheDocument();
    expect(screen.getByText(/2m ago/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Approve Ada" }));
    fireEvent.click(screen.getByRole("button", { name: "Deny Ada" }));
    expect(onApprove).toHaveBeenCalledWith("r1");
    expect(onDeny).toHaveBeenCalledWith("r1");
    fireEvent.click(screen.getByRole("button", { name: "Revoke Grace" }));
    expect(onRevoke).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(onRevoke).toHaveBeenCalledWith("u1"));
    rerender(<AccessRequestQueue requests={[]} />);
    expect(screen.getByText("No pending requests")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Agent room                                                          */
/* ------------------------------------------------------------------ */

const members: AgentRoomMember[] = [
  { id: "you", name: "You", kind: "human" },
  { id: "ada", name: "Ada", kind: "agent", role: "Planner", status: "thinking" },
  { id: "rex", name: "Researcher", kind: "agent", status: "holding" },
  { id: "cri", name: "Critic", kind: "agent" },
];

describe("agent room", () => {
  it("attributes speakers, shows the round, holds and mentions", async () => {
    const { container } = render(
      <AgentRoom
        members={members}
        round={2}
        currentSpeakerId="ada"
        turnOrder={["rex", "ada", "cri"]}
        messages={[
          { id: "1", authorId: "you", text: "@Ada plan the launch, @Researcher find comps" },
          { id: "2", authorId: "rex", text: "On it." },
          { id: "3", authorId: "ada", kind: "notice", notice: { direction: "outgoing", agent: "Critic", payload: "Review the plan" } },
          { id: "4", authorId: "ada", kind: "system", text: "Round 2 started" },
        ]}
        composer={<input aria-label="Message the room" />}
      />
    );
    expect(container.querySelector("[data-slot='agent-room-turn']")).toHaveTextContent("Round 2 · Ada's turn");
    const chips = within(screen.getByRole("list", { name: "Turn order" })).getAllByRole("listitem");
    expect(chips.map((c) => c.getAttribute("data-state"))).toEqual(["done", "current", "upcoming"]);
    expect(chips[1]).toHaveAttribute("aria-current", "step");
    expect(container.querySelector("[data-author='you']")).toHaveAttribute("data-kind", "human");
    expect(container.querySelector("[data-author='rex']")).toHaveAttribute("data-kind", "agent");
    expect(container.querySelectorAll("[data-mention]")).toHaveLength(2);
    expect(screen.getByText("Holding — waiting to be mentioned")).toBeInTheDocument();
    expect(container.querySelector("[data-indicator='ada']")).toHaveTextContent("Ada is thinking…");
    expect(screen.getByText("Round 2 started")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message the room" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("parses mentions case-insensitively, longest name first", () => {
    const parts = parseAgentMentions("hi @researcher and @ada.", members);
    expect(parts.filter((p) => typeof p !== "string").map((p) => (p as { mention: AgentRoomMember }).mention.id)).toEqual(["rex", "ada"]);
  });

  it("AgentRoomMembers adds, removes, reorders and mutes", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <AgentRoomMembers defaultValue={members.slice(0, 3)} available={members} onValueChange={onChange} />
    );
    const order = () => Array.from(container.querySelectorAll("li[data-member]")).map((li) => li.getAttribute("data-member"));
    expect(order()).toEqual(["you", "ada", "rex"]);
    fireEvent.click(screen.getByRole("button", { name: "Move Researcher up" }));
    expect(order()).toEqual(["you", "rex", "ada"]);
    fireEvent.keyDown(container.querySelector("li[data-member='you']")!, { key: "ArrowDown", altKey: true });
    expect(order()).toEqual(["rex", "you", "ada"]);
    fireEvent.click(screen.getByRole("button", { name: "Add Critic" }));
    expect(order()).toEqual(["rex", "you", "ada", "cri"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Ada" }));
    expect(order()).toEqual(["rex", "you", "cri"]);
    const mute = screen.getByRole("button", { name: "Mute Critic" });
    fireEvent.click(mute);
    expect(mute).toHaveAttribute("aria-pressed", "true");
    expect(onChange.mock.calls.at(-1)![0].find((m: AgentRoomMember) => m.id === "cri").muted).toBe(true);
    expect(screen.queryByRole("button", { name: "Remove You" })).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("AgentMessageNotice expands its payload", async () => {
    const { container } = render(
      <div>
        <AgentMessageNotice direction="outgoing" agent="Researcher" payload={"Find three comps\nwith pricing"} />
        <AgentMessageNotice direction="incoming" agent="Planner" payload="Plan ready" />
      </div>
    );
    const btn = screen.getByRole("button", { name: /Messaged Researcher\s?: Find three comps/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Message from Planner/ })).toBeInTheDocument();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/with pricing/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Subagents                                                           */
/* ------------------------------------------------------------------ */

const NOW = 1_000_000;
const tree: SubagentNode[] = [
  {
    id: "root",
    name: "Orchestrator",
    status: "running",
    startedAt: NOW - 90_000,
    tools: 2,
    tokens: 1000,
    cost: 0.01,
    heat: 0.9,
    activity: "Waiting on children",
    children: [
      { id: "a", name: "Researcher", type: "research", status: "done", elapsedMs: 30_000, tools: 5, cost: 0.2, batch: { index: 1, total: 2 } },
      {
        id: "b",
        name: "Coder",
        status: "running",
        startedAt: NOW - 60_000,
        tools: 3,
        cost: 0.05,
        heat: 0.2,
        activity: "edit src/app.ts",
        batch: { index: 2, total: 2 },
        children: [{ id: "b1", name: "Tester", status: "failed", elapsedMs: 5000, tools: 1 }],
      },
    ],
  },
  { id: "solo", name: "Summarizer", status: "waiting", tools: 0 },
];

describe("subagents", () => {
  it("rolls up counts", () => {
    expect(subagentRollup(tree[0]!)).toMatchObject({ tools: 11, agents: 3, tokens: 1000 });
  });

  it("renders a nested ARIA tree with rollups, heat and batch tags", async () => {
    const { container } = render(<SubagentTree nodes={tree} now={NOW} />);
    const items = screen.getAllByRole("treeitem");
    expect(items.map((i) => i.getAttribute("data-node"))).toEqual(["root", "a", "b", "b1", "solo"]);
    expect(items[0]).toHaveAttribute("aria-level", "1");
    expect(items[3]).toHaveAttribute("aria-level", "3");
    expect(items[0]).toHaveAttribute("aria-expanded", "true");
    expect(within(items[0]!).getByText("11 tools")).toBeInTheDocument();
    expect(within(items[0]!).getByText("3 agents")).toBeInTheDocument();
    expect(within(items[0]!).getByText("1m 30s")).toBeInTheDocument();
    expect(screen.getByText("[2/2]")).toBeInTheDocument();
    expect(items[0]!.querySelector("[data-row]")).toHaveClass("subagent-heat-4");
    expect(items[2]!.querySelector("[data-row]")).toHaveClass("subagent-heat-1");
    expect(items[4]!.querySelector("[data-row]")).toHaveClass("subagent-heat-0");
    expect(within(items[2]!).getByText("edit src/app.ts")).toHaveClass("text-shimmer");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("supports keyboard navigation", () => {
    const onOpen = vi.fn();
    render(<SubagentTree nodes={tree} now={NOW} onOpen={onOpen} />);
    const item = (id: string) => screen.getAllByRole("treeitem").find((i) => i.getAttribute("data-node") === id)!;
    expect(item("root")).toHaveAttribute("tabindex", "0");
    item("root").focus();
    fireEvent.keyDown(item("root"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(item("a"));
    fireEvent.keyDown(item("a"), { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("a");
    fireEvent.keyDown(item("a"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(item("b"));
    fireEvent.keyDown(item("b"), { key: "ArrowLeft" });
    expect(item("b")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Tester")).toBeNull();
    fireEvent.keyDown(item("b"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(item("root"));
    fireEvent.keyDown(item("root"), { key: "End" });
    expect(document.activeElement).toBe(item("solo"));
    fireEvent.keyDown(item("solo"), { key: "Home" });
    expect(document.activeElement).toBe(item("root"));
    fireEvent.keyDown(item("root"), { key: "ArrowLeft" });
    expect(screen.getAllByRole("treeitem")).toHaveLength(2);
    fireEvent.keyDown(item("root"), { key: "ArrowRight" });
    expect(screen.getAllByRole("treeitem").length).toBeGreaterThan(2);
  });

  it("steers and stops running subagents", () => {
    const onSteer = vi.fn();
    const onStop = vi.fn();
    render(<SubagentTree nodes={tree} now={NOW} onSteer={onSteer} onStop={onStop} />);
    expect(screen.queryByRole("button", { name: "Steer Researcher" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Steer Coder" }));
    const input = screen.getByRole("textbox", { name: "Message to Coder" });
    fireEvent.change(input, { target: { value: "use the existing helper" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSteer).toHaveBeenCalledWith("b", "use the existing helper");
    expect(screen.queryByRole("textbox", { name: "Message to Coder" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Stop Orchestrator" }));
    expect(onStop).toHaveBeenCalledWith("root");
  });

  it("sorts and filters", () => {
    render(<SubagentTree nodes={tree} now={NOW} />);
    const ids = () => screen.getAllByRole("treeitem").map((i) => i.getAttribute("data-node"));
    fireEvent.click(screen.getByRole("button", { name: "Cost" }));
    expect(ids()).toEqual(["root", "a", "b", "b1", "solo"]);
    fireEvent.click(screen.getByRole("button", { name: "Elapsed" }));
    expect(ids()).toEqual(["root", "b", "b1", "a", "solo"]);
    fireEvent.click(screen.getByRole("button", { name: "Status" }));
    expect(ids()).toEqual(["root", "b", "b1", "a", "solo"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Running only" }));
    expect(ids()).toEqual(["root", "b"]);
  });

  it("RunTicker pushes new lines and expands", async () => {
    vi.useFakeTimers();
    const acts = [
      { id: "1", text: "Reading README.md" },
      { id: "2", text: "Searching for auth" },
    ];
    const { container, rerender } = render(<RunTicker activities={acts} label="Coder" />);
    expect(container.querySelector("[data-ticker='current']")).toHaveTextContent("Searching for auth");
    expect(screen.getByText("2 activities")).toBeInTheDocument();
    rerender(<RunTicker activities={[...acts, { id: "3", text: "Editing auth.ts" }]} label="Coder" />);
    expect(container.querySelector("[data-ticker='current']")).toHaveTextContent("Editing auth.ts");
    expect(container.querySelector("[data-ticker='out']")).toHaveTextContent("Searching for auth");
    act(() => vi.advanceTimersByTime(400));
    expect(container.querySelector("[data-ticker='out']")).toBeNull();
    vi.useRealTimers();
    const btn = screen.getByRole("button", { expanded: false });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByRole("list", { name: "All activity" })).getAllByRole("listitem")).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("DelegateToolBody lists child tasks", async () => {
    const onOpen = vi.fn();
    const { container } = render(
      <DelegateToolBody
        onOpen={onOpen}
        tasks={[
          { id: "t1", title: "Survey pricing pages", agent: "Researcher", status: "done", elapsedMs: 42_000 },
          { id: "t2", title: "Draft landing copy", status: "running" },
          { id: "t3", title: "Check links", status: "failed", summary: "timeout" },
        ]}
      />
    );
    expect(screen.getByText("Delegated 3 tasks · 1 running · 1 done · 1 failed")).toBeInTheDocument();
    expect(screen.getByText("[1/3]")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open task 2" }));
    expect(onOpen).toHaveBeenCalledWith("t2");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Persona                                                             */
/* ------------------------------------------------------------------ */

describe("agent persona", () => {
  it("AgentAvatar is deterministic from the seed", () => {
    expect(randomAvatarSpec("ada")).toEqual(randomAvatarSpec("ada"));
    const { container: a } = render(<AgentAvatar spec={{ ...randomAvatarSpec("ada"), shape: "blob" }} />);
    const { container: b } = render(<AgentAvatar spec={{ ...randomAvatarSpec("ada"), shape: "blob" }} />);
    const { container: c } = render(<AgentAvatar spec={{ ...randomAvatarSpec("rex"), shape: "blob" }} />);
    const d = (el: HTMLElement) => el.querySelector("svg > path")!.getAttribute("d");
    expect(d(a)).toBe(d(b));
    expect(d(a)).not.toBe(d(c));
  });

  it("builder tabs update the preview", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <AgentAvatarBuilder defaultValue={{ shape: "circle", color: "#615fff", face: "dots", seed: "s1" }} onValueChange={onChange} />
    );
    const preview = () => screen.getByRole("img", { name: "Avatar preview" });
    fireEvent.click(screen.getByRole("radio", { name: "Hexagon" }));
    expect(preview()).toHaveAttribute("data-shape", "hexagon");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Face" }));
    fireEvent.click(await screen.findByRole("radio", { name: "Cyclops" }));
    expect(preview()).toHaveAttribute("data-face", "cyclops");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Color" }));
    fireEvent.click(await screen.findByRole("radio", { name: "Brand" }));
    expect(preview()).toHaveAttribute("data-color", "var(--primary)");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Generate" }));
    fireEvent.change(await screen.findByLabelText("Seed"), { target: { value: "hello" } });
    expect(onChange.mock.calls.at(-1)![0]).toEqual(randomAvatarSpec("hello"));
    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(onChange.mock.calls.at(-1)![0].seed).not.toBe("hello");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("PersonaEditor previews markdown", async () => {
    render(<PersonaEditor defaultValue={"# Ada\nCareful planner."} />);
    expect(screen.getByLabelText("Persona")).toHaveValue("# Ada\nCareful planner.");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Preview" }));
    expect(await screen.findByRole("heading", { name: "Ada" })).toBeInTheDocument();
  });

  it("CreateAgentDialog validates the name", async () => {
    expect(validateAgentName("  ")).toMatch(/name/);
    const onCreate = vi.fn();
    render(<CreateAgentDialog defaultOpen existingNames={["Ada"]} onCreate={onCreate} modelSlot={<span>model-picker</span>} />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("model-picker")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Create agent" }));
    expect(await within(dialog).findByText("Give the agent a name.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: "ada" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create agent" }));
    expect(await within(dialog).findByText(/already exists/)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: "Scout" } });
    fireEvent.change(within(dialog).getByLabelText("Persona"), { target: { value: "You scout." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create agent" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0]).toMatchObject({ name: "Scout", persona: "You scout." });
    expect(onCreate.mock.calls[0][0].avatar.shape).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

/* ------------------------------------------------------------------ */
/* Remote screen                                                       */
/* ------------------------------------------------------------------ */

describe("remote screen", () => {
  it("hands the control lease back and forth", async () => {
    const onController = vi.fn();
    const onScreenshot = vi.fn();
    const { container } = render(
      <RemoteScreenViewer state="live" latencyMs={42} onControllerChange={onController} onScreenshot={onScreenshot}>
        <canvas />
      </RemoteScreenViewer>
    );
    expect(screen.getByText("Agent is in control")).toBeInTheDocument();
    expect(screen.getByText("42 ms")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Take over" }));
    expect(onController).toHaveBeenLastCalledWith("user");
    expect(screen.getByText("You're in control")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hand back" }));
    expect(onController).toHaveBeenLastCalledWith("agent");
    fireEvent.click(screen.getByRole("button", { name: "Take screenshot" }));
    expect(onScreenshot).toHaveBeenCalled();
    const fit = screen.getByRole("button", { name: "Show actual size" });
    fireEvent.click(fit);
    expect(screen.getByRole("button", { name: "Scale to fit" })).toHaveAttribute("aria-pressed", "false");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("disables take over while disconnected and offers reconnect", () => {
    const onReconnect = vi.fn();
    render(<RemoteScreenViewer state="disconnected" frameSrc="data:image/png;base64,AA==" onReconnect={onReconnect} />);
    expect(screen.getByRole("button", { name: "Take over" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onReconnect).toHaveBeenCalled();
  });

  it("PermissionPreflightCard re-checks", async () => {
    let resolve!: () => void;
    const onRecheck = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const onOpen = vi.fn();
    const { container, rerender } = render(
      <PermissionPreflightCard
        onRecheck={onRecheck}
        onOpenSettings={onOpen}
        permissions={[
          { id: "screen", label: "Screen recording", state: "granted" },
          { id: "ax", label: "Accessibility", state: "denied" },
          { id: "mic", label: "Microphone", state: "unknown", optional: true },
        ]}
      />
    );
    expect(screen.getByText("1 of 3 granted")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Open settings/ })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: /Open settings/ })[0]!);
    expect(onOpen).toHaveBeenCalledWith("ax");
    const btn = screen.getByRole("button", { name: /Re-check/ });
    fireEvent.click(btn);
    expect(onRecheck).toHaveBeenCalled();
    await waitFor(() => expect(btn).toBeDisabled());
    await act(async () => resolve());
    await waitFor(() => expect(btn).not.toBeDisabled());
    rerender(
      <PermissionPreflightCard
        onRecheck={onRecheck}
        permissions={[
          { id: "screen", label: "Screen recording", state: "granted" },
          { id: "ax", label: "Accessibility", state: "granted" },
          { id: "mic", label: "Microphone", state: "unknown", optional: true },
        ]}
      />
    );
    expect(screen.getByText(/All set/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
