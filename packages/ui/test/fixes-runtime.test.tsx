import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { SlotFill, SlotOutlet, SlotProvider, createSlotRegistry, useSlotContributions } from "../src/kits/agent-admin/slot-outlet";
import { TilingLayout, type FloatingPaneState, type LayoutNode } from "../src/patterns/tiling-layout";
import { detectShortcutPlatform } from "../src/patterns/shortcuts";
import { CallScreen } from "../src/kits/social/call-overlay";
import { ApiKeyCreateDialog } from "../src/kits/identity/api-keys";

// jsdom may lack PointerEvent; without it fireEvent.pointer* drops pointer fields.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
}

const pointer = { pointerId: 1, pointerType: "mouse", button: 0 };
const flush = () => act(async () => {});

/* ------------------------------------------------------------------ */
/* SlotFill                                                            */
/* ------------------------------------------------------------------ */

describe("SlotFill registration", () => {
  it("does not loop when a SlotFill lives inside an extension rendered by a SlotOutlet", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let renders = 0;
    function Extension() {
      renders++;
      return (
        <SlotFill slot="b">
          <span>filled from extension</span>
        </SlotFill>
      );
    }
    render(
      <SlotProvider contributions={[{ id: "ext", slot: "a", render: Extension }]}>
        <SlotOutlet name="a" />
        <SlotOutlet name="b" />
      </SlotProvider>
    );
    expect(screen.getByText("filled from extension")).toBeInTheDocument();
    expect(renders).toBeLessThan(10);
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/Maximum update depth/);
    errors.mockRestore();
  });

  it("does not loop when the component that renders a SlotFill also reads that slot", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let renders = 0;
    function Host() {
      renders++;
      const items = useSlotContributions("b");
      return (
        <>
          <SlotFill slot="b">
            <span>inline fill</span>
          </SlotFill>
          <output data-testid="count">{items.length}</output>
        </>
      );
    }
    render(
      <SlotProvider>
        <Host />
        <SlotOutlet name="b" />
      </SlotProvider>
    );
    expect(screen.getByText("inline fill")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(renders).toBeLessThan(10);
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/Maximum update depth/);
    errors.mockRestore();
  });

  it("updates the outlet when SlotFill children change, keeps order, and removes on unmount", () => {
    function App({ label, show }: { label: string; show: boolean }) {
      return (
        <SlotProvider>
          <SlotOutlet name="bar" />
          <SlotFill slot="bar" id="late" order={2}>
            <span data-testid="item">late</span>
          </SlotFill>
          {show && (
            <SlotFill slot="bar" id="early" order={1}>
              <span data-testid="item">{label}</span>
            </SlotFill>
          )}
        </SlotProvider>
      );
    }
    const { rerender } = render(<App label="first" show />);
    expect(screen.getAllByTestId("item").map((e) => e.textContent)).toEqual(["first", "late"]);
    rerender(<App label="second" show />);
    expect(screen.getAllByTestId("item").map((e) => e.textContent)).toEqual(["second", "late"]);
    rerender(<App label="second" show={false} />);
    expect(screen.getAllByTestId("item").map((e) => e.textContent)).toEqual(["late"]);
  });

  it("only re-renders outlets whose slot changed", () => {
    const registry = createSlotRegistry();
    let otherRenders = 0;
    function Other() {
      otherRenders++;
      useSlotContributions("other");
      return null;
    }
    render(
      <SlotProvider registry={registry}>
        <Other />
        <SlotOutlet name="main" />
      </SlotProvider>
    );
    const before = otherRenders;
    act(() => {
      registry.register({ id: "x", slot: "main", render: <span>x</span> });
    });
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(otherRenders).toBe(before);
  });
});

/* ------------------------------------------------------------------ */
/* TilingLayout: focus tracking through portalled pane content         */
/* ------------------------------------------------------------------ */

const twoGroups = (): LayoutNode => ({
  type: "split",
  id: "root",
  direction: "row",
  sizes: [0.5, 0.5],
  children: [
    { type: "tabs", id: "gA", panes: ["a"], active: "a" },
    { type: "tabs", id: "gB", panes: ["b", "c"], active: "b" },
  ],
});

function TilingHarness({ floating: initialFloating }: { floating?: FloatingPaneState[] }) {
  const [floating, setFloating] = React.useState<FloatingPaneState[]>(initialFloating ?? []);
  return (
    <TilingLayout
      defaultLayout={twoGroups()}
      renderPane={(id) => <input aria-label={`input ${id}`} />}
      shortcuts
      floating={floating}
      onFloatingChange={setFloating}
    />
  );
}

describe("TilingLayout portal focus tracking", () => {
  it("focuses the group whose pane content was clicked, so mod+w closes that group's tab", () => {
    const { container } = render(<TilingHarness />);
    const gA = container.querySelector('[data-group-id="gA"]')!;
    const gB = container.querySelector('[data-group-id="gB"]')!;
    expect(gA).toHaveAttribute("data-focused");

    const input = screen.getByRole("textbox", { name: "input b" });
    fireEvent.pointerDown(input, pointer);
    fireEvent.focus(input);
    expect(gB).toHaveAttribute("data-focused");
    expect(gA).not.toHaveAttribute("data-focused");

    const mod = detectShortcutPlatform() === "mac" ? { metaKey: true } : { ctrlKey: true };
    fireEvent.keyDown(input, { key: "w", code: "KeyW", ...mod });
    expect(screen.queryByRole("tab", { name: "b" })).toBeNull();
    expect(screen.getByRole("tab", { name: "a" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "c" })).toBeInTheDocument();
  });

  it("restores a maximized group on Escape pressed inside pane content", () => {
    const { container } = render(<TilingHarness />);
    const gB = container.querySelector('[data-group-id="gB"]') as HTMLElement;
    fireEvent.click(within(gB).getByRole("button", { name: "Maximize group" }));
    expect(gB).toHaveAttribute("data-maximized");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "input b" }), { key: "Escape" });
    expect(gB).not.toHaveAttribute("data-maximized");
  });

  it("brings a floating window to front when its portalled content is pressed", () => {
    render(
      <TilingHarness
        floating={[
          { id: "x", x: 0, y: 0, width: 300, height: 200 },
          { id: "y", x: 40, y: 40, width: 300, height: 200 },
        ]}
      />
    );
    const winX = screen.getByRole("dialog", { name: "x" });
    expect(winX).not.toHaveAttribute("data-front");
    fireEvent.pointerDown(screen.getByRole("textbox", { name: "input x" }), pointer);
    expect(winX).toHaveAttribute("data-front");
    expect(screen.getByRole("dialog", { name: "y" })).not.toHaveAttribute("data-front");
  });
});

/* ------------------------------------------------------------------ */
/* CallScreen: srcObject follows remounted <video> elements            */
/* ------------------------------------------------------------------ */

describe("CallScreen stream video", () => {
  beforeAll(() => {
    if (!("srcObject" in HTMLMediaElement.prototype)) {
      Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
        configurable: true,
        get(this: { __src?: unknown }) {
          return this.__src ?? null;
        },
        set(this: { __src?: unknown }, v: unknown) {
          this.__src = v;
        },
      });
    }
  });

  it("re-attaches the local stream after the camera is turned off and on again", () => {
    const stream = { id: "local-stream" } as unknown as MediaStream;
    const { container } = render(<CallScreen name="Ana" localStream={stream} />);
    const first = container.querySelector("video") as HTMLVideoElement;
    expect(first.srcObject).toBe(stream);

    const toggle = screen.getByRole("button", { name: "Camera off" });
    fireEvent.click(toggle);
    expect(container.querySelector("video")).toBeNull();
    expect(first.srcObject).toBeNull();
    fireEvent.click(toggle);
    const second = container.querySelector("video") as HTMLVideoElement;
    expect(second).not.toBe(first);
    expect(second.srcObject).toBe(stream);
  });

  it("re-attaches the remote stream when it comes back", () => {
    const stream = { id: "remote-stream" } as unknown as MediaStream;
    const { container, rerender } = render(<CallScreen name="Ana" type="audio" remoteStream={stream} />);
    expect((container.querySelector("video") as HTMLVideoElement).srcObject).toBe(stream);
    rerender(<CallScreen name="Ana" type="audio" remoteStream={null} />);
    expect(container.querySelector("video")).toBeNull();
    rerender(<CallScreen name="Ana" type="audio" remoteStream={stream} />);
    expect((container.querySelector("video") as HTMLVideoElement).srcObject).toBe(stream);
  });
});

/* ------------------------------------------------------------------ */
/* ApiKeyCreateDialog: closing mid-request                             */
/* ------------------------------------------------------------------ */

describe("ApiKeyCreateDialog pending create", () => {
  it("discards a result that resolves after the dialog was closed", async () => {
    let resolve!: (v: string) => void;
    const onCreate = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const onCreateDiscarded = vi.fn();
    render(
      <ApiKeyCreateDialog
        trigger={<button type="button">New key</button>}
        scopes={[{ value: "chat:write", label: "chat:write" }]}
        onCreate={onCreate}
        onCreateDiscarded={onCreateDiscarded}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "New key" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Name/ }), { target: { value: "Laptop" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "chat:write" }));
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    expect(onCreate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await flush();
    expect(screen.queryByRole("dialog")).toBeNull();

    await act(async () => {
      resolve("sk-late-secret");
    });
    expect(onCreateDiscarded).toHaveBeenCalledWith("sk-late-secret", {
      name: "Laptop",
      scopes: ["chat:write"],
      expiresInDays: 30,
      permissions: [],
    });

    fireEvent.click(screen.getByRole("button", { name: "New key" }));
    await flush();
    expect(screen.queryByText("sk-late-secret")).toBeNull();
    expect(screen.queryByText("Key created")).toBeNull();
    expect(screen.getByRole("textbox", { name: /Name/ })).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "chat:write" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Create key" })).not.toBeDisabled();
  });
});
