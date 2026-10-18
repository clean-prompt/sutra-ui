import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RichTextEditor, type RichTextEditorInstance } from "../src/components/rich-text-editor";
import { NestedValueEditor, SchemaForm, type SchemaFormSchema } from "../src/components/schema-form";
import { PromptInput, PromptInputRestoredDraft, PromptInputSubmit, PromptInputTextarea, usePromptInput } from "../src/components/prompt-input";
import { Progress, ProgressCircle, ProgressSegments } from "../src/components/progress";
import { SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton, SidebarProvider } from "../src/components/sidebar-navigation";
import { KillButton } from "../src/components/process-table";
import { ZoomPan } from "../src/components/primitives-extra";
import { ProgressDialog, toStreamingTaskState } from "../src/components/progress-dialog";
import { Sparkline } from "../src/components/sparkline";
import { RequestIdCopy } from "../src/components/request-inspector";
import { SettingsRow } from "../src/components/settings";
import { RuleScopePicker, PermissionPrompt } from "../src/components/permission-prompt";
import { SessionList } from "../src/components/sessions";

/* jsdom has no layout: ProseMirror measures through Range/Element rects. */
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect;
const emptyRects = Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getClientRects ??= () => emptyRects;
Range.prototype.getBoundingClientRect ??= () => emptyRect;
Element.prototype.getClientRects ??= () => emptyRects;
(document as unknown as { elementFromPoint: () => null }).elementFromPoint ??= () => null;

describe("RichTextEditor onValueChange", () => {
  it.each(["onValueChange", "onChange"] as const)("emits edits through %s", (prop) => {
    const editorRef = React.createRef<RichTextEditorInstance | null>();
    const handler = vi.fn();
    render(<RichTextEditor defaultValue="<p>Hi</p>" toolbar="none" editorRef={editorRef} {...{ [prop]: handler }} />);
    act(() => {
      editorRef.current!.commands.insertContent(" there");
    });
    expect(handler).toHaveBeenLastCalledWith(expect.stringContaining("there"), editorRef.current);
  });

  it("prefers onValueChange when both are passed", () => {
    const editorRef = React.createRef<RichTextEditorInstance | null>();
    const canonical = vi.fn();
    const legacy = vi.fn();
    render(<RichTextEditor defaultValue="<p>Hi</p>" toolbar="none" editorRef={editorRef} onValueChange={canonical} onChange={legacy} />);
    act(() => {
      editorRef.current!.commands.insertContent("!");
    });
    expect(canonical).toHaveBeenCalled();
    expect(legacy).not.toHaveBeenCalled();
  });
});

const formSchema: SchemaFormSchema = { type: "object", properties: { name: { type: "string", title: "Name" } } };

describe("SchemaForm onValueChange", () => {
  it.each(["onValueChange", "onChange"] as const)("emits the form value through %s", (prop) => {
    const handler = vi.fn();
    render(<SchemaForm schema={formSchema} {...{ [prop]: handler }} />);
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Ada" } });
    expect(handler).toHaveBeenLastCalledWith({ name: "Ada" });
  });

  it.each(["onValueChange", "onChange"] as const)("NestedValueEditor emits through %s", (prop) => {
    const handler = vi.fn();
    render(<NestedValueEditor schema={{ type: "string", title: "Alias" }} value="" {...{ [prop]: handler }} />);
    fireEvent.change(screen.getByLabelText(/^Alias/), { target: { value: "x" } });
    expect(handler).toHaveBeenLastCalledWith("x");
  });
});

function LoadingProbe() {
  const ctx = usePromptInput();
  return <span data-testid="probe" data-loading={String(ctx.loading)} data-legacy={String(ctx.isLoading)} />;
}

describe("PromptInput loading", () => {
  it.each([{ loading: true }, { isLoading: true }])("turns submit into stop with %o", (flag) => {
    const onStop = vi.fn();
    render(
      <PromptInput aria-label="Composer" defaultValue="hello" onStop={onStop} {...flag}>
        <PromptInputTextarea />
        <PromptInputSubmit />
        <LoadingProbe />
      </PromptInput>
    );
    expect(screen.getByRole("button", { name: "Stop generating" })).toBeEnabled();
    expect(screen.getByTestId("probe")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("probe")).toHaveAttribute("data-legacy", "true");
  });

  it("`loading` wins over the deprecated `isLoading`", () => {
    render(
      <PromptInput defaultValue="hello" loading={false} isLoading>
        <PromptInputSubmit />
      </PromptInput>
    );
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("exposes onLargePaste (and the deprecated handleLargePaste) in the context", () => {
    let ctx: ReturnType<typeof usePromptInput> | null = null;
    function Grab() {
      ctx = usePromptInput();
      return null;
    }
    const onLargePaste = vi.fn();
    render(
      <PromptInput largePasteThreshold={5} onLargePaste={onLargePaste}>
        <Grab />
      </PromptInput>
    );
    expect(ctx!.onLargePaste).toBeTypeOf("function");
    expect(ctx!.handleLargePaste).toBe(ctx!.onLargePaste);
    act(() => {
      expect(ctx!.onLargePaste!("a long paste", [0, 0])).toBe(true);
    });
    expect(onLargePaste).toHaveBeenCalledWith("a long paste");
  });

  it("PromptInputRestoredDraft supports defaultOpen and onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<PromptInputRestoredDraft onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<PromptInputRestoredDraft key="closed" defaultOpen={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("Progress tone", () => {
  it.each([{ tone: "success" }, { color: "success" }] as const)("colours the bar with %o", (p) => {
    const { container } = render(<Progress value={40} aria-label="p" {...p} />);
    expect(container.querySelector(".bg-success")).toBeInTheDocument();
  });

  it("accepts legacy tone spellings and prefers tone over color", () => {
    const { container } = render(<Progress value={40} aria-label="p" tone="danger" color="success" />);
    expect(container.querySelector(".bg-destructive")).toBeInTheDocument();
    expect(container.querySelector(".bg-success")).not.toBeInTheDocument();
  });

  it("ProgressCircle and ProgressSegments take tone too", () => {
    const { container } = render(
      <>
        <ProgressCircle value={50} tone="warning" />
        <ProgressSegments value={2} tone="info" />
      </>
    );
    expect(container.querySelector(".stroke-warning")).toBeInTheDocument();
    expect(container.querySelector(".bg-info")).toBeInTheDocument();
  });
});

describe("SidebarMenuButton active", () => {
  it.each([{ active: true }, { isActive: true }])("marks the current page with %o", (flag) => {
    render(
      <SidebarProvider>
        <SidebarMenuButton {...flag}>Dashboard</SidebarMenuButton>
        <SidebarMenuSubButton href="#a" {...flag}>
          Sub
        </SidebarMenuSubButton>
      </SidebarProvider>
    );
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Sub" })).toHaveAttribute("aria-current", "page");
  });

  it("SidebarMenuSub forwards active to its trigger", () => {
    render(
      <SidebarProvider>
        <SidebarMenuSub label="Projects" active />
      </SidebarProvider>
    );
    expect(screen.getByRole("button", { name: "Projects" })).toHaveAttribute("aria-current", "page");
  });
});

describe("other B4 aliases", () => {
  it.each([{ loading: true }, { pending: true }])("KillButton shows Killing… with %o", (flag) => {
    render(<KillButton pid={42} onKill={() => {}} {...flag} />);
    expect(screen.getByRole("status")).toHaveTextContent("Killing…");
  });

  it.each(["onValueChange", "onChange"] as const)("ZoomPan reports state through %s", (prop) => {
    const handler = vi.fn();
    render(<ZoomPan label="Diagram" {...{ [prop]: handler }} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ scale: 1.25 }));
  });

  it("ProgressDialog accepts canonical and legacy lifecycle spellings", () => {
    expect(toStreamingTaskState("cancelled")).toBe("canceled");
    expect(toStreamingTaskState("pending")).toBe("idle");
    expect(toStreamingTaskState("done")).toBe("succeeded");
    expect(toStreamingTaskState("error")).toBe("failed");
    render(<ProgressDialog open title="Export" state="cancelled" />);
    expect(screen.getByText("Canceled")).toBeInTheDocument();
  });

  it("Sparkline tone wins over color", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} tone="destructive" color="#00ff00" label="s" />);
    expect(container.innerHTML).toContain("var(--destructive)");
    expect(container.innerHTML).not.toContain("#00ff00");
  });

  it("forwards refs on RequestIdCopy, SettingsRow and RuleScopePicker", () => {
    const btn = React.createRef<HTMLButtonElement>();
    const row = React.createRef<HTMLElement>();
    const picker = React.createRef<HTMLSpanElement>();
    render(
      <>
        <RequestIdCopy ref={btn} id="req_1" data-testid="rid" />
        <SettingsRow ref={row} title="Theme" />
        <RuleScopePicker ref={picker} data-testid="picker" />
      </>
    );
    expect(btn.current).toBe(screen.getByTestId("rid"));
    expect(row.current).toHaveAttribute("data-slot", "settings-row");
    expect(picker.current).toBe(screen.getByTestId("picker"));
  });

  it("PermissionPrompt accepts defaultDecision", () => {
    const { container } = render(<PermissionPrompt title="Run it?" defaultDecision={{ choice: "allow" }} />);
    expect(container.querySelector("[data-decided='allow']")).toBeInTheDocument();
  });

  it("SessionList accepts emptyState", async () => {
    render(<SessionList sessions={[]} emptyState={<p>Nothing here</p>} />);
    await waitFor(() => expect(screen.getByText("Nothing here")).toBeInTheDocument());
  });
});
