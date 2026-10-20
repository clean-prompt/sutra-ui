import { describe, expect, it } from "vitest";
import {
  assistantOrbLabels,
  assistantOrbStates,
  effectiveLevel,
  normalizeOrbState,
  orbParams,
  orbStillLevel,
  resolveOrbState,
  shouldRipple,
  smoothLevel,
  waveFrame,
  waveLayers,
  waveSpeed,
  waveY,
  type AssistantOrbState,
} from "../src/lib/orb";

describe("states", () => {
  it("lists the four states of the brief plus the error and muted looks, each with a label", () => {
    expect(assistantOrbStates.slice(0, 4)).toEqual(["idle", "listening", "thinking", "speaking"]);
    for (const s of assistantOrbStates) expect(assistantOrbLabels[s].length).toBeGreaterThan(8);
    expect(new Set(Object.values(assistantOrbLabels)).size).toBe(assistantOrbStates.length);
  });

  it("reads anything unknown as idle", () => {
    expect(normalizeOrbState("speaking")).toBe("speaking");
    expect(normalizeOrbState("dancing")).toBe("idle");
    expect(normalizeOrbState(undefined)).toBe("idle");
    expect(normalizeOrbState(null)).toBe("idle");
    expect(normalizeOrbState(3)).toBe("idle");
  });

  it("resolves flags by priority: error, speaking, thinking, listening, muted, idle", () => {
    expect(resolveOrbState({})).toBe("idle");
    expect(resolveOrbState({ muted: true })).toBe("muted");
    expect(resolveOrbState({ listening: true, muted: true })).toBe("listening");
    expect(resolveOrbState({ listening: true })).toBe("listening");
    expect(resolveOrbState({ listening: true, thinking: true })).toBe("thinking");
    expect(resolveOrbState({ listening: true, thinking: true, speaking: true })).toBe("speaking");
    expect(resolveOrbState({ speaking: true, error: true })).toBe("error");
    expect(resolveOrbState({ thinking: false, speaking: false, listening: false })).toBe("idle");
  });
});

describe("orbParams", () => {
  it("gives every state finite targets", () => {
    for (const s of assistantOrbStates) {
      for (const v of Object.values(orbParams(s))) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("makes each state recognisable by its numbers", () => {
    const p = Object.fromEntries(assistantOrbStates.map((s) => [s, orbParams(s)])) as Record<AssistantOrbState, ReturnType<typeof orbParams>>;
    // idle is quiet: the least saturated of the live states, no rings, ignores the level
    expect(p.idle.saturation).toBeLessThan(p.listening.saturation);
    expect(p.idle.ringRate).toBe(0);
    expect(p.idle.levelGain).toBe(0);
    // listening swells the most with the level
    expect(p.listening.swell).toBeGreaterThan(p.thinking.swell);
    expect(p.listening.levelGain).toBe(1);
    // thinking swirls fastest
    for (const s of ["idle", "listening", "speaking"] as const) expect(p.thinking.speed).toBeGreaterThan(p[s].speed);
    // speaking has expanding rings and the strongest glow
    expect(p.speaking.ringRate).toBeGreaterThan(0);
    expect(p.speaking.glow).toBeGreaterThan(p.listening.glow);
    // muted is grey and dark
    expect(p.muted.saturation).toBe(0);
    expect(p.muted.glow).toBe(0);
  });

  it("returns a copy, so a caller cannot change the table", () => {
    const a = orbParams("idle");
    a.scale = 99;
    expect(orbParams("idle").scale).not.toBe(99);
    expect(orbParams("nope" as AssistantOrbState)).toEqual(orbParams("idle"));
  });
});

describe("effectiveLevel and the still pose", () => {
  it("clamps, ignores NaN and applies the state's gain", () => {
    expect(effectiveLevel("listening", 0.4)).toBeCloseTo(0.4);
    expect(effectiveLevel("listening", 7)).toBe(1);
    expect(effectiveLevel("listening", -3)).toBe(0);
    expect(effectiveLevel("listening", Number.NaN)).toBe(0);
    expect(effectiveLevel("listening", undefined)).toBe(0);
    expect(effectiveLevel("idle", 1)).toBe(0);
    expect(effectiveLevel("thinking", 1)).toBeCloseTo(0.2);
  });

  it("has a different still level for listening, thinking and speaking, and none for the quiet states", () => {
    const levels = (["listening", "thinking", "speaking"] as const).map(orbStillLevel);
    expect(new Set(levels).size).toBe(3);
    for (const s of ["idle", "error", "muted"] as const) expect(orbStillLevel(s)).toBe(0);
  });
});

describe("smoothLevel", () => {
  it("rises faster than it falls", () => {
    const up = smoothLevel(0, 1, 0.05);
    const down = 1 - smoothLevel(1, 0, 0.05);
    expect(up).toBeGreaterThan(down * 2);
  });

  it("is frame-rate independent: two half steps equal one whole step", () => {
    const whole = smoothLevel(0.1, 0.9, 0.032);
    const half = smoothLevel(smoothLevel(0.1, 0.9, 0.016), 0.9, 0.016);
    expect(half).toBeCloseTo(whole, 10);
    const wholeDown = smoothLevel(0.9, 0.1, 0.1);
    const halfDown = smoothLevel(smoothLevel(0.9, 0.1, 0.05), 0.1, 0.05);
    expect(halfDown).toBeCloseTo(wholeDown, 10);
  });

  it("converges on the target and never overshoots", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) {
      v = smoothLevel(v, 0.6, 0.016);
      expect(v).toBeLessThanOrEqual(0.6 + 1e-12);
    }
    expect(v).toBeCloseTo(0.6, 3);
  });

  it("holds the value for a zero or negative step and survives bad input", () => {
    expect(smoothLevel(0.3, 1, 0)).toBe(0.3);
    expect(smoothLevel(0.3, 1, -1)).toBe(0.3);
    expect(smoothLevel(0.3, 1, Number.NaN)).toBe(0.3);
    expect(smoothLevel(Number.NaN, 0.5, 1)).toBeGreaterThanOrEqual(0);
    expect(smoothLevel(0.5, Number.NaN, 1)).toBeLessThan(0.5);
    expect(smoothLevel(5, 5, 1)).toBe(1);
    expect(smoothLevel(-5, -5, 1)).toBe(0);
  });

  it("jumps with a zero time constant", () => {
    expect(smoothLevel(0, 0.8, 0.016, 0)).toBe(0.8);
    expect(smoothLevel(0.8, 0, 0.016, 0.05, 0)).toBe(0);
  });
});

describe("shouldRipple", () => {
  it("needs a loud level and a gap since the last ripple", () => {
    expect(shouldRipple(0.7, 1000)).toBe(true);
    expect(shouldRipple(0.3, 1000)).toBe(false);
    expect(shouldRipple(0.7, 100)).toBe(false);
    expect(shouldRipple(Number.NaN, 1000)).toBe(false);
    expect(shouldRipple(0.4, 1000, 0.4, 500)).toBe(true);
  });
});

describe("waveLayers", () => {
  it("defaults to five layers and clamps the count to 1..8", () => {
    expect(waveLayers()).toHaveLength(5);
    expect(waveLayers(0)).toHaveLength(1);
    expect(waveLayers(99)).toHaveLength(8);
    expect(waveLayers(Number.NaN)).toHaveLength(5);
    expect(waveLayers(4)).toHaveLength(4);
    expect(waveLayers(6)).toHaveLength(6);
  });

  it("gives every layer its own frequency, speed and phase, and is deterministic", () => {
    const layers = waveLayers(6);
    expect(new Set(layers.map((l) => l.frequency)).size).toBe(6);
    expect(new Set(layers.map((l) => l.speed)).size).toBe(6);
    expect(new Set(layers.map((l) => l.phase)).size).toBe(6);
    expect(waveLayers(6)).toEqual(layers);
    expect(layers.some((l) => l.speed < 0) && layers.some((l) => l.speed > 0)).toBe(true);
  });

  it("makes the first layer the tallest and the boldest, and keeps every number in range", () => {
    for (const n of [1, 4, 5, 8]) {
      const layers = waveLayers(n);
      expect(layers[0]!.amplitude).toBe(1);
      for (const l of layers) {
        expect(l.amplitude).toBeGreaterThan(0.2);
        expect(l.amplitude).toBeLessThanOrEqual(1);
        expect(l.opacity).toBeGreaterThan(0);
        expect(l.opacity).toBeLessThanOrEqual(1);
        expect(l.width).toBeGreaterThanOrEqual(1);
        expect(l.amplitude).toBeLessThanOrEqual(layers[0]!.amplitude);
        expect(l.width).toBeLessThanOrEqual(layers[0]!.width);
      }
    }
  });
});

describe("waveY", () => {
  const layers = waveLayers(5);

  it("pinches to zero at both ends", () => {
    for (const l of layers) {
      expect(waveY(0, 1.3, l, 1)).toBeCloseTo(0, 10);
      expect(waveY(1, 1.3, l, 1)).toBeCloseTo(0, 10);
    }
  });

  it("stays within -1..1 across x, time and amplitude", () => {
    for (const l of layers) {
      for (let x = 0; x <= 1; x += 0.05) {
        for (const t of [0, 0.7, 3.1, 40]) {
          const y = waveY(x, t, l, 1);
          expect(y).toBeGreaterThanOrEqual(-1);
          expect(y).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("scales linearly with the amplitude and is flat at zero", () => {
    const l = layers[0]!;
    const full = waveY(0.4, 0.5, l, 1);
    expect(full).not.toBe(0);
    expect(waveY(0.4, 0.5, l, 0.5)).toBeCloseTo(full / 2, 10);
    expect(waveY(0.4, 0.5, l, 0)).toBe(0);
    expect(waveY(0.4, 0.5, l, 5)).toBeCloseTo(full, 10); // amplitude is clamped to 1
    expect(waveY(0.4, 0.5, l, -1)).toBe(0);
  });

  it("moves with time and differs between layers", () => {
    const a = layers.map((l) => waveY(0.45, 0, l, 1));
    const b = layers.map((l) => waveY(0.45, 0.6, l, 1));
    expect(a).not.toEqual(b);
    expect(new Set(a.map((v) => v.toFixed(4))).size).toBeGreaterThan(1);
  });

  it("concentrates the energy at a pulse", () => {
    const energy = (pulse: { center: number; width: number } | null, from: number, to: number) => {
      let sum = 0;
      for (let x = from; x <= to; x += 0.01) for (const l of layers) sum += Math.abs(waveY(x, 0.3, l, 1, pulse));
      return sum;
    };
    const pulse = { center: 0.3, width: 0.08 };
    const near = energy(pulse, 0.2, 0.4) / energy(null, 0.2, 0.4);
    const far = energy(pulse, 0.6, 0.8) / energy(null, 0.6, 0.8);
    expect(near).toBeGreaterThan(0.8);
    expect(far).toBeLessThan(0.3);
  });

  it("never returns NaN for bad input", () => {
    const l = layers[0]!;
    for (const v of [waveY(Number.NaN, 1, l, 1), waveY(0.5, Number.NaN, l, 1), waveY(0.5, 1, l, Number.NaN), waveY(-4, 1, l, 1), waveY(9, 1, l, 1)]) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });
});

describe("waveFrame", () => {
  it("makes idle a nearly flat line that breathes", () => {
    const amps = [0, 1, 2, 3, 4].map((t) => waveFrame("idle", 0, t).amplitude);
    expect(Math.max(...amps)).toBeLessThan(0.07);
    expect(Math.max(...amps)).toBeGreaterThan(Math.min(...amps));
    expect(waveFrame("idle", 1, 0).amplitude).toBe(waveFrame("idle", 0, 0).amplitude); // idle ignores the level
    expect(waveFrame("idle", 0, 0).pulse).toBeNull();
  });

  it("makes listening follow the level", () => {
    const at = (l: number) => waveFrame("listening", l, 0).amplitude;
    expect(at(0)).toBeLessThan(at(0.25));
    expect(at(0.25)).toBeLessThan(at(0.5));
    expect(at(0.5)).toBeLessThan(at(1));
    expect(at(1)).toBeLessThanOrEqual(1);
    expect(at(0)).toBeGreaterThan(0);
  });

  it("makes speaking tall and modulated by the level", () => {
    for (const t of [0, 0.3, 0.9]) {
      expect(waveFrame("speaking", 0, t).amplitude).toBeGreaterThan(waveFrame("idle", 0, t).amplitude * 4);
      expect(waveFrame("speaking", 1, t).amplitude).toBeGreaterThan(waveFrame("speaking", 0, t).amplitude);
      expect(waveFrame("speaking", 1, t).amplitude).toBeLessThanOrEqual(1);
    }
  });

  it("sends a travelling pulse across the width while thinking", () => {
    const centers = [0, 0.4, 0.8, 1.2, 1.6].map((t) => waveFrame("thinking", 0, t).pulse!.center);
    expect(centers.every((c) => c !== undefined)).toBe(true);
    for (let i = 1; i < centers.length; i++) expect(centers[i]!).toBeGreaterThan(centers[i - 1]!);
    expect(centers[0]!).toBeLessThan(0.1);
    expect(centers[4]!).toBeGreaterThan(0.8);
    // it starts again after a sweep
    expect(waveFrame("thinking", 0, 1.95).pulse!.center).toBeLessThan(0.1);
    expect(waveFrame("thinking", 0, 0).pulse!.width).toBeGreaterThan(0);
  });

  it("keeps error and muted flat and has no pulse outside thinking", () => {
    expect(waveFrame("error", 1, 0).amplitude).toBeLessThan(0.05);
    expect(waveFrame("muted", 1, 0).amplitude).toBeLessThan(waveFrame("error", 1, 0).amplitude);
    for (const s of assistantOrbStates) if (s !== "thinking") expect(waveFrame(s, 0.5, 1).pulse).toBeNull();
  });

  it("returns amplitudes within 0..1 for every state, level and time", () => {
    for (const s of assistantOrbStates) {
      for (const l of [0, 0.3, 1, 5, Number.NaN]) {
        for (const t of [0, 1.1, 77, Number.NaN]) {
          const { amplitude } = waveFrame(s, l, t);
          expect(amplitude).toBeGreaterThanOrEqual(0);
          expect(amplitude).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("travels faster while thinking and not at all when muted", () => {
    expect(waveSpeed("thinking")).toBeGreaterThan(waveSpeed("speaking"));
    expect(waveSpeed("speaking")).toBeGreaterThan(waveSpeed("listening"));
    expect(waveSpeed("listening")).toBeGreaterThan(waveSpeed("idle"));
    expect(waveSpeed("muted")).toBe(0);
  });
});
