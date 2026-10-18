import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  AgentBrowserPane,
  AnnotationLayer,
  BrowserConsole,
  RealProfileConsentDialog,
  inferBrowserSecurity,
  normalizeBrowserInput,
  type BrowserAnnotation,
  type BrowserConsoleEntry,
} from "../src/kits/agent/agent-browser";
import {
  ArtifactCard,
  ArtifactLibrary,
  ArtifactViewer,
  formatArtifactTime,
  type ArtifactData,
  type ArtifactVersion,
} from "../src/kits/agent/artifacts";
import {
  BranchPill,
  ChangedFilesCard,
  ReviewFileTree,
  ReviewScopeTabs,
  ShipBar,
  WorktreeDialog,
  buildChangedFileTree,
  getShipDisabledReason,
  truncateBranchHead,
  validateWorktreeName,
  type ChangedFile,
  type WorktreeBranch,
} from "../src/kits/agent/git-review";
import { axeViolations } from "./a11y";

afterEach(() => vi.useRealTimers());

/* ------------------------------------------------------------------ */
/* Agent browser                                                       */
/* ------------------------------------------------------------------ */

describe("AgentBrowserPane", () => {
  it("helpers classify and normalize urls", () => {
    expect(inferBrowserSecurity("https://example.com")).toBe("secure");
    expect(inferBrowserSecurity("http://example.com")).toBe("insecure");
    expect(inferBrowserSecurity("http://localhost:5173/")).toBe("local");
    expect(inferBrowserSecurity("about:blank")).toBe("unknown");
    expect(normalizeBrowserInput("example.com")).toBe("https://example.com");
    expect(normalizeBrowserInput("localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeBrowserInput("  ")).toBe("");
  });

  it("fires nav callbacks and submits the url", () => {
    const onBack = vi.fn();
    const onForward = vi.fn();
    const onReload = vi.fn();
    const onNavigate = vi.fn();
    const { rerender } = render(
      <AgentBrowserPane
        url="https://app.local.test/"
        canGoBack
        canGoForward
        onBack={onBack}
        onForward={onForward}
        onReload={onReload}
        onNavigate={onNavigate}
      >
        <div>page</div>
      </AgentBrowserPane>
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onForward).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("img", { name: "Secure connection" })).toBeInTheDocument();

    const field = screen.getByRole("textbox", { name: "Address" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "docs.example.test/guide" } });
    fireEvent.submit(field.closest("form")!);
    expect(onNavigate).toHaveBeenCalledWith("https://docs.example.test/guide");

    const onStop = vi.fn();
    rerender(
      <AgentBrowserPane url="https://app.local.test/" loading progress={40} onStop={onStop}>
        <div>page</div>
      </AgentBrowserPane>
    );
    expect(screen.getByRole("progressbar", { name: "Page loading" })).toHaveAttribute("aria-valuenow", "40");
    fireEvent.click(screen.getByRole("button", { name: "Stop loading" }));
    expect(onStop).toHaveBeenCalled();
  });

  it("toggles the control lease", () => {
    const onControllerChange = vi.fn();
    render(
      <AgentBrowserPane url="https://x.test" defaultController="agent" agentName="Sutra" agentActivity="Reading the page" canGoBack onControllerChange={onControllerChange}>
        <div>page</div>
      </AgentBrowserPane>
    );
    expect(screen.getByText("Sutra is driving")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Address" })).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "Take over" }));
    expect(onControllerChange).toHaveBeenCalledWith("user");
    expect(screen.queryByText("Sutra is driving")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Hand back" }));
    expect(onControllerChange).toHaveBeenLastCalledWith("agent");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AgentBrowserPane url="http://localhost:3000" defaultController="agent" loading footer={<BrowserConsole entries={[]} />}>
        <div>page</div>
      </AgentBrowserPane>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

const consoleEntries: BrowserConsoleEntry[] = [
  { id: 1, level: "log", message: "App mounted", source: "main.js:3" },
  { id: 2, level: "warn", message: "Deprecated API used" },
  { id: 3, level: "error", message: "TypeError: x is undefined", source: "cart.js:88", count: 2 },
  { id: 4, level: "debug", message: "render cart" },
];

describe("BrowserConsole", () => {
  it("collapses, filters by text and level", () => {
    const onClear = vi.fn();
    render(<BrowserConsole entries={consoleEntries} onClear={onClear} />);
    expect(screen.getByLabelText("2 errors")).toBeInTheDocument();
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Console/ }));
    const log = screen.getByRole("log");
    expect(within(log).getAllByRole("listitem")).toHaveLength(4);

    fireEvent.change(screen.getByRole("searchbox", { name: "Filter console" }), { target: { value: "cart" } });
    expect(within(log).getAllByRole("listitem")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "debug" }));
    expect(screen.getByRole("button", { name: "debug" })).toHaveAttribute("aria-pressed", "false");
    expect(within(log).getAllByRole("listitem")).toHaveLength(1);
    expect(within(log).getByText("TypeError: x is undefined")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Filter console" }), { target: { value: "zzz" } });
    expect(within(log).getByText("No messages match")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear console" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<BrowserConsole entries={consoleEntries} defaultOpen onClear={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("AnnotationLayer", () => {
  const rect = { left: 100, top: 50, width: 400, height: 200, right: 500, bottom: 250, x: 100, y: 50, toJSON: () => ({}) } as DOMRect;

  it("drops a pin at the click position, edits and sends", async () => {
    const onSend = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <AnnotationLayer defaultActive onSendAnnotations={onSend} onAnnotationsChange={onChange}>
        <div>page</div>
      </AnnotationLayer>
    );
    const surface = container.querySelector<HTMLElement>('[data-slot="annotation-surface"]')!;
    surface.getBoundingClientRect = () => rect;
    expect(screen.getByRole("button", { name: "Send to agent" })).toBeDisabled();
    fireEvent.click(surface, { clientX: 200, clientY: 100 });
    const pinned = onChange.mock.calls.at(-1)![0] as BrowserAnnotation[];
    expect(pinned).toHaveLength(1);
    expect(pinned[0]).toMatchObject({ x: 25, y: 25, comment: "" });

    const pin = screen.getByRole("button", { name: "Annotation 1" });
    expect(pin.style.left).toBe("25%");
    const box = await screen.findByRole("textbox", { name: "Annotation 1 comment" });
    fireEvent.change(box, { target: { value: "Make this button bigger" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Annotation 1: Make this button bigger" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Annotations" })).getByText("Make this button bigger")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send to agent" }));
    expect(onSend).toHaveBeenCalledWith([expect.objectContaining({ x: 25, y: 25, comment: "Make this button bigger" })]);
    expect(screen.queryByRole("button", { name: /Annotation 1/ })).not.toBeInTheDocument();
  });

  it("ignores clicks when not annotating and removes pins", () => {
    const start: BrowserAnnotation[] = [{ id: "a", x: 10, y: 10, comment: "Typo" }];
    const { container } = render(
      <AnnotationLayer defaultAnnotations={start}>
        <div>page</div>
      </AnnotationLayer>
    );
    const surface = container.querySelector<HTMLElement>('[data-slot="annotation-surface"]')!;
    surface.getBoundingClientRect = () => rect;
    fireEvent.click(surface, { clientX: 200, clientY: 100 });
    expect(screen.getAllByRole("button", { name: /^Annotation \d/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove annotation 1" }));
    expect(screen.queryByRole("button", { name: /^Annotation \d/ })).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AnnotationLayer defaultAnnotations={[{ id: "a", x: 10, y: 10, comment: "Typo" }]}>
        <p>page</p>
      </AnnotationLayer>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("RealProfileConsentDialog", () => {
  it.each([
    ["Allow once", "once", false],
    ["Always allow", "always", true],
    ["Use a clean profile", "clean", false],
  ] as const)("%s → %s", (label, choice, remember) => {
    const onChoose = vi.fn();
    const onOpenChange = vi.fn();
    render(<RealProfileConsentDialog open onOpenChange={onOpenChange} onChoose={onChoose} profileName="Chrome — Personal" />);
    expect(screen.getByRole("dialog", { name: "Use your real browser profile?" })).toBeInTheDocument();
    expect(screen.getByText("Cookies and signed-in sessions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onChoose).toHaveBeenCalledWith(choice, { remember });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("remembers the choice when checked", () => {
    const onChoose = vi.fn();
    render(<RealProfileConsentDialog defaultOpen onChoose={onChoose} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Remember my choice" }));
    fireEvent.click(screen.getByRole("button", { name: "Use a clean profile" }));
    expect(onChoose).toHaveBeenCalledWith("clean", { remember: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    render(<RealProfileConsentDialog open />);
    expect(await axeViolations(screen.getByRole("dialog"))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Artifacts                                                           */
/* ------------------------------------------------------------------ */

const codeVersions: ArtifactVersion[] = [
  { id: "1", content: "const a = 1;", note: "First draft" },
  { id: "2", content: "const a = 2;", note: "Tweak" },
  { id: "3", content: "const a = 3;", note: "Final" },
];

describe("ArtifactCard", () => {
  it("switches versions and runs actions", () => {
    const onVersionChange = vi.fn();
    const onCopy = vi.fn();
    const onDownload = vi.fn();
    const onShare = vi.fn();
    const onOpen = vi.fn();
    render(
      <ArtifactCard
        title="counter.ts"
        kind="code"
        language="ts"
        versions={codeVersions}
        onVersionChange={onVersionChange}
        onCopy={onCopy}
        onDownload={onDownload}
        onShare={onShare}
        onOpen={onOpen}
      />
    );
    expect(screen.getByText("v3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next version" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous version" }));
    expect(onVersionChange).toHaveBeenCalledWith(1);
    expect(screen.getByText("v2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledWith("const a = 2;");
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(onDownload).toHaveBeenCalledWith("const a = 2;");
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onShare).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalled();
  });

  it("shows the streaming state", () => {
    render(<ArtifactCard title="Report" kind="markdown" content="" streaming onShare={() => {}} />);
    expect(screen.getByText("Generating…")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Report" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
  });

  it("renders html only in a sandboxed iframe after opting in", () => {
    const html = "<h1>Hi</h1><script>alert(1)</script>";
    const { container } = render(<ArtifactCard title="Landing" kind="html" content={html} />);
    expect(container.querySelector("iframe")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Render preview" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    const frame = screen.getByTitle("Landing preview") as HTMLIFrameElement;
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame.getAttribute("srcdoc")).toBe(html);
    expect(frame).not.toHaveAttribute("src");
    fireEvent.click(toggle);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders svg through an img data url", () => {
    render(<ArtifactCard title="Logo" kind="svg" content='<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>' />);
    const img = screen.getByRole("img", { name: "Logo" });
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <ArtifactCard title="counter.ts" kind="code" versions={codeVersions} onOpen={() => {}} />
        {/* Rendered iframes are covered above; axe can't traverse a sandboxed srcdoc frame in jsdom. */}
        <ArtifactCard title="Landing" kind="html" content="<p>x</p>" />
        <ArtifactCard title="Notes" kind="markdown" content="# Hello" streaming />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ArtifactViewer", () => {
  it("switches tabs, versions and fullscreen", () => {
    const onTabChange = vi.fn();
    const onFullscreenChange = vi.fn();
    const onClose = vi.fn();
    render(
      <ArtifactViewer
        title="Landing"
        kind="html"
        versions={[
          { id: "1", content: "<p>one</p>", note: "Initial" },
          { id: "2", content: "<p>two</p>", note: "Hero copy" },
        ]}
        onTabChange={onTabChange}
        onFullscreenChange={onFullscreenChange}
        onClose={onClose}
      />
    );
    const frame = screen.getByTitle("Landing preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame.getAttribute("srcdoc")).toBe("<p>two</p>");
    const codeTab = screen.getByRole("tab", { name: "Code" });
    fireEvent.mouseDown(codeTab);
    expect(onTabChange).toHaveBeenCalledWith("code");
    expect(codeTab).toHaveAttribute("aria-selected", "true");

    const history = screen.getByRole("complementary", { name: "Version history" });
    fireEvent.click(within(history).getByRole("button", { name: /v1/ }));
    expect(within(history).getByRole("button", { name: /v1/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByLabelText("Version 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    expect(onFullscreenChange).toHaveBeenCalledWith(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onFullscreenChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Close artifact" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ArtifactViewer title="counter.ts" kind="code" versions={codeVersions} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

const NOW = new Date("2026-10-18T12:00:00Z").getTime();
const lib: ArtifactData[] = [
  { id: "a", title: "Pricing page", kind: "html", versions: [{ id: "1", content: "" }], updatedAt: NOW - 3 * 3600_000 },
  { id: "b", title: "API client", kind: "code", language: "ts", versions: [{ id: "1", content: "" }, { id: "2", content: "" }], updatedAt: NOW - 60_000 },
  { id: "c", title: "Launch notes", kind: "markdown", versions: [{ id: "1", content: "" }], updatedAt: NOW - 2 * 86400_000 },
  { id: "d", title: "Billing schema", kind: "code", versions: [{ id: "1", content: "" }], updatedAt: NOW - 30 * 60_000 },
];

describe("ArtifactLibrary", () => {
  const titles = () => within(screen.getByRole("list", { name: "Artifacts" })).getAllByRole("button").map((b) => b.querySelector(".font-medium")!.textContent);

  it("searches, filters by kind and sorts", () => {
    const onOpen = vi.fn();
    const { rerender } = render(<ArtifactLibrary artifacts={lib} now={NOW} onOpenArtifact={onOpen} />);
    expect(titles()).toEqual(["API client", "Billing schema", "Pricing page", "Launch notes"]);
    expect(screen.getByText(/1m ago/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Code/ }));
    expect(titles()).toEqual(["API client", "Billing schema"]);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search artifacts" }), { target: { value: "bill" } });
    expect(titles()).toEqual(["Billing schema"]);
    fireEvent.click(screen.getByRole("button", { name: /Billing schema/ }));
    expect(onOpen).toHaveBeenCalledWith(lib[3]);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search artifacts" }), { target: { value: "nothing-here" } });
    expect(screen.getByText("No matching artifacts")).toBeInTheDocument();

    rerender(<ArtifactLibrary key="fresh" artifacts={lib} now={NOW} sort="oldest" />);
    expect(titles()).toEqual(["Launch notes", "Pricing page", "Billing schema", "API client"]);
    rerender(<ArtifactLibrary key="fresh" artifacts={lib} now={NOW} sort="title" />);
    expect(titles()).toEqual(["API client", "Billing schema", "Launch notes", "Pricing page"]);
  });

  it("shows the empty state", () => {
    render(<ArtifactLibrary artifacts={[]} />);
    expect(screen.getByText("No artifacts yet")).toBeInTheDocument();
    expect(formatArtifactTime(NOW - 10_000, NOW)).toBe("just now");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ArtifactLibrary artifacts={lib} now={NOW} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Git review                                                          */
/* ------------------------------------------------------------------ */

const files: ChangedFile[] = [
  { path: "src/components/button.tsx", status: "modified", additions: 12, deletions: 3 },
  { path: "src/components/new-thing.tsx", status: "added", additions: 80, deletions: 0 },
  { path: "src/lib/old.ts", status: "deleted", additions: 0, deletions: 40 },
  { path: "README.md", status: "renamed", oldPath: "readme.md", additions: 1, deletions: 1 },
  { path: "package.json", status: "modified", additions: 2, deletions: 2 },
];

describe("ChangedFilesCard", () => {
  it("shows totals, expands and opens files", () => {
    const onReview = vi.fn();
    const onOpenFile = vi.fn();
    render(<ChangedFilesCard files={files} onReview={onReview} onOpenFile={onOpenFile} />);
    expect(screen.getByText("5 files changed")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "95 additions, 46 deletions" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }));
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Open src/lib/old.ts" }));
    expect(onOpenFile).toHaveBeenCalledWith(files[2]);
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(onReview).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ChangedFilesCard files={files} onReview={() => {}} onOpenFile={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ReviewScopeTabs", () => {
  it("shows counts and changes scope", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <ReviewScopeTabs counts={{ uncommitted: 3, branch: 12, turn: 2 }} baseBranch="main" onValueChange={onValueChange} />
    );
    const counts = [...container.querySelectorAll('[data-slot="scope-count"]')].map((n) => n.textContent);
    expect(counts).toEqual(["3", "12", "2"]);
    const branch = screen.getByRole("radio", { name: /vs main/ });
    fireEvent.click(branch);
    expect(onValueChange).toHaveBeenCalledWith("branch");
    expect(branch).toHaveAttribute("aria-checked", "true");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ReviewScopeTabs counts={{ uncommitted: 1 }} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ReviewFileTree", () => {
  it("builds a compacted tree", () => {
    const nodes = buildChangedFileTree(files);
    expect(nodes.map((n) => n.id)).toEqual(["dir:src", "package.json", "README.md"]);
    const one = buildChangedFileTree([{ path: "a/b/c/d.ts" }]);
    expect(one[0]).toMatchObject({ id: "dir:a/b/c", label: "a/b/c" });
  });

  it("shows status letters and selects files", () => {
    const onSelectedChange = vi.fn();
    const onOpenFile = vi.fn();
    const { container } = render(<ReviewFileTree files={files} onSelectedChange={onSelectedChange} onOpenFile={onOpenFile} />);
    const letter = (s: string) => container.querySelector(`[data-status="${s}"]`)!;
    expect(letter("added")).toHaveTextContent("A");
    expect(letter("deleted")).toHaveTextContent("D");
    expect(letter("renamed")).toHaveTextContent("R");
    expect(letter("added").className).toMatch(/text-success/);
    expect(letter("deleted").className).toMatch(/text-destructive/);
    fireEvent.click(screen.getByText("button.tsx").closest("[data-tree-row]")!);
    expect(onSelectedChange).toHaveBeenCalledWith("src/components/button.tsx");
    expect(onOpenFile).toHaveBeenCalledWith(files[0]);
  });

  it("has no axe violations", async () => {
    const { container } = render(<ReviewFileTree files={files} defaultSelected="package.json" showStats />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ShipBar", () => {
  it("truncateBranchHead keeps the tail", () => {
    expect(truncateBranchHead("main", 10)).toBe("main");
    expect(truncateBranchHead("feature/agent-browser-pane", 12)).toBe("…rowser-pane");
    expect(truncateBranchHead("feature/agent-browser-pane", 12)).toHaveLength(12);
    expect(truncateBranchHead("abcdef", 1)).toBe("…");
    expect(truncateBranchHead("abcdef", 0)).toBe("");
    expect(truncateBranchHead("abcdef", 6)).toBe("abcdef");
  });

  it("computes disabled reasons", () => {
    expect(getShipDisabledReason("commit", { changedCount: 0, message: "" })).toBe("Nothing to commit");
    expect(getShipDisabledReason("commit", { changedCount: 2, message: "x", conflicts: 1 })).toBe("Resolve 1 conflict first");
    expect(getShipDisabledReason("commit", { changedCount: 2, message: " " })).toBe("Write a commit message");
    expect(getShipDisabledReason("commit-push", { changedCount: 2, message: "x", behind: 3 })).toMatch(/behind/);
    expect(getShipDisabledReason("pr", { changedCount: 0, message: "", ahead: 2 })).toBeNull();
    expect(getShipDisabledReason("commit", { changedCount: 2, message: "x" })).toBeNull();
  });

  it("runs the primary action and shows reasons", () => {
    const onCommit = vi.fn();
    const onPush = vi.fn();
    const onDelegate = vi.fn();
    const { rerender } = render(
      <ShipBar branch="feature/very-long-branch-name-for-agent-browser" changedCount={3} ahead={1} behind={0} onCommit={onCommit} onCommitAndPush={onPush} onDelegate={onDelegate} />
    );
    const commit = screen.getByRole("button", { name: "Commit" });
    expect(commit).toBeDisabled();
    expect(screen.getByText("Write a commit message")).toBeInTheDocument();
    expect(commit).toHaveAttribute("aria-describedby");
    fireEvent.change(screen.getByRole("textbox", { name: "Commit message" }), { target: { value: "feat: add browser pane " } });
    expect(commit).toBeEnabled();
    fireEvent.click(commit);
    expect(onCommit).toHaveBeenCalledWith("feat: add browser pane");
    fireEvent.click(screen.getByRole("button", { name: "Hand to agent" }));
    expect(onDelegate).toHaveBeenCalled();
    expect(screen.getByLabelText("1 ahead")).toBeInTheDocument();

    rerender(<ShipBar branch="main" changedCount={3} conflicts={2} defaultMessage="x" action="commit-push" onCommitAndPush={onPush} />);
    expect(screen.getByRole("button", { name: "Commit & push" })).toBeDisabled();
    expect(screen.getByText("Resolve 2 conflicts first")).toBeInTheDocument();

    rerender(<ShipBar branch="main" changedCount={0} />);
    expect(screen.getByText("Nothing to commit")).toBeInTheDocument();

    rerender(<ShipBar branch="main" changedCount={1} message="x" status="running" progressLabel="Pushing…" />);
    expect(screen.getByText("Pushing…")).toBeInTheDocument();
    rerender(<ShipBar branch="main" changedCount={0} status="success" result="Committed a1b2c3d" />);
    expect(screen.getByText("Committed a1b2c3d")).toBeInTheDocument();
    rerender(<ShipBar branch="main" changedCount={1} message="x" status="error" error="Push rejected" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Push rejected");
  });

  it("picks another action from the split menu", async () => {
    const onPR = vi.fn();
    render(<ShipBar branch="main" changedCount={1} defaultMessage="msg" onCreatePR={onPR} />);
    const trigger = screen.getByRole("button", { name: "More ship actions" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    const item = await screen.findByRole("menuitem", { name: /Create PR/ });
    fireEvent.click(item);
    expect(onPR).toHaveBeenCalledWith("msg");
    await waitFor(() => expect(screen.getByRole("button", { name: "Create PR" })).toBeInTheDocument());
  });

  it("has no axe violations", async () => {
    const { container } = render(<ShipBar branch="main" changedCount={2} onGenerateMessage={() => {}} onDelegate={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

const branches: WorktreeBranch[] = [
  { name: "main", current: true, recent: true },
  { name: "feat/browser", recent: true },
  { name: "fix/login" },
  { name: "chore/deps" },
  { name: "origin/main", remote: true },
  { name: "origin/release-2.0", remote: true },
];

describe("WorktreeDialog", () => {
  it("validates names", () => {
    expect(validateWorktreeName("")).toBe("Name is required");
    expect(validateWorktreeName("has space")).toBe("No spaces allowed");
    expect(validateWorktreeName("a..b")).toMatch(/valid/);
    expect(validateWorktreeName("x.lock")).toMatch(/valid/);
    expect(validateWorktreeName("feat/ok", ["feat/ok"])).toMatch(/already exists/);
    expect(validateWorktreeName("feat/ok")).toBeNull();
  });

  it("validates, searches branches and creates", async () => {
    const onCreate = vi.fn();
    render(<WorktreeDialog open branches={branches} worktreeRoot="~/wt/sutra" onCreate={onCreate} />);
    const create = screen.getByRole("button", { name: "Create worktree" });
    fireEvent.click(create);
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();

    const name = screen.getByRole("textbox", { name: /Branch name/ });
    fireEvent.change(name, { target: { value: "fix/login" } });
    expect(screen.getByText("“fix/login” already exists")).toBeInTheDocument();
    fireEvent.change(name, { target: { value: "feat/review-pane" } });
    expect(screen.getByText("~/wt/sutra/feat-review-pane")).toBeInTheDocument();

    const base = screen.getByRole("combobox", { name: "Base branch" });
    expect(base).toHaveTextContent("main");
    fireEvent.click(base);
    expect(await screen.findByText("Remote branches")).toBeInTheDocument();
    expect(screen.getByText("Recent")).toBeInTheDocument();
    const search = screen.getByPlaceholderText("Search branches…");
    fireEvent.change(search, { target: { value: "release" } });
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    fireEvent.click(screen.getByRole("option", { name: /origin\/release-2\.0/ }));
    expect(base).toHaveTextContent("origin/release-2.0");

    fireEvent.click(screen.getByRole("switch", { name: /Open in new session/ }));
    fireEvent.click(create);
    expect(onCreate).toHaveBeenCalledWith({
      name: "feat/review-pane",
      base: "origin/release-2.0",
      path: "~/wt/sutra/feat-review-pane",
      openInNewSession: false,
    });
  });

  it("has no axe violations", async () => {
    render(<WorktreeDialog open branches={branches} />);
    expect(await axeViolations(screen.getByRole("dialog"))).toEqual([]);
  });
});

describe("BranchPill", () => {
  it("truncates from the head, shows status and copies", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const name = "feature/some-really-long-branch-name";
    const { container } = render(<BranchPill name={name} maxLength={14} status="dirty" />);
    expect(screen.getByText("…g-branch-name")).toBeInTheDocument();
    expect(screen.getByText(name)).toHaveClass("sr-only");
    expect(screen.getByText(", uncommitted changes")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy branch name" }));
    });
    expect(writeText).toHaveBeenCalledWith(name);
    expect(screen.getByRole("button", { name: "Copied branch name" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <BranchPill name="main" status="clean" />
        <BranchPill name="fix/merge" status="conflict" copyable={false} />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});
