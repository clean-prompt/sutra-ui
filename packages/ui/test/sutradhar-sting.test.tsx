/**
 * SutradharSting: the mark and astra stings with the crescent mark. The lockup is the markup (server, reduced motion, before a
 * play); a play runs on the shared frame driver, ends on the lockup and calls onComplete once; the astra's aim is clamped. The
 * astra's energy (ink lightning round the bead) builds, bursts and holds still on the lockup, repeats exactly for the same
 * moment and never reaches the face. The endless astra streams on a wide stage, reports once its stream runs and never settles.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SutradharSting } from "../src/assets/sutradhar-sting";
import { activeFrameCount } from "../src/assets/mascot-driver-internal";
import { ASTRA_STING, MARK_STING, astraEndlessFrame, astraFrame, astraStage, astraView, markFrame } from "../src/assets/sutradhar-sting-internal";
import { FIG } from "../src/assets/mascot-sutradhar-internal";
import { nodesToMarkup, type FNode } from "../src/assets/mascot-kit-internal";
import { axeViolations } from "./helpers/a11y";

const svgOf = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;
const art = (container: HTMLElement) => container.querySelector('[data-part="art"]') as SVGGElement;
const strip = (s: string) => s.replace(/id="[^"]*"|url\(#[^)]*\)/g, "");

function withReducedMotion(fn: () => void) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("reduce") })) as typeof window.matchMedia;
  try {
    fn();
  } finally {
    window.matchMedia = original;
  }
}

afterEach(() => vi.restoreAllMocks());

describe("SutradharSting", () => {
  it("draws the mark and the astra in their own boxes, sized by height", () => {
    const { container, rerender } = render(<SutradharSting size={160} autoPlay={false} />);
    let svg = svgOf(container);
    expect(svg).toHaveAttribute("data-slot", "sutradhar-sting");
    expect(svg).toHaveAttribute("data-variant", "mark");
    expect(svg).toHaveAttribute("viewBox", "0 0 96 80");
    expect(svg).toHaveAttribute("height", "160");
    expect(svg).toHaveAttribute("width", "192");
    rerender(<SutradharSting variant="astra" size={104} autoPlay={false} />);
    svg = svgOf(container);
    expect(svg).toHaveAttribute("viewBox", "0 0 128 104");
    expect(svg).toHaveAttribute("width", "128");
    expect(art(container).querySelectorAll("[data-k]").length).toBeGreaterThan(20);
    rerender(<SutradharSting variant="astra-endless" size={104} autoPlay={false} />);
    svg = svgOf(container);
    expect(svg).toHaveAttribute("data-variant", "astra-endless");
    expect(svg).toHaveAttribute("viewBox", "0 0 256 104");
    expect(svg).toHaveAttribute("width", "256");
  });

  it("is decorative unless titled", async () => {
    const { container, rerender } = render(<SutradharSting autoPlay={false} />);
    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true");
    rerender(<SutradharSting autoPlay={false} title="Sutradhar plants the Sutra mark" />);
    expect(svgOf(container)).toHaveAttribute("role", "img");
    expect(svgOf(container).querySelector("title")).toHaveTextContent("Sutradhar plants the Sutra mark");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("clamps the aim to 30 to 330 degrees", () => {
    const look = (aim: number) => {
      const { container, unmount } = render(<SutradharSting variant="astra" aim={aim} autoPlay={false} />);
      const s = strip(art(container).innerHTML);
      unmount();
      return s;
    };
    expect(look(10)).toBe(look(30));
    expect(look(350)).toBe(look(330));
    expect(look(150)).not.toBe(look(135));
    expect(look(270)).not.toBe(look(90));
  });

  it("clamps the endless astra's aim to 30 to 330 and aims at 172 when it is left out", () => {
    const look = (aim?: number) => {
      const { container, unmount } = render(<SutradharSting variant="astra-endless" aim={aim} autoPlay={false} />);
      const s = strip(art(container).innerHTML);
      unmount();
      return s;
    };
    expect(look(10)).toBe(look(30));
    expect(look(350)).toBe(look(330));
    expect(look()).toBe(look(172));
    expect(look(172)).not.toBe(look(165));
  });

  it("the endless astra keeps streaming: it reports once at full length and never settles", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      const done = vi.fn();
      const { container } = render(<SutradharSting variant="astra-endless" loop onComplete={done} />);
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(done).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      expect(done).toHaveBeenCalledTimes(1);
      const at = strip(art(container).innerHTML);
      await act(async () => {
        vi.advanceTimersByTime(20000);
      });
      expect(done).toHaveBeenCalledTimes(1);
      expect(svgOf(container)).toHaveAttribute("data-playing");
      expect(activeFrameCount()).toBe(1);
      expect(strip(art(container).innerHTML)).not.toBe(at);
    } finally {
      vi.useRealTimers();
    }
  });

  it("under reduced motion the endless astra shows its still stream and completes at once", () => {
    withReducedMotion(() => {
      const raf = vi.spyOn(window, "requestAnimationFrame");
      const done = vi.fn();
      const { container, unmount } = render(<SutradharSting variant="astra-endless" onComplete={done} />);
      expect(raf).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledTimes(1);
      expect(svgOf(container)).not.toHaveAttribute("data-playing");
      unmount();
    });
  });

  it("under reduced motion shows only the lockup, requests no frame and completes at once", () => {
    withReducedMotion(() => {
      const raf = vi.spyOn(window, "requestAnimationFrame");
      const done = vi.fn();
      const { unmount } = render(<SutradharSting onComplete={done} />);
      expect(raf).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledTimes(1);
      unmount();
    });
  });

  it("autoPlay false waits on the lockup; a new replayKey plays it", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const { rerender, container } = render(<SutradharSting autoPlay={false} />);
    expect(raf).not.toHaveBeenCalled();
    expect(svgOf(container)).not.toHaveAttribute("data-playing");
    rerender(<SutradharSting autoPlay={false} replayKey={1} />);
    expect(svgOf(container)).toHaveAttribute("data-playing");
    expect(activeFrameCount()).toBe(1);
  });

  it("plays to the lockup, calls onComplete once and leaves the frame", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      const done = vi.fn();
      const { container } = render(<SutradharSting onComplete={done} />);
      expect(svgOf(container)).toHaveAttribute("data-playing");
      const lockup = strip(art(container).innerHTML);
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(strip(art(container).innerHTML)).not.toBe(lockup);
      await act(async () => {
        vi.advanceTimersByTime(6000);
      });
      expect(done).toHaveBeenCalledTimes(1);
      expect(svgOf(container)).not.toHaveAttribute("data-playing");
      expect(activeFrameCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ends a play on its lockup without a jump: the lockup is the last frame", () => {
    const at = (frame: typeof markFrame, tt: number, still: boolean, aim = 150) => nodesToMarkup(frame({ tt, still, size: 160, ink: "#111", aim }), "u");
    expect(at(markFrame, 99, true)).toBe(at(markFrame, MARK_STING.len, false));
    for (const aim of [150, 30, 270]) expect(at(astraFrame, 99, true, aim), `aim ${aim}`).toBe(at(astraFrame, ASTRA_STING.len, false, aim));
  });

  it("a loop fades out over its hold and back in, instead of cutting to the start", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      const { container } = render(<SutradharSting variant="mark" loop />);
      const opacity = () => Number(art(container).getAttribute("opacity") ?? 1);
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(opacity()).toBe(1); /* the first play starts at full strength */
      const cycle = (MARK_STING.len + 1.6) * 1000;
      await act(async () => {
        vi.advanceTimersByTime(cycle - 500 - 100);
      });
      expect(opacity()).toBeLessThan(0.5); /* fading out at the end of the hold */
      await act(async () => {
        vi.advanceTimersByTime(150);
      });
      expect(opacity()).toBeLessThan(0.5); /* and back in from the start of the next play */
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(opacity()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("loops without completing", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      const done = vi.fn();
      const { container } = render(<SutradharSting variant="astra" loop onComplete={done} />);
      await act(async () => {
        vi.advanceTimersByTime(14000);
      });
      expect(done).not.toHaveBeenCalled();
      expect(svgOf(container)).toHaveAttribute("data-playing");
    } finally {
      vi.useRealTimers();
    }
  });
});

/** Every key in a frame's node tree, in order. */
const keysOf = (nodes: FNode[], out: string[] = []) => {
  for (const [, key, , kids] of nodes) {
    out.push(key);
    if (kids) keysOf(kids, out);
  }
  return out;
};
const find = (nodes: FNode[], key: string): FNode | undefined => {
  for (const n of nodes) {
    const hit = n[1] === key ? n : n[3] && find(n[3], key);
    if (hit) return hit;
  }
  return undefined;
};
/** A frame's scene, unwrapped from the group that frames it on the stage (mirrored, pulled back, or on the wide stage). */
const scene = (nodes: FNode[]) => (nodes.length === 1 && nodes[0][1] === "stage" ? nodes[0][3]! : nodes);
const astra = (tt: number, aim = 150) => scene(astraFrame({ tt, still: tt === 99, size: 160, ink: "#111", aim }));
/** The endless astra's frame, unwrapped from the group that places its scene on the wide stage. */
const endless = (tt: number, aim = 172) => {
  const nodes = astraEndlessFrame({ tt, still: tt === 99, size: 160, ink: "#111", aim });
  expect(nodes).toHaveLength(1);
  expect(nodes[0][1]).toBe("stage");
  return nodes[0][3]!;
};
/** The energy a frame shows: halo washes (eh), rim filaments (er), sparks (es), bolts (eb) and their forks (ef). */
const energyOf = (nodes: FNode[]) => nodes.filter(([, k, a]) => /^e[hrsbf]\d$/.test(k) && Number(a.opacity) > 0 && a.d !== "M0 0");
const pointsOf = (d: string) => {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
};

describe("the astra's energy", () => {
  it("builds with the charge, bursts into bolts as it fires and keeps a still crackle on the lockup", () => {
    expect(energyOf(astra(1.5))).toEqual([]);
    const charge = energyOf(astra(2.6)).map(([, k]) => k);
    expect(charge).toEqual(expect.arrayContaining(["eh0", "eh1", "er0", "er1"]));
    const burst = energyOf(astra(3.1)).map(([, k]) => k);
    expect(burst.filter((k) => k.startsWith("eb")).length).toBeGreaterThanOrEqual(5);
    const lockup = energyOf(astra(99)).map(([, k]) => k);
    expect(lockup).toEqual(expect.arrayContaining(["eh0", "eh1", "er0", "er1"]));
    expect(lockup.filter((k) => k.startsWith("eb")).length).toBeLessThanOrEqual(1);
  });

  it("crackles: the same moment draws the same lightning, the next tick a new one", () => {
    const at = (tt: number) => JSON.stringify(energyOf(astra(tt)));
    expect(at(3)).toBe(at(3));
    expect(at(3)).not.toBe(at(3.06));
    expect(at(99)).toBe(at(99));
  });

  it("keeps its lightning off the face at every aim", () => {
    for (const [frame, aims] of [[astra, [30, 60, 90, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330]], [endless, [30, 90, 172, 210, 270, 330]]] as const)
      for (const aim of aims)
        for (const tt of [2.2, 2.45, 2.62, 2.8, 2.95, 3.1, 3.3, 3.8, 4.6, 99]) {
          const nodes = frame(tt, aim);
          const head = find(nodes, "head")![2];
          for (const [, k, a] of energyOf(nodes)) {
            if (!a.d) continue; /* the halo washes sit behind the figure */
            for (const [x, y] of pointsOf(String(a.d)))
              expect(Math.hypot(x - Number(head.cx), y - Number(head.cy)), `${k} at ${tt} s, aim ${aim}`).toBeGreaterThan(FIG.hr + 0.5);
          }
        }
  });

  it("keys every element of every frame once, so the frame driver patches the right one", () => {
    for (const [name, frame] of [["mark", markFrame], ["astra", astraFrame], ["astra-endless", astraEndlessFrame]] as const)
      for (const tt of [0.3, 1.3, 2.2, 2.6, 2.95, 3.1, 3.4, 4.2, 5.3, 12.7, 99]) {
        const keys = keysOf(frame({ tt, still: tt === 99, size: 160, ink: "#111", aim: 150 }));
        expect(keys.filter((k, i) => keys.indexOf(k) !== i), `${name} at ${tt} s`).toEqual([]);
      }
  });
});

describe("the endless astra's stream", () => {
  const xs = (d: string) => pointsOf(d).map(([x]) => x);
  it("streams its wave across the whole stage and thins it away at the far end", () => {
    for (const tt of [6, 9.5, 31, 99]) {
      const wave = endless(tt).find(([, k]) => k === "wv0")![2];
      const x = xs(String(wave.d));
      /* the scene is drawn 128 to the left of the stage: its left edge is at -128 */
      expect(Math.min(...x), `at ${tt} s`).toBeLessThan(-100);
      expect(Math.max(...x) - Math.min(...x), `at ${tt} s`).toBeGreaterThan(170);
    }
    const plain = astra(99).find(([, k]) => k === "wv0")![2];
    const lengthOf = (d: string) => Math.max(...xs(d)) - Math.min(...xs(d));
    expect(lengthOf(String(endless(99).find(([, k]) => k === "wv0")![2].d))).toBeGreaterThan(3 * lengthOf(String(plain.d)));
  });

  it("keeps the energy at full strength, with lightning and beads flowing out along the wave", () => {
    for (const tt of [8, 19.3, 44.1, 99]) {
      const nodes = endless(tt);
      const shown = energyOf(nodes).map(([, k]) => k);
      expect(shown.filter((k) => k.startsWith("eb")).length, `bolts at ${tt} s`).toBeGreaterThanOrEqual(3);
      const flowing = nodes.filter(([, k, a]) => /^(rb|bd)\d$/.test(k) && Number(a.opacity) > 0.2);
      expect(flowing.length, `flow at ${tt} s`).toBeGreaterThanOrEqual(3);
      expect(Number(nodes.find(([, k]) => k === "glow")![2].opacity)).toBeGreaterThan(0);
    }
    /* before it fires, nothing flows */
    expect(endless(2.5).filter(([, k, a]) => /^(rb|bd)\d$|^glow$/.test(k) && Number(a.opacity) > 0)).toEqual([]);
  });
});

describe("the astra's aim, 30 to 330 degrees", () => {
  /* where a point of the scene lands on the stage, by the view (camera about his feet, then mirrored for a right-hand aim) */
  const onStage = (v: ReturnType<typeof astraView>, [x, y]: [number, number]): [number, number] => {
    const X = v.anchor[0] + v.scale * (x - v.anchor[0]) - v.left, Y = v.anchor[1] + v.scale * (y - v.anchor[1]) - v.lift;
    return [v.mirror ? v.width - X : X, Y];
  };

  it("keeps the aims the stage already fits exactly as they were", () => {
    for (const aim of [150, 165, 180]) {
      const v = astraView(aim, false);
      expect([v.mirror, v.scale, v.lift, v.transform], `aim ${aim}`).toEqual([false, 1, 0, ""]);
      expect(astraFrame({ tt: 99, still: true, size: 160, ink: "#111", aim })[0][1]).not.toBe("stage");
    }
  });

  it("turns round for an aim to the right, as the mirror image of the matching aim to the left", () => {
    expect(astraView(30, false)).toMatchObject({ aim: 150, mirror: true });
    expect(astraView(330, false)).toMatchObject({ aim: 210, mirror: true });
    expect(astraView(90, false).mirror).toBe(false);
    const stage = astraFrame({ tt: 99, still: true, size: 160, ink: "#111", aim: 30 })[0];
    expect(stage[1]).toBe("stage");
    expect(String(stage[2].transform)).toMatch(/^translate\(128 0\) scale\(-1 1\)/);
  });

  it("pulls the view back for a steep aim so the whole wave stays on the stage", () => {
    for (const [endlessToo, aims] of [[false, [60, 90, 120, 210, 240, 270, 300]], [true, [90, 135, 270]]] as const)
      for (const aim of aims) {
        const v = astraView(aim, endlessToo);
        const frame = endlessToo ? astraEndlessFrame : astraFrame;
        const [w, h] = endlessToo ? [256, 104] : [128, 104];
        /* the wave at its full reach (just after it fires) and on the lockup */
        for (const tt of [endlessToo ? 4.6 : 3.95, 99]) {
          const nodes = scene(frame({ tt, still: tt === 99, size: 160, ink: "#111", aim }));
          for (const [x, y] of pointsOf(String(nodes.find(([, k]) => k === "wv0")![2].d))) {
            const [X, Y] = onStage(v, [x, y]);
            expect(X, `aim ${aim} at ${tt} s`).toBeGreaterThan(-1);
            expect(X, `aim ${aim} at ${tt} s`).toBeLessThan(w + 1);
            expect(Y, `aim ${aim} at ${tt} s`).toBeGreaterThan(-1);
            expect(Y, `aim ${aim} at ${tt} s`).toBeLessThan(h + 1);
          }
        }
        expect(v.scale < 1 || v.lift > 0, `aim ${aim}`).toBe(true);
      }
  });

  it("rises off the ground for a downward shot only as he swings it down", () => {
    const v = astraView(270, false);
    expect(v.lift).toBeGreaterThan(20);
    const stageAt = (tt: number) => String(astraFrame({ tt, still: false, size: 160, ink: "#111", aim: 270 })[0][2].transform);
    expect(stageAt(2.5)).toBe(astraStage(v, 0)); /* charging on the ground */
    expect(stageAt(4)).toBe(astraStage(v, 1)); /* hovering as he fires */
  });
});

describe("the lightning discharge", () => {
  const bolt = (frame: typeof astraFrame, tt: number, aim: number) =>
    scene(frame({ tt, still: tt === 99, size: 160, ink: "#111", aim, discharge: "lightning" }));
  const shown = (nodes: FNode[], key: string) => {
    const n = nodes.find(([, k]) => k === key);
    return !!n && Number(n[2].opacity) > 0 && n[2].d !== "M0 0";
  };
  /* how far the main bolt reaches from the head, along the aim */
  const reach = (nodes: FNode[]) => {
    const xs = pointsOf(String(nodes.find(([, k]) => k === "lb")![2].d)).map(([x]) => x);
    return Math.max(...xs) - Math.min(...xs);
  };

  it("fires a forked bolt in place of the wave: nothing before it fires, a full strike at once, a quieter bolt on the lockup", () => {
    expect(bolt(astraFrame, 3.3, 180).some(([, k]) => /^wv\d$/.test(k))).toBe(false);
    expect(shown(bolt(astraFrame, 2.5, 180), "lb")).toBe(false);
    const strike = bolt(astraFrame, 3.25, 180), lockup = bolt(astraFrame, 99, 180);
    expect(shown(strike, "lb")).toBe(true);
    expect(strike.filter(([, k, a]) => /^lf\d$/.test(k) && Number(a.opacity) > 0).length).toBeGreaterThanOrEqual(5);
    expect(reach(lockup)).toBeLessThan(reach(strike) * 0.75);
    expect(bolt(astraEndlessFrame, 12.7, 172).filter(([, k, a]) => /^lp\d$/.test(k) && Number(a.r) > 0).length).toBeGreaterThan(0);
  });

  it("crackles: the same moment draws the same bolt, the next tick a new one; the lockup is its last frame", () => {
    const at = (tt: number) => JSON.stringify(bolt(astraFrame, tt, 150));
    expect(at(3.4)).toBe(at(3.4));
    expect(at(3.4)).not.toBe(at(3.46));
    const markup = (tt: number, still: boolean) => nodesToMarkup(astraFrame({ tt, still, size: 160, ink: "#111", aim: 150, discharge: "lightning" }), "u");
    expect(markup(99, true)).toBe(markup(ASTRA_STING.len, false));
  });

  it("keeps the bolt on the stage at every aim", () => {
    for (const [endlessToo, aims] of [[false, [30, 60, 90, 150, 180, 240, 270, 300]], [true, [90, 172, 270]]] as const)
      for (const aim of aims) {
        const v = astraView(aim, endlessToo);
        const [w, h] = endlessToo ? [256, 104] : [128, 104];
        for (const tt of [3.25, 3.6, 99]) {
          const nodes = bolt(endlessToo ? astraEndlessFrame : astraFrame, tt, aim);
          for (const [, k, a] of nodes) {
            if (!/^l[bsft]\d?$/.test(k) || Number(a.opacity) <= 0 || a.d === "M0 0") continue;
            for (const [x, y] of pointsOf(String(a.d))) {
              const X0 = v.anchor[0] + v.scale * (x - v.anchor[0]) - v.left, Y = v.anchor[1] + v.scale * (y - v.anchor[1]) - v.lift;
              const X = v.mirror ? v.width - X0 : X0;
              expect(X > -1 && X < w + 1 && Y > -1 && Y < h + 1, `${k} at aim ${aim}, ${tt} s: ${X.toFixed(1)}, ${Y.toFixed(1)}`).toBe(true);
            }
          }
        }
      }
  });

  it("keys every element of every lightning frame once", () => {
    for (const frame of [astraFrame, astraEndlessFrame])
      for (const tt of [2.2, 3.1, 3.25, 4.2, 12.7, 99]) {
        const keys = keysOf(frame({ tt, still: tt === 99, size: 160, ink: "#111", aim: 160, discharge: "lightning" }));
        expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
      }
  });

  it("is a prop of the astras: it changes their drawing and name, and the mark ignores it", () => {
    const look = (variant: "mark" | "astra", discharge: "wave" | "lightning") => {
      const { container, unmount } = render(<SutradharSting variant={variant} discharge={discharge} autoPlay={false} title />);
      const out = [strip(art(container).innerHTML), svgOf(container).querySelector("title")!.textContent];
      unmount();
      return out;
    };
    const [wave] = look("astra", "wave"), [lit, name] = look("astra", "lightning");
    expect(lit).not.toBe(wave);
    expect(name).toBe("Sutradhar fires lightning from a hand astra");
    expect(look("mark", "lightning")).toEqual(look("mark", "wave"));
  });
});
