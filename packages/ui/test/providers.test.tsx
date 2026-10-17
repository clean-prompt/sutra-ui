import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  CustomEndpointForm,
  ProviderConnectDialog,
  ProviderKeysGroups,
  ProviderList,
  ProviderQuotaChip,
  formatTokenExpiry,
  providerMonogram,
  type ProviderEntry,
} from "../src/components/providers";
import {
  EnsembleBuilder,
  FallbackChainEditor,
  ModelInfoCard,
  ModelVisibilityManager,
  ProviderModelPicker,
  ReasoningPill,
  TaskModelAssignment,
  formatModelPrice,
  type ModelRef,
  type RoutingProvider,
} from "../src/components/model-routing";
import { BackendPicker, type BackendOption } from "../src/components/backends";
import {
  HardwareFitHint,
  LocalModelBrowser,
  StagedSetupHero,
  SystemResourcesBar,
  estimateModelFit,
  quantizationBits,
  type LocalModelListing,
  type SetupStage,
} from "../src/components/local-models";
import { axeViolations } from "./a11y";

const NOW = Date.UTC(2026, 9, 18, 12);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const flush = () => act(async () => {});

afterEach(() => vi.useRealTimers());

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const providerEntries: ProviderEntry[] = [
  { id: "nimbus", name: "Nimbus AI", auth: "oauth", status: "connected", tokenExpiresAt: NOW + 12 * DAY, modelCount: 14, quota: { used: 62, resetsAt: NOW + 3 * HOUR } },
  { id: "corvid", name: "Corvid", auth: "api-key", status: "expired", tokenExpiresAt: NOW - 2 * DAY, modelCount: 9 },
  { id: "relay", name: "Relay Router", auth: "api-key", status: "not-configured", description: "300+ models behind one key" },
  { id: "hearth", name: "Hearth Local", auth: "local", status: "error", error: "Daemon not running" },
  { id: "gateway", name: "Team Gateway", auth: "custom", status: "not-configured" },
];

const routing: RoutingProvider[] = [
  {
    id: "nimbus",
    name: "Nimbus AI",
    configured: true,
    models: [
      { id: "opal", name: "Nimbus Opal", contextLength: 200_000, inputPrice: 3, outputPrice: 15, capabilities: ["tools", "vision", "reasoning"] },
      { id: "quartz-mini", name: "Nimbus Quartz Mini", contextLength: 128_000, inputPrice: 0.25, outputPrice: 1.25, capabilities: ["tools"] },
      { id: "council", name: "Council Ensemble", ensemble: true },
    ],
  },
  {
    id: "corvid",
    name: "Corvid",
    configured: true,
    models: [
      { id: "c5", name: "Corvid 5", contextLength: 400_000, capabilities: ["tools", "reasoning"] },
      { id: "c-vision", name: "Corvid Vision", capabilities: ["vision"] },
    ],
  },
  { id: "relay", name: "Relay Router", configured: false, models: [{ id: "auto", name: "Relay Auto" }] },
];

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

describe("helpers", () => {
  it("formats token expiry and monograms", () => {
    expect(formatTokenExpiry(NOW + 12 * DAY, NOW)).toBe("expires in 12d");
    expect(formatTokenExpiry(NOW + 3 * HOUR, NOW)).toBe("expires in 3h");
    expect(formatTokenExpiry(NOW - 2 * DAY, NOW)).toBe("expired 2d ago");
    expect(formatTokenExpiry(undefined, NOW)).toBe("");
    expect(providerMonogram("Nimbus AI")).toBe("NA");
    expect(providerMonogram("corvid")).toBe("CO");
    expect(formatModelPrice({ inputPrice: 3, outputPrice: 15 })).toBe("$3 / $15");
    expect(formatModelPrice({ inputPrice: 0, outputPrice: 0 })).toBe("Free");
  });
});

describe("ProviderList", () => {
  it("groups providers, shows status, expiry and model count, and wires actions", async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const { container } = render(<ProviderList providers={providerEntries} now={NOW} onConnect={onConnect} onDisconnect={onDisconnect} onManage={() => {}} />);
    const connected = screen.getByRole("region", { name: /Connected/ });
    const available = screen.getByRole("region", { name: /Available/ });
    expect(within(connected).getAllByRole("listitem")).toHaveLength(3);
    expect(within(available).getAllByRole("listitem")).toHaveLength(2);
    expect(within(available).getByText("Relay Router")).toBeInTheDocument();

    const nimbus = container.querySelector('[data-status="connected"]') as HTMLElement;
    expect(within(nimbus).getByText("Expires in 12d")).toBeInTheDocument();
    expect(within(nimbus).getByText("14 models")).toBeInTheDocument();
    expect(within(nimbus).getByText("OAuth")).toBeInTheDocument();
    expect(within(nimbus).getByRole("meter", { name: "Nimbus AI quota" })).toHaveAttribute("aria-valuenow", "38");

    const corvid = container.querySelector('[data-status="expired"]') as HTMLElement;
    expect(within(corvid).getByText("Expired")).toBeInTheDocument();
    expect(within(corvid).getByText("Expired 2d ago")).toBeInTheDocument();
    expect(screen.getByText("Daemon not running")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Connect Relay Router" }));
    expect(onConnect).toHaveBeenCalledWith(expect.objectContaining({ id: "relay" }));
    fireEvent.click(screen.getByRole("button", { name: "Reconnect Corvid" }));
    expect(onConnect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "corvid" }));
    fireEvent.click(screen.getByRole("button", { name: "Disconnect Nimbus AI" }));
    expect(onDisconnect).toHaveBeenCalledWith(expect.objectContaining({ id: "nimbus" }));
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ProviderQuotaChip", () => {
  it("applies thresholds to the used percentage", async () => {
    const { container } = render(
      <div>
        <ProviderQuotaChip used={50} label="A" />
        <ProviderQuotaChip used={80} label="B" />
        <ProviderQuotaChip used={95} label="C" resetsAt={NOW + 3 * HOUR} now={NOW} />
        <ProviderQuotaChip used={55} label="D" thresholds={{ warn: 50, danger: 60 }} />
      </div>
    );
    expect(screen.getByRole("meter", { name: "A" })).toHaveAttribute("data-level", "ok");
    expect(screen.getByRole("meter", { name: "B" })).toHaveAttribute("data-level", "warn");
    const c = screen.getByRole("meter", { name: "C" });
    expect(c).toHaveAttribute("data-level", "danger");
    expect(c).toHaveAttribute("aria-valuetext", "5% left, resets in 3h 0m");
    expect(screen.getByRole("meter", { name: "D" })).toHaveAttribute("data-level", "warn");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ProviderConnectDialog", () => {
  const grant = { userCode: "WXYZ-1234", verificationUrl: "https://login.nimbus.example/device", expiresIn: 10, interval: 2 };

  it("device code: shows the code, polls and completes on approval", async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockResolvedValue(grant);
    const onPoll = vi.fn().mockResolvedValueOnce("pending").mockResolvedValueOnce("approved");
    const onConnected = vi.fn();
    render(
      <ProviderConnectDialog defaultOpen provider={{ name: "Nimbus AI" }} methods={["device"]} onStartDeviceFlow={onStart} onPollDeviceFlow={onPoll} onConnected={onConnected} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Get sign-in code" }));
    await flush();
    expect(screen.getByText("WXYZ-1234")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /login\.nimbus\.example\/device/ })).toHaveAttribute("href", grant.verificationUrl);
    expect(screen.getByText("Waiting for approval…")).toBeInTheDocument();
    expect(screen.getByText("0:10")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onPoll).toHaveBeenCalledTimes(1);
    expect(screen.getByText("0:08")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    await flush();
    expect(onPoll).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Connected to Nimbus AI.")).toBeInTheDocument();
    expect(onConnected).toHaveBeenCalledWith("device");
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it("device code: expires and restarts", async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockResolvedValue({ ...grant, expiresIn: 3 });
    const onPoll = vi.fn().mockResolvedValue("pending");
    render(<ProviderConnectDialog defaultOpen provider={{ name: "Nimbus AI" }} methods={["device"]} onStartDeviceFlow={onStart} onPollDeviceFlow={onPoll} />);
    fireEvent.click(screen.getByRole("button", { name: "Get sign-in code" }));
    await flush();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("The code expired before it was approved.")).toBeInTheDocument();
    expect(screen.queryByText("WXYZ-1234")).not.toBeInTheDocument();
    const polls = onPoll.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });
    expect(onPoll).toHaveBeenCalledTimes(polls);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    await flush();
    expect(onStart).toHaveBeenCalledTimes(2);
    expect(screen.getByText("WXYZ-1234")).toBeInTheDocument();
    expect(screen.getByText("0:03")).toBeInTheDocument();
  });

  it("paste-code: surfaces errors and succeeds", async () => {
    const onSubmitCode = vi.fn().mockRejectedValueOnce(new Error("Invalid code")).mockResolvedValueOnce(undefined);
    const onConnected = vi.fn();
    render(
      <ProviderConnectDialog
        defaultOpen
        provider={{ name: "Nimbus AI" }}
        defaultMethod="pkce"
        authorizeUrl="https://login.nimbus.example/authorize"
        onSubmitCode={onSubmitCode}
        onConnected={onConnected}
      />
    );
    expect(screen.getByRole("tab", { name: "Paste code" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "sign-in page" })).toHaveAttribute("href", "https://login.nimbus.example/authorize");
    const input = screen.getByLabelText("Authorization code");
    fireEvent.change(input, { target: { value: " abc123 " } });
    fireEvent.click(screen.getByRole("button", { name: "Submit code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid code");
    expect(onSubmitCode).toHaveBeenCalledWith("abc123");
    fireEvent.click(screen.getByRole("button", { name: "Submit code" }));
    expect(await screen.findByText("Signed in.")).toBeInTheDocument();
    expect(onConnected).toHaveBeenCalledWith("pkce");
  });

  it("API key: validates before saving", async () => {
    const onValidateKey = vi.fn().mockResolvedValueOnce({ ok: false, message: "Key rejected (401)" }).mockResolvedValueOnce({ ok: true, message: "Key works · 14 models" });
    const onSaveKey = vi.fn();
    const { baseElement } = render(
      <ProviderConnectDialog
        defaultOpen
        provider={{ name: "Nimbus AI" }}
        defaultMethod="api-key"
        getKeyUrl="https://console.nimbus.example/keys"
        onValidateKey={onValidateKey}
        onSaveKey={onSaveKey}
      />
    );
    expect(screen.getByRole("link", { name: /Get a key/ })).toHaveAttribute("href", "https://console.nimbus.example/keys");
    const save = screen.getByRole("button", { name: "Save key" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nimbus AI API key"), { target: { value: "nk-bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(await screen.findByText("Key rejected (401)")).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nimbus AI API key"), { target: { value: "nk-good-1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(await screen.findByText("Key works · 14 models")).toBeInTheDocument();
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));
    expect(onSaveKey).toHaveBeenCalledWith("nk-good-1234");
    expect(screen.getByText("Key saved for Nimbus AI.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Saved key" })).toBeInTheDocument();
  });

  it("switches tabs and passes axe on the device tab", async () => {
    const { baseElement } = render(<ProviderConnectDialog defaultOpen provider={{ name: "Nimbus AI" }} onStartDeviceFlow={async () => grant} />);
    expect(screen.getByRole("dialog", { name: "Connect Nimbus AI" })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "API key" }), { button: 0 });
    expect(screen.getByRole("tab", { name: "API key" })).toHaveAttribute("aria-selected", "true");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Device code" }), { button: 0 });
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
  });
});

describe("CustomEndpointForm", () => {
  it("validates the URL, tests the connection and saves", async () => {
    const onTest = vi.fn().mockResolvedValue({ ok: true, latencyMs: 182.4, models: ["mx-large", "mx-small", "mx-embed"] });
    const onSave = vi.fn();
    const { container } = render(<CustomEndpointForm onTest={onTest} onSave={onSave} />);
    const test = screen.getByRole("button", { name: "Test connection" });
    expect(test).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Gateway" } });
    fireEvent.change(screen.getByLabelText(/Base URL/), { target: { value: "not a url" } });
    expect(screen.getByText("Enter an http(s) URL.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Base URL/), { target: { value: "https://llm.example.internal/v1/" } });
    fireEvent.click(screen.getByRole("button", { name: "Add header" }));
    fireEvent.change(screen.getByLabelText("Header 1 name"), { target: { value: "X-Team" } });
    fireEvent.change(screen.getByLabelText("Header 1 value"), { target: { value: "core" } });
    fireEvent.click(test);
    expect(await screen.findByText(/Connected · 182 ms · 3 models found/)).toBeInTheDocument();
    expect(screen.getByText("mx-embed")).toBeInTheDocument();
    expect(onTest).toHaveBeenCalledWith(expect.objectContaining({ baseUrl: "https://llm.example.internal/v1", apiMode: "openai", headers: [{ key: "X-Team", value: "core" }] }));
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Save endpoint" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Gateway", baseUrl: "https://llm.example.internal/v1" }));
  });

  it("shows a failed test", async () => {
    render(<CustomEndpointForm defaultValues={{ name: "x", baseUrl: "http://localhost:9" }} onTest={() => Promise.reject(new Error("ECONNREFUSED"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
    expect(await screen.findByText("ECONNREFUSED")).toBeInTheDocument();
  });
});

describe("ProviderKeysGroups", () => {
  it("sorts groups by priority and clears / sets keys", async () => {
    const onClearKey = vi.fn();
    const onSetKey = vi.fn();
    const onAddCustomKey = vi.fn();
    const { container } = render(
      <ProviderKeysGroups
        groups={[
          { id: "b", name: "Corvid", priority: 2, keys: [{ name: "CORVID_API_KEY" }] },
          { id: "a", name: "Nimbus AI", priority: 1, keys: [{ name: "NIMBUS_API_KEY", value: "nk-secret-123" }] },
        ]}
        customKeys={[{ name: "HTTP_PROXY", value: "http://proxy:8080" }]}
        onClearKey={onClearKey}
        onSetKey={onSetKey}
        onAddCustomKey={onAddCustomKey}
      />
    );
    const headings = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(headings.slice(0, 3)).toEqual(["Nimbus AI", "Corvid", "Custom keys"]);
    expect(screen.queryByText("nk-secret-123")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show nimbus_api_key" }));
    expect(screen.getByText("nk-secret-123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear NIMBUS_API_KEY" }));
    expect(onClearKey).toHaveBeenCalledWith("NIMBUS_API_KEY");
    fireEvent.change(screen.getByLabelText("Value for CORVID_API_KEY"), { target: { value: "ck-1" } });
    fireEvent.click(within(screen.getByRole("region", { name: "Corvid" })).getByRole("button", { name: "Save" }));
    expect(onSetKey).toHaveBeenCalledWith("CORVID_API_KEY", "ck-1");
    fireEvent.change(screen.getByLabelText("Variable name"), { target: { value: "my_var" } });
    fireEvent.change(screen.getByLabelText("Variable value"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAddCustomKey).toHaveBeenCalledWith("MY_VAR", "1");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Model routing                                                       */
/* ------------------------------------------------------------------ */

describe("ProviderModelPicker", () => {
  it("highlights search matches and marks the current model", async () => {
    const { container } = render(<ProviderModelPicker providers={routing} value={{ providerId: "nimbus", modelId: "opal" }} />);
    expect(screen.getByRole("option", { name: /Nimbus Opal/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getAllByText("200K ctx")).toHaveLength(1);
    expect(screen.getByText("$3 / $15 /Mtok")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search models" }), { target: { value: "quartz" } });
    const models = screen.getByRole("listbox", { name: "Nimbus AI models" });
    expect(within(models).getAllByRole("option")).toHaveLength(1);
    expect(container.querySelector("mark")).toHaveTextContent("Quartz");
    fireEvent.change(screen.getByRole("textbox", { name: "Search models" }), { target: { value: "vision" } });
    expect(screen.getByRole("listbox", { name: "Corvid models" })).toBeInTheDocument();
    expect(container.querySelector("mark")).toHaveTextContent("Vision");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("moves between columns with the keyboard and selects with Enter", () => {
    const onSelect = vi.fn();
    render(<ProviderModelPicker providers={routing} onSelect={onSelect} />);
    const providers = screen.getByRole("listbox", { name: "Providers" });
    providers.focus();
    fireEvent.keyDown(providers, { key: "ArrowDown" });
    expect(within(providers).getByRole("option", { name: /Corvid/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(providers, { key: "ArrowRight" });
    const models = screen.getByRole("listbox", { name: "Corvid models" });
    expect(document.activeElement).toBe(models);
    fireEvent.keyDown(models, { key: "ArrowDown" });
    expect(document.getElementById(models.getAttribute("aria-activedescendant")!)).toHaveTextContent("Corvid Vision");
    fireEvent.keyDown(models, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith({ providerId: "corvid", modelId: "c-vision" }, expect.objectContaining({ name: "Corvid Vision" }));
    fireEvent.keyDown(models, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(providers);
  });

  it("shows a Set up CTA for unconfigured providers and an empty state with none configured", async () => {
    const onSetupProvider = vi.fn();
    const { rerender, container } = render(<ProviderModelPicker providers={routing} onSetupProvider={onSetupProvider} />);
    fireEvent.click(screen.getByRole("option", { name: /Relay Router/ }));
    expect(screen.getByText("Relay Router isn't set up")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set up Relay Router" }));
    expect(onSetupProvider).toHaveBeenCalledWith("relay");
    expect(await axeViolations(container)).toEqual([]);
    rerender(<ProviderModelPicker providers={routing.map((p) => ({ ...p, configured: false }))} emptyActions={<button type="button">Add API key</button>} />);
    expect(screen.getByText("No providers connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add API key" })).toBeInTheDocument();
  });
});

describe("ModelVisibilityManager", () => {
  it("toggles visibility, adds custom ids and resets", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<ModelVisibilityManager providers={routing} onValueChange={onValueChange} />);
    expect(screen.getByText("3 of 3 visible")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Show Nimbus Opal" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ hidden: ["nimbus/opal"], custom: [] });
    expect(screen.getByRole("switch", { name: "Show Nimbus Opal" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("2 of 3 visible")).toBeInTheDocument();

    const input = screen.getByRole("textbox", { name: "Custom model id" });
    fireEvent.change(input, { target: { value: "opal-preview-0915" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ hidden: ["nimbus/opal"], custom: [{ providerId: "nimbus", modelId: "opal-preview-0915" }] });
    expect(screen.getByRole("switch", { name: "Show opal-preview-0915" })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "opal" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("alert")).toHaveTextContent("already in the list");
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ hidden: [], custom: [] });
    expect(screen.getByText("3 of 3 visible")).toBeInTheDocument();
  });
});

describe("FallbackChainEditor", () => {
  const initial: ModelRef[] = [
    { providerId: "nimbus", modelId: "opal" },
    { providerId: "corvid", modelId: "c5" },
  ];

  it("reorders with the keyboard, removes and adds via the picker", async () => {
    const onValueChange = vi.fn();
    const { container } = render(<FallbackChainEditor providers={routing} defaultValue={initial} onValueChange={onValueChange} />);
    expect(screen.getByText("Tried in order when a model fails or is rate-limited.")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Fallback 1")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    const handle = screen.getByRole("button", { name: "Reorder Corvid 5 (Corvid)" });
    handle.focus();
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: " " });
    expect(onValueChange).toHaveBeenLastCalledWith([initial[1], initial[0]]);
    const items = within(screen.getByRole("list", { name: "Model fallback order" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Corvid 5");
    expect(items[0]).toHaveTextContent("Primary");

    fireEvent.click(screen.getByRole("button", { name: "Remove Nimbus Opal (Nimbus AI)" }));
    expect(onValueChange).toHaveBeenLastCalledWith([initial[1]]);

    fireEvent.click(screen.getByRole("button", { name: "Add fallback" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a fallback model" });
    fireEvent.click(within(dialog).getByRole("option", { name: /Corvid/ }));
    expect(within(dialog).getByRole("option", { name: /Corvid 5/ })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(within(dialog).getByRole("option", { name: /Corvid Vision/ }));
    expect(onValueChange).toHaveBeenLastCalledWith([initial[1], { providerId: "corvid", modelId: "c-vision" }]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("TaskModelAssignment", () => {
  it("applies a model to all tasks and resets to Auto after confirmation", async () => {
    const onValueChange = vi.fn();
    const { baseElement } = render(
      <TaskModelAssignment providers={routing} defaultValue={{ vision: { providerId: "nimbus", modelId: "opal" } }} onValueChange={onValueChange} />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(baseElement.querySelectorAll("[data-auto]")).toHaveLength(5);
    expect(await axeViolations(baseElement)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Use Nimbus Opal for all tasks" }));
    const all = onValueChange.mock.lastCall![0];
    expect(Object.keys(all)).toEqual(["vision", "compression", "title", "web-extract", "mcp-sampling", "embeddings"]);
    expect(Object.values(all).every((v) => (v as ModelRef).modelId === "opal")).toBe(true);
    expect(baseElement.querySelectorAll("[data-auto]")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Reset Title generation to Auto" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Reset Title generation to Auto?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset to Auto" }));
    await waitFor(() => expect(onValueChange.mock.lastCall![0].title).toBe("auto"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(baseElement.querySelectorAll("[data-auto]")).toHaveLength(1);
  });

  it("cancelling the confirmation keeps the model", async () => {
    const onValueChange = vi.fn();
    render(<TaskModelAssignment providers={routing} tasks={[{ id: "vision", label: "Vision" }]} defaultValue={{ vision: { providerId: "corvid", modelId: "c-vision" } }} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset Vision to Auto" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("EnsembleBuilder", () => {
  it("rejects ensembles as members and summarizes the preset", async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <EnsembleBuilder
        providers={routing}
        defaultValue={{ references: [{ providerId: "nimbus", modelId: "opal" }, { providerId: "corvid", modelId: "c5" }], aggregator: null, rounds: 2 }}
        onValueChange={onValueChange}
      />
    );
    expect(screen.getByText(/Add reference models and an aggregator/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add reference" }));
    let dialog = await screen.findByRole("dialog", { name: "Add a reference model" });
    fireEvent.click(within(dialog).getByRole("option", { name: /Council Ensemble/ }));
    expect(await screen.findByText(/Council Ensemble is itself an ensemble/)).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Choose" }));
    dialog = await screen.findByRole("dialog", { name: "Choose the aggregator" });
    fireEvent.click(within(dialog).getByRole("option", { name: /Nimbus Quartz Mini/ }));
    expect(onValueChange).toHaveBeenLastCalledWith(expect.objectContaining({ aggregator: { providerId: "nimbus", modelId: "quartz-mini" } }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText(/2 reference models × 2 rounds, combined by Nimbus Quartz Mini\. About 5 model calls/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Corvid 5" }));
    expect(onValueChange.mock.lastCall![0].references).toEqual([{ providerId: "nimbus", modelId: "opal" }]);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("uses the isEnsemble predicate", async () => {
    render(<EnsembleBuilder providers={routing} isEnsemble={(r) => r.modelId === "c5"} />);
    fireEvent.click(screen.getByRole("button", { name: "Add reference" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("option", { name: /^Corvid/ }));
    fireEvent.click(within(dialog).getByRole("option", { name: /Corvid 5/ }));
    expect(await screen.findByText(/Corvid 5 is itself an ensemble/)).toBeInTheDocument();
  });
});

describe("ModelInfoCard", () => {
  it("shows auto vs override context and pricing", async () => {
    const onChange = vi.fn();
    const model = routing[0]!.models[0]!;
    const { rerender, container } = render(<ModelInfoCard model={{ ...model, knowledgeCutoff: "2025-03" }} provider={routing[0]} onContextOverrideChange={onChange} />);
    expect(screen.getByText("200K tokens")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByText("2025-03")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Override" }));
    fireEvent.change(screen.getByLabelText("Context length override (tokens)"), { target: { value: "64000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onChange).toHaveBeenCalledWith(64000);
    rerender(<ModelInfoCard model={model} provider={routing[0]} contextOverride={64000} onContextOverrideChange={onChange} />);
    expect(screen.getByText("64K tokens")).toBeInTheDocument();
    expect(screen.getByText("Override")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use auto (200K)" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ReasoningPill", () => {
  it("toggles thinking and fast mode; effort follows thinking", async () => {
    const onValueChange = vi.fn();
    const { baseElement } = render(<ReasoningPill defaultValue={{ thinking: true, fast: false, effort: "high" }} onValueChange={onValueChange} />);
    const pill = screen.getByRole("button", { name: "Reasoning: Thinking · High" });
    fireEvent.click(pill);
    const slider = await screen.findByRole("slider", { name: "Effort" });
    expect(slider).not.toHaveAttribute("aria-disabled");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith({ thinking: true, fast: false, effort: "max" });
    fireEvent.click(screen.getByRole("switch", { name: "Fast mode" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ thinking: true, fast: true, effort: "max" });
    expect(screen.getByRole("button", { name: "Reasoning: Thinking · Max · Fast" })).toBeInTheDocument();
    expect(await axeViolations(baseElement, { disable: ["aria-hidden-focus"] })).toEqual([]);
    fireEvent.click(screen.getByRole("switch", { name: "Thinking" }));
    expect(onValueChange).toHaveBeenLastCalledWith({ thinking: false, fast: true, effort: "max" });
    expect(screen.getByRole("slider", { name: "Effort" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Reasoning: Thinking off · Fast" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Backends                                                            */
/* ------------------------------------------------------------------ */

describe("BackendPicker", () => {
  it("runs probes on mount, shows results and re-checks", async () => {
    const local = vi.fn().mockResolvedValue({ latencyMs: 12 });
    // Driven by state rather than call order, since StrictMode probes once more on mount.
    let dockerUp = false;
    const docker = vi.fn(async () => {
      if (!dockerUp) throw new Error("daemon not running");
      return { latencyMs: 48 };
    });
    const backends: BackendOption[] = [
      { id: "local", name: "Local", kind: "local", description: "Run on this machine", probe: local },
      { id: "docker", name: "Docker", kind: "docker", description: "Isolated container", probe: docker },
      { id: "ssh", name: "SSH", kind: "ssh", description: "Remote host", configured: false, probe: vi.fn() },
    ];
    const onValueChange = vi.fn();
    const onConfigure = vi.fn();
    const { container } = render(<BackendPicker backends={backends} defaultValue="local" onValueChange={onValueChange} onConfigure={onConfigure} />);
    expect(screen.getAllByText("Checking…")).toHaveLength(2);
    const card = (id: string) => container.querySelector(`[data-backend="${id}"]`) as HTMLElement;
    await waitFor(() => expect(within(card("local")).getByText(/Healthy/)).toBeInTheDocument());
    expect(within(card("local")).getByText("· 12 ms")).toBeInTheDocument();
    expect(within(card("docker")).getByText("Unreachable: daemon not running")).toBeInTheDocument();
    expect(within(card("ssh")).getByText("Not configured")).toBeInTheDocument();
    expect(backends[2]!.probe).not.toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);

    const dockerAtMount = docker.mock.calls.length;
    const localAtMount = local.mock.calls.length;
    dockerUp = true;
    fireEvent.click(screen.getByRole("button", { name: "Re-check Docker" }));
    expect(within(card("docker")).getByText("Checking…")).toBeInTheDocument();
    await waitFor(() => expect(within(card("docker")).getByText("· 48 ms")).toBeInTheDocument());
    expect(docker).toHaveBeenCalledTimes(dockerAtMount + 1);
    expect(local).toHaveBeenCalledTimes(localAtMount);

    fireEvent.click(screen.getByRole("radio", { name: /Docker/ }));
    expect(onValueChange).toHaveBeenCalledWith("docker");
    fireEvent.click(screen.getByRole("button", { name: "Configure SSH" }));
    expect(onConfigure).toHaveBeenCalledWith("ssh");
    fireEvent.click(screen.getByRole("button", { name: "Re-check all" }));
    await waitFor(() => expect(local).toHaveBeenCalledTimes(localAtMount + 1));
  });
});

/* ------------------------------------------------------------------ */
/* Local models                                                        */
/* ------------------------------------------------------------------ */

describe("estimateModelFit", () => {
  const hw = { vramGB: 12, ramGB: 32 };
  it("classifies fit levels", () => {
    expect(estimateModelFit({ sizeGB: 4.4 }, hw)).toMatchObject({ fit: "gpu", gpuFraction: 1, requiredGB: 5.3 });
    const partial = estimateModelFit({ sizeGB: 20 }, hw);
    expect(partial.fit).toBe("partial");
    expect(partial.gpuFraction).toBeCloseTo(0.45, 2);
    expect(partial.explanation).toMatch(/45% fits/);
    expect(estimateModelFit({ sizeGB: 10 }, { ramGB: 32 }).fit).toBe("cpu");
    expect(estimateModelFit({ sizeGB: 40 }, { vramGB: 8, ramGB: 16 }).fit).toBe("none");
    expect(estimateModelFit({ sizeGB: 30 }, { ramGB: 16, gpus: [{ name: "A", vramGB: 24 }, { name: "B", vramGB: 24 }] }).fit).toBe("gpu");
  });
  it("derives size from params and quantization", () => {
    expect(quantizationBits("Q4_K_M")).toBe(4.6);
    expect(quantizationBits("Q8_0")).toBe(8.5);
    expect(quantizationBits("F16")).toBe(16);
    expect(quantizationBits(undefined)).toBe(16);
    expect(estimateModelFit({ paramsB: 8, quant: "Q8_0" }, hw).requiredGB).toBe(10.2);
    expect(estimateModelFit({ paramsB: 70, quant: "F16" }, hw).fit).toBe("none");
  });
});

describe("HardwareFitHint", () => {
  it("renders the fit with explanation", async () => {
    const { container } = render(<HardwareFitHint model={{ sizeGB: 20 }} hardware={{ vramGB: 12, ramGB: 32 }} />);
    expect(screen.getByText("Partial offload")).toBeInTheDocument();
    expect(screen.getByText(/rest runs from system RAM/)).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("StagedSetupHero", () => {
  function Harness({ onRetry }: { onRetry: (id: string) => void }) {
    const [stages, setStages] = React.useState<SetupStage[]>([
      { id: "engine", label: "Engine", status: "active", actionLabel: "Install engine" },
      { id: "model", label: "Model", status: "pending", actionLabel: "Choose model" },
      { id: "download", label: "Download", status: "pending", actionLabel: "Start download" },
      { id: "ready", label: "Ready", status: "pending", actionLabel: "Open chat" },
    ]);
    const advance = (id: string) =>
      setStages((s) => {
        const i = s.findIndex((x) => x.id === id);
        return s.map((x, j) => (j === i ? { ...x, status: id === "download" ? "error" : "done", error: "Network dropped at 41%" } : j === i + 1 ? { ...x, status: "active" } : x));
      });
    return (
      <StagedSetupHero
        stages={stages}
        onAction={advance}
        onRetry={(id) => {
          onRetry(id);
          setStages((s) => s.map((x) => (x.id === id ? { ...x, status: "active", error: undefined } : x)));
        }}
        download={stages.find((x) => x.id === "download")?.status === "active" ? { receivedBytes: 1024 ** 3, totalBytes: 4 * 1024 ** 3, bytesPerSecond: 50 * 1024 ** 2 } : undefined}
      />
    );
  }

  it("progresses through stages and retries a failed one", async () => {
    const onRetry = vi.fn();
    const { container } = render(<Harness onRetry={onRetry} />);
    const stage = (id: string) => container.querySelector(`[data-stage="${id}"]`)!;
    expect(stage("engine")).toHaveAttribute("aria-current", "step");
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Install engine" }));
    expect(stage("engine")).toHaveAttribute("data-status", "done");
    expect(stage("model")).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Choose model" }));
    expect(screen.getByRole("progressbar", { name: "Downloading model" })).toBeInTheDocument();
    expect(screen.getByText("1 GB / 4 GB")).toBeInTheDocument();
    expect(screen.getByText("50 MB/s · 1m 1s left")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Setup progress, 2 of 4 done" })).toBeInTheDocument();

  });

  it("shows error + retry and the ready state", async () => {
    const onRetry = vi.fn();
    const stages: SetupStage[] = [
      { id: "engine", label: "Engine", status: "done" },
      { id: "model", label: "Model", status: "done" },
      { id: "download", label: "Download", status: "error", error: "Network dropped at 41%" },
      { id: "ready", label: "Ready", status: "pending" },
    ];
    const { rerender, container } = render(<StagedSetupHero stages={stages} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network dropped at 41%");
    expect(container.querySelector('[data-stage="download"]')).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("download");
    expect(await axeViolations(container)).toEqual([]);
    rerender(<StagedSetupHero stages={stages.map((s) => ({ ...s, status: "done", error: undefined }))} />);
    expect(screen.getByText("Local model ready.")).toBeInTheDocument();
  });
});

describe("LocalModelBrowser", () => {
  const models: LocalModelListing[] = [
    {
      id: "wren-8b",
      name: "Wren 8B Instruct",
      author: "wren-labs",
      paramsB: 8,
      downloads: 1_250_000,
      likes: 4200,
      variants: [
        { quant: "Q4_K_M", sizeGB: 4.9 },
        { quant: "Q8_0", sizeGB: 8.5 },
        { quant: "F16", sizeGB: 16 },
      ],
    },
    { id: "heron-70b", name: "Heron 70B", author: "heron", paramsB: 70, variants: [{ quant: "Q4_K_M", sizeGB: 42 }] },
  ];
  const hw = { vramGB: 12, ramGB: 32 };

  it("searches, starts downloads and shows progress", async () => {
    const onDownload = vi.fn();
    const onCancel = vi.fn();
    const { rerender, container } = render(<LocalModelBrowser models={models} hardware={hw} onDownload={onDownload} onCancelDownload={onCancel} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("1.3M")).toBeInTheDocument();
    expect(container.querySelector('[data-model="heron-70b"] [data-fit]')).toHaveAttribute("data-fit", "none");
    expect(await axeViolations(container)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Download Wren 8B Instruct" }));
    // Largest variant that still fits on the GPU is picked by default.
    expect(onDownload).toHaveBeenCalledWith("wren-8b", "Q8_0");

    rerender(
      <LocalModelBrowser
        models={models}
        hardware={hw}
        onDownload={onDownload}
        onCancelDownload={onCancel}
        downloads={{ "wren-8b": { status: "downloading", receivedBytes: 4 * 1024 ** 3, totalBytes: 8 * 1024 ** 3, bytesPerSecond: 64 * 1024 ** 2 } }}
      />
    );
    const progress = screen.getByRole("progressbar", { name: "Downloading Wren 8B Instruct" });
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("4 GB / 8 GB · 50%")).toBeInTheDocument();
    expect(screen.getByText("64 MB/s · 1m 4s left")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Wren 8B Instruct download" }));
    expect(onCancel).toHaveBeenCalledWith("wren-8b");

    rerender(<LocalModelBrowser models={models} hardware={hw} downloads={{ "wren-8b": { status: "done" } }} />);
    expect(screen.getByText("Downloaded")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Search models" }), { target: { value: "heron" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(screen.getByRole("textbox", { name: "Search models" }), { target: { value: "zzz" } });
    expect(screen.getByText("No models match “zzz”.")).toBeInTheDocument();
  });
});

describe("SystemResourcesBar", () => {
  it("renders meters with threshold levels", async () => {
    const { container } = render(<SystemResourcesBar cpuPercent={42} ram={{ usedGB: 28, totalGB: 32 }} gpuPercent={96} vram={{ usedGB: 6.5, totalGB: 12 }} />);
    expect(screen.getByRole("meter", { name: "CPU" })).toHaveAttribute("data-level", "ok");
    expect(screen.getByRole("meter", { name: "RAM" })).toHaveAttribute("data-level", "warn");
    expect(screen.getByRole("meter", { name: "RAM" })).toHaveAttribute("aria-valuetext", "28 / 32 GB");
    expect(screen.getByRole("meter", { name: "GPU" })).toHaveAttribute("data-level", "danger");
    expect(screen.getByText("6.5 / 12 GB")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
