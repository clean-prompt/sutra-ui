import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EffortSlider } from "../src/kits/agent/agent-mode";
import { SideThread } from "../src/kits/agent/agent-composer";
import { CallScreen } from "../src/kits/social/call-overlay";
import { QueueList, type PlayerTrack } from "../src/kits/media/audio-player";
import { ImageCropper } from "../src/patterns/image-cropper";
import { TilingHandle } from "../src/patterns/tiling-layout-internal";

/* Pointer behaviour of the components that run on `useDrag`: one pointer, ends on release, pointercancel and a lost capture. */

const rect = (width: number, height: number) =>
  ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} }) as DOMRect;

describe("EffortSlider drag", () => {
  const levels = [{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C" }, { value: "d", label: "D" }];
  const slider = () => {
    const el = screen.getByRole("slider");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect(400, 20));
    return el;
  };

  it("follows the pointer across the bars and stops on release", () => {
    const onValueChange = vi.fn();
    render(<EffortSlider levels={levels} defaultValue="a" onValueChange={onValueChange} />);
    const el = slider();
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 10 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 210 });
    expect(el).toHaveAttribute("aria-valuenow", "2");
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 390 });
    expect(el).toHaveAttribute("aria-valuenow", "3");
    fireEvent.pointerUp(el, { pointerId: 1 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 10 });
    expect(el).toHaveAttribute("aria-valuenow", "3");
  });

  it("drags from the inline start in RTL, so the right edge is the first level", () => {
    render(
      <div dir="rtl">
        <EffortSlider levels={levels} defaultValue="d" />
      </div>
    );
    const el = slider();
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 390 });
    expect(el).toHaveAttribute("aria-valuenow", "0");
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 10 });
    expect(el).toHaveAttribute("aria-valuenow", "3");
    fireEvent.pointerUp(el, { pointerId: 1 });
  });

  it("stops following after pointercancel and ignores a disabled slider", () => {
    render(<EffortSlider levels={levels} defaultValue="a" />);
    const el = slider();
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 10 });
    fireEvent.pointerCancel(el, { pointerId: 1 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 390 });
    expect(el).toHaveAttribute("aria-valuenow", "0");
  });

  it("does nothing while disabled", () => {
    render(<EffortSlider levels={levels} defaultValue="a" disabled />);
    const el = slider();
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 390 });
    expect(el).toHaveAttribute("aria-valuenow", "0");
  });
});

describe("SideThread resize drag", () => {
  const setup = () => {
    const onHeightChange = vi.fn();
    render(<SideThread exchanges={[]} defaultHeight={200} minHeight={120} maxHeight={400} onHeightChange={onHeightChange} />);
    return { onHeightChange, handle: screen.getByRole("separator", { name: "Resize side question" }) };
  };

  it("keeps the height at the press when the pointer never moves (a tap)", () => {
    const { handle, onHeightChange } = setup();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 300 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 300 });
    expect(onHeightChange).not.toHaveBeenCalled();
  });

  it("resizes from the press height, clamped, and stops after a lost capture", () => {
    const { handle } = setup();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 300 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 250 });
    expect(handle).toHaveAttribute("aria-valuenow", "250");
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: -500 });
    expect(handle).toHaveAttribute("aria-valuenow", "400");
    fireEvent.lostPointerCapture(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 320 });
    expect(handle).toHaveAttribute("aria-valuenow", "400");
  });

  it("starts the next drag from the new height", () => {
    const { handle } = setup();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 300 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 280 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(handle).toHaveAttribute("aria-valuenow", "220");
    fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientY: 200 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 190 });
    expect(handle).toHaveAttribute("aria-valuenow", "230");
    fireEvent.pointerUp(handle, { pointerId: 2 });
  });
});

describe("CallScreen picture-in-picture drag", () => {
  const setup = () => {
    const onPipCornerChange = vi.fn();
    const { container } = render(<CallScreen name="Maya" type="video" onPipCornerChange={onPipCornerChange} />);
    const pip = container.querySelector<HTMLElement>("[data-corner]")!;
    vi.spyOn(pip.parentElement!.firstElementChild as HTMLElement, "getBoundingClientRect").mockReturnValue(rect(400, 300));
    return { pip, onPipCornerChange };
  };

  it("leaves the corner alone for a tap or a nudge under 4 px", () => {
    const { pip, onPipCornerChange } = setup();
    fireEvent.pointerDown(pip, { pointerId: 1, button: 0, clientX: 380, clientY: 280 });
    fireEvent.pointerMove(pip, { pointerId: 1, clientX: 382, clientY: 281 });
    fireEvent.pointerUp(pip, { pointerId: 1, clientX: 382, clientY: 281 });
    expect(onPipCornerChange).not.toHaveBeenCalled();
    // The hook writes 0px when it binds; either way nothing is offset.
    expect(parseFloat(pip.style.getPropertyValue("--sutra-drag-x") || "0")).toBe(0);
  });

  it("clears the offset and keeps the corner on pointercancel", () => {
    const { pip, onPipCornerChange } = setup();
    fireEvent.pointerDown(pip, { pointerId: 1, button: 0, clientX: 380, clientY: 280 });
    fireEvent.pointerMove(pip, { pointerId: 1, clientX: 100, clientY: 40 });
    expect(pip.style.getPropertyValue("--sutra-drag-x")).toBe("-280px");
    fireEvent.pointerCancel(pip, { pointerId: 1 });
    expect(pip.style.getPropertyValue("--sutra-drag-x")).toBe("");
    expect(pip.className).not.toContain("cursor-grabbing");
    expect(onPipCornerChange).not.toHaveBeenCalled();
  });

  it("starts a second drag from zero after a drop", () => {
    const { pip } = setup();
    fireEvent.pointerDown(pip, { pointerId: 1, button: 0, clientX: 380, clientY: 280 });
    fireEvent.pointerMove(pip, { pointerId: 1, clientX: 100, clientY: 40 });
    fireEvent.pointerUp(pip, { pointerId: 1, clientX: 100, clientY: 40 });
    fireEvent.pointerDown(pip, { pointerId: 2, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(pip, { pointerId: 2, clientX: 70, clientY: 60 });
    expect(pip.style.getPropertyValue("--sutra-drag-x")).toBe("20px");
    expect(pip.style.getPropertyValue("--sutra-drag-y")).toBe("10px");
    fireEvent.pointerCancel(pip, { pointerId: 2 });
  });
});

describe("QueueList handle drag", () => {
  const tracks: PlayerTrack[] = [
    { id: "1", title: "Alpha", artist: "Ana", duration: 185 },
    { id: "2", title: "Bravo", artist: "Ben", duration: 200 },
    { id: "3", title: "Charlie", artist: "Cy", duration: 240 },
  ];
  const setup = () => {
    const onReorder = vi.fn();
    const { container } = render(<QueueList items={tracks} onReorder={onReorder} />);
    container.querySelectorAll<HTMLElement>("[data-queue-id]").forEach((li, i) => {
      li.getBoundingClientRect = () => ({ top: i * 40, height: 40, bottom: i * 40 + 40, left: 0, right: 300, width: 300, x: 0, y: i * 40, toJSON() {} }) as DOMRect;
    });
    return { onReorder, container, handle: screen.getByRole("button", { name: "Reorder Alpha" }) };
  };
  const indicator = (c: HTMLElement) => c.querySelector('[data-slot="queue-drop-indicator"]');

  it("does nothing for a press without travel", () => {
    const { handle, onReorder, container } = setup();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 20 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 20 });
    expect(onReorder).not.toHaveBeenCalled();
    expect(indicator(container)).toBeNull();
  });

  it("drops the drag on pointercancel without reordering", () => {
    const { handle, onReorder, container } = setup();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 110 });
    expect(indicator(container)).toBeInTheDocument();
    fireEvent.pointerCancel(handle, { pointerId: 1 });
    expect(indicator(container)).toBeNull();
    expect(container.querySelector("[data-dragging]")).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("drops the drag when capture is lost, and a stray release reorders nothing", () => {
    const { handle, onReorder, container } = setup();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 110 });
    fireEvent.lostPointerCapture(handle, { pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 110 });
    expect(indicator(container)).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("ignores a right-button press", () => {
    const { handle, onReorder, container } = setup();
    fireEvent.pointerDown(handle, { pointerId: 1, button: 2, pointerType: "mouse", clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 110 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 110 });
    expect(indicator(container)).toBeNull();
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("ImageCropper drag lifecycle", () => {
  const setup = () => {
    const onCropChange = vi.fn();
    const onCropEnd = vi.fn();
    const { container } = render(
      <ImageCropper src="/photo.jpg" defaultCrop={{ x: 100, y: 100, width: 200, height: 200 }} onCropChange={onCropChange} onCropEnd={onCropEnd} />
    );
    const img = container.querySelector("img")!;
    Object.defineProperty(img, "naturalWidth", { value: 800, configurable: true });
    Object.defineProperty(img, "naturalHeight", { value: 600, configurable: true });
    fireEvent.load(img);
    container.querySelector<HTMLElement>('[data-slot="image-cropper-frame"]')!.getBoundingClientRect = () => rect(400, 300);
    return { onCropChange, onCropEnd, box: screen.getByRole("group", { name: "Crop area" }) };
  };

  it("ends on pointercancel, reports the change once and ignores later moves", () => {
    const { box, onCropChange, onCropEnd } = setup();
    fireEvent.pointerDown(box, { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 60, clientY: 70 });
    expect(box).toHaveAttribute("data-dragging", "move");
    fireEvent.pointerCancel(box, { pointerId: 1 });
    expect(box).not.toHaveAttribute("data-dragging");
    expect(onCropEnd).toHaveBeenCalledTimes(1);
    onCropChange.mockClear();
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 300, clientY: 300 });
    expect(onCropChange).not.toHaveBeenCalled();
  });

  it("a tap on the box or a handle changes nothing and never calls onCropEnd", () => {
    const { box, onCropChange, onCropEnd } = setup();
    onCropChange.mockClear();
    fireEvent.pointerDown(box, { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(box, { pointerId: 1 });
    const se = screen.getByRole("button", { name: "Resize from bottom-right" });
    fireEvent.pointerDown(se, { pointerId: 2, button: 0, clientX: 150, clientY: 150 });
    fireEvent.pointerUp(se, { pointerId: 2 });
    expect(onCropChange).not.toHaveBeenCalled();
    expect(onCropEnd).not.toHaveBeenCalled();
  });

  it("a handle drag resizes (not moves) and the handle keeps focus", () => {
    const { box, onCropChange } = setup();
    const se = screen.getByRole("button", { name: "Resize from bottom-right" });
    fireEvent.pointerDown(se, { pointerId: 1, button: 0, clientX: 150, clientY: 150 });
    expect(document.activeElement).toBe(se);
    fireEvent.pointerMove(se, { pointerId: 1, clientX: 175, clientY: 160 });
    expect(box).toHaveAttribute("data-dragging", "se");
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 100, y: 100, width: 250, height: 220 });
    fireEvent.pointerUp(se, { pointerId: 1 });
  });
});

describe("TilingHandle drag", () => {
  const setup = (dir: "ltr" | "rtl", direction: "row" | "column" = "row") => {
    const onResize = vi.fn();
    render(
      <div dir={dir} data-testid="parent">
        <TilingHandle direction={direction} sizes={[0.5, 0.5]} index={0} min={0.1} step={0.05} label="Resize" onResize={onResize} onEqualize={() => {}} />
      </div>
    );
    const handle = screen.getByRole("separator");
    vi.spyOn(screen.getByTestId("parent"), "getBoundingClientRect").mockReturnValue(rect(1000, 400));
    return { handle, onResize };
  };

  it("grows the first pane towards the pointer in LTR", () => {
    const { handle, onResize } = setup("ltr");
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 600 });
    expect(onResize).toHaveBeenLastCalledWith(0, expect.closeTo(0.1, 5));
    expect(handle).toHaveAttribute("data-dragging");
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(handle).not.toHaveAttribute("data-dragging");
  });

  it("reads the travel against the reading direction in RTL", () => {
    const { handle, onResize } = setup("rtl");
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 500 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 600 });
    expect(onResize).toHaveBeenLastCalledWith(0, expect.closeTo(-0.1, 5));
    fireEvent.pointerUp(handle, { pointerId: 1 });
  });

  it("uses the vertical travel for a column split and stops on pointercancel", () => {
    const { handle, onResize } = setup("ltr", "column");
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 0, clientY: 200 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 240 });
    expect(onResize).toHaveBeenLastCalledWith(0, expect.closeTo(0.1, 5));
    fireEvent.pointerCancel(handle, { pointerId: 1 });
    onResize.mockClear();
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 0, clientY: 300 });
    expect(onResize).not.toHaveBeenCalled();
    expect(handle).not.toHaveAttribute("data-dragging");
  });
});
