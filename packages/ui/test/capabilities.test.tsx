import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  CapabilitiesShell,
  CapabilityDetailHeader,
  ProvenancePill,
  ScopeChip,
  ScopeSelector,
  TrustBadge,
} from "../src/kits/agent-admin/capabilities";
import { ToolToggleList, ToolsetCard, ToolsetProviderDrawer, type ToolToggleItem, type ToolsetProvider } from "../src/kits/agent-admin/tool-toggles";
import {
  ConnectionMethodChooser,
  ConnectorAccounts,
  ConnectorDirectory,
  KeyValueRowsInput,
  McpServerCard,
  McpServerForm,
  parseMcpServersJson,
  validateMcpServerConfig,
  emptyMcpServerConfig,
  type ConnectorAccount,
  type ConnectorCatalogEntry,
  type KeyValueRowsEntry,
} from "../src/kits/agent-admin/mcp";
import {
  CatalogCard,
  ExtensionInstallDialog,
  InstalledExtensionCard,
  SecurityScanVerdict,
  SkillCard,
  SkillDetail,
  SyncReceiptCard,
  countScanFindings,
  type ScanFinding,
  type SkillSummary,
} from "../src/kits/agent-admin/extensions-catalog";
import { SchemaForm, schemaDefaults, validateAgainstSchema, type SchemaFormSchema } from "../src/patterns/schema-form";
import { SlotFill, SlotOutlet, SlotProvider, createSlotRegistry, useSlotRegistry } from "../src/kits/agent-admin/slot-outlet";
import { axeViolations } from "./helpers/a11y";

const flush = () => act(async () => {});
// jsdom has no scrollTo; LogViewer's auto-follow uses it.
Element.prototype.scrollTo ??= function () {} as typeof Element.prototype.scrollTo;
afterEach(() => vi.useRealTimers());

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const tools: ToolToggleItem[] = [
  { id: "read_file", name: "read_file", description: "Read a file", enabled: true, hints: ["read-only", "filesystem"], inputSchema: { type: "object", properties: { path: { type: "string" } } } },
  { id: "write_file", name: "write_file", enabled: true, hints: ["filesystem"] },
  { id: "delete_repo", name: "delete_repo", enabled: false, hints: ["destructive", "network"] },
  { id: "shell", name: "shell", enabled: false, locked: true, hints: ["destructive"] },
  { id: "old_search", name: "old_search", enabled: false, deprecated: true },
];

const skill: SkillSummary = {
  id: "s1",
  name: "pdf-extract",
  description: "Extract tables from PDFs",
  provenance: "learned",
  category: "Documents",
  toolsets: [{ name: "files" }],
  enabled: true,
  trust: "trusted",
};

const findings: ScanFinding[] = [
  { severity: "critical", title: "Pipes curl into sh", file: "install.sh", line: 4 },
  { severity: "high", title: "Reads ~/.ssh", file: "skill.py", line: 22 },
  { severity: "high", title: "Writes outside workspace", file: "skill.py", line: 40 },
  { severity: "low", title: "Unpinned dependency" },
];

/* ------------------------------------------------------------------ */
/* Capabilities shell + small pieces                                   */
/* ------------------------------------------------------------------ */

describe("CapabilitiesShell", () => {
  it("renders tabs with counts, switches tabs, searches and shows the detail pane", async () => {
    const onSearch = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <CapabilitiesShell
        onSearchChange={onSearch}
        scope={<ScopeChip profile="work" />}
        tabs={[
          { value: "skills", label: "Skills", count: 4, content: <p>skills list</p> },
          { value: "toolsets", label: "Toolsets", count: 5, content: <p>toolsets list</p> },
        ]}
        detail={<CapabilityDetailHeader title="pdf-extract" provenance="learned" trust="verified" onClose={onClose} />}
        onDetailClose={onClose}
      />
    );
    expect(screen.getByRole("tab", { name: "Skills (4)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("skills list")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Toolsets (5)" }));
    expect(screen.getByText("toolsets list")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: /search toolsets/i }), { target: { value: "web" } });
    expect(onSearch).toHaveBeenCalledWith("web");
    expect(screen.getByRole("complementary", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByText("Applies to:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ProvenancePill, TrustBadge and ScopeSelector render accessibly", async () => {
    const { container } = render(
      <div>
        <ProvenancePill provenance="hub" />
        <ProvenancePill provenance="bundled" />
        <TrustBadge level="flagged" showScale />
        <ScopeSelector profiles={["work", "home"]} defaultValue="work" />
      </div>
    );
    expect(screen.getByText("Hub")).toBeInTheDocument();
    expect(screen.getByText("Flagged")).toBeInTheDocument();
    expect(screen.getByText(/security scan or a report flagged/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("work");
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* ToolToggleList                                                      */
/* ------------------------------------------------------------------ */

describe("ToolToggleList", () => {
  it("tracks dirty state and saves", async () => {
    const onSave = vi.fn();
    render(<ToolToggleList tools={tools} onSave={onSave} />);
    expect(screen.queryByText(/unsaved/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Enable delete_repo" }));
    fireEvent.click(screen.getByRole("switch", { name: "Enable write_file" }));
    expect(screen.getByRole("status")).toHaveTextContent("2 unsaved changes");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await flush();
    expect(onSave).toHaveBeenCalledTimes(1);
    const [map, changed] = onSave.mock.calls[0]!;
    expect(map).toMatchObject({ delete_repo: true, write_file: false, read_file: true });
    expect(changed).toEqual(["write_file", "delete_repo"]);
    expect(screen.queryByText(/unsaved/)).not.toBeInTheDocument();
  });

  it("discards changes", () => {
    const onDiscard = vi.fn();
    render(<ToolToggleList tools={tools} onDiscard={onDiscard} />);
    const sw = screen.getByRole("switch", { name: "Enable read_file" });
    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("1 unsaved change")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onDiscard).toHaveBeenCalled();
    expect(screen.queryByText(/unsaved/)).not.toBeInTheDocument();
  });

  it("policy-locked rows cannot be toggled, including by bulk actions", () => {
    render(<ToolToggleList tools={tools} />);
    const locked = screen.getByRole("switch", { name: "Enable shell" });
    expect(locked).toBeDisabled();
    fireEvent.click(locked);
    expect(locked).toHaveAttribute("aria-checked", "false");
    expect(screen.getAllByText("Managed by your organization").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Enable all" }));
    expect(locked).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Enable delete_repo" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("1 unsaved change")).toBeInTheDocument();
  });

  it("filters by hint chip and search, and hides deprecated until asked", () => {
    render(<ToolToggleList tools={tools} />);
    const list = screen.getByRole("list", { name: "Tools" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByText("old_search")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Show deprecated" }));
    expect(screen.getByText("old_search")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Destructive/ }));
    expect(within(list).getAllByRole("listitem").map((li) => li.getAttribute("data-tool"))).toEqual(["delete_repo", "shell"]);
    fireEvent.click(screen.getByRole("button", { name: /^Destructive/ }));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search tools" }), { target: { value: "file" } });
    expect(within(list).getAllByRole("listitem").map((li) => li.getAttribute("data-tool"))).toEqual(["read_file", "write_file"]);
  });

  it("expands a row to show description and schema; axe clean", async () => {
    const { container } = render(<ToolToggleList tools={tools} />);
    const btn = screen.getByRole("button", { name: /read_file/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Read a file")).toBeInTheDocument();
    expect(screen.getByText("Input schema")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Enable read_file" }));
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Toolsets                                                            */
/* ------------------------------------------------------------------ */

describe("ToolsetCard", () => {
  it("shows each health pill and fires configure / toggle", async () => {
    const onConfigure = vi.fn();
    const onEnabled = vi.fn();
    const { container } = render(
      <div>
        <ToolsetCard name="Web search" toolCount={3} health="configured" defaultEnabled />
        <ToolsetCard name="Image gen" toolCount={1} health="needs-keys" onConfigure={onConfigure} onEnabledChange={onEnabled} />
        <ToolsetCard name="Browser" toolCount={12} health="error" healthMessage="Chromium not found" />
      </div>
    );
    expect(screen.getByText("Configured").closest("[data-health]")).toHaveAttribute("data-health", "configured");
    expect(screen.getByText("Needs keys").closest("[data-health]")).toHaveAttribute("data-health", "needs-keys");
    expect(screen.getByText("Error").closest("[data-health]")).toHaveAttribute("data-health", "error");
    expect(screen.getByText("1 tool")).toBeInTheDocument();
    expect(screen.getByText("Chromium not found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Configure" }));
    expect(onConfigure).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("switch", { name: "Enable Image gen" }));
    expect(onEnabled).toHaveBeenCalledWith(true);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ToolsetProviderDrawer", () => {
  const providers: ToolsetProvider[] = [
    { id: "brave", name: "Brave", fields: [{ key: "BRAVE_KEY", label: "Brave API key", isSet: true, getKeyUrl: "https://brave.example/keys" }] },
    { id: "tavily", name: "Tavily", tag: "Free tier", fields: [{ key: "TAVILY_KEY", label: "Tavily API key", isSet: false, getKeyUrl: "https://tavily.example" }] },
  ];

  it("selects a provider and saves a key", async () => {
    const onProvider = vi.fn();
    const onSave = vi.fn();
    render(
      <ToolsetProviderDrawer
        open
        title="Web search"
        providers={providers}
        onProviderChange={onProvider}
        onSaveCredential={onSave}
        onInstall={() => {}}
        installStatus="running"
        installLog={["pip install brave-search", "Collecting brave-search"]}
      />
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Selected").closest("label")).toHaveTextContent("Brave");
    expect(within(dialog).getByText("Set")).toBeInTheDocument();
    expect(within(dialog).getByText("Installing…")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("radio", { name: /Tavily/ }));
    expect(onProvider).toHaveBeenCalledWith("tavily");
    expect(within(dialog).getByText("Selected").closest("label")).toHaveTextContent("Tavily");
    expect(within(dialog).getByText("Not set")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Get a key/ })).toHaveAttribute("href", "https://tavily.example");
    fireEvent.change(within(dialog).getByLabelText("Tavily API key"), { target: { value: "tvly-123" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await flush();
    expect(onSave).toHaveBeenCalledWith("tavily", "TAVILY_KEY", "tvly-123");
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* MCP                                                                 */
/* ------------------------------------------------------------------ */

describe("McpServerCard", () => {
  it("shows test result variants", async () => {
    const onTest = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, tools: ["a", "b", "c"] })
      .mockResolvedValueOnce({ ok: true, tools: [] })
      .mockResolvedValueOnce({ ok: false, error: "ECONNREFUSED 127.0.0.1:3000" });
    const { container } = render(<McpServerCard name="github" transport="stdio" status="connected" toolCount={3} onTest={onTest} />);
    const test = screen.getByRole("button", { name: "Test" });
    fireEvent.click(test);
    expect(await screen.findByText("Tools: a, b, c")).toBeInTheDocument();
    fireEvent.click(test);
    expect(await screen.findByText("Connected — no tools")).toBeInTheDocument();
    fireEvent.click(test);
    expect(await screen.findByText("ECONNREFUSED 127.0.0.1:3000")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-test-result", "error");
    expect(screen.getByText("stdio").closest("[data-transport]")).toHaveAttribute("data-transport", "stdio");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("confirms before removing", async () => {
    const onRemove = vi.fn();
    render(<McpServerCard name="linear" transport="http" status="failed" lastError="401 Unauthorized" onRemove={onRemove} />);
    expect(screen.getByText("401 Unauthorized")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemove).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Remove linear?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await flush();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("OAuth connect shows waiting, failure and retry", async () => {
    let resolve!: () => void;
    const onConnect = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sign-in window was closed"))
      .mockImplementationOnce(() => new Promise<void>((r) => (resolve = r)));
    render(<McpServerCard name="notion" transport="http" status="needs-auth" onConnect={onConnect} />);
    expect(screen.getByText("Needs sign-in")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("Sign-in window was closed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onConnect).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/Waiting for sign-in/)).toBeInTheDocument();
    await act(async () => resolve());
    expect(screen.queryByText(/Waiting for sign-in/)).not.toBeInTheDocument();
  });
});

describe("McpServerForm", () => {
  it("switches between stdio and HTTP fields", async () => {
    const { container } = render(<McpServerForm />);
    expect(screen.getByLabelText(/Command/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^URL/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "HTTP" }));
    expect(screen.getByLabelText(/^URL/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Command/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Bearer token" }));
    expect(screen.getByLabelText(/Bearer token/, { selector: "input" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("pastes an mcpServers JSON snippet and fills the form", () => {
    const onSubmit = vi.fn();
    render(<McpServerForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Paste JSON config/ }));
    fireEvent.change(screen.getByLabelText("MCP JSON config"), {
      target: {
        value: JSON.stringify({
          mcpServers: { github: { command: "npx", args: ["-y", "@mcp/server-github"], env: { GITHUB_TOKEN: "ghp_x" } } },
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fill form" }));
    expect(screen.getByRole("status")).toHaveTextContent('Filled from "github"');
    expect(screen.getByLabelText(/^Name/)).toHaveValue("github");
    expect(screen.getByLabelText(/Command/)).toHaveValue("npx");
    expect(screen.getByText("@mcp/server-github")).toBeInTheDocument();
    expect(screen.getByLabelText("Environment variable 1 key")).toHaveValue("GITHUB_TOKEN");
    expect(screen.getByLabelText("Environment variable 1 value")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    return waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "github", command: "npx", args: ["-y", "@mcp/server-github"] })));
  });

  it("shows paste errors and validates on submit", () => {
    const onSubmit = vi.fn();
    render(<McpServerForm onSubmit={onSubmit} existingNames={["github"]} />);
    fireEvent.click(screen.getByRole("button", { name: /Paste JSON config/ }));
    fireEvent.change(screen.getByLabelText("MCP JSON config"), { target: { value: "{nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Fill form" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid JSON");

    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Command is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "GitHub" } });
    expect(screen.getByText("A server with this name already exists")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "HTTP" }));
    fireEvent.change(screen.getByLabelText(/^URL/), { target: { value: "ftp://x" } });
    expect(screen.getByText("URL must start with http:// or https://")).toBeInTheDocument();
    expect(screen.getByLabelText(/^URL/)).toHaveAttribute("aria-invalid", "true");
  });

  it("parseMcpServersJson / validateMcpServerConfig", () => {
    const [s] = parseMcpServersJson('{"linear": {"type": "http", "url": "https://mcp.linear.app/mcp", "headers": {"Authorization": "Bearer abc", "X-Team": "eng"}},}');
    expect(s).toMatchObject({ name: "linear", transport: "http", auth: "bearer", bearerToken: "abc", headers: [{ key: "X-Team", value: "eng" }] });
    expect(parseMcpServersJson('{"command": "uvx", "args": ["mcp-time"]}')[0]).toMatchObject({ transport: "stdio", command: "uvx" });
    expect(parseMcpServersJson('{"servers": {"s": {"url": "https://x.dev/sse", "type": "sse"}}}')[0]!.transport).toBe("sse");
    expect(() => parseMcpServersJson("[]")).toThrow(/object/);
    expect(validateMcpServerConfig({ ...emptyMcpServerConfig, name: "ok", command: "npx", env: [{ key: "A", value: "1" }, { key: "A", value: "2" }] })).toEqual({ env: "Keys must be unique" });
  });
});

describe("KeyValueRowsInput", () => {
  it("adds, edits, masks secrets, flags duplicates and removes", async () => {
    function Harness() {
      const [rows, setRows] = React.useState<KeyValueRowsEntry[]>([{ key: "PORT", value: "3000" }]);
      return (
        <>
          <KeyValueRowsInput label="Env" value={rows} onValueChange={setRows} />
          <output data-testid="out">{JSON.stringify(rows)}</output>
        </>
      );
    }
    const { container } = render(<Harness />);
    expect(screen.getByLabelText("Env 1 value")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Add row" }));
    fireEvent.change(screen.getByLabelText("Env 2 key"), { target: { value: "API_TOKEN" } });
    fireEvent.change(screen.getByLabelText("Env 2 value"), { target: { value: "s3cret" } });
    expect(screen.getByLabelText("Env 2 value")).toHaveAttribute("type", "password");
    expect(JSON.parse(screen.getByTestId("out").textContent!)).toEqual([
      { key: "PORT", value: "3000" },
      { key: "API_TOKEN", value: "s3cret" },
    ]);
    fireEvent.change(screen.getByLabelText("Env 2 key"), { target: { value: "PORT" } });
    expect(screen.getAllByText("Duplicate key")).toHaveLength(2);
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Env 1" }));
    expect(screen.queryByText("Duplicate key")).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("out").textContent!)).toHaveLength(1);
  });
});

describe("ConnectorDirectory", () => {
  const entries: ConnectorCatalogEntry[] = [
    { id: "gh", name: "GitHub", category: "Developer", ways: ["hosted", "local"], description: "Issues and PRs", installed: true },
    { id: "linear", name: "Linear", category: "Developer", ways: ["hosted"] },
    { id: "fs", name: "Filesystem", category: "Local", ways: ["local"] },
    { id: "gcal", name: "Google Calendar", category: "Productivity", ways: ["hosted"], domain: "calendar.google.com" },
  ];

  it("filters by category and installs", async () => {
    const onInstall = vi.fn();
    const { container } = render(<ConnectorDirectory entries={entries} onInstall={onInstall} />);
    const grid = screen.getByRole("list", { name: "Connectors" });
    expect(within(grid).getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /^Developer/ }));
    expect(within(grid).getAllByRole("listitem").map((li) => li.getAttribute("data-connector"))).toEqual(["gh", "linear"]);
    expect(within(grid).getByText("Installed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Local/ }));
    fireEvent.click(screen.getByRole("button", { name: "Install Filesystem" }));
    await flush();
    expect(onInstall).toHaveBeenCalledWith(expect.objectContaining({ id: "fs" }));
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(screen.getByRole("button", { name: "Connect Linear" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ConnectionMethodChooser lists pros and cons", async () => {
    const onChange = vi.fn();
    const { container } = render(<ConnectionMethodChooser onValueChange={onChange} />);
    expect(screen.getByText("No install")).toBeInTheDocument();
    expect(screen.getByText("Requires Node or Python")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Local/ }));
    expect(onChange).toHaveBeenCalledWith("local");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ConnectorAccounts", () => {
  const accounts: ConnectorAccount[] = [
    { id: "a1", alias: "Work", identity: "me@corp.com", status: "connected" },
    { id: "a2", alias: "Personal", identity: "me@home.net", status: "expired" },
    { id: "a3", alias: "Old", status: "retired" },
  ];

  it("validates alias rename, repairs and folds retired accounts", async () => {
    const onRename = vi.fn();
    const onRepair = vi.fn();
    const { container } = render(<ConnectorAccounts accounts={accounts} onRename={onRename} onRepair={onRepair} onAdd={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename Work" }));
    const input = screen.getByRole("textbox", { name: "Account name" });
    fireEvent.change(input, { target: { value: "personal" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("That name is already taken");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onRename).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("can't be empty");
    fireEvent.change(input, { target: { value: "Day job" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await flush();
    expect(onRename).toHaveBeenCalledWith("a1", "Day job");

    fireEvent.click(screen.getByRole("button", { name: "Repair Personal" }));
    expect(onRepair).toHaveBeenCalledWith("a2");

    const fold = screen.getByRole("button", { name: "Retired accounts (1)" });
    expect(fold).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Old")).not.toBeInTheDocument();
    fireEvent.click(fold);
    expect(screen.getByText("Old")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Extensions catalog                                                  */
/* ------------------------------------------------------------------ */

describe("CatalogCard", () => {
  it("caps capabilities with +N and renders states", async () => {
    const onInstall = vi.fn();
    const { container, rerender } = render(
      <CatalogCard
        name="Calendar Sync"
        author="Sutra"
        tier="official"
        trust="verified"
        version="1.2.0"
        capabilities={["calendar.read", "calendar.write", "net.fetch", "ui.sidebar", "cron", "notify"]}
        maxCapabilities={4}
        platforms={["macOS", "Linux"]}
        stars={12400}
        docsUrl="https://docs.example"
        repoUrl="https://repo.example"
        onInstall={onInstall}
      />
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByLabelText("2 more capabilities")).toBeInTheDocument();
    expect(screen.getByText("12k")).toBeInTheDocument();
    expect(screen.getByText("Official")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Install Calendar Sync" }));
    await flush();
    expect(onInstall).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);

    rerender(<CatalogCard name="Calendar Sync" state="update-available" latestVersion="1.3.0" onUpdate={() => {}} />);
    expect(screen.getByRole("button", { name: "Update Calendar Sync to v1.3.0" })).toBeInTheDocument();
    rerender(<CatalogCard name="Calendar Sync" state="removed" tier="community" />);
    expect(screen.getByRole("note")).toHaveTextContent("Removed from the catalog");
    expect(screen.getByText("Installed")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    rerender(<CatalogCard name="Calendar Sync" state="installed" />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Install/ })).not.toBeInTheDocument();
  });
});

describe("InstalledExtensionCard", () => {
  it("shows restart-required and asks consent before updating", async () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <InstalledExtensionCard
        name="Kanban"
        source="github.com/acme/kanban"
        version="0.4.0"
        latestVersion="0.5.0"
        runtime="restart-required"
        authRequired
        onUpdate={onUpdate}
        updatePermissions={["net.fetch:api.trello.com"]}
        slots={["sidebar.footer", "command.palette"]}
        setupCommand="sutra plugin setup kanban"
        onRemove={() => {}}
      />
    );
    expect(screen.getByText("Takes effect after restart")).toBeInTheDocument();
    expect(screen.getByText("Restart required")).toBeInTheDocument();
    expect(screen.getByText("Auth required")).toBeInTheDocument();
    expect(screen.getByText("sidebar.footer")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Update to v0.5.0" }));
    expect(onUpdate).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("net.fetch:api.trello.com");
    fireEvent.click(within(dialog).getByRole("button", { name: "Update" }));
    await flush();
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("ExtensionInstallDialog", () => {
  it("warns for unverified sources and requires acknowledgement", async () => {
    const onInstall = vi.fn();
    render(<ExtensionInstallDialog open mode="git" sha="a1b2c3d" permissions={["fs.read", "net.fetch"]} onInstall={onInstall} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Unverified source")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Git URL"), { target: { value: "https://github.com/acme/plugin.git" } });
    const install = within(dialog).getByRole("button", { name: "Install" });
    expect(install).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText("I understand the risk"));
    expect(install).toBeEnabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Advanced details" }));
    expect(within(dialog).getByText("a1b2c3d")).toBeInTheDocument();
    expect(within(dialog).getByText("net.fetch")).toBeInTheDocument();
    fireEvent.click(install);
    expect(onInstall).toHaveBeenCalledWith("https://github.com/acme/plugin.git");
    expect(await axeViolations(document.body)).toEqual([]);
  });

  it("verified source has no warning; shows progress and success", () => {
    const { rerender } = render(<ExtensionInstallDialog open name="Kanban" verified status="installing" log={["Cloning…"]} />);
    expect(screen.queryByText("Unverified source")).not.toBeInTheDocument();
    expect(screen.getByText("Verified source")).toBeInTheDocument();
    expect(screen.getByText("Installing…")).toBeInTheDocument();
    rerender(<ExtensionInstallDialog open name="Kanban" verified status="error" error="npm ERR!" />);
    expect(screen.getByText(/Install failed: npm ERR!/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    rerender(<ExtensionInstallDialog open name="Kanban" verified status="success" />);
    expect(screen.getByText("Installed successfully")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});

describe("SecurityScanVerdict", () => {
  it("counts findings per severity and lists file:line", async () => {
    expect(countScanFindings(findings)).toEqual({ critical: 1, high: 2, medium: 0, low: 1 });
    const { container } = render(<SecurityScanVerdict verdict="dangerous" policy="Blocked by policy" policyTone="block" findings={findings} />);
    const counts = screen.getByRole("list", { name: "Findings" });
    expect(within(counts).getAllByRole("listitem")).toHaveLength(4);
    const cell = (s: string) => container.querySelector(`[data-severity="${s}"] dd`)!.textContent;
    expect([cell("critical"), cell("high"), cell("medium"), cell("low")]).toEqual(["1", "2", "0", "1"]);
    expect(screen.getByText("install.sh:4")).toBeInTheDocument();
    expect(screen.getByText("Verdict: Dangerous")).toBeInTheDocument();
    expect(screen.getByText("Blocked by policy")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SkillCard / SkillDetail", () => {
  it("switches between SKILL.md, frontmatter and security tabs", async () => {
    const onArchive = vi.fn();
    const { container } = render(
      <SkillDetail
        skill={skill}
        markdown={"# PDF extract\n\nUse **camelot** for tables."}
        frontmatter={{ name: "pdf-extract", version: "1.0", tags: ["pdf", "tables"] }}
        scan={{ verdict: "caution", findings: findings.slice(3) }}
        onArchive={onArchive}
        onEdit={() => {}}
        onEnabledChange={() => {}}
      />
    );
    expect(screen.getByRole("heading", { name: "PDF extract" })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Frontmatter" }));
    expect(screen.getByText("pdf, tables")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Security/ }));
    expect(screen.getByText("Verdict: Caution")).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));
    await flush();
    expect(onArchive).toHaveBeenCalled();
  });

  it("SkillCard shows provenance and flagged state", async () => {
    const onSelect = vi.fn();
    const { container } = render(<SkillCard skill={{ ...skill, flagged: true }} onSelect={onSelect} onEnabledChange={() => {}} />);
    expect(screen.getByText("Learned")).toBeInTheDocument();
    expect(screen.getByText("Flagged")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Enable pdf-extract" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "pdf-extract" }));
    expect(onSelect).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("SyncReceiptCard", () => {
  it("summarises sync outcome", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <SyncReceiptCard
        updated={[{ name: "web-search", from: "1.0", to: "1.1" }]}
        failed={[{ name: "pdf-extract", reason: "pip build failed" }]}
        disabled={[{ name: "ocr", reason: "needs numpy<2" }]}
        availableUpdates={[{ name: "kanban", to: "0.5.0" }]}
        onRetry={onRetry}
        onUpdateAll={() => {}}
      />
    );
    expect(screen.getByText("1 updated")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Disabled by dependency conflict" })).toHaveTextContent("needs numpy<2");
    fireEvent.click(screen.getByRole("button", { name: "Retry failed" }));
    expect(onRetry).toHaveBeenCalled();
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* SchemaForm                                                          */
/* ------------------------------------------------------------------ */

const schema: SchemaFormSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", title: "Name", description: "Shown in the picker" },
    port: { type: "integer", minimum: 1, maximum: 65535, default: 8080 },
    enabled: { type: "boolean", default: true },
    mode: { enum: ["fast", "safe"], default: "fast" },
    apiKey: { type: "string", "x-secret": true },
    homepage: { type: "string", format: "uri" },
    tags: { type: "array", items: { type: "string" } },
    servers: {
      type: "array",
      items: { type: "object", required: ["url"], properties: { url: { type: "string", format: "uri" }, weight: { type: "number" } } },
    },
    advanced: { type: "object", properties: { retries: { type: "integer", minimum: 0 } } },
    region: { type: "string", "x-disabled-reason": "Set by your organization" },
  },
};

describe("validateAgainstSchema", () => {
  it("checks required, types, ranges, formats, enums and nested paths", () => {
    expect(validateAgainstSchema(schema, { name: "x" })).toEqual({});
    expect(validateAgainstSchema(schema, {})).toEqual({ name: "Required" });
    expect(
      validateAgainstSchema(schema, {
        name: "x",
        port: 70000,
        mode: "turbo",
        homepage: "not a url",
        servers: [{ url: "https://a.dev" }, { weight: 2 }],
        advanced: { retries: 1.5 },
      })
    ).toEqual({
      port: "Must be at most 65535",
      mode: "Choose one of the allowed values",
      homepage: "Enter a valid URL",
      "servers.1.url": "Required",
      "advanced.retries": "Must be a whole number",
    });
    expect(validateAgainstSchema({ type: "string", format: "email" }, "a@b")).toEqual({ "": "Enter a valid email address" });
    expect(validateAgainstSchema({ type: "array", minItems: 1, items: { type: "number" } }, ["1"])).toEqual({ "0": "Must be a number" });
    expect(validateAgainstSchema({ type: "string", minLength: 3 }, "ab")).toEqual({ "": "Must be at least 3 characters" });
  });

  it("schemaDefaults collects defaults", () => {
    expect(schemaDefaults(schema)).toEqual({ port: 8080, enabled: true, mode: "fast", tags: [], servers: [], advanced: {} });
  });
});

describe("SchemaForm", () => {
  it("renders each type, nested sections, disabled reason and navigation", async () => {
    const { container } = render(<SchemaForm schema={schema} onSubmit={() => {}} />);
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/^Port/)).toHaveValue(8080);
    expect(screen.getByRole("switch", { name: "Enabled" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "fast" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText(/^Api Key/)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/^Homepage/)).toHaveAttribute("type", "url");
    expect(screen.getByRole("group", { name: "Advanced" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Retries/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Region/)).toBeDisabled();
    expect(screen.getByText("Set by your organization")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search settings" }), { target: { value: "retries" } });
    expect(screen.queryByLabelText(/^Port/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Retries/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search settings" }), { target: { value: "" } });
    expect(await axeViolations(container)).toEqual([]);
  });

  it("adds and removes array items (primitive and object) and validates on submit", async () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    render(<SchemaForm schema={schema} onSubmit={onSubmit} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Tag 1" }), { target: { value: "prod" } });
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    expect(screen.getByText("Server 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Required")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Fix 2 fields");
    expect(screen.getByLabelText(/^Name/)).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Primary" } });
    fireEvent.change(screen.getByLabelText(/^Url/), { target: { value: "https://mem.example" } });
    fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "0.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await flush();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Primary", tags: ["prod"], servers: [{ url: "https://mem.example", weight: 0.5 }] })
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove Server 1" }));
    expect(screen.queryByText("Server 1")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ servers: [] }));
  });

  it("autosaves with a debounce and shows per-field Saved status", async () => {
    vi.useFakeTimers();
    let resolveSave!: () => void;
    const onSave = vi.fn(() => new Promise<void>((r) => (resolveSave = r)));
    render(<SchemaForm schema={schema} defaultValue={{ name: "A", port: 8080 }} autosave autosaveDelay={500} onSave={onSave} />);
    const port = screen.getByLabelText(/^Port/);
    fireEvent.change(port, { target: { value: "9" } });
    fireEvent.change(port, { target: { value: "90" } });
    fireEvent.change(port, { target: { value: "9000" } });
    act(() => vi.advanceTimersByTime(499));
    expect(onSave).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ name: "A", port: 9000 }, ["port"]);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    await act(async () => resolveSave());
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();

    fireEvent.change(port, { target: { value: "99999" } });
    act(() => vi.advanceTimersByTime(600));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Must be at most 65535")).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/* Slots                                                               */
/* ------------------------------------------------------------------ */

describe("SlotOutlet", () => {
  it("renders contributions in order and isolates failures", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    function Boom(): React.ReactElement {
      throw new Error("kaboom");
    }
    const registry = createSlotRegistry([
      { id: "c", slot: "sidebar.footer", order: 20, render: <span>third</span> },
      { id: "a", slot: "sidebar.footer", order: 0, render: <span>first</span> },
      { id: "boom", slot: "sidebar.footer", order: 10, source: "Broken plugin", render: Boom },
      { id: "x", slot: "other", render: <span>elsewhere</span> },
    ]);
    const { container } = render(
      <SlotProvider registry={registry}>
        <SlotOutlet name="sidebar.footer" onContributionError={onError} />
        <SlotFill slot="sidebar.footer" id="b" order={10}>
          <span>second</span>
        </SlotFill>
      </SlotProvider>
    );
    await flush();
    const outlet = container.querySelector('[data-slot-outlet="sidebar.footer"]')!;
    expect(outlet.textContent).toMatch(/^first.*Extension failed to render.*second.*third$/s);
    expect(screen.queryByText("elsewhere")).not.toBeInTheDocument();
    expect(screen.getByText("(Broken plugin)")).toBeInTheDocument();
    expect(screen.getByText(/boom: kaboom/)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ id: "boom" }));
    expect(await axeViolations(container)).toEqual([]);
    spy.mockRestore();
  });

  it("supports imperative register/unregister and fallback", async () => {
    let api!: ReturnType<typeof useSlotRegistry>;
    function Grab() {
      api = useSlotRegistry();
      return null;
    }
    render(
      <SlotProvider>
        <Grab />
        <SlotOutlet name="toolbar" fallback={<span>nothing here</span>} />
      </SlotProvider>
    );
    expect(screen.getByText("nothing here")).toBeInTheDocument();
    let off!: () => void;
    act(() => {
      off = api.register({ id: "t1", slot: "toolbar", render: <span>from plugin</span> });
    });
    expect(screen.getByText("from plugin")).toBeInTheDocument();
    act(() => off());
    expect(screen.getByText("nothing here")).toBeInTheDocument();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<SlotOutlet name="x" />)).toThrow(/SlotProvider/);
    spy.mockRestore();
  });
});
