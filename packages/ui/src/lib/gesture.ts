/* Pure maths for pointer gestures (hooks/use-drag, use-swipe-dismiss, use-pan and the swipe components). No DOM, no React. */

/** Pixels the pointer must travel before a press becomes a drag (lets taps and clicks through). */
export const DRAG_THRESHOLD = 4;
/** Pixels after which `lockAxis` decides between a horizontal and a vertical drag. */
export const AXIS_LOCK_DISTANCE = 8;
/** Only samples from the last 100 ms count towards the release velocity. */
export const VELOCITY_WINDOW_MS = 100;
/** A release past this distance (px) commits. */
export const COMMIT_DISTANCE = 90;
/** A release faster than this (px/s) in the direction of travel commits. */
export const COMMIT_VELOCITY = 450;
/** A flick needs at least this much travel (px) so a twitch is not a commit. */
export const FLICK_MIN_DISTANCE = 24;
/** Release projection: where the thing would be after this many seconds at the release velocity. */
export const PROJECTION_SECONDS = 0.2;
/** Default inertia friction, per second (`v *= exp(-friction * dt)`). */
export const INERTIA_FRICTION = 6;
/** Inertia stops below this speed (px/s). */
export const INERTIA_REST_SPEED = 12;

export type DragAxis = "x" | "y" | "both";

export interface DragSample {
  /** Milliseconds (any monotonic clock). */
  t: number;
  x: number;
  y: number;
}

/** Append a sample and drop the ones older than `window` ms (in place, keeps the array short). */
export function recordSample(samples: DragSample[], sample: DragSample, window = VELOCITY_WINDOW_MS): void {
  samples.push(sample);
  while (samples.length > 2 && sample.t - samples[0]!.t > window) samples.shift();
}

/**
 * Pointer velocity in px/s from the samples inside the last `window` ms (a time window, not a sample count, so it is the same
 * on a 60 Hz and a 240 Hz pointer). A pointer that rested for longer than the window before `now` has velocity 0.
 */
export function velocityFromSamples(samples: readonly DragSample[], now?: number, window = VELOCITY_WINDOW_MS): { x: number; y: number } {
  const last = samples[samples.length - 1];
  if (!last || samples.length < 2) return { x: 0, y: 0 };
  if (now !== undefined && now - last.t > window) return { x: 0, y: 0 };
  let first = last;
  for (let i = samples.length - 2; i >= 0 && last.t - samples[i]!.t <= window; i--) first = samples[i]!;
  if (first === last) return { x: 0, y: 0 };
  const dt = Math.max(1, last.t - first.t);
  return { x: ((last.x - first.x) / dt) * 1000, y: ((last.y - first.y) / dt) * 1000 };
}

/** Beyond-the-limit resistance: a factor of the overshoot (`.15` free pan, `.4` to `.6` stacks, `0` sliders) or a curve. */
export type Elastic = number | ((overshoot: number) => number);

function resist(overshoot: number, elastic: Elastic): number {
  if (typeof elastic === "function") return Math.max(0, elastic(overshoot));
  return overshoot * Math.min(1, Math.max(0, elastic));
}

/** Clamp `value` to [min, max]; beyond a limit it follows the finger at the `elastic` rate (0 = hard stop). */
export function applyBounds(value: number, min = -Infinity, max = Infinity, elastic: Elastic = 0): number {
  if (value < min) return min - resist(min - value, elastic);
  if (value > max) return max + resist(value - max, elastic);
  return value;
}

/** An asymptotic rubber band: the pull grows with the overshoot but never passes `limit` (a scroll view's feel). */
export function rubberBand(overshoot: number, limit: number, stiffness = 0.55): number {
  if (overshoot <= 0 || limit <= 0) return 0;
  return limit * (1 - 1 / ((overshoot * stiffness) / limit + 1));
}

export type DragStart = { type: "wait" } | { type: "ignore" } | { type: "start"; axis: DragAxis };

/**
 * Decide, from the pointer travel since the press, whether the drag starts. On a single axis the cross axis winning at the first
 * decision hands the gesture back (`ignore`: the page scrolls, never a stolen swipe). With `lockAxis` on `"both"` the drag waits for
 * `lockDistance` px, then follows the dominant axis only.
 */
export function dragStartDecision({
  axis = "both",
  dx,
  dy,
  threshold = DRAG_THRESHOLD,
  lockAxis = false,
  lockDistance = AXIS_LOCK_DISTANCE,
}: {
  axis?: DragAxis;
  dx: number;
  dy: number;
  threshold?: number;
  lockAxis?: boolean;
  lockDistance?: number;
}): DragStart {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const travel = Math.max(ax, ay);
  if (axis === "both") {
    if (travel < (lockAxis ? Math.max(threshold, lockDistance) : threshold)) return { type: "wait" };
    return { type: "start", axis: lockAxis ? (ax > ay ? "x" : "y") : "both" };
  }
  if (travel < threshold) return { type: "wait" };
  const main = axis === "x" ? ax : ay;
  const cross = axis === "x" ? ay : ax;
  return cross > main ? { type: "ignore" } : { type: "start", axis };
}

/** Sign of a number as -1, 0 or 1. */
export const signOf = (n: number): -1 | 0 | 1 => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** Fraction (0..1) of the way from rest to the commit distance. */
export function dragProgress(offset: number, distance = COMMIT_DISTANCE): number {
  return distance > 0 ? Math.min(1, Math.abs(offset) / distance) : 0;
}

/** Where a release would come to rest if it kept its velocity for `seconds`. */
export function projectRelease(position: number, velocity: number, seconds = PROJECTION_SECONDS): number {
  return position + velocity * seconds;
}

/**
 * The commit rule: `-1` or `1` (the direction) when the release went further than `distance` px, or faster than `speed` px/s in the
 * direction it moved by at least `minFlick` px; otherwise `0` (settle back). A fast reversal against the offset never commits.
 */
export function releaseDecision({
  offset,
  velocity = 0,
  distance = COMMIT_DISTANCE,
  speed = COMMIT_VELOCITY,
  minFlick = FLICK_MIN_DISTANCE,
}: {
  offset: number;
  velocity?: number;
  distance?: number;
  speed?: number;
  minFlick?: number;
}): -1 | 0 | 1 {
  if (Math.abs(velocity) > speed && Math.abs(offset) > minFlick && signOf(velocity) === signOf(offset)) return signOf(offset);
  if (Math.abs(offset) > distance) return signOf(offset);
  return 0;
}

/** Index of the value in `points` nearest to `position` (-1 for an empty list). */
export function nearestIndex(points: readonly number[], position: number): number {
  let best = -1;
  points.forEach((p, i) => {
    if (best < 0 || Math.abs(p - position) < Math.abs(points[best]! - position)) best = i;
  });
  return best;
}

/** The snap point after a release: a flick steps one point from `current`, anything else goes to the nearest to `position`. */
export function snapIndex(points: readonly number[], position: number, { current = 0, flick = 0 }: { current?: number; flick?: -1 | 0 | 1 } = {}): number {
  if (!points.length) return -1;
  if (flick) return Math.min(points.length - 1, Math.max(0, current + flick));
  return nearestIndex(points, position);
}

/** One frame of time-based friction: the velocity after `dt` seconds and the distance covered (exact integral, frame-rate independent). */
export function inertiaStep(velocity: number, friction: number, dt: number): { velocity: number; delta: number } {
  if (friction <= 0) return { velocity, delta: velocity * dt };
  const decay = Math.exp(-friction * dt);
  return { velocity: velocity * decay, delta: (velocity * (1 - decay)) / friction };
}

/** Total distance an inertial release travels before it stops. */
export function inertiaDistance(velocity: number, friction = INERTIA_FRICTION): number {
  return friction > 0 ? velocity / friction : 0;
}

/** A row opens when its release (projected 0.2 s ahead) is past this fraction of the actions' width. */
export const SWIPE_REVEAL_FRACTION = 0.4;
/** A full swipe commits the outermost action past this fraction of the row's width. */
export const SWIPE_COMMIT_FRACTION = 0.5;
/** A fast flick (px/s) commits once the actions are mostly revealed. */
export const SWIPE_COMMIT_SPEED = 1100;

export type SwipeSide = "start" | "end";
export type SwipeRowTarget = { type: "closed" } | { type: "reveal"; side: SwipeSide } | { type: "commit"; side: SwipeSide };

/**
 * Where a swipe row comes to rest. `offset` and `velocity` are logical: positive reveals the start actions, negative the end
 * actions (flip the sign in a right-to-left row). A release is judged where it would land 0.2 s later: past 40% of the
 * actions' width it opens, past half the row (or fast, with the actions mostly out) it commits, otherwise it closes.
 */
export function swipeRowRelease({
  offset,
  velocity = 0,
  startWidth,
  endWidth,
  rowWidth,
  commit = true,
}: {
  offset: number;
  velocity?: number;
  startWidth: number;
  endWidth: number;
  rowWidth: number;
  commit?: boolean;
}): SwipeRowTarget {
  const projected = projectRelease(offset, velocity);
  const side: SwipeSide | null = projected > 0 ? "start" : projected < 0 ? "end" : null;
  if (!side) return { type: "closed" };
  const width = side === "start" ? startWidth : endWidth;
  if (width <= 0) return { type: "closed" };
  const way = side === "start" ? 1 : -1;
  const travel = offset * way;
  if (commit && rowWidth > 0) {
    const far = Math.max(rowWidth * SWIPE_COMMIT_FRACTION, width + FLICK_MIN_DISTANCE);
    const fast = velocity * way > SWIPE_COMMIT_SPEED && travel > width * 0.75;
    if (travel > far || fast) return { type: "commit", side };
  }
  return projected * way >= width * SWIPE_REVEAL_FRACTION ? { type: "reveal", side } : { type: "closed" };
}

/** A slide-to-confirm counts once the thumb is this far along its track (an irreversible action never confirms on speed alone). */
export const SLIDE_CONFIRM_PROGRESS = 0.9;

/** Progress (0..1) of a thumb at offset `x` on a track with `travel` px of room. */
export function slideProgress(x: number, travel: number): number {
  return travel > 0 ? Math.min(1, Math.max(0, x / travel)) : 0;
}

/** Whether a release at offset `x` confirms. */
export const slideConfirms = (x: number, travel: number): boolean => slideProgress(x, travel) >= SLIDE_CONFIRM_PROGRESS;
