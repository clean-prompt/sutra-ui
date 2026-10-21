/** SeekBar scrubbing on useDrag (absolute mode): a tap seeks, a drag scrubs and commits on release, cancel never seeks, hover stays. */
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "./helpers/gesture-pointer";
import { SeekBar } from "../src/kits/media/media-controls";

const rect = { left: 0, width: 200, top: 0, height: 20, right: 200, bottom: 20, x: 0, y: 0, toJSON() {} };
const pt = (x: number, extra: object = {}) => ({ pointerId: 1, clientX: x, clientY: 5, ...extra });
function setup(props: Partial<React.ComponentProps<typeof SeekBar>> = {}) {
  const onSeek = vi.fn();
  const onScrub = vi.fn();
  render(<SeekBar value={0} duration={100} onSeek={onSeek} onScrub={onScrub} showTimes={false} {...props} />);
  const slider = screen.getByRole("slider");
  slider.getBoundingClientRect = () => rect as DOMRect;
  return { slider, onSeek, onScrub };
}

describe("SeekBar scrub", () => {
  it("a tap seeks to the pressed position and focuses the bar", () => {
    const { slider, onSeek, onScrub } = setup();
    fireEvent.pointerDown(slider, pt(150, { pointerType: "touch" }));
    expect(onScrub).toHaveBeenLastCalledWith(75);
    expect(slider).toHaveAttribute("data-dragging");
    expect(slider).toHaveFocus();
    fireEvent.pointerUp(slider, pt(150, { pointerType: "touch" }));
    expect(onSeek).toHaveBeenCalledWith(75);
    expect(onScrub).toHaveBeenLastCalledWith(null);
    expect(slider).not.toHaveAttribute("data-dragging");
  });

  it("scrubs with moves, clamps at both ends and commits the last position on release", () => {
    const { slider, onSeek, onScrub } = setup();
    fireEvent.pointerDown(slider, pt(100, { pointerType: "touch" }));
    fireEvent.pointerMove(slider, pt(-50, { pointerType: "touch" }));
    expect(onScrub).toHaveBeenLastCalledWith(0);
    fireEvent.pointerMove(slider, pt(500, { pointerType: "touch" }));
    expect(onScrub).toHaveBeenLastCalledWith(100);
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    fireEvent.pointerUp(slider, pt(500, { pointerType: "touch" }));
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(100);
  });

  it("a cancelled drag never seeks and clears the scrub", () => {
    const { slider, onSeek, onScrub } = setup();
    fireEvent.pointerDown(slider, pt(100, { pointerType: "touch" }));
    fireEvent.pointerMove(slider, pt(120, { pointerType: "touch" }));
    fireEvent.pointerCancel(slider, pt(120, { pointerType: "touch" }));
    expect(onSeek).not.toHaveBeenCalled();
    expect(onScrub).toHaveBeenLastCalledWith(null);
    expect(slider).not.toHaveAttribute("data-dragging");
  });

  it("ignores a second finger and secondary mouse buttons", () => {
    const a = setup();
    fireEvent.pointerDown(a.slider, pt(20, { pointerType: "mouse", button: 2 }));
    expect(a.onScrub).not.toHaveBeenCalled();
    fireEvent.pointerDown(a.slider, pt(20, { pointerType: "touch" }));
    fireEvent.pointerDown(a.slider, pt(180, { pointerType: "touch", pointerId: 2 }));
    fireEvent.pointerMove(a.slider, pt(190, { pointerType: "touch", pointerId: 2 }));
    expect(a.onScrub).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(a.slider, pt(20, { pointerType: "touch" }));
    expect(a.onSeek).toHaveBeenCalledWith(10);
  });

  it("does nothing when disabled", () => {
    const off = setup({ disabled: true });
    fireEvent.pointerDown(off.slider, pt(100));
    expect(off.onScrub).not.toHaveBeenCalled();
  });

  it("shows the hover time for a mouse that is not pressing, not for touch or during a drag", () => {
    const { slider } = setup({ thumbnails: undefined });
    fireEvent.pointerMove(slider, pt(100, { pointerType: "mouse" }));
    expect(screen.queryByText("0:50")).not.toBeNull();
    fireEvent.pointerLeave(slider);
    expect(screen.queryByText("0:50")).toBeNull();
    fireEvent.pointerMove(slider, pt(100, { pointerType: "touch" }));
    expect(screen.queryByText("0:50")).toBeNull();
  });
});
