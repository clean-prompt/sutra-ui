import * as React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TableCheckbox } from "../src/primitives/table";
import { Globe, type GlobeApi } from "../src/entries/geo";
import { SlashMenu, type SlashCommand } from "../src/patterns/slash-menu";
import { KillButton } from "../src/kits/ops/process-table-kill";
import { IncomingCall } from "../src/kits/social/call-overlay";
import { VideoPlayer } from "../src/kits/media/video-player";
import { SRC } from "./helpers/conventions-scan";

/**
 * A handler a component owns must be composed with the consumer's, never replaced by it (CONVENTIONS, prop-spread rule):
 * the consumer's handler runs first, the component's own behaviour still happens (unless the consumer called
 * `preventDefault()` on a keyboard behaviour).
 */

describe("TableCheckbox onClick", () => {
  it("calls the consumer's onClick and still keeps the click from reaching the row", () => {
    const onRowClick = vi.fn();
    const onClick = vi.fn();
    render(
      <table>
        <tbody>
          <tr onClick={onRowClick}>
            <td>
              <TableCheckbox aria-label="Select row" onClick={onClick} />
            </td>
          </tr>
        </tbody>
      </table>
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select row" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "Select row" })).toBeChecked();
  });

  it("stops propagation without a consumer handler too", () => {
    const onRowClick = vi.fn();
    render(
      <table>
        <tbody>
          <tr onClick={onRowClick}>
            <td>
              <TableCheckbox aria-label="Select row" />
            </td>
          </tr>
        </tbody>
      </table>
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select row" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("Globe onKeyDown", () => {
  beforeEach(() => {
    vi.spyOn(performance, "now").mockImplementation(() => 0);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  const globe = () => screen.getByRole("group", { name: /globe/i });

  it("runs the consumer's handler and still navigates from the keyboard", () => {
    const onKeyDown = vi.fn();
    const onRotationChange = vi.fn();
    const api = React.createRef<GlobeApi>();
    render(<Globe apiRef={api} onKeyDown={onKeyDown} onRotationChange={onRotationChange} />);
    fireEvent.keyDown(globe(), { key: "ArrowLeft" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onRotationChange).toHaveBeenLastCalledWith([0, -20, 0]);
    fireEvent.keyDown(globe(), { key: "+" });
    expect(api.current!.getView().zoom).toBe(1.25);
  });

  it("skips the navigation when the consumer calls preventDefault", () => {
    const onKeyDown = vi.fn((e: React.KeyboardEvent) => e.preventDefault());
    const onRotationChange = vi.fn();
    const api = React.createRef<GlobeApi>();
    render(<Globe apiRef={api} onKeyDown={onKeyDown} onRotationChange={onRotationChange} />);
    fireEvent.keyDown(globe(), { key: "ArrowLeft" });
    fireEvent.keyDown(globe(), { key: "+" });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(onRotationChange).not.toHaveBeenCalled();
    expect(api.current!.getView().zoom).toBe(1);
  });
});

describe("SlashMenu onMouseDown", () => {
  const commands: SlashCommand[] = [{ id: "summarize", name: "summarize", description: "Summarize the thread" }];

  function Harness({ onMouseDown }: { onMouseDown: React.MouseEventHandler<HTMLDivElement> }) {
    const ref = React.useRef<HTMLTextAreaElement>(null);
    return (
      <div>
        <textarea aria-label="Message" ref={ref} />
        <SlashMenu anchorRef={ref} commands={commands} onMouseDown={onMouseDown} />
      </div>
    );
  }

  it("calls the consumer's handler and still keeps the composer focused (default prevented)", async () => {
    const onMouseDown = vi.fn();
    render(<Harness onMouseDown={onMouseDown} />);
    const ta = screen.getByRole("textbox", { name: "Message" });
    ta.focus();
    fireEvent.input(ta, { target: { value: "/s" } });
    const menu = (await screen.findByRole("listbox", { name: "Commands" })).closest('[data-slot="slash-menu"]')!;
    const notPrevented = fireEvent.mouseDown(menu);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });
});

describe("KillButton onKeyDown", () => {
  const confirmStep = (onKeyDown: React.KeyboardEventHandler<HTMLDivElement>, onConfirmingChange: (s: unknown) => void) => {
    render(<KillButton pid={42} name="node" onKill={() => {}} onKeyDown={onKeyDown} onConfirmingChange={onConfirmingChange} />);
    fireEvent.click(screen.getByRole("button", { name: /SIGTERM/ }));
    return screen.getByRole("group", { name: /Confirm kill/ });
  };

  it("calls the consumer's handler and still cancels on Escape", () => {
    const onKeyDown = vi.fn();
    const onConfirmingChange = vi.fn();
    const group = confirmStep(onKeyDown, onConfirmingChange);
    fireEvent.keyDown(group, { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onConfirmingChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("group", { name: /Confirm kill/ })).toBeNull();
  });

  it("keeps the confirm step open when the consumer prevents the default", () => {
    const onConfirmingChange = vi.fn();
    const group = confirmStep((e) => e.preventDefault(), onConfirmingChange);
    fireEvent.keyDown(group, { key: "Escape" });
    expect(onConfirmingChange).not.toHaveBeenCalledWith(null);
    expect(screen.getByRole("group", { name: /Confirm kill/ })).toBeInTheDocument();
  });
});

describe("IncomingCall onKeyDown", () => {
  it("calls the consumer's handler and still declines on Escape", () => {
    const onKeyDown = vi.fn();
    const onDecline = vi.fn();
    render(<IncomingCall name="Ana" onDecline={onDecline} onKeyDown={onKeyDown} ringFor={0} />);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Ana" }), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("does not decline when the consumer prevents the default", () => {
    const onDecline = vi.fn();
    render(<IncomingCall name="Ana" onDecline={onDecline} onKeyDown={(e) => e.preventDefault()} ringFor={0} />);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Ana" }), { key: "Escape" });
    expect(onDecline).not.toHaveBeenCalled();
  });
});

describe("VideoPlayer pointer and focus handlers", () => {
  it("calls the consumer's onPointerDown, onFocus and onBlur while keeping its own chrome behaviour", () => {
    const onPointerDown = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(<VideoPlayer src="movie.mp4" title="Clip" onPointerDown={onPointerDown} onFocus={onFocus} onBlur={onBlur} />);
    const root = screen.getByRole("region", { name: "Clip" });
    fireEvent.pointerDown(root, { pointerType: "touch" });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    fireEvent.focus(root);
    expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent.blur(root);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute("data-chrome", "visible");
  });
});

describe("checkbox-like boxes use the radius token", () => {
  const files = ["primitives/table.tsx", "primitives/combobox.tsx", "patterns/filter-bar.tsx", "patterns/tree-view.tsx"];

  it.each(files)("%s has no hardcoded rounded-[4px] and uses rounded-xs", (file) => {
    const source = readFileSync(path.join(SRC, file), "utf8");
    expect(source).not.toContain("rounded-[4px]");
    expect(source).toMatch(/\bsize-4\b[^"`]*\brounded-xs\b/);
  });

  it("the TableCheckbox and its DataTable skeleton carry rounded-xs", () => {
    render(<TableCheckbox aria-label="Select" />);
    expect(screen.getByRole("checkbox", { name: "Select" })).toHaveClass("rounded-xs");
    expect(screen.getByRole("checkbox", { name: "Select" }).className).not.toContain("rounded-[4px]");
  });
});
