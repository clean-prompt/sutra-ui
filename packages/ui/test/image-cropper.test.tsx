import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CROP_HANDLES,
  applyAspect,
  centerCrop,
  clampCrop,
  cropEquals,
  getCropOutputSize,
  moveCrop,
  normalizeAspect,
  normalizeRotation,
  resizeCrop,
  rotateCrop,
  rotatedSize,
  roundCrop,
  toDisplayRect,
  toNaturalPoint,
  toNaturalRect,
  type CropRect,
} from "../src/lib/crop";
import { ImageCropper, cropToBlob, cropToCanvas, imageCropperAspectOptions, type ImageCropperHandle } from "../src/patterns/image-cropper";
import { axeViolations } from "./helpers/a11y";

const B = { width: 800, height: 600 };
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ------------------------------------------------------------------ */
/* lib/crop                                                            */
/* ------------------------------------------------------------------ */

describe("lib/crop", () => {
  it("normalizes rotation and aspect", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-540)).toBe(180);
    expect(normalizeRotation(44)).toBe(0);
    expect(normalizeRotation(46)).toBe(90);
    expect(normalizeRotation(Number.NaN)).toBe(0);
    expect(normalizeAspect(1.5)).toBe(1.5);
    expect(normalizeAspect(0)).toBeNull();
    expect(normalizeAspect(-1)).toBeNull();
    expect(normalizeAspect(Infinity)).toBeNull();
    expect(normalizeAspect(null)).toBeNull();
  });

  it("swaps the image size for quarter turns", () => {
    expect(rotatedSize(B, 0)).toEqual(B);
    expect(rotatedSize(B, 90)).toEqual({ width: 600, height: 800 });
    expect(rotatedSize(B, 180)).toEqual(B);
    expect(rotatedSize(B, -90)).toEqual({ width: 600, height: 800 });
  });

  it("clamps to the bounds and the minimum size", () => {
    expect(clampCrop({ x: -10, y: -5, width: 100, height: 50 }, B)).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(clampCrop({ x: 750, y: 580, width: 100, height: 50 }, B)).toEqual({ x: 700, y: 550, width: 100, height: 50 });
    expect(clampCrop({ x: 10, y: 10, width: 2000, height: 900 }, B)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    expect(clampCrop({ x: 10, y: 10, width: 4, height: 4 }, B, { minWidth: 20, minHeight: 30 })).toEqual({ x: 10, y: 10, width: 20, height: 30 });
    // A minimum bigger than the image is capped at the image.
    expect(clampCrop({ x: 0, y: 0, width: 1, height: 1 }, { width: 10, height: 10 }, { minWidth: 50 })).toEqual({ x: 0, y: 0, width: 10, height: 1 });
    // Bad input never throws.
    expect(clampCrop({ x: Number.NaN, y: Infinity, width: -5, height: Number.NaN } as CropRect, B)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("moves without leaving the bounds or changing size", () => {
    const c = { x: 100, y: 100, width: 200, height: 100 };
    expect(moveCrop(c, 50, -20, B)).toEqual({ x: 150, y: 80, width: 200, height: 100 });
    expect(moveCrop(c, 5000, 5000, B)).toEqual({ x: 600, y: 500, width: 200, height: 100 });
    expect(moveCrop(c, -5000, -5000, B)).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  describe("resizeCrop (free)", () => {
    const c = { x: 100, y: 100, width: 200, height: 100 };
    it("keeps the opposite corner or edge fixed", () => {
      expect(resizeCrop(c, "se", 50, 20, B)).toEqual({ x: 100, y: 100, width: 250, height: 120 });
      expect(resizeCrop(c, "nw", -50, -20, B)).toEqual({ x: 50, y: 80, width: 250, height: 120 });
      expect(resizeCrop(c, "ne", 10, -10, B)).toEqual({ x: 100, y: 90, width: 210, height: 110 });
      expect(resizeCrop(c, "sw", -10, 10, B)).toEqual({ x: 90, y: 100, width: 210, height: 110 });
      expect(resizeCrop(c, "n", 999, -30, B)).toEqual({ x: 100, y: 70, width: 200, height: 130 });
      expect(resizeCrop(c, "s", 999, 30, B)).toEqual({ x: 100, y: 100, width: 200, height: 130 });
      expect(resizeCrop(c, "e", 30, 999, B)).toEqual({ x: 100, y: 100, width: 230, height: 100 });
      expect(resizeCrop(c, "w", -30, 999, B)).toEqual({ x: 70, y: 100, width: 230, height: 100 });
    });

    it("stops at the image edge", () => {
      expect(resizeCrop(c, "se", 5000, 5000, B)).toEqual({ x: 100, y: 100, width: 700, height: 500 });
      expect(resizeCrop(c, "nw", -5000, -5000, B)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
    });

    it("respects the minimum size instead of flipping", () => {
      const min = { minWidth: 40, minHeight: 30 };
      expect(resizeCrop(c, "se", -1000, -1000, B, min)).toEqual({ x: 100, y: 100, width: 40, height: 30 });
      expect(resizeCrop(c, "nw", 1000, 1000, B, min)).toEqual({ x: 260, y: 170, width: 40, height: 30 });
    });
  });

  describe("resizeCrop (aspect locked)", () => {
    const aspect = 4 / 3;
    const c = { x: 200, y: 150, width: 200, height: 150 };

    it.each(CROP_HANDLES)("keeps 4:3 from the %s handle and anchors the opposite side", (handle) => {
      const dx = handle.includes("e") ? 40 : handle.includes("w") ? -40 : 0;
      const dy = handle.includes("s") ? 30 : handle.includes("n") ? -30 : 0;
      const r = resizeCrop(c, handle, dx, dy, B, { aspect });
      expect(near(r.width / r.height, aspect)).toBe(true);
      expect(r.width).toBeGreaterThan(c.width);
      if (handle.includes("e")) expect(r.x).toBe(c.x);
      if (handle.includes("w")) expect(near(r.x + r.width, c.x + c.width)).toBe(true);
      if (handle.includes("s")) expect(r.y).toBe(c.y);
      if (handle.includes("n")) expect(near(r.y + r.height, c.y + c.height)).toBe(true);
      if (handle === "e" || handle === "w") expect(near(r.y + r.height / 2, c.y + c.height / 2)).toBe(true);
      if (handle === "n" || handle === "s") expect(near(r.x + r.width / 2, c.x + c.width / 2)).toBe(true);
    });

    it("follows the axis pulled further on a corner", () => {
      expect(resizeCrop(c, "se", 100, 0, B, { aspect })).toEqual({ x: 200, y: 150, width: 300, height: 225 });
      expect(resizeCrop(c, "se", 0, 75, B, { aspect })).toEqual({ x: 200, y: 150, width: 300, height: 225 });
    });

    it("stays inside the image and above the minimum", () => {
      const big = resizeCrop(c, "se", 5000, 5000, B, { aspect });
      expect(near(big.width / big.height, aspect)).toBe(true);
      expect(big.x + big.width).toBeLessThanOrEqual(800 + 1e-9);
      expect(big.y + big.height).toBeLessThanOrEqual(600 + 1e-9);
      expect(big).toEqual({ x: 200, y: 150, width: 600, height: 450 });

      const small = resizeCrop(c, "se", -5000, -5000, B, { aspect, minWidth: 20, minHeight: 30 });
      expect(small).toEqual({ x: 200, y: 150, width: 40, height: 30 });

      // An edge handle with a lock shifts the other axis back inside the image.
      const edge = resizeCrop({ x: 0, y: 500, width: 80, height: 60 }, "e", 200, 0, B, { aspect });
      expect(edge.y + edge.height).toBeLessThanOrEqual(600);
      expect(near(edge.width / edge.height, aspect)).toBe(true);
    });
  });

  it("centres a default crop and fits an aspect", () => {
    expect(centerCrop(B)).toEqual({ x: 80, y: 60, width: 640, height: 480 });
    expect(centerCrop(B, 1)).toEqual({ x: 160, y: 60, width: 480, height: 480 });
    const wide = centerCrop(B, 16 / 9, 1);
    expect(wide.width).toBe(800);
    expect(near(wide.height, 450)).toBe(true);
    expect(near(wide.y, 75)).toBe(true);
    expect(centerCrop({ width: 0, height: 0 }, 1)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("re-shapes to an aspect around the centre", () => {
    const r = applyAspect({ x: 100, y: 100, width: 400, height: 100 }, 1, B);
    expect(r).toEqual({ x: 200, y: 50, width: 200, height: 200 });
    const capped = applyAspect({ x: 0, y: 0, width: 800, height: 600 }, 16 / 9, B);
    expect(capped.width).toBe(800);
    expect(near(capped.height, 450)).toBe(true);
    expect(applyAspect({ x: 1, y: 2, width: 3, height: 4 }, null, B)).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it("rotates a crop with the image", () => {
    const c = { x: 100, y: 50, width: 200, height: 100 };
    expect(rotateCrop(c, B, 90)).toEqual({ x: 450, y: 100, width: 100, height: 200 });
    expect(rotateCrop(c, B, 180)).toEqual({ x: 500, y: 450, width: 200, height: 100 });
    expect(rotateCrop(c, B, -90)).toEqual({ x: 50, y: 500, width: 100, height: 200 });
    expect(rotateCrop(c, B, 360)).toEqual(c);
    // Back and forth returns the original.
    expect(rotateCrop(rotateCrop(c, B, 90), rotatedSize(B, 90), -90)).toEqual(c);
  });

  it("converts between display and natural pixels", () => {
    const display = { width: 400, height: 300 };
    const crop = { x: 100, y: 60, width: 200, height: 120 };
    const shown = toDisplayRect(crop, B, display);
    expect(shown).toEqual({ x: 50, y: 30, width: 100, height: 60 });
    expect(toNaturalRect(shown, B, display)).toEqual(crop);
    expect(toNaturalPoint({ x: 10, y: 5 }, B, display)).toEqual({ x: 20, y: 10 });
    expect(toNaturalRect(shown, B, { width: 0, height: 0 })).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it("rounds, compares and sizes the output", () => {
    expect(roundCrop({ x: 1.4, y: 1.6, width: 9.5, height: 2.49 })).toEqual({ x: 1, y: 2, width: 10, height: 2 });
    expect(cropEquals({ x: 0, y: 0, width: 1, height: 1 }, { x: 0.4, y: 0, width: 1, height: 1 }, 0.5)).toBe(true);
    expect(cropEquals(null, undefined)).toBe(true);
    expect(cropEquals(null, { x: 0, y: 0, width: 1, height: 1 })).toBe(false);
    const c = { x: 0, y: 0, width: 400, height: 300 };
    expect(getCropOutputSize(c)).toEqual({ width: 400, height: 300, scaleX: 1, scaleY: 1 });
    expect(getCropOutputSize(c, { outputWidth: 200 })).toEqual({ width: 200, height: 150, scaleX: 0.5, scaleY: 0.5 });
    expect(getCropOutputSize(c, { outputHeight: 600 })).toEqual({ width: 800, height: 600, scaleX: 2, scaleY: 2 });
    expect(getCropOutputSize(c, { maxOutputSize: 100 })).toEqual({ width: 100, height: 75, scaleX: 0.25, scaleY: 0.25 });
    expect(getCropOutputSize({ x: 0, y: 0, width: 0, height: 0 })).toEqual({ width: 1, height: 1, scaleX: 1, scaleY: 1 });
  });
});

/* ------------------------------------------------------------------ */
/* ImageCropper                                                        */
/* ------------------------------------------------------------------ */

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toBlob = originalToBlob;
});

function mockCanvas() {
  const ctx = {
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  };
  const sizes: { width: number; height: number; type?: string; quality?: number }[] = [];
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as unknown as HTMLCanvasElement["getContext"];
  HTMLCanvasElement.prototype.toBlob = function (this: HTMLCanvasElement, cb: BlobCallback, type?: string, quality?: number) {
    sizes.push({ width: this.width, height: this.height, type, quality });
    cb(new Blob(["png"], { type: type ?? "image/png" }));
  };
  return { ctx, sizes };
}

/** Fakes the image finishing loading with the given natural size. */
function loadImage(container: HTMLElement, width = 800, height = 600) {
  const img = container.querySelector("img")!;
  Object.defineProperty(img, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(img);
  return img;
}

/** jsdom has no layout: the frame is drawn at 400×300 (half the natural size). */
function sizeFrame(container: HTMLElement, width = 400, height = 300) {
  const frame = container.querySelector<HTMLElement>('[data-slot="image-cropper-frame"]')!;
  frame.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} }) as DOMRect;
}

const box = () => screen.getByRole("group", { name: "Crop area" });
const boxRect = (el: HTMLElement) => ({ left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height });

function setup(props: Partial<React.ComponentProps<typeof ImageCropper>> = {}) {
  const onCropChange = vi.fn();
  const utils = render(
    <ImageCropper src="/photo.jpg" defaultCrop={{ x: 100, y: 100, width: 200, height: 200 }} onCropChange={onCropChange} {...props} />
  );
  loadImage(utils.container);
  sizeFrame(utils.container);
  return { ...utils, onCropChange };
}

describe("ImageCropper", () => {
  it("shows a loading state until the image loads, then a default crop", () => {
    const onCropChange = vi.fn();
    const onImageLoad = vi.fn();
    const { container } = render(<ImageCropper src="/photo.jpg" onCropChange={onCropChange} onImageLoad={onImageLoad} />);
    const root = container.querySelector('[data-slot="image-cropper"]')!;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "Loading image" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Crop area" })).toBeNull();
    expect(screen.getByRole("button", { name: "Rotate right" })).toBeDisabled();

    loadImage(container);
    expect(onImageLoad).toHaveBeenCalledWith({ width: 800, height: 600 });
    expect(root).not.toHaveAttribute("aria-busy");
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 80, y: 60, width: 640, height: 480 });
    expect(boxRect(box())).toEqual({ left: "10%", top: "10%", width: "80%", height: "80%" });
  });

  it("keeps the loading state while `loading` is set", () => {
    const { container } = render(<ImageCropper src="/photo.jpg" loading />);
    loadImage(container);
    expect(container.querySelector('[data-slot="image-cropper"]')).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("group", { name: "Crop area" })).toBeNull();
  });

  it("shows an error when the image fails", () => {
    const onImageError = vi.fn();
    const { container, rerender } = render(<ImageCropper src="/broken.jpg" onImageError={onImageError} />);
    fireEvent.error(container.querySelector("img")!);
    expect(onImageError).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("The image could not be loaded.");
    expect(screen.queryByRole("status", { name: "Loading image" })).toBeNull();
    rerender(<ImageCropper src="/broken.jpg" errorState={<p>Nope</p>} />);
    expect(screen.getByText("Nope")).toBeInTheDocument();
    // A new source starts loading again.
    rerender(<ImageCropper src="/other.jpg" />);
    expect(screen.getByRole("status", { name: "Loading image" })).toBeInTheDocument();
  });

  it("renders an uncontrolled default crop and moves it by dragging", () => {
    const onCropEnd = vi.fn();
    const { onCropChange } = setup({ onCropEnd });
    expect(boxRect(box())).toEqual({ left: "12.5%", top: "16.666666666666664%", width: "25%", height: "33.33333333333333%" });
    fireEvent.pointerDown(box(), { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(box(), { pointerId: 1, clientX: 60, clientY: 70 });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 120, y: 140, width: 200, height: 200 });
    // Other pointers are ignored.
    fireEvent.pointerMove(box(), { pointerId: 2, clientX: 300, clientY: 300 });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 120, y: 140, width: 200, height: 200 });
    fireEvent.pointerMove(box(), { pointerId: 1, clientX: 1000, clientY: 1000 });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 600, y: 400, width: 200, height: 200 });
    fireEvent.pointerUp(box(), { pointerId: 1 });
    expect(onCropEnd).toHaveBeenCalledWith({ x: 600, y: 400, width: 200, height: 200 });
    expect(box().style.left).toBe("75%");
    fireEvent.pointerMove(box(), { pointerId: 1, clientX: 0, clientY: 0 });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 600, y: 400, width: 200, height: 200 });
  });

  it("resizes from a handle by dragging (touch too)", () => {
    const { onCropChange } = setup();
    const se = screen.getByRole("button", { name: "Resize from bottom-right" });
    fireEvent.pointerDown(se, { pointerId: 3, pointerType: "touch", clientX: 150, clientY: 150 });
    fireEvent.pointerMove(se, { pointerId: 3, pointerType: "touch", clientX: 175, clientY: 160 });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 100, y: 100, width: 250, height: 220 });
    fireEvent.pointerUp(se, { pointerId: 3 });

    const nw = screen.getByRole("button", { name: "Resize from top-left" });
    fireEvent.pointerDown(nw, { pointerId: 4, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(nw, { pointerId: 4, clientX: 500, clientY: 500 });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 334, y: 304, width: 16, height: 16 });
    fireEvent.pointerUp(nw, { pointerId: 4 });
  });

  it("ignores secondary mouse buttons", () => {
    const { onCropChange } = setup();
    onCropChange.mockClear();
    fireEvent.pointerDown(box(), { pointerId: 1, button: 2, pointerType: "mouse", clientX: 50, clientY: 50 });
    fireEvent.pointerMove(box(), { pointerId: 1, clientX: 90, clientY: 90 });
    expect(onCropChange).not.toHaveBeenCalled();
  });

  it("locks the aspect while resizing", () => {
    const { onCropChange } = setup({ aspect: 1, defaultCrop: { x: 100, y: 100, width: 200, height: 200 } });
    const e = screen.getByRole("button", { name: "Resize from right" });
    fireEvent.pointerDown(e, { pointerId: 1, button: 0, clientX: 150, clientY: 100 });
    fireEvent.pointerMove(e, { pointerId: 1, clientX: 200, clientY: 140 });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 100, y: 50, width: 300, height: 300 });
    fireEvent.pointerUp(e, { pointerId: 1 });
  });

  it("moves and resizes with the keyboard", () => {
    const onCropEnd = vi.fn();
    const { onCropChange } = setup({ onCropEnd });
    const b = box();
    expect(b).toHaveAttribute("tabindex", "0");
    expect(b).toHaveAccessibleDescription(/Arrow keys move the crop/);
    fireEvent.keyDown(b, { key: "ArrowRight" });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 101, y: 100, width: 200, height: 200 });
    fireEvent.keyDown(b, { key: "ArrowDown", shiftKey: true });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 101, y: 110, width: 200, height: 200 });
    fireEvent.keyDown(b, { key: "ArrowRight", altKey: true });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 101, y: 110, width: 201, height: 200 });
    fireEvent.keyDown(b, { key: "ArrowUp", altKey: true, shiftKey: true });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 101, y: 110, width: 201, height: 190 });
    expect(onCropEnd).toHaveBeenLastCalledWith({ x: 101, y: 110, width: 201, height: 190 });
    expect(screen.getByText("201 × 190 at 101, 110")).toBeInTheDocument();

    const nw = screen.getByRole("button", { name: "Resize from top-left" });
    fireEvent.keyDown(nw, { key: "ArrowLeft" });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 100, y: 110, width: 202, height: 190 });
    const n = screen.getByRole("button", { name: "Resize from top" });
    fireEvent.keyDown(n, { key: "ArrowUp", shiftKey: true });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 100, y: 100, width: 202, height: 200 });
    // Every handle is reachable and named.
    for (const name of ["top-left", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left"]) {
      expect(screen.getByRole("button", { name: `Resize from ${name}` })).toBeInTheDocument();
    }
  });

  it("supports a controlled crop", () => {
    const onCropChange = vi.fn();
    const crop = { x: 0, y: 0, width: 400, height: 300 };
    const { container, rerender } = render(<ImageCropper src="/photo.jpg" crop={crop} onCropChange={onCropChange} />);
    loadImage(container);
    expect(onCropChange).not.toHaveBeenCalled();
    expect(boxRect(box())).toEqual({ left: "0%", top: "0%", width: "50%", height: "50%" });
    fireEvent.keyDown(box(), { key: "ArrowRight", shiftKey: true });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 10, y: 0, width: 400, height: 300 });
    expect(box().style.left).toBe("0%");
    rerender(<ImageCropper src="/photo.jpg" crop={{ ...crop, x: 400 }} onCropChange={onCropChange} />);
    expect(box().style.left).toBe("50%");
  });

  it("rotates in quarter turns and carries the crop along", () => {
    const onRotationChange = vi.fn();
    const { container, onCropChange } = setup({
      defaultCrop: { x: 100, y: 50, width: 200, height: 100 },
      onRotationChange,
    });
    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    expect(onRotationChange).toHaveBeenLastCalledWith(90);
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 450, y: 100, width: 100, height: 200 });
    const img = container.querySelector("img")!;
    expect(img.style.transform).toContain("rotate(90deg)");
    // The frame is now 600×800, so the image is drawn 800/600 wide.
    expect(img.style.width).toBe(`${(800 / 600) * 100}%`);
    expect(boxRect(box()).left).toBe("75%");
    fireEvent.click(screen.getByRole("button", { name: "Rotate left" }));
    expect(onRotationChange).toHaveBeenLastCalledWith(0);
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 100, y: 50, width: 200, height: 100 });
  });

  it("switches aspect presets", () => {
    const onAspectChange = vi.fn();
    const { onCropChange } = setup({
      aspectOptions: imageCropperAspectOptions,
      defaultCrop: { x: 100, y: 100, width: 400, height: 100 },
      onAspectChange,
    });
    const group = screen.getByRole("radiogroup", { name: "Aspect ratio" });
    expect(group).toBeInTheDocument();
    const free = screen.getByRole("radio", { name: "Free" });
    expect(free).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "1:1" }));
    expect(onAspectChange).toHaveBeenLastCalledWith(1);
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 200, y: 50, width: 200, height: 200 });
    // Further resizes keep the lock.
    fireEvent.keyDown(box(), { key: "ArrowRight", altKey: true, shiftKey: true });
    expect(onCropChange).toHaveBeenLastCalledWith({ x: 200, y: 45, width: 210, height: 210 });
  });

  it("exports the crop through the handle and Apply", async () => {
    const { ctx, sizes } = mockCanvas();
    const ref = React.createRef<ImageCropperHandle>();
    const onComplete = vi.fn();
    const { container } = setup({
      cropperRef: ref,
      onComplete,
      defaultCrop: { x: 100, y: 50, width: 400, height: 300 },
      output: { type: "image/jpeg", quality: 0.9 },
    });
    const img = container.querySelector("img")!;

    const blob = await ref.current!.getCroppedBlob();
    expect(blob).toBeInstanceOf(Blob);
    expect(sizes.at(-1)).toEqual({ width: 400, height: 300, type: "image/jpeg", quality: 0.9 });
    expect(ctx.translate).toHaveBeenCalledWith(-100, -50);
    expect(ctx.drawImage).toHaveBeenLastCalledWith(img, -400, -300, 800, 600);

    await ref.current!.getCroppedBlob({ outputWidth: 200, type: "image/webp" });
    expect(sizes.at(-1)).toMatchObject({ width: 200, height: 150, type: "image/webp" });
    expect(ctx.scale).toHaveBeenLastCalledWith(0.5, 0.5);

    act(() => ref.current!.rotate(90));
    ctx.rotate.mockClear();
    const canvas = ref.current!.getCroppedCanvas();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas!.width).toBe(300);
    expect(canvas!.height).toBe(400);
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const [applied, appliedCrop] = onComplete.mock.calls[0]!;
    expect(applied).toBeInstanceOf(Blob);
    expect(appliedCrop).toEqual({ x: 250, y: 100, width: 300, height: 400 });
  });

  it("returns null and reports an error when the canvas is unavailable", async () => {
    const ref = React.createRef<ImageCropperHandle>();
    const onComplete = vi.fn();
    setup({ cropperRef: ref, onComplete });
    expect(await ref.current!.getCroppedBlob()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("The crop could not be exported.")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("standalone cropToCanvas / cropToBlob draw the rotated crop", async () => {
    const { ctx } = mockCanvas();
    const source = document.createElement("canvas");
    source.width = 800;
    source.height = 600;
    const canvas = cropToCanvas(source, { x: 0, y: 0, width: 300, height: 400 }, { rotation: 270 });
    expect(canvas!.width).toBe(300);
    expect(ctx.translate).toHaveBeenCalledWith(300, 400);
    expect(ctx.rotate).toHaveBeenCalledWith((270 * Math.PI) / 180);
    expect(await cropToBlob(source, { x: 0, y: 0, width: 10, height: 10 })).toBeInstanceOf(Blob);
  });

  it("zooms with a slider", () => {
    const onZoomChange = vi.fn();
    setup({ zoomable: true, onZoomChange });
    const slider = screen.getByRole("slider", { name: "Zoom" });
    expect(slider).toHaveAttribute("aria-valuetext", "100%");
    fireEvent.keyDown(slider, { key: "End" });
    expect(onZoomChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveAttribute("aria-valuetext", "300%");
  });

  it("has no axe violations", async () => {
    const { container } = setup({ aspectOptions: imageCropperAspectOptions, zoomable: true, onComplete: () => {} });
    // Let SegmentedControl finish its first-frame state update.
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    expect(await axeViolations(container)).toEqual([]);
  });

  it("has no axe violations while loading or failed", async () => {
    const { container } = render(<ImageCropper src="/photo.jpg" />);
    expect(await axeViolations(container)).toEqual([]);
    fireEvent.error(container.querySelector("img")!);
    expect(await axeViolations(container)).toEqual([]);
  });
});
