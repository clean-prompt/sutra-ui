/** A damped spring in physical terms: `stiffness` k, `damping` c and `mass` m (default 1). */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

/** The three springs of the design system (the CSS tokens `--sutra-spring-*` are generated from these). */
export const springs = {
  gentle: { stiffness: 260, damping: 26 },
  snappy: { stiffness: 632, damping: 50.3 },
  bouncy: { stiffness: 350, damping: 20.6 },
} satisfies Record<string, SpringConfig>;

export type SpringName = keyof typeof springs;

/** Step response from rest: 0 at t = 0, tending to 1 (t in seconds). Closed form, so it is exact at any t. */
export function springAt({ stiffness: k, damping: c, mass: m = 1 }: SpringConfig, t: number): number {
  if (t <= 0) return 0;
  const w = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const s = w * Math.sqrt(Math.abs(1 - z * z));
  if (z < 1) return 1 - Math.exp(-z * w * t) * (Math.cos(s * t) + ((z * w) / s) * Math.sin(s * t));
  const r1 = -z * w + s;
  const r2 = -z * w - s;
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

/** Seconds until the response stays within `epsilon` of 1 (0.002 by default). Scans in 1 ms steps, up to 10 s. */
export function settleTime(config: SpringConfig, epsilon = 0.002): number {
  let last = 0;
  for (let i = 1; i <= 1e4; i++) if (Math.abs(springAt(config, i / 1e3) - 1) > epsilon) last = i;
  return (last + 1) / 1e3;
}

/** The spring as a CSS `linear()` easing (at most 40 points) and the duration in ms to pair with it. */
export function springToLinear(config: SpringConfig, { tolerance = 0.002 }: { tolerance?: number } = {}) {
  const T = settleTime(config);
  const pts = Array.from({ length: 241 }, (_, i) => [i / 240, springAt(config, (i / 240) * T)] as const);
  // Keep the points that matter at `tolerance`; loosen it until there are at most 40.
  let keep = simplify(pts, 0, 240, tolerance);
  for (let tol = tolerance; keep.length > 40; ) keep = simplify(pts, 0, 240, (tol *= 1.25));
  const round = (n: number, d: number) => String(Math.round(n * d) / d).replace(/^0\./, ".").replace(/^-0\./, "-.");
  const stops = keep.slice(1, -1).map((i) => `${round(pts[i]![1], 1e3)} ${round(pts[i]![0] * 100, 10)}%`);
  return { easing: `linear(0, ${[...stops, "1"].join(", ")})`, duration: Math.round(T * 1e3) };
}

/** Ramer-Douglas-Peucker on (x, y), measuring the vertical distance: indices to keep between a and b. */
function simplify(pts: readonly (readonly [number, number])[], a: number, b: number, tol: number): number[] {
  let worst = 0;
  let at = -1;
  for (let i = a + 1; i < b; i++) {
    const y = pts[a]![1] + ((pts[b]![1] - pts[a]![1]) * (pts[i]![0] - pts[a]![0])) / (pts[b]![0] - pts[a]![0]);
    const d = Math.abs(pts[i]![1] - y);
    if (d > worst) [worst, at] = [d, i];
  }
  return worst > tol ? [...simplify(pts, a, at, tol).slice(0, -1), ...simplify(pts, at, b, tol)] : [a, b];
}

export interface SpringHandle {
  /** Spring toward `target`, optionally starting with a velocity (units per second). */
  to(target: number, velocity?: number): void;
  /** Jump to `value` at rest and report it. */
  set(value: number): void;
  /** Stop where it is. */
  stop(): void;
  readonly value: number;
}

/**
 * A requestAnimationFrame spring for values CSS cannot animate (a release with velocity, a retarget mid-flight).
 * Semi-implicit Euler in steps of at most 1/120 s, one frame loop that stops at rest. `onUpdate` runs every frame.
 * It does not look at reduced motion: callers (see `useSpringValue`) call `set` instead of `to`.
 */
export function createSpring({ stiffness: k, damping: c, mass: m = 1 }: SpringConfig, onUpdate: (value: number) => void, initial = 0): SpringHandle {
  let value = initial;
  let target = initial;
  let velocity = 0;
  let frame = 0;
  let last = 0;
  const step = (now: number) => {
    const dt = Math.min((now - last) / 1e3, 1 / 30);
    const n = Math.max(1, Math.ceil(dt * 120));
    last = now;
    for (let i = 0; i < n; i++) {
      velocity += ((k * (target - value) - c * velocity) / m) * (dt / n);
      value += velocity * (dt / n);
    }
    const rest = Math.abs(velocity) < 0.01 && Math.abs(target - value) < 0.001;
    if (rest) [value, velocity, frame] = [target, 0, 0];
    else frame = requestAnimationFrame(step);
    onUpdate(value);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  return {
    to(next, v) {
      target = next;
      if (v !== undefined) velocity = v;
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    },
    set(next) {
      stop();
      value = target = next;
      velocity = 0;
      onUpdate(value);
    },
    stop,
    get value() {
      return value;
    },
  };
}
