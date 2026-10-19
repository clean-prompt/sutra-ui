import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { AgentStatusLine } from "../src/kits/agent/tool-timeline";
import { QueuedMessages, ComposerToolbar } from "../src/kits/agent/agent-composer";
import { CheckpointMarker } from "../src/kits/agent/rewind";
import { ApprovalStack } from "../src/kits/ai/approval-stack";
import { PromptInputModelPill } from "../src/kits/ai/prompt-input-model";
import { ConnectorDirectory, type ConnectorCatalogEntry } from "../src/kits/agent-admin/mcp";
import { ProviderList, type ProviderEntry } from "../src/kits/agent-admin/llm-providers";
import { JobList } from "../src/kits/agent-admin/agent-jobs-list";
import type { AgentJob } from "../src/kits/agent-admin/agent-jobs-model";
import { EditorStatusBar, SaveStatus } from "../src/kits/editor/editor-status";
import { VersionHistory, type DocumentVersion } from "../src/kits/editor/version-history";
import { LanguageBar } from "../src/kits/voice/translate";

// jsdom cannot lay anything out: these checks pin the classes and structure that let each kit component follow the
// width it is given (wrapping rows, min-w-0 text columns, base grid columns, container queries), not the viewport.
// The audit re-run in a real browser is the check that the layout itself holds.

describe("layout F2: grids need a base column", () => {
  it("no class string in the AI / agent / admin / editor / terminal / voice kits has a responsive grid-cols without a base grid-cols", () => {
    // `grid sm:grid-cols-2` leaves one implicit `auto` column, which grows to the widest min-content and pushes cards past the container.
    const root = path.resolve(__dirname, "../src/kits");
    const offenders: string[] = [];
    for (const kit of ["ai", "agent", "agent-admin", "editor", "terminal", "voice"]) {
      for (const file of fs.readdirSync(path.join(root, kit))) {
        if (!file.endsWith(".tsx")) continue;
        const text = fs.readFileSync(path.join(root, kit, file), "utf8");
        for (const m of text.matchAll(/"([^"\n]*)"/g)) {
          const cls = m[1]!;
          if (/(^| )grid( |$)/.test(cls) && /(sm|md|lg|xl|2xl|@\w+):grid-cols-/.test(cls) && !/(^| )grid-cols-/.test(cls)) offenders.push(`${kit}/${file}: ${cls}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("ConnectorDirectory cards size to the container: auto-fill grid, min-w-0 card, wrapping footer", () => {
    const entries: ConnectorCatalogEntry[] = [
      { id: "gh", name: "GitHub", category: "Developer", ways: ["hosted", "local"], description: "Issues and PRs", installed: true },
      { id: "linear", name: "Linear", category: "Developer", ways: ["hosted"] },
    ];
    render(<ConnectorDirectory entries={entries} onInstall={() => undefined} onManage={() => undefined} />);
    const grid = screen.getByRole("list", { name: "Connectors" });
    expect(grid.className).toContain("grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))]");
    expect(grid.className).not.toMatch(/(^|\s)(sm|md|lg|xl):grid-cols/);
    const card = grid.querySelector("[data-connector='gh']")!;
    expect(card).toHaveClass("min-w-0");
    const footer = card.querySelector(".mt-auto")!;
    expect(footer).toHaveClass("flex-wrap");
    expect(footer.querySelector(".ml-auto")).not.toBeNull();
  });
});

describe("layout F2: rows wrap instead of overflowing", () => {
  const providers: ProviderEntry[] = [
    { id: "nimbus", name: "Nimbus AI", auth: "oauth", status: "connected", modelCount: 14, quota: { used: 62 } },
  ];
  it("ProviderRow wraps and keeps its action group inside the row", () => {
    const { container } = render(<ProviderList providers={providers} onConnect={() => undefined} onDisconnect={() => undefined} onManage={() => undefined} />);
    const row = container.querySelector("[data-slot='provider-row']")!;
    expect(row).toHaveClass("flex-wrap");
    expect(row.className).not.toContain("sm:flex-nowrap");
    const actions = row.lastElementChild!;
    expect(actions).toHaveClass("flex-wrap", "ml-auto", "max-w-full");
    expect(actions).not.toHaveClass("shrink-0");
  });

  it("JobRow and its action buttons wrap on a narrow list", () => {
    const job: AgentJob = {
      id: "j1",
      name: "Inbox triage",
      prompt: "Triage my inbox",
      schedule: { kind: "interval", every: 30, unit: "m" },
      model: "claude-sonnet",
      skills: [],
      toolsets: [],
      mode: "script",
      script: "triage.sh",
      repeat: null,
      delivery: { platform: "local" },
      enabled: true,
      state: "scheduled",
    };
    render(<JobList jobs={[job]} onPause={() => undefined} onEdit={() => undefined} onDelete={() => undefined} />);
    const row = screen.getByRole("listitem");
    expect(row).toHaveClass("flex-wrap");
    const main = row.querySelector("button")!;
    expect(main).toHaveClass("min-w-0", "basis-48");
    const buttons = screen.getByRole("button", { name: /Edit Inbox triage/ }).parentElement!;
    expect(buttons).toHaveClass("flex-wrap", "ml-auto", "max-w-full");
    // the name row wraps its badges and the name truncates rather than being squeezed to a letter
    expect(screen.getByText("Inbox triage")).toHaveClass("max-w-full", "truncate");
    expect(screen.getByText("Inbox triage").parentElement).toHaveClass("flex-wrap");
  });

  it("AgentStatusLine bar layout wraps so the label is not truncated to a few letters", () => {
    render(<AgentStatusLine state="running" tool="Bash" tokens={3420} hint={<span>Esc to interrupt</span>} />);
    const line = screen.getByRole("status");
    expect(line).toHaveClass("flex-wrap");
    expect(screen.getByText(/Bash/).className).toContain("max-w-full");
  });

  it("EditorStatusBar and SaveStatus wrap", () => {
    const { container } = render(<EditorStatusBar status={<SaveStatus status="dirty" />} text="Hello brave new world" cursor={{ line: 3, column: 7 }} mode="Live" />);
    const bar = container.querySelector("[data-slot='editor-status-bar']")!;
    expect(bar).toHaveClass("flex-wrap");
    const right = bar.lastElementChild!;
    expect(right).toHaveClass("flex-wrap", "max-w-full");
    expect(right).not.toHaveClass("overflow-hidden");
    expect(container.querySelector("[data-slot='save-status']")).toHaveClass("flex-wrap", "max-w-full");
  });

  it("QueuedMessages row wraps its actions under the text", () => {
    const { container } = render(<QueuedMessages items={[{ id: "a", text: "Use pnpm instead" }]} onEdit={() => undefined} onRemove={() => undefined} onSteer={() => undefined} onSendNow={() => undefined} />);
    const li = container.querySelector("li[data-queued-id]")!;
    expect(li).toHaveClass("flex-wrap");
    expect(screen.getByTitle("Use pnpm instead")).toHaveClass("basis-32", "truncate");
    expect(screen.getByRole("button", { name: "Edit" }).parentElement).toHaveClass("ml-auto", "flex-wrap");
  });

  it("CheckpointMarker truncates its text and never shrinks the rewind action", () => {
    render(<CheckpointMarker files={[{ path: "a.ts", additions: 84, deletions: 5 }]} onRewind={() => undefined} />);
    expect(screen.getByRole("button", { name: /Rewind/ })).toHaveClass("shrink-0");
    expect(screen.getByText(/1 file changed/)).toHaveClass("min-w-0", "truncate");
  });

  it("ApprovalStack header wraps", () => {
    render(<ApprovalStack items={["a", "b", "c"]} onApproveAll={() => undefined} onDenyAll={() => undefined} renderItem={(item) => <p>{item}</p>} />);
    const header = screen.getByText(/Approval 1 of 3/).parentElement!;
    expect(header).toHaveClass("flex-wrap");
    expect(screen.getByRole("button", { name: /Deny all/ }).parentElement).toHaveClass("flex-wrap");
  });
});

describe("layout F2: narrow containers", () => {
  it("LanguageBar wraps chips instead of hiding the language menu in a horizontal scroller", () => {
    render(<LanguageBar source="auto" target="en" detected="hi" recentSources={["hi", "fr"]} recentTargets={["en", "es"]} />);
    const group = screen.getByRole("group", { name: "Source language" });
    expect(group).toHaveClass("flex-wrap");
    expect(group.className).not.toContain("overflow-x-auto");
    expect(group.parentElement).toHaveClass("flex-wrap");
  });

  it("VersionHistory stacks the version list under the preview until the container is wide", () => {
    const versions: DocumentVersion[] = [
      { id: "v2", createdAt: new Date("2026-03-03T14:00:00"), contributors: [], content: "Hello brave new world." },
      { id: "v1", createdAt: new Date("2026-03-02T09:00:00"), contributors: [], content: "Hello world." },
    ];
    const { container } = render(<VersionHistory versions={versions} />);
    const root = container.querySelector("[data-slot='version-history']")!;
    expect(root).toHaveClass("@container");
    const aside = screen.getByLabelText("Versions");
    expect(aside).toHaveClass("w-full", "@2xl:w-72", "@2xl:border-l");
    expect(aside.parentElement).toHaveClass("flex-col", "@2xl:flex-row");
    expect(aside.className).not.toMatch(/(^|\s)(sm|md|lg):/);
  });

  it("the model pill and composer toolbar can shrink, so a long model name never pushes the + button out", () => {
    render(<PromptInputModelPill model="A very long model display name" effort="High" />);
    expect(screen.getByRole("button")).toHaveClass("min-w-0", "shrink");
    const { container } = render(<ComposerToolbar addContext={<button type="button">+</button>} submit={<button type="button">go</button>} model={<span>m</span>} />);
    const bar = container.querySelector("[data-slot='composer-toolbar']")!;
    expect(bar.lastElementChild).toHaveClass("min-w-0", "shrink");
  });
});

describe("layout F2: PdfViewer toolbar", () => {
  it("wraps its groups and keeps the zoom button compact so the toolbar never spills at 360px", async () => {
    const { PdfViewer } = await import("../src/kits/editor/pdf-viewer");
    const { container } = render(<PdfViewer />);
    const bar = container.querySelector("[data-slot='pdf-toolbar']")!;
    expect(bar).toHaveClass("flex-wrap", "min-h-11");
    expect(bar).not.toHaveClass("h-11");
  });
});
