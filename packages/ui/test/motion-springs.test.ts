/**
 * Springs: the pure maths of lib/spring.ts, the rAF integrator, and the generated CSS tokens
 * (`--sutra-spring-*` in styles/sutra.css and styles/paper.css must equal what scripts/gen-springs.mjs produces).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpring, settleTime, springAt, springToLinear, springs, type SpringConfig } from "../src/lib/spring";
// @ts-expect-error plain .mjs without types
import { PAPER_SPRINGS, springBlock as block } from "../scripts/springs-css.mjs";

const ROOT = path.resolve(__dirname, "..");
const STYLES = path.join(ROOT, "src/styles");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const sutraCss = strip(readFileSync(path.join(STYLES, "sutra.css"), "utf8"));
const paperCss = strip(readFileSync(path.join(STYLES, "paper.css"), "utf8"));
const springBlock = (c: unknown, opts?: { themeEases?: boolean }): string[] => block(c, springToLinear, opts);
const zeta = ({ stiffness: k, damping: c, mass: m = 1 }: SpringConfig) => c / (2 * Math.sqrt(k * m));
const peak = (c: SpringConfig) => Math.max(...Array.from({ length: 3000 }, (_, i) => springAt(c, i / 1000)));

describe("springAt and settleTime", () => {
  it("starts at 0, ends within epsilon of 1 at the settle time, and stays there", () => {
    for (const c of [...Object.values(springs), ...Object.values(PAPER_SPRINGS as Record<string, SpringConfig>)]) {
      const T = settleTime(c);
      expect(springAt(c, 0)).toBe(0);
      expect(springAt(c, -1)).toBe(0);
      for (const t of [T, T * 1.5, T * 3]) expect(Math.abs(springAt(c, t) - 1)).toBeLessThanOrEqual(0.002 + 1e-9);
      expect(T).toBeGreaterThan(0.1);
      expect(T).toBeLessThan(1.5);
    }
  });

  it("critical and over-damped springs never overshoot; under-damped ones overshoot by exp(-pi z / sqrt(1 - z^2))", () => {
    expect(zeta(springs.snappy)).toBeCloseTo(1, 2);
    for (const c of [springs.snappy, PAPER_SPRINGS.gentle, { stiffness: 100, damping: 40 }]) expect(peak(c)).toBeLessThanOrEqual(1 + 1e-9);
    for (const c of [springs.gentle, springs.bouncy, PAPER_SPRINGS.bouncy]) {
      const z = zeta(c);
      expect(z).toBeLessThan(1);
      expect(peak(c) - 1).toBeCloseTo(Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z)), 3);
    }
  });

  it("is continuous across the critical damping branch and honours the mass", () => {
    const base = { stiffness: 400, damping: 40 }; // z = 1 exactly
    for (const t of [0.01, 0.05, 0.2]) {
      expect(springAt({ ...base, damping: 40.0001 }, t)).toBeCloseTo(springAt(base, t), 4);
      expect(springAt({ ...base, damping: 39.9999 }, t)).toBeCloseTo(springAt(base, t), 4);
    }
    // doubling mass and stiffness and damping together leaves the response unchanged
    expect(springAt({ stiffness: 800, damping: 80, mass: 2 }, 0.1)).toBeCloseTo(springAt(base, 0.1), 9);
  });
});

describe("springToLinear", () => {
  const parse = (easing: string) => {
    const stops = easing.slice("linear(".length, -1).split(",").map((s) => s.trim());
    return stops.map((s, i) => {
      const [v, pos] = s.split(/\s+/);
      return { y: Number(v), x: pos ? Number(pos.replace("%", "")) / 100 : i === 0 ? 0 : 1 };
    });
  };

  it("is a linear() with a first stop of 0, a last stop of 1, rising positions, at most 40 points", () => {
    for (const c of Object.values(springs)) {
      const { easing, duration } = springToLinear(c);
      const pts = parse(easing);
      expect(easing).toMatch(/^linear\(0, .*, 1\)$/);
      expect(pts[0]).toEqual({ y: 0, x: 0 });
      expect(pts.at(-1)).toEqual({ y: 1, x: 1 });
      expect(pts.length).toBeLessThanOrEqual(40);
      for (let i = 1; i < pts.length; i++) expect(pts[i]!.x).toBeGreaterThan(pts[i - 1]!.x);
      expect(duration).toBe(Math.round(settleTime(c) * 1000));
    }
  });

  it("follows the real curve within the tolerance (plus rounding)", () => {
    for (const c of Object.values(springs)) {
      const { easing, duration } = springToLinear(c);
      const pts = parse(easing);
      for (let i = 0; i <= 200; i++) {
        const x = i / 200;
        const j = pts.findIndex((p) => p.x >= x);
        const a = pts[Math.max(j - 1, 0)]!;
        const b = pts[j]!;
        const y = b.x === a.x ? b.y : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
        expect(Math.abs(y - springAt(c, (x * duration) / 1000))).toBeLessThan(0.012);
      }
    }
  });

  it("a looser tolerance gives fewer points; a tight one is capped at 40", () => {
    const n = (tolerance: number) => springToLinear(springs.bouncy, { tolerance }).easing.split(",").length;
    expect(n(0.02)).toBeLessThan(n(0.002));
    expect(n(0.00001)).toBeLessThanOrEqual(40);
  });
});

describe("createSpring", () => {
  let queue: FrameRequestCallback[] = [];
  let clock = 0;
  const raf = vi.fn((cb: FrameRequestCallback) => queue.push(cb));
  const caf = vi.fn(() => (queue = []));
  const install = () => {
    queue = [];
    clock = 1000;
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("cancelAnimationFrame", caf);
    vi.spyOn(performance, "now").mockImplementation(() => clock);
  };
  /** Run frames of 16 ms until the loop stops; returns how many ran. */
  const run = (max = 600) => {
    let n = 0;
    while (queue.length && n < max) {
      const cb = queue.shift()!;
      clock += 16;
      cb(clock);
      n++;
    }
    return n;
  };
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    raf.mockClear();
    caf.mockClear();
  });

  it("springs to the target, reports every frame and stops the loop at rest", () => {
    install();
    const seen: number[] = [];
    const s = createSpring(springs.snappy, (v) => seen.push(v), 0);
    expect(raf).not.toHaveBeenCalled();
    s.to(100);
    const frames = run();
    expect(frames).toBeGreaterThan(5);
    expect(frames).toBeLessThan(80);
    expect(seen).toHaveLength(frames);
    expect(seen.at(-1)).toBe(100);
    expect(s.value).toBe(100);
    expect(queue).toHaveLength(0); // nothing keeps running at rest
    expect(seen.every((v) => v <= 100 + 1e-9)).toBe(true); // critical damping: no overshoot
  });

  it("overshoots when under-damped and keeps going from the current value on a retarget", () => {
    install();
    const seen: number[] = [];
    const s = createSpring(springs.bouncy, (v) => seen.push(v), 0);
    s.to(1);
    run();
    expect(Math.max(...seen)).toBeGreaterThan(1.05);
    s.to(0);
    run(4);
    const mid = s.value;
    expect(mid).toBeLessThan(1);
    expect(mid).toBeGreaterThan(0);
    s.to(2);
    run();
    expect(s.value).toBe(2);
  });

  it("set() jumps at rest and reports once; stop() cancels the loop where it is; a velocity is honoured", () => {
    install();
    const onUpdate = vi.fn();
    const s = createSpring(springs.gentle, onUpdate, 5);
    expect(s.value).toBe(5);
    s.set(9);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenLastCalledWith(9);
    s.to(0);
    run(3);
    const where = s.value;
    s.stop();
    expect(queue).toHaveLength(0);
    run();
    expect(s.value).toBe(where);

    const withV = createSpring(springs.snappy, () => {}, 0);
    withV.to(0, 500); // already at the target, thrown at 500 units per second
    run(2);
    expect(withV.value).toBeGreaterThan(1);
  });

  it("starting a second to() while running does not add a second loop", () => {
    install();
    const s = createSpring(springs.gentle, () => {}, 0);
    s.to(1);
    s.to(2);
    s.to(3);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("survives a long frame (dt is clamped, no blow-up)", () => {
    install();
    const s = createSpring(springs.snappy, () => {}, 0);
    s.to(1);
    clock += 5000;
    queue.shift()!(clock);
    expect(Number.isFinite(s.value)).toBe(true);
    expect(Math.abs(s.value)).toBeLessThan(2);
  });
});

describe("generated CSS tokens", () => {
  const decls = (css: string, from: string) => {
    const body = css.slice(css.indexOf(from));
    return new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
  };
  const stock = decls(sutraCss, ":root {");
  const paper = decls(paperCss, '[data-style="paper"] {');
  const expectedMap = (lines: string[]) => new Map(lines.map((l) => /^(--[\w-]+):\s*(.*);$/.exec(l)!.slice(1, 3) as [string, string]));

  it("sutra.css holds exactly what the generator produces for lib/spring.ts", () => {
    for (const [name, value] of expectedMap(springBlock(springs))) expect(stock.get(name), name).toBe(value);
  });

  it("paper.css holds the calmer set and re-points the theme easings", () => {
    const want = expectedMap(springBlock(PAPER_SPRINGS, { themeEases: true }));
    expect([...want.keys()].filter((k) => k.startsWith("--ease-spring-"))).toHaveLength(3);
    for (const [name, value] of want) expect(paper.get(name), name).toBe(value);
    for (const n of ["gentle", "snappy", "bouncy"]) {
      expect(paper.get(`--sutra-spring-${n}`), n).not.toBe(stock.get(`--sutra-spring-${n}`));
      // calmer: a smaller overshoot, never a bigger one
      expect(peak((PAPER_SPRINGS as Record<string, SpringConfig>)[n]!)).toBeLessThanOrEqual(peak((springs as Record<string, SpringConfig>)[n]!) + 1e-9);
    }
  });

  it("every token has a -duration sibling and a theme easing that reads it", () => {
    for (const n of ["gentle", "snappy", "bouncy"]) {
      expect(stock.get(`--sutra-spring-${n}`), n).toMatch(/^linear\(0, .*, 1\)$/);
      expect(stock.get(`--sutra-spring-${n}-duration`), n).toMatch(/^\d+ms$/);
      expect(sutraCss).toContain(`--ease-spring-${n}: var(--sutra-spring-${n});`);
    }
    // the old overshoot bezier stays for animate-pop
    expect(stock.get("--sutra-ease-spring")).toMatch(/^cubic-bezier\(/);
  });

  it("the transition-spring utilities transition the individual transform properties on the tokens", () => {
    for (const [util, name] of [["transition-spring", "gentle"], ["transition-spring-snappy", "snappy"], ["transition-spring-bouncy", "bouncy"]] as const) {
      const at = sutraCss.indexOf(`@utility ${util} {`);
      expect(at, util).toBeGreaterThan(-1);
      const body = sutraCss.slice(at, sutraCss.indexOf("}", at));
      expect(body).toMatch(/transition-property:\s*transform,\s*translate,\s*scale,\s*rotate/);
      expect(body).toContain(`var(--sutra-spring-${name}-duration)`);
      expect(body).toContain(`var(--sutra-spring-${name})`);
    }
  });

  it("gen-springs.mjs --check passes (the blocks are not stale)", () => {
    const out = execFileSync(process.execPath, ["--no-warnings", path.join(ROOT, "scripts/gen-springs.mjs"), "--check"], { encoding: "utf8", stdio: "pipe" });
    expect(out).toBe("");
  });
});
