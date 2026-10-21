/** Vocabulary aliases (b2): controlled triads, tone, lifecycle status, density and empty states, forwardRef. */
import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeEditor, type CodeEditorHandle } from "../src/kits/editor/code-editor";
import { ChatFeedbackActions } from "../src/kits/ai/chat-message-actions";
import { Combobox } from "../src/primitives/combobox";
import { DatePicker } from "../src/primitives/date-picker";
import { Note } from "../src/primitives/empty-state";
import { Dropzone } from "../src/primitives/dropzone";
import { Chip, ChipGroup } from "../src/primitives/chip";
import { ChatTool, ChatToolStateBadge } from "../src/kits/ai/chat-tool";
import { CommentComposer } from "../src/patterns/comments";
import { ActivityFeed, ConnectedAppList } from "../src/kits/identity/connected-apps";
import { SecurityScanVerdict, ExtensionInstallDialog } from "../src/kits/agent-admin/extensions-catalog";
import { ConfirmDialog } from "../src/primitives/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../src/primitives/dropdown-menu";
import { FileUploadItem } from "../src/patterns/file-upload";
import { ChatListView } from "../src/kits/ai/chat-list-view";
import { DocumentOutline } from "../src/kits/editor/document-outline";
import { DiffViewer } from "../src/patterns/diff-viewer";
import { TipBubble } from "../src/patterns/coachmarks";
import { ScopeIcon } from "../src/kits/identity/consent";

describe("vocabulary: controlled triads", () => {
  it("CodeEditor fires onValueChange and the deprecated onChange", () => {
    const ref = React.createRef<CodeEditorHandle>();
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(<CodeEditor ref={ref} defaultValue="hi" onValueChange={onValueChange} onChange={onChange} />);
    act(() => ref.current!.view!.dispatch({ selection: { anchor: 2 } }));
    act(() => ref.current!.insert("!"));
    expect(onValueChange).toHaveBeenLastCalledWith("hi!", expect.anything());
    expect(onChange).toHaveBeenLastCalledWith("hi!", expect.anything());
  });

  it("ChatFeedbackActions fires onValueChange and the deprecated onFeedback", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onFeedback = vi.fn();
    render(<ChatFeedbackActions onValueChange={onValueChange} onFeedback={onFeedback} />);
    await user.click(screen.getByRole("button", { name: "Good response" }));
    expect(onValueChange).toHaveBeenLastCalledWith("up");
    expect(onFeedback).toHaveBeenLastCalledWith("up");
  });

  it("CommentComposer supports value / onValueChange", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Controlled() {
      const [v, setV] = React.useState("draft");
      return (
        <CommentComposer
          value={v}
          onValueChange={(next) => {
            setV(next);
            onValueChange(next);
          }}
          onSubmit={() => {}}
        />
      );
    }
    render(<Controlled />);
    const field = screen.getByRole("textbox", { name: "Comment" });
    expect(field).toHaveValue("draft");
    await user.type(field, "!");
    expect(onValueChange).toHaveBeenLastCalledWith("draft!");
    expect(field).toHaveValue("draft!");
  });

  it("Combobox and DatePicker honour defaultOpen", () => {
    render(<Combobox aria-label="Fruit" options={[{ value: "a", label: "Apple" }]} defaultOpen />);
    expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveAttribute("data-state", "open");
    render(<DatePicker aria-label="Due" defaultOpen />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("DiffViewer defaultMode is uncontrolled and toggleable", async () => {
    const user = userEvent.setup();
    const { container } = render(<DiffViewer oldValue="a" newValue="b" defaultMode="split" />);
    const root = container.querySelector("[data-mode]")!;
    expect(root).toHaveAttribute("data-mode", "split");
    await user.click(screen.getByRole("radio", { name: "Inline" }));
    expect(root).toHaveAttribute("data-mode", "inline");
  });
});

describe("vocabulary: tone", () => {
  it('Note tone="destructive" matches the deprecated "error"', () => {
    render(
      <>
        <Note tone="destructive">A</Note>
        <Note tone="error">B</Note>
      </>
    );
    const [a, b] = screen.getAllByRole("alert");
    expect(a).toHaveAttribute("data-tone", "destructive");
    expect(b).toHaveAttribute("data-tone", "destructive");
    expect(a!.className).toBe(b!.className);
  });

  it("Note loading matches the deprecated busy", () => {
    render(
      <>
        <Note loading>A</Note>
        <Note busy>B</Note>
      </>
    );
    for (const el of screen.getAllByRole("status")) expect(el).toHaveAttribute("aria-busy", "true");
  });

  it('Chip tone="primary" matches the deprecated color="brand"', () => {
    render(
      <>
        <Chip tone="primary" variant="solid">A</Chip>
        <Chip color="brand" variant="solid">B</Chip>
      </>
    );
    const a = screen.getByRole("button", { name: "A" }).parentElement!;
    const b = screen.getByRole("button", { name: "B" }).parentElement!;
    expect(a.className).toBe(b.className);
    expect(a.className).toContain("bg-primary");
  });

  it("ChipGroup accepts tone", () => {
    render(
      <ChipGroup tone="success" variant="soft" defaultValue="x">
        <Chip value="x">X</Chip>
      </ChipGroup>
    );
    expect(screen.getByRole("button", { name: "X" }).parentElement!.className).toContain("bg-success-soft");
  });

  it("SecurityScanVerdict policyTone accepts warning and the deprecated warn", () => {
    const { container } = render(
      <>
        <SecurityScanVerdict verdict="caution" policy="P1" policyTone="warning" />
        <SecurityScanVerdict verdict="caution" policy="P2" policyTone="warn" />
      </>
    );
    const [a, b] = Array.from(container.querySelectorAll("[data-policy]"));
    expect(a!.className).toBe(b!.className);
  });

  it("ActivityFeed risk accepts destructive and the deprecated danger", () => {
    const at = Date.UTC(2026, 0, 1);
    render(
      <ActivityFeed
        now={at}
        groupByDay={false}
        events={[
          { id: "a", type: "alert", description: "A", at, risk: "destructive" },
          { id: "b", type: "alert", description: "B", at, risk: "danger" },
        ]}
      />
    );
    const a = screen.getByText("A").closest("button")!;
    const b = screen.getByText("B").closest("button")!;
    expect(a.className).toContain("bg-destructive-soft/40");
    expect(a.className).toBe(b.className);
  });

  it("ConfirmDialog tone accepts canonical and legacy spellings", () => {
    render(<ConfirmDialog defaultOpen title="Delete?" tone="danger" confirmLabel="Delete" />);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("bg-destructive");
  });

  it("DropdownMenuItem tone matches the deprecated variant", () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem tone="destructive">A</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">B</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const [a, b] = screen.getAllByRole("menuitem");
    expect(a).toHaveAttribute("data-variant", "destructive");
    expect(b).toHaveAttribute("data-variant", "destructive");
  });

  it("TipBubble tone matches the deprecated accent", () => {
    render(
      <>
        <TipBubble tips={[{ id: "a", body: "A" }]} tone="info">
          <button type="button">anchor A</button>
        </TipBubble>
        <TipBubble tips={[{ id: "b", body: "B" }]} accent="info">
          <button type="button">anchor B</button>
        </TipBubble>
      </>
    );
    const bar = (id: string) => document.querySelector(`[data-tip="${id}"] > span[aria-hidden]`)!;
    expect(bar("a").className).toContain("bg-info");
    expect(bar("a").className).toBe(bar("b").className);
  });
});

describe("vocabulary: lifecycle status", () => {
  it("ChatToolStateBadge renders canonical and legacy states alike", () => {
    render(
      <>
        <ChatToolStateBadge state="succeeded" data-testid="a" />
        <ChatToolStateBadge state="completed" data-testid="b" />
        <ChatToolStateBadge state="failed" data-testid="c" />
        <ChatToolStateBadge state="error" data-testid="d" />
        <ChatToolStateBadge state="canceled" data-testid="e" />
      </>
    );
    expect(screen.getByTestId("a")).toHaveTextContent("Completed");
    expect(screen.getByTestId("a").className).toBe(screen.getByTestId("b").className);
    expect(screen.getByTestId("c")).toHaveTextContent("Error");
    expect(screen.getByTestId("c").className).toBe(screen.getByTestId("d").className);
    expect(screen.getByTestId("e")).toHaveTextContent("Canceled");
  });

  it('ChatTool shows errorText for state="failed"', async () => {
    const user = userEvent.setup();
    render(<ChatTool name="t" state="failed" errorText="Boom" input={{}} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("FileUploadItem accepts canonical statuses", () => {
    const file = new File(["x"], "a.txt");
    render(
      <ul>
        <FileUploadItem file={{ id: "1", file, status: "failed", error: "Nope" }} hideRemove />
      </ul>
    );
    expect(screen.getByText("Nope")).toBeInTheDocument();
  });

  it("ExtensionInstallDialog accepts canonical statuses", () => {
    render(<ExtensionInstallDialog defaultOpen name="X" verified status="succeeded" />);
    expect(screen.getByText("Installed successfully")).toBeInTheDocument();
  });
});

describe("vocabulary: density and empty states", () => {
  it('Dropzone density="compact" matches the deprecated compact', () => {
    render(
      <>
        <Dropzone density="compact" title="A" />
        <Dropzone compact title="B" />
        <Dropzone title="C" />
      </>
    );
    const [a, b, c] = screen.getAllByRole("button");
    expect(a).toHaveAttribute("data-density", "compact");
    expect(b).toHaveAttribute("data-density", "compact");
    expect(c).toHaveAttribute("data-density", "normal");
    expect(a!.className).toBe(b!.className);
  });

  it("CommentComposer density matches the deprecated compact", () => {
    render(
      <>
        <CommentComposer density="compact" submitLabel="Send A" onSubmit={() => {}} />
        <CommentComposer compact submitLabel="Send B" onSubmit={() => {}} />
        <CommentComposer submitLabel="Send C" onSubmit={() => {}} />
      </>
    );
    expect(screen.queryByRole("button", { name: "Send A" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send B" })).toBeNull();
    expect(screen.getByRole("button", { name: "Send C" })).toBeInTheDocument();
  });

  it("emptyState is preferred and legacy empty props still work", () => {
    render(
      <>
        <ActivityFeed events={[]} emptyState="Nothing A" />
        <ActivityFeed events={[]} empty="Nothing B" />
        <ActivityFeed events={[]} />
        <ConnectedAppList apps={[]} emptyState="No apps A" />
        <ChatListView items={[]} emptyState="No chats A" />
        <ChatListView items={[]} emptyMessage="No chats B" />
        <DocumentOutline headings={[]} emptyState="No outline A" />
        <DocumentOutline headings={[]} emptyHint="No outline B" />
      </>
    );
    for (const t of ["Nothing A", "Nothing B", "No activity yet", "No apps A", "No chats A", "No chats B", "No outline A", "No outline B"]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it("Combobox empty text has no trailing period and emptyState overrides it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Combobox aria-label="Fruit" options={[{ value: "a", label: "Apple" }]} />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await user.keyboard("zzz");
    expect(await screen.findByText("No results")).toBeInTheDocument();
    unmount();
    render(<Combobox aria-label="Veg" options={[{ value: "a", label: "Apple" }]} emptyState="Nothing here" emptyText="Old" />);
    await user.click(screen.getByRole("combobox", { name: "Veg" }));
    await user.keyboard("zzz");
    expect(await screen.findByText("Nothing here")).toBeInTheDocument();
  });
});

describe("forwardRef", () => {
  it("ScopeIcon forwards its ref to the svg", () => {
    const ref = React.createRef<SVGSVGElement>();
    render(<ScopeIcon ref={ref} scope="email" />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });
});
