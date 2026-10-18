/* Crop-rectangle math in image pixel space. Pure; never throws on bad input. */
import { clamp } from "./math";

/** A rectangle in image pixels (top-left origin). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A width/height pair in pixels. */
export interface CropSize {
  width: number;
  height: number;
}

/** A point in pixels. */
export interface CropPoint {
  x: number;
  y: number;
}

/** A resize handle, named by compass direction. */
export type CropHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** All handles, clockwise from the top-left corner. */
export const CROP_HANDLES: readonly CropHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Rotation in quarter turns, clockwise. */
export type CropRotation = 0 | 90 | 180 | 270;

export interface CropConstraints {
  /** Width ÷ height to keep; `null`/`undefined` (or anything not positive and finite) means free. */
  aspect?: number | null;
  /** Smallest width in pixels (capped at the bounds). */
  minWidth?: number;
  /** Smallest height in pixels (capped at the bounds). */
  minHeight?: number;
}

const num = (n: unknown, fallback = 0): number => (typeof n === "number" && Number.isFinite(n) ? n : fallback);

function sizeOf(size: Partial<CropSize> | null | undefined): CropSize {
  return { width: Math.max(0, num(size?.width)), height: Math.max(0, num(size?.height)) };
}

/** A usable aspect ratio, or `null` for free cropping. */
export function normalizeAspect(aspect: number | null | undefined): number | null {
  return typeof aspect === "number" && Number.isFinite(aspect) && aspect > 0 ? aspect : null;
}

/** Snaps any angle to the nearest quarter turn in `0 | 90 | 180 | 270` (NaN → 0). */
export function normalizeRotation(degrees: number): CropRotation {
  if (!Number.isFinite(degrees)) return 0;
  const r = (((Math.round(degrees / 90) * 90) % 360) + 360) % 360;
  return r as CropRotation;
}

/** The image size after rotating it (width and height swap for 90° and 270°). */
export function rotatedSize(size: CropSize, rotation: number): CropSize {
  const s = sizeOf(size);
  const r = normalizeRotation(rotation);
  return r === 90 || r === 270 ? { width: s.height, height: s.width } : s;
}

/** Keeps `crop` inside `bounds`: size between the minimum and the bounds, then position inside. */
export function clampCrop(crop: CropRect, bounds: CropSize, constraints: CropConstraints = {}): CropRect {
  const b = sizeOf(bounds);
  const minW = Math.min(b.width, Math.max(0, num(constraints.minWidth)));
  const minH = Math.min(b.height, Math.max(0, num(constraints.minHeight)));
  const width = clamp(num(crop?.width), minW, b.width);
  const height = clamp(num(crop?.height), minH, b.height);
  return {
    x: clamp(num(crop?.x), 0, b.width - width),
    y: clamp(num(crop?.y), 0, b.height - height),
    width,
    height,
  };
}

/** Moves `crop` by (`dx`, `dy`) without leaving `bounds`; the size never changes (unless it exceeded the bounds). */
export function moveCrop(crop: CropRect, dx: number, dy: number, bounds: CropSize): CropRect {
  const c = clampCrop(crop, bounds);
  return clampCrop({ ...c, x: c.x + num(dx), y: c.y + num(dy) }, bounds);
}

/**
 * Resizes `crop` by dragging `handle` by (`dx`, `dy`). The opposite edge or corner stays put; edges that
 * don't belong to the handle stay put too, except with an aspect lock, where an edge handle grows the other
 * axis around its centre. The result stays inside `bounds` and is at least the minimum size.
 */
export function resizeCrop(
  crop: CropRect,
  handle: CropHandle,
  dx: number,
  dy: number,
  bounds: CropSize,
  constraints: CropConstraints = {}
): CropRect {
  const b = sizeOf(bounds);
  const start = clampCrop(crop, b);
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  if (sx === 0 && sy === 0) return start;

  const left = start.x;
  const top = start.y;
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  const maxW = sx > 0 ? b.width - left : sx < 0 ? right : b.width;
  const maxH = sy > 0 ? b.height - top : sy < 0 ? bottom : b.height;
  const minW = Math.max(0, num(constraints.minWidth));
  const minH = Math.max(0, num(constraints.minHeight));
  const aspect = normalizeAspect(constraints.aspect);

  let w = sx !== 0 ? start.width + sx * num(dx) : start.width;
  let h = sy !== 0 ? start.height + sy * num(dy) : start.height;

  if (aspect === null) {
    w = clamp(w, Math.min(minW, maxW), maxW);
    h = clamp(h, Math.min(minH, maxH), maxH);
  } else {
    const limW = sx !== 0 && sy !== 0 ? Math.min(maxW, maxH * aspect) : sx !== 0 ? Math.min(maxW, b.height * aspect) : Math.min(b.width, maxH * aspect);
    const lowW = Math.max(minW, minH * aspect);
    // Corners follow whichever axis the pointer pulled further; edges follow their own axis.
    if (sx !== 0 && sy !== 0) w = w / aspect >= h ? w : h * aspect;
    else if (sx === 0) w = h * aspect;
    w = clamp(w, Math.min(lowW, limW), limW);
    h = w / aspect;
  }

  const centred = aspect !== null;
  const x = sx > 0 ? left : sx < 0 ? right - w : centred ? left + start.width / 2 - w / 2 : left;
  const y = sy > 0 ? top : sy < 0 ? bottom - h : centred ? top + start.height / 2 - h / 2 : top;
  return clampCrop({ x, y, width: w, height: h }, b);
}

/** A centred crop covering `coverage` (0–1, default 0.8) of `bounds`, shrunk to `aspect` when one is given. */
export function centerCrop(bounds: CropSize, aspect?: number | null, coverage = 0.8): CropRect {
  const b = sizeOf(bounds);
  const k = clamp(num(coverage, 0.8), 0, 1) || 0.8;
  let width = b.width * k;
  let height = b.height * k;
  const a = normalizeAspect(aspect);
  if (a !== null && width > 0 && height > 0) {
    if (width / height > a) width = height * a;
    else height = width / a;
  }
  return { x: (b.width - width) / 2, y: (b.height - height) / 2, width, height };
}

/** Reshapes `crop` to `aspect` around its centre, keeping roughly the same area and staying inside `bounds`. */
export function applyAspect(crop: CropRect, aspect: number | null | undefined, bounds: CropSize): CropRect {
  const b = sizeOf(bounds);
  const c = clampCrop(crop, b);
  const a = normalizeAspect(aspect);
  if (a === null) return c;
  const area = c.width * c.height;
  let width = Math.sqrt(area * a);
  let height = width / a;
  if (width > b.width) {
    width = b.width;
    height = width / a;
  }
  if (height > b.height) {
    height = b.height;
    width = height * a;
  }
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  return clampCrop({ x: cx - width / 2, y: cy - height / 2, width, height }, b);
}

/**
 * Maps `crop` (in an image of `size`) onto the same pixels after rotating the image by `delta` degrees
 * (snapped to quarter turns, clockwise positive). The new image size is `rotatedSize(size, delta)`.
 */
export function rotateCrop(crop: CropRect, size: CropSize, delta: number): CropRect {
  let s = sizeOf(size);
  let c = clampCrop(crop, s);
  const steps = normalizeRotation(delta) / 90;
  for (let i = 0; i < steps; i++) {
    c = { x: s.height - (c.y + c.height), y: c.x, width: c.height, height: c.width };
    s = { width: s.height, height: s.width };
  }
  return c;
}

function scaleRect(rect: CropRect, sx: number, sy: number): CropRect {
  return { x: num(rect?.x) * sx, y: num(rect?.y) * sy, width: num(rect?.width) * sx, height: num(rect?.height) * sy };
}

const ratio = (to: number, from: number) => (from > 0 && Number.isFinite(to) ? to / from : 0);

/** Converts a rectangle in natural image pixels to on-screen pixels for an image drawn at `display` size. */
export function toDisplayRect(rect: CropRect, natural: CropSize, display: CropSize): CropRect {
  const n = sizeOf(natural);
  const d = sizeOf(display);
  return scaleRect(rect, ratio(d.width, n.width), ratio(d.height, n.height));
}

/** Converts a rectangle in on-screen pixels to natural image pixels (the inverse of `toDisplayRect`). */
export function toNaturalRect(rect: CropRect, natural: CropSize, display: CropSize): CropRect {
  const n = sizeOf(natural);
  const d = sizeOf(display);
  return scaleRect(rect, ratio(n.width, d.width), ratio(n.height, d.height));
}

/** Converts an on-screen point (or distance) to natural image pixels. */
export function toNaturalPoint(point: CropPoint, natural: CropSize, display: CropSize): CropPoint {
  const r = toNaturalRect({ x: point?.x, y: point?.y, width: 0, height: 0 } as CropRect, natural, display);
  return { x: r.x, y: r.y };
}

/** Rounds every field to whole pixels. */
export function roundCrop(crop: CropRect): CropRect {
  return {
    x: Math.round(num(crop?.x)),
    y: Math.round(num(crop?.y)),
    width: Math.round(num(crop?.width)),
    height: Math.round(num(crop?.height)),
  };
}

/** True when both rectangles match within `epsilon` pixels (both missing counts as equal). */
export function cropEquals(a: CropRect | null | undefined, b: CropRect | null | undefined, epsilon = 0): boolean {
  if (!a || !b) return !a && !b;
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.width - b.width) <= epsilon &&
    Math.abs(a.height - b.height) <= epsilon
  );
}

export interface CropOutputOptions {
  /** Output width in pixels; the height follows the crop's shape. */
  outputWidth?: number;
  /** Output height in pixels, used when `outputWidth` is not set. */
  outputHeight?: number;
  /** Largest output side in pixels; bigger results are scaled down. */
  maxOutputSize?: number;
}

export interface CropOutputSize extends CropSize {
  /** Horizontal scale from crop pixels to output pixels. */
  scaleX: number;
  /** Vertical scale from crop pixels to output pixels. */
  scaleY: number;
}

/** The canvas size for a crop (natural size by default, or scaled to `outputWidth`/`outputHeight`/`maxOutputSize`). Never below 1×1. */
export function getCropOutputSize(crop: CropRect, options: CropOutputOptions = {}): CropOutputSize {
  const w = Math.max(0, num(crop?.width));
  const h = Math.max(0, num(crop?.height));
  const ow = num(options.outputWidth);
  const oh = num(options.outputHeight);
  let scale = ow > 0 && w > 0 ? ow / w : oh > 0 && h > 0 ? oh / h : 1;
  const max = num(options.maxOutputSize);
  const longest = Math.max(w, h) * scale;
  if (max > 0 && longest > max) scale = max / Math.max(w, h);
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));
  return { width, height, scaleX: w > 0 ? width / w : 1, scaleY: h > 0 ? height / h : 1 };
}
