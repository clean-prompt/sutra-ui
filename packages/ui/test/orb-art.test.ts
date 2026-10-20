import { describe, expect, it } from "vitest";
import {
  HALFTONE_DOT,
  HALFTONE_HUB,
  INK_REACH,
  INK_THRESHOLD,
  beadProportions,
  catmullRom,
  graphCount,
  graphLinked,
  graphWalker,
  halftonePitch,
  halftoneRings,
  hash01,
  inkField,
  inkFieldAt,
  inkScene,
  malaAngle,
  malaCount,
  malaPose,
  orbGraph,
  ringsLayout,
  traceIso,
  type IsoSink,
} from "../src/lib/orb-art-internal";
import {
  ORB_STRING_SQUARE_BELOW,
  assistantOrbVariantLabels,
  assistantOrbVariants,
  defaultOrbSize,
  isOrbArtVariant,
  normalizeOrbVariant,
  orbStringForm,
} from "../src/lib/orb";

const TAU = Math.PI * 2;
const flat = (v: number) => () => v;

describe("orb variants", () => {
  it("lists the looks in picker order with a name for each", () => {
    expect(assistantOrbVariants).toEqual(["orb", "waveform", "mala", "string", "ink", "rings", "graph", "halftone"]);
    for (const v of assistantOrbVariants) expect(assistantOrbVariantLabels[v]).toMatch(/\w/);
    expect(new Set(Object.values(assistantOrbVariantLabels)).size).toBe(assistantOrbVariants.length);
  });

  it("reads an unknown variant as the orb and knows which looks are drawn on a canvas", () => {
    expect(normalizeOrbVariant("sparkle")).toBe("orb");
    expect(normalizeOrbVariant(undefined)).toBe("orb");
    expect(normalizeOrbVariant("mala")).toBe("mala");
    expect(assistantOrbVariants.filter(isOrbArtVariant)).toEqual(["mala", "string", "ink", "rings", "graph", "halftone"]);
  });

  it("defaults round looks to 128 px and bars to 64 px, and gives the string a square below 48 px", () => {
    expect(defaultOrbSize("orb")).toBe(128);
    expect(defaultOrbSize("halftone")).toBe(128);
    expect(defaultOrbSize("waveform")).toBe(64);
    expect(defaultOrbSize("string")).toBe(64);
    expect(ORB_STRING_SQUARE_BELOW).toBe(48);
    expect(orbStringForm(96, 32)).toBe("bar");
    expect(orbStringForm(57.6, 32)).toBe("bar");
    expect(orbStringForm(40, 32)).toBe("square");
    expect(orbStringForm(32, 32)).toBe("square");
    expect(orbStringForm(10, 0)).toBe("square");
  });
});

describe("hash01 and helpers", () => {
  it("is stable, in [0, 1) and spread out", () => {
    expect(hash01(3, 7)).toBe(hash01(3, 7));
    const values = Array.from({ length: 200 }, (_, i) => hash01(i, 11));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
    expect(hash01(3, 7)).not.toBe(hash01(3, 8));
  });

  it("interpolates through its middle points (Catmull-Rom)", () => {
    expect(catmullRom(0, 1, 2, 3, 0)).toBe(1);
    expect(catmullRom(0, 1, 2, 3, 1)).toBe(2);
    expect(catmullRom(0, 1, 2, 3, 0.5)).toBeCloseTo(1.5);
  });

  it("keeps the brand mark's proportions for a ring bead", () => {
    const p = beadProportions(19);
    expect(p.inner).toBeCloseTo(8);
    expect(p.thread).toBeCloseTo(4.4);
    expect(p.gap).toBeCloseTo(2.4);
  });
});

describe("mala", () => {
  it("has 8 larger beads below 64 px and 12 from 64 px", () => {
    expect(malaCount(32)).toBe(8);
    expect(malaCount(63)).toBe(8);
    expect(malaCount(64)).toBe(12);
    expect(malaCount(240)).toBe(12);
  });

  it("puts the head bead at the top with more room on both sides than between the others", () => {
    for (const n of [8, 12]) {
      expect(malaAngle(0, n)).toBeCloseTo(-Math.PI / 2);
      const head = malaAngle(1, n) - malaAngle(0, n);
      const other = malaAngle(3, n) - malaAngle(2, n);
      expect(head).toBeGreaterThan(other);
      expect(malaAngle(n, n) - malaAngle(n - 1, n)).toBeCloseTo(head);
      for (let u = 0; u < n; u += 0.25) expect(malaAngle(u + 0.25, n)).toBeGreaterThan(malaAngle(u, n));
      expect(malaAngle(n, n) - malaAngle(0, n)).toBeCloseTo(TAU);
    }
  });

  it("is a calm ring at rest and an equaliser while listening", () => {
    const quiet = malaPose("listening", 1.3, flat(0), 12);
    expect(Math.max(...quiet.offset)).toBe(0);
    expect(new Set(quiet.scale)).toEqual(new Set([1]));
    const loud = malaPose("listening", 1.3, flat(1), 12);
    expect(Math.max(...loud.offset)).toBeGreaterThan(0.05);
    expect(Math.max(...loud.offset)).toBeLessThanOrEqual(0.13);
    expect(new Set(loud.offset.map((o) => o.toFixed(3))).size).toBeGreaterThan(4);
  });

  it("counts one bead at a time while thinking: one big bead, the others small", () => {
    const pose = malaPose("thinking", 3 * 0.36, flat(0), 12);
    expect(pose.scale[3]).toBeCloseTo(1.6);
    const others = pose.scale.filter((_, i) => i !== 3 && i !== 0);
    expect(Math.max(...others)).toBeLessThan(0.6);
  });

  it("swells the head bead with the level while speaking, and leaves hollow-sized beads when muted", () => {
    expect(malaPose("speaking", 0.66, flat(0.5), 12).scale[0]).toBeCloseTo(1.1);
    expect(malaPose("muted", 0, flat(1), 12).scale.slice(1)).toEqual(new Array(11).fill(0.92));
  });

  it("runs the travel the other way round in right-to-left", () => {
    const ltr = malaPose("idle", 2.2, flat(0), 12, 1);
    const rtl = malaPose("idle", 2.2, flat(0), 12, -1);
    for (let i = 1; i < 12; i++) expect(rtl.scale[i]).toBeCloseTo(ltr.scale[12 - i]!);
    const a = malaPose("thinking", 3 * 0.36, flat(0), 12, -1);
    expect(a.scale[9]).toBeCloseTo(1.6);
  });
});

describe("rings", () => {
  it("draws three loops from 120 px and two below, with a line that grows with the size", () => {
    expect(ringsLayout(240).radii).toHaveLength(3);
    expect(ringsLayout(119).radii).toHaveLength(2);
    expect(ringsLayout(32).line).toBe(2);
    expect(ringsLayout(240).line).toBe(7);
    expect(ringsLayout(160).line).toBeGreaterThan(ringsLayout(96).line);
    for (const size of [32, 96, 240]) expect(Math.max(...ringsLayout(size).radii)).toBeLessThan(0.45);
  });
});

describe("graph", () => {
  it("puts its points on the unit sphere and builds the same sparse, connected-enough graph every time", () => {
    for (const n of [26, 46, 72]) {
      const g = orbGraph(n);
      expect(orbGraph(n)).toBe(g);
      expect(g.points).toHaveLength(n);
      for (const p of g.points) expect(Math.hypot(p[0], p[1], p[2])).toBeCloseTo(1);
      g.adjacency.forEach((nb, i) => {
        expect(nb.length).toBeGreaterThan(0);
        for (const j of nb) expect(g.adjacency[j]).toContain(i);
      });
      expect(new Set(g.edges.map(([a, b]) => `${a}-${b}`)).size).toBe(g.edges.length);
      expect(g.edges.length).toBeLessThan(2 * n);
      expect(new Set(g.spokes).size).toBe(5);
      for (const s of g.spokes) expect(s).toBeLessThan(n);
    }
    expect(graphCount(32)).toBe(26);
    expect(graphCount(64)).toBe(46);
    expect(graphCount(240)).toBe(72);
  });

  it("sends thinking signals out from the hub along links, one hop at a time", () => {
    const g = orbGraph(46);
    const hub = g.points.length;
    for (let walker = 0; walker < 3; walker++) {
      expect(graphWalker(g, walker, 0, true)).toBe(hub);
      expect(graphWalker(g, walker, 9, true)).toBe(hub);
      expect(g.spokes).toContain(graphWalker(g, walker, 1, true));
      for (let h = 0; h < 8; h++) expect(graphLinked(g, graphWalker(g, walker, h, true), graphWalker(g, walker, h + 1, true))).toBe(true);
      for (let h = 0; h < 30; h++) expect(graphWalker(g, walker, h, false)).toBeLessThan(hub);
    }
    expect(graphLinked(g, hub, g.spokes[0]!)).toBe(true);
    expect(graphLinked(g, g.spokes[0]!, hub)).toBe(true);
  });
});

describe("halftone", () => {
  it("uses a coarser screen on small spheres", () => {
    expect(halftonePitch(240) / 240).toBeLessThan(halftonePitch(32) / 32);
    expect(halftonePitch(32)).toBeGreaterThanOrEqual(4.6);
  });

  it("never cuts a dot at the edge and leaves room for a bigger centre dot", () => {
    for (const size of [32, 48, 96, 160, 240]) {
      const pitch = halftonePitch(size);
      const radius = 0.43 * size;
      const rings = halftoneRings(radius, pitch);
      expect(rings.length).toBeGreaterThan(0);
      for (const ring of rings) expect(ring.radius + HALFTONE_DOT * pitch).toBeLessThanOrEqual(radius);
      const inner = Math.min(...rings.map((r) => r.radius));
      expect(inner - HALFTONE_DOT * pitch).toBeGreaterThanOrEqual(HALFTONE_HUB * pitch);
      expect(HALFTONE_HUB).toBeGreaterThan(HALFTONE_DOT);
      for (const ring of rings) expect((TAU * ring.radius) / ring.count).toBeGreaterThan(0.7 * pitch);
    }
  });
});

describe("ink", () => {
  it("puts the edge of a lone ball at its radius", () => {
    const scene = { radius: 0, harmonics: [], drops: [[0, 0, 10]] as [number, number, number][] };
    expect(inkFieldAt(scene, 10, 0)).toBeCloseTo(INK_THRESHOLD);
    expect(inkFieldAt(scene, 9, 0)).toBeGreaterThan(INK_THRESHOLD);
    expect(inkFieldAt(scene, INK_REACH * 10 + 0.1, 0)).toBe(0);
  });

  it("has a different shape per state", () => {
    const listening = inkScene("listening", 1.3, flat(0.8), [], 100);
    expect(listening.harmonics.some(([h, a]) => h >= 6 && a > 0.02)).toBe(true);
    const quiet = inkScene("listening", 1.3, flat(0), [], 100);
    expect(quiet.harmonics.filter(([h]) => h >= 6).every(([, a]) => a === 0)).toBe(true);
    const split = inkScene("thinking", 1.8, flat(0), [], 100);
    expect(split.radius).toBe(0);
    expect(split.drops).toHaveLength(3);
    const d = split.drops.map(([x, y]) => Math.hypot(x, y));
    expect(Math.max(...d) - Math.min(...d)).toBeLessThan(1e-6);
    const merged = inkScene("thinking", 0, flat(0), [], 100);
    expect(merged.radius).toBeCloseTo(29);
    expect(inkScene("speaking", 0.9, flat(0.8), [{ age: 0.2, id: 4 }], 100).drops.length).toBeGreaterThan(0);
    expect(inkScene("speaking", 0.9, flat(0.8), [], 100).drops).toHaveLength(0);
    expect(inkScene("error", 0, flat(0), [], 100).drops).toHaveLength(5);
  });

  it("traces the filled region of the field (area of a disc, nothing for an empty field)", () => {
    const g = 60;
    const cell = 2;
    const field = new Float32Array((g + 1) * (g + 1));
    inkField(field, g, cell, -60, -60, { radius: 0, harmonics: [], drops: [[0, 0, 25]] });
    let area = 0;
    let pts: [number, number][] = [];
    const flush = () => {
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[(i + 1) % pts.length]!;
        area += x0 * y1 - x1 * y0;
      }
      pts = [];
    };
    const sink: IsoSink = {
      moveTo: (x, y) => {
        flush();
        pts.push([x, y]);
      },
      lineTo: (x, y) => {
        pts.push([x, y]);
      },
      closePath: () => flush(),
      rect: (x, y, w, h) => {
        flush();
        area += 2 * w * h;
      },
    };
    traceIso(field, g, cell, -60, -60, INK_THRESHOLD, sink);
    flush();
    expect(area / 2).toBeGreaterThan(Math.PI * 25 * 25 * 0.97);
    expect(area / 2).toBeLessThan(Math.PI * 25 * 25 * 1.03);
    let calls = 0;
    const counter: IsoSink = { moveTo: () => calls++, lineTo: () => calls++, closePath: () => calls++, rect: () => calls++ };
    traceIso(new Float32Array((g + 1) * (g + 1)), g, cell, 0, 0, INK_THRESHOLD, counter);
    expect(calls).toBe(0);
  });
});
