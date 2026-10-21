/** Bug-fix regressions in the agent-admin, capabilities and ops components (webhook routes, toolset and provider drawers, custom endpoints, agent creation, mentions, subagent tree). */
import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { WebhookRouteEditor, type WebhookRoute } from "../src/kits/agent-admin/webhooks";
import { ToolsetProviderDrawer, type ToolsetProvider } from "../src/kits/agent-admin/tool-toggles";
import { CustomEndpointForm, ProviderConnectDialog } from "../src/kits/agent-admin/llm-providers";
import { AgentAvatarBuilder, CreateAgentDialog } from "../src/kits/agent-admin/agent-persona";
import { AgentMessageNotice, parseAgentMentions, type AgentRoomMember } from "../src/kits/agent-admin/agent-room";
import { RunTicker, SubagentTree, type SubagentNode } from "../src/kits/agent-admin/subagents";
import { StatusStack, StatusStackRow } from "../src/kits/agent-admin/status-stack";
import { EnsembleBuilder, TaskModelAssignment, formatModelPrice, type RoutingProvider } from "../src/kits/agent-admin/model-routing";
import { ConnectorAccounts, McpServerCard } from "../src/kits/agent-admin/mcp";
import { PlatformConfigForm, formatChannelAgo } from "../src/kits/agent-admin/channels";
import { quantizationBits } from "../src/kits/agent-admin/local-models";
import { ExtensionInstallDialog } from "../src/kits/agent-admin/extensions-catalog";
import { BlueprintCard, fillBlueprintTemplate } from "../src/kits/agent-admin/agent-jobs";
import { RequestLogTable, describeRequestLog, formatRequestLatency, type RequestLogRecord } from "../src/kits/ops/request-inspector";
import { useStreamingTask } from "../src/kits/ops/progress-dialog";
import { AlertGroup } from "../src/kits/ops/alert-group";

const flush = () => act(async () => {});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => vi.useRealTimers());

/* ------------------------------------------------------------------ */
/* webhooks                                                            */
/* ------------------------------------------------------------------ */

describe("WebhookRouteEditor", () => {
  const a: WebhookRoute = { id: "a", name: "Route A", url: "https://hooks.example/a", events: ["push"], delivery: { platform: "local" }, enabled: true };
  const b: WebhookRoute = { id: "b", name: "Route B", url: "https://hooks.example/b", events: ["issues"], delivery: { platform: "local" }, enabled: false };

  it("resets the draft when another route is selected", async () => {
    const onSave = vi.fn();
    const { rerender } = render(<WebhookRouteEditor route={a} events={["push", "issues"]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Route A edited" } });
    rerender(<WebhookRouteEditor route={b} events={["push", "issues"]} onSave={onSave} />);
    expect(screen.getByLabelText(/Name/)).toHaveValue("Route B");
    fireEvent.click(screen.getByRole("button", { name: "Save route" }));
    await flush();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: "b", name: "Route B", events: ["issues"], enabled: false }));
  });

  it("does not crash on an invalid delivery date", () => {
    render(<WebhookRouteEditor route={{ ...a, deliveries: [{ id: "d", statusCode: 200, at: "nope" }] }} events={["push"]} />);
    expect(screen.getByRole("list", { name: "Recent deliveries" })).toHaveTextContent("—");
  });
});

/* ------------------------------------------------------------------ */
/* tool-toggles                                                        */
/* ------------------------------------------------------------------ */

describe("ToolsetProviderDrawer", () => {
  const providers: ToolsetProvider[] = [{ id: "brave", name: "Brave", fields: [{ key: "BRAVE_KEY", label: "Brave API key", isSet: true }] }];

  it("leaves edit mode after replacing an already-set key", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ToolsetProviderDrawer open title="Search" providers={providers} onSaveCredential={onSave} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace" }));
    fireEvent.change(within(dialog).getByLabelText("Brave API key"), { target: { value: "new-key" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await flush();
    expect(onSave).toHaveBeenCalledWith("brave", "BRAVE_KEY", "new-key");
    expect(within(dialog).getByRole("button", { name: "Replace" })).toBeInTheDocument();
    expect(within(dialog).getByText("Set")).toBeInTheDocument();
  });

  it("shows a failed save", async () => {
    render(<ToolsetProviderDrawer open title="Search" providers={providers} onSaveCredential={() => Promise.reject(new Error("Vault locked"))} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace" }));
    fireEvent.change(within(dialog).getByLabelText("Brave API key"), { target: { value: "k" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Vault locked");
  });

  it("selects the first provider once providers load", () => {
    const { rerender } = render(<ToolsetProviderDrawer open title="Search" providers={[]} />);
    rerender(<ToolsetProviderDrawer open title="Search" providers={providers} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("radio", { name: /Brave/ })).toBeChecked();
    expect(within(dialog).getByRole("region", { name: "Credentials" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* llm-providers                                                       */
/* ------------------------------------------------------------------ */

describe("ProviderConnectDialog", () => {
  const grant = { userCode: "WXYZ-1234", verificationUrl: "https://login.example/device", expiresIn: 60, interval: 2 };

  it("device flow keeps polling when the parent re-renders with an inline onPoll", async () => {
    vi.useFakeTimers();
    const onPoll = vi.fn().mockResolvedValue("pending");
    function Parent() {
      const [, setTick] = React.useState(0);
      React.useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
      }, []);
      return (
        <ProviderConnectDialog
          defaultOpen
          provider={{ name: "Nimbus" }}
          methods={["device"]}
          onStartDeviceFlow={async () => grant}
          onPollDeviceFlow={() => onPoll()}
        />
      );
    }
    render(<Parent />);
    fireEvent.click(screen.getByRole("button", { name: "Get sign-in code" }));
    await flush();
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(onPoll.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("device flow: the live region's text stays stable while the countdown ticks", async () => {
    vi.useFakeTimers();
    render(<ProviderConnectDialog defaultOpen provider={{ name: "Nimbus" }} methods={["device"]} onStartDeviceFlow={async () => grant} onPollDeviceFlow={async () => "pending"} />);
    fireEvent.click(screen.getByRole("button", { name: "Get sign-in code" }));
    await flush();
    const status = screen.getByRole("status");
    const countdown = document.querySelector('[data-slot="device-countdown"]')!;
    const before = { status: status.textContent, countdown: countdown.textContent };
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(countdown.textContent).not.toBe(before.countdown);
    expect(screen.getByRole("status").textContent).toBe(before.status);
    expect(status).not.toContainElement(countdown as HTMLElement);
  });

  it("API key: editing the key while validation is in flight drops the stale result", async () => {
    const d = deferred<{ ok: boolean }>();
    const onSaveKey = vi.fn();
    render(<ProviderConnectDialog defaultOpen provider={{ name: "Nimbus" }} defaultMethod="api-key" onValidateKey={() => d.promise} onSaveKey={onSaveKey} />);
    const input = screen.getByLabelText("Nimbus API key");
    fireEvent.change(input, { target: { value: "nk-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    fireEvent.change(input, { target: { value: "nk-unvalidated" } });
    await act(async () => d.resolve({ ok: true }));
    expect(screen.queryByText("Key works.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save key" })).toBeDisabled();
  });
});

describe("CustomEndpointForm", () => {
  it("drops a test result for values that changed while it ran", async () => {
    const d = deferred<{ ok: boolean; latencyMs: number }>();
    render(<CustomEndpointForm defaultValues={{ name: "x", baseUrl: "https://a.example" }} onTest={() => d.promise} />);
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    fireEvent.change(screen.getByLabelText(/Base URL/), { target: { value: "https://b.example" } });
    await act(async () => d.resolve({ ok: true, latencyMs: 10 }));
    expect(screen.queryByText(/Connected/)).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* agent-persona                                                       */
/* ------------------------------------------------------------------ */

describe("CreateAgentDialog", () => {
  it("keeps typed values when the parent re-renders with inline defaultValues", async () => {
    const { rerender } = render(<CreateAgentDialog defaultOpen defaultValues={{ role: "Helper" }} />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: "Scout" } });
    rerender(<CreateAgentDialog defaultOpen defaultValues={{ role: "Helper" }} />);
    await flush();
    expect(within(screen.getByRole("dialog")).getByLabelText(/^Name/)).toHaveValue("Scout");
  });
});

describe("AgentAvatarBuilder upload", () => {
  const spec = { shape: "circle", color: "#615fff", face: "dots", seed: "s1" } as const;

  it("applies the uploaded image on top of edits made while it uploaded", async () => {
    const d = deferred<string>();
    const onChange = vi.fn();
    render(<AgentAvatarBuilder defaultValue={{ ...spec }} onUpload={() => d.promise} onValueChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Upload" }));
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(await screen.findByLabelText("Upload avatar image"), { target: { files: [file] } });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Shape" }));
    fireEvent.click(await screen.findByRole("radio", { name: "Hexagon" }));
    await act(async () => d.resolve("https://img.example/a.png"));
    expect(onChange.mock.lastCall![0]).toMatchObject({ shape: "hexagon", imageUrl: "https://img.example/a.png" });
  });

  it("shows an error when the upload fails", async () => {
    render(<AgentAvatarBuilder defaultValue={{ ...spec }} onUpload={() => Promise.reject(new Error("Too large"))} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Upload" }));
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(await screen.findByLabelText("Upload avatar image"), { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Too large");
  });
});

/* ------------------------------------------------------------------ */
/* agent-room                                                          */
/* ------------------------------------------------------------------ */

describe("parseAgentMentions", () => {
  const members: AgentRoomMember[] = [
    { id: "z", name: "Zoë", kind: "agent" },
    { id: "r", name: "研究员", kind: "agent" },
    { id: "p", name: "Planner", kind: "agent" },
  ];
  const mentions = (text: string) =>
    parseAgentMentions(text, members)
      .filter((p): p is { mention: AgentRoomMember; text: string } => typeof p !== "string")
      .map((p) => p.mention.id);

  it("matches non-ASCII names and ignores e-mail addresses", () => {
    expect(mentions("hi @Zoë, ask @研究员.")).toEqual(["z", "r"]);
    expect(mentions("mail foo@Planner.com")).toEqual([]);
    expect(mentions("@Planner: go")).toEqual(["p"]);
    expect(mentions("@Plannerx")).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* subagents                                                           */
/* ------------------------------------------------------------------ */

describe("SubagentTree", () => {
  it("expands parents whose children stream in after mount", () => {
    const root: SubagentNode = { id: "root", name: "Root", status: "running" };
    const { rerender } = render(<SubagentTree nodes={[root]} now={0} />);
    rerender(<SubagentTree nodes={[{ ...root, children: [{ id: "c", name: "Child", status: "running" }] }]} now={0} />);
    const items = screen.getAllByRole("treeitem");
    expect(items[0]).toHaveAttribute("aria-expanded", "true");
    expect(items.map((i) => i.getAttribute("data-node"))).toEqual(["root", "c"]);
  });

  it("still lets the user collapse an auto-expanded node", () => {
    const onExpandedChange = vi.fn();
    const nodes: SubagentNode[] = [{ id: "root", name: "Root", status: "running", children: [{ id: "c", name: "Child", status: "running" }] }];
    render(<SubagentTree nodes={nodes} now={0} onExpandedChange={onExpandedChange} />);
    const root = screen.getAllByRole("treeitem")[0]!;
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(root).toHaveAttribute("aria-expanded", "false");
    expect(onExpandedChange).toHaveBeenLastCalledWith([]);
  });
});

/* ------------------------------------------------------------------ */
/* status-stack                                                        */
/* ------------------------------------------------------------------ */

describe("StatusStack", () => {
  it("shows a new row in a slot whose previous row was dismissed", () => {
    const view = (goal: string | null) => (
      <StatusStack defaultCollapsed={false}>
        {goal ? <StatusStackRow label="Goal" title={goal} onDismiss={() => {}} /> : null}
        <StatusStackRow label="Loop" />
      </StatusStack>
    );
    const { rerender } = render(view("Goal 1"));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Goal" }));
    expect(screen.queryByText("Goal 1")).not.toBeInTheDocument();
    rerender(view(null));
    rerender(view("Goal 2"));
    expect(screen.getByText("Goal 2")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* model-routing                                                       */
/* ------------------------------------------------------------------ */

const routing: RoutingProvider[] = [
  { id: "nimbus", name: "Nimbus", configured: true, models: [{ id: "opal", name: "Opal" }] },
];

describe("model-routing", () => {
  it("formatModelPrice keeps sub-cent precision", () => {
    expect(formatModelPrice({ inputPrice: 0.075, outputPrice: 0.3 })).toBe("$0.075 / $0.3");
    expect(formatModelPrice({ inputPrice: 0.004, outputPrice: 3 })).toBe("$0.004 / $3");
  });

  it("TaskModelAssignment ids are unique per instance", () => {
    const { container } = render(
      <>
        <TaskModelAssignment providers={routing} tasks={[{ id: "vision", label: "Vision" }]} />
        <TaskModelAssignment providers={routing} tasks={[{ id: "vision", label: "Vision" }]} />
      </>
    );
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("EnsembleBuilder rounds field can be cleared and retyped", () => {
    const onValueChange = vi.fn();
    render(<EnsembleBuilder providers={routing} defaultValue={{ references: [], aggregator: null, rounds: 2 }} onValueChange={onValueChange} />);
    const rounds = screen.getByLabelText("Rounds");
    fireEvent.change(rounds, { target: { value: "" } });
    expect(rounds).toHaveValue(null);
    fireEvent.change(rounds, { target: { value: "3" } });
    expect(onValueChange.mock.lastCall![0].rounds).toBe(3);
    expect(onValueChange.mock.calls.some((c) => c[0].rounds === 1)).toBe(false);
    fireEvent.change(rounds, { target: { value: "" } });
    fireEvent.blur(rounds);
    expect(rounds).toHaveValue(3);
  });
});

/* ------------------------------------------------------------------ */
/* mcp                                                                 */
/* ------------------------------------------------------------------ */

describe("McpServerCard OAuth", () => {
  it("ignores a stale attempt after Cancel", async () => {
    const d = deferred<void>();
    render(<McpServerCard name="notion" transport="http" status="needs-auth" onConnect={() => d.promise} />);
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => d.reject(new Error("Sign-in window was closed")));
    expect(screen.queryByText("Sign-in window was closed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("ignores the superseded attempt after Retry", async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    const onConnect = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<McpServerCard name="notion" transport="http" status="needs-auth" onConnect={onConnect} />);
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => first.reject(new Error("old attempt failed")));
    expect(screen.queryByText("old attempt failed")).not.toBeInTheDocument();
    expect(screen.getByText(/Waiting for sign-in/)).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* channels                                                            */
/* ------------------------------------------------------------------ */

describe("PlatformConfigForm", () => {
  it("shows a rejected save", async () => {
    render(
      <PlatformConfigForm
        platform="slack"
        fields={[{ name: "TOKEN", label: "Token" }]}
        defaultValues={{ TOKEN: "x" }}
        onSubmit={() => Promise.reject(new Error("Gateway unreachable"))}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Gateway unreachable");
  });

  it("formatChannelAgo rounds at unit boundaries and handles invalid input", () => {
    const now = Date.UTC(2026, 9, 18, 12);
    expect(formatChannelAgo(now - 59.5 * 60_000, now)).not.toMatch(/60m/);
    expect(formatChannelAgo("nope", now)).not.toMatch(/NaN/);
  });
});

/* ------------------------------------------------------------------ */
/* local-models                                                        */
/* ------------------------------------------------------------------ */

describe("quantizationBits", () => {
  it("knows common 4-bit formats", () => {
    expect(quantizationBits("MXFP4")).toBeCloseTo(4.25);
    expect(quantizationBits("NVFP4")).toBeCloseTo(4.25);
    expect(quantizationBits("AWQ")).toBe(4.5);
    expect(quantizationBits("GPTQ")).toBe(4.5);
    expect(quantizationBits("bnb-NF4")).toBe(4.5);
    expect(quantizationBits("EXL2 4.65bpw")).toBe(4.65);
    expect(quantizationBits("GPTQ-Int8")).toBe(8.5);
    expect(quantizationBits("Q4_K_M")).toBe(4.6);
  });
});

/* ------------------------------------------------------------------ */
/* extensions-catalog                                                  */
/* ------------------------------------------------------------------ */

describe("ExtensionInstallDialog", () => {
  it("resets the risk acknowledgement for another plugin", () => {
    const { rerender } = render(<ExtensionInstallDialog open name="Alpha" source="https://a.example/alpha.git" />);
    fireEvent.click(screen.getByLabelText("I understand the risk"));
    expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
    rerender(<ExtensionInstallDialog open name="Beta" source="https://b.example/beta.git" />);
    expect(screen.getByLabelText("I understand the risk")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Install" })).toBeDisabled();
  });

  it("resets the risk acknowledgement when reopened", () => {
    const { rerender } = render(<ExtensionInstallDialog open name="Alpha" source="https://a.example/alpha.git" />);
    fireEvent.click(screen.getByLabelText("I understand the risk"));
    rerender(<ExtensionInstallDialog open={false} name="Alpha" source="https://a.example/alpha.git" />);
    rerender(<ExtensionInstallDialog open name="Alpha" source="https://a.example/alpha.git" />);
    expect(screen.getByLabelText("I understand the risk")).not.toBeChecked();
  });
});

/* ------------------------------------------------------------------ */
/* aria-controls on collapsed disclosures                              */
/* ------------------------------------------------------------------ */

describe("collapsed disclosures don't point aria-controls at missing elements", () => {
  const check = (root: ParentNode) => {
    const buttons = [...root.querySelectorAll('[aria-expanded="false"][aria-controls]')];
    for (const b of buttons) expect(document.getElementById(b.getAttribute("aria-controls")!)).not.toBeNull();
  };

  it("AgentMessageNotice, RunTicker, ConnectorAccounts, BlueprintCard, ExtensionInstallDialog", () => {
    const { container } = render(
      <>
        <AgentMessageNotice direction="outgoing" agent="Planner" payload="hello" />
        <RunTicker activities={[{ id: "1", text: "reading" }]} />
        <ConnectorAccounts accounts={[{ id: "a", alias: "Old", status: "retired" }]} />
        <BlueprintCard blueprint={{ id: "b", title: "Briefing", description: "Daily", schedule: "every 1h" }} />
      </>
    );
    expect(container.querySelectorAll('[aria-expanded="false"]').length).toBeGreaterThanOrEqual(4);
    check(container);
    render(<ExtensionInstallDialog open name="X" sha="abc" />);
    check(document.body);
  });
});

/* ------------------------------------------------------------------ */
/* request-inspector                                                   */
/* ------------------------------------------------------------------ */

describe("request-inspector", () => {
  const rec: RequestLogRecord = { id: "r1", timestamp: Date.UTC(2026, 9, 18, 12), status: 200, model: "m", stream: true, params: { temperature: 1 } };

  it("describeRequestLog does not mutate the caller's params", () => {
    const params = { temperature: 1 };
    const d = describeRequestLog({ ...rec, params });
    expect(d.params).toEqual({ temperature: 1, stream: true });
    expect(params).toEqual({ temperature: 1 });
  });

  it("formatRequestLatency never shows 60s", () => {
    expect(formatRequestLatency(119_600)).toBe("2m 0s");
    expect(formatRequestLatency(119_400)).toBe("1m 59s");
  });

  it("detail ids are unique across two tables", () => {
    const { container } = render(
      <>
        <RequestLogTable records={[rec]} expandedId="r1" />
        <RequestLogTable records={[rec]} expandedId="r1" />
      </>
    );
    const controls = [...container.querySelectorAll("[aria-controls]")].map((e) => e.getAttribute("aria-controls"));
    const detail = controls.filter((c) => c && container.querySelector(`[id="${c}"]`)?.tagName === "TD");
    expect(detail).toHaveLength(2);
    expect(new Set(detail).size).toBe(2);
  });

  it("does not crash on an invalid timestamp", () => {
    render(<RequestLogTable records={[{ ...rec, timestamp: "nope" }]} expandedId="r1" />);
    expect(screen.getAllByText("r1").length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* progress-dialog                                                     */
/* ------------------------------------------------------------------ */

describe("useStreamingTask with an EventSource", () => {
  function makeSource(readyState: number) {
    const listeners: Record<string, ((e: unknown) => void)[]> = {};
    return {
      readyState,
      addEventListener: (t: string, l: (e: unknown) => void) => (listeners[t] ??= []).push(l),
      removeEventListener: (t: string, l: (e: unknown) => void) => {
        listeners[t] = (listeners[t] ?? []).filter((x) => x !== l);
      },
      close: vi.fn(),
      emit: (t: string, e: unknown) => listeners[t]?.forEach((l) => l(e)),
    };
  }

  function setup() {
    let result!: ReturnType<typeof useStreamingTask>;
    function Probe() {
      result = useStreamingTask();
      return null;
    }
    render(<Probe />);
    return () => result;
  }

  it("keeps running through a transient reconnect error", async () => {
    const get = setup();
    const source = makeSource(0);
    act(() => void get().start(source));
    await act(async () => {
      await Promise.resolve();
      source.emit("error", new Event("error"));
    });
    expect(get().state).toBe("running");
    expect(source.close).not.toHaveBeenCalled();
    await act(async () => source.emit("message", { data: '{"done":true}' }));
    expect(get().state).toBe("succeeded");
  });

  it("fails when the source is closed", async () => {
    const get = setup();
    const source = makeSource(2);
    act(() => void get().start(source));
    await act(async () => {
      await Promise.resolve();
      source.emit("error", new Event("error"));
    });
    expect(get().state).toBe("failed");
    expect(get().error).toBe("Connection lost");
  });

  it("fails on a server-sent error event with a message", async () => {
    const get = setup();
    const source = makeSource(1);
    act(() => void get().start(source));
    await act(async () => {
      await Promise.resolve();
      source.emit("error", { data: '{"error":"Disk full"}' });
    });
    expect(get().state).toBe("failed");
    expect(get().error).toBe("Disk full");
  });
});

/* ------------------------------------------------------------------ */
/* alert-group                                                         */
/* ------------------------------------------------------------------ */

describe("AlertGroup", () => {
  it("does not crash on an invalid alert time", () => {
    render(<AlertGroup alerts={[{ id: "a", severity: "warning", message: "Low space", time: "nope" }]} />);
    expect(screen.getByText("Low space")).toBeInTheDocument();
  });
});

void waitFor;

/* ------------------------------------------------------------------ */
/* agent-jobs: fillBlueprintTemplate                                   */
/* ------------------------------------------------------------------ */

describe("fillBlueprintTemplate shell escaping", () => {
  const tpl = 'sutra cron add "{schedule}" --city "{city}" --tag {tag} --note \'{note}\'';

  it("leaves values untouched without the shell option", () => {
    expect(fillBlueprintTemplate("hi {name}", { name: 'a"b' })).toBe('hi a"b');
  });

  it("escapes values for their quoting context", () => {
    const out = fillBlueprintTemplate(tpl, { schedule: "0 7 * * *", city: 'Lis"bon $(rm -rf ~) `id` \\ x!', tag: "two words;rm", note: "it's" }, { escape: "shell" });
    expect(out).toBe(
      'sutra cron add "0 7 * * *" --city "Lis\\"bon \\$(rm -rf ~) \\`id\\` \\\\ x"\'!\'"" --tag \'two words;rm\' --note \'it\'\\\'\'s\''
    );
    expect(fillBlueprintTemplate("--tag {tag}", { tag: "simple-1.2" }, { escape: "shell" })).toBe("--tag simple-1.2");
    expect(fillBlueprintTemplate("--tag {tag}", { tag: "" }, { escape: "shell" })).toBe("--tag {tag}");
  });

  it("BlueprintCard's copyable command can't be broken out of", () => {
    render(
      <BlueprintCard
        defaultExpanded
        blueprint={{ id: "b", title: "B", description: "d", schedule: "every 1h", cliCommand: 'sutra add --city "{city}"', slots: [{ id: "city", label: "City", type: "text", defaultValue: 'x"; rm -rf ~; echo "' }] }}
      />
    );
    expect(document.querySelector('[data-slot="blueprint-cli"]')).toHaveTextContent('sutra add --city "x\\"; rm -rf ~; echo \\""');
  });
});
