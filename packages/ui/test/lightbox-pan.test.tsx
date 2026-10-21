/** Lightbox pan on useDrag: image-pixel offset through CSS variables, no render per move, reset on zoom out, swipe still pages at 1x. */
import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "./helpers/gesture-pointer";
import { Lightbox, type LightboxItem } from "../src/patterns/lightbox";

const gallery: LightboxItem[] = [
  { src: "/a.jpg", alt: "Alpha" },
  { src: "/b.jpg", alt: "Beta" },
  { src: "/c.jpg", alt: "Gamma" },
];
const finger = (x: number, y: number, extra: object = {}) => ({ pointerId: 1, pointerType: "touch", clientX: x, clientY: y, ...extra });
const mouse = (x: number, y: number) => ({ pointerId: 2, pointerType: "mouse", button: 0, buttons: 1, clientX: x, clientY: y });

async function open(props: Partial<React.ComponentProps<typeof Lightbox>> = {}) {
  const commits = { n: 0 };
  render(
    <React.Profiler id="lb" onRender={() => commits.n++}>
      <Lightbox items={gallery} defaultOpen {...props} />
    </React.Profiler>
  );
  const dialog = await screen.findByRole("dialog");
  const stage = dialog.querySelector<HTMLElement>('[data-slot="lightbox-stage"]')!;
  return { dialog, stage, commits, img: () => within(dialog).getByRole("img", { name: "Alpha" }) };
}

describe("Lightbox pan", () => {
  it("pans a zoomed image in image pixels without rendering per move, and resets at 1x", async () => {
    const { dialog, stage, commits, img } = await open();
    expect(img().style.transform).toContain("var(--sutra-drag-x");
    fireEvent.doubleClick(img()); // zoom 2
    expect(stage.style.touchAction).toBe("none");
    fireEvent.pointerDown(stage, finger(100, 100));
    fireEvent.pointerMove(stage, finger(120, 90));
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("10px"); // 20 screen px at zoom 2
    expect(stage.style.getPropertyValue("--sutra-drag-y")).toBe("-5px");
    const afterStart = commits.n;
    for (let i = 1; i <= 20; i++) fireEvent.pointerMove(stage, finger(120 + i * 2, 90));
    expect(commits.n).toBe(afterStart);
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("30px");
    fireEvent.pointerUp(stage, finger(160, 90));
    // Pan again: continues from where the last one ended; zooming in keeps the image-pixel offset.
    fireEvent.pointerDown(stage, finger(0, 0));
    fireEvent.pointerMove(stage, finger(10, 0));
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("35px");
    fireEvent.pointerUp(stage, finger(10, 0));
    fireEvent.keyDown(dialog, { key: "0" });
    expect(img()).toHaveAttribute("data-zoom", "1");
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("0px");
    expect(stage.style.touchAction).toBe("");
  });

  it("pans with the mouse and does not pan at 1x", async () => {
    const { stage, img } = await open();
    fireEvent.pointerDown(stage, mouse(10, 10));
    fireEvent.pointerMove(stage, mouse(60, 10));
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("0px");
    fireEvent.pointerUp(stage, mouse(60, 10));
    fireEvent.doubleClick(img());
    fireEvent.pointerDown(stage, mouse(10, 10));
    fireEvent.pointerMove(stage, mouse(60, 30));
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("25px");
    expect(stage.style.getPropertyValue("--sutra-drag-y")).toBe("10px");
    fireEvent.pointerUp(stage, mouse(60, 30));
  });

  it("still pages with a swipe at 1x (not while zoomed) and resets the pan when the item changes", async () => {
    const onIndexChange = vi.fn();
    const { dialog, stage } = await open({ onIndexChange });
    fireEvent.pointerDown(stage, finger(200, 100));
    fireEvent.pointerMove(stage, finger(100, 100));
    fireEvent.pointerUp(stage, finger(100, 100));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    onIndexChange.mockClear();
    fireEvent.doubleClick(await screen.findByRole("img", { name: "Beta" }));
    fireEvent.pointerDown(stage, finger(200, 100));
    fireEvent.pointerMove(stage, finger(100, 100));
    fireEvent.pointerUp(stage, finger(100, 100));
    expect(onIndexChange).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "0" });
    fireEvent.pointerDown(stage, finger(0, 0));
    fireEvent.pointerMove(stage, finger(1, 0));
    fireEvent.pointerUp(stage, finger(1, 0));
    fireEvent.doubleClick(await screen.findByRole("img", { name: "Beta" }));
    fireEvent.pointerDown(stage, finger(0, 0));
    fireEvent.pointerMove(stage, finger(40, 0));
    fireEvent.pointerUp(stage, finger(40, 0));
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("20px");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    expect(stage.style.getPropertyValue("--sutra-drag-x")).toBe("0px");
  });
});
