/**
 * SutraMascot (assets/mascot): the Bead as a character. The expression (face, extras) is markup, so it survives reduced motion; the
 * motion is CSS keyframes in the last section of styles/sutra.css, started by `data-state`. These tests pin both halves: the
 * markup per state, the accessible name, the tile forms, the dye, the pause and replay hooks, and the CSS contract (every
 * animation has keyframes, cycle lengths come from the motion token, one-shots play once, the reduced-motion twins match).
 */
import * as React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SutraMascot, mascotStateLabels, mascotStates, type MascotState } from "../src/assets/mascot";
import { sutraAppMeta, sutraApps } from "../src/assets/brand";
import { axeViolations } from "./helpers/a11y";

const svgOf = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;
const part = (root: ParentNode, name: string) => Array.from(root.querySelectorAll(`[data-part="${name}"]`));

/** What a state looks like with no motion at all: the eyes, the mouth and the extras that are drawn. */
function expression(svg: SVGSVGElement) {
  const mouth = svg.querySelector('[data-part="mouth"]')!;
  const extras = ["rings", "dots", "sparks", "sparkles", "zees", "bang", "brows"].filter((name) => part(svg, name).length > 0);
  return JSON.stringify({
    eyes: svg.querySelector("[data-eyes]")!.getAttribute("data-eyes"),
    mouth: mouth.tagName + (mouth.getAttribute("d") ?? mouth.getAttribute("rx")),
    extras,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("states and labels", () => {
  it("lists the eight states in a fixed order, each with a label that names Sutra", () => {
    expect([...mascotStates]).toEqual(["idle", "listening", "thinking", "working", "speaking", "happy", "sleeping", "error"]);
    for (const state of mascotStates) expect(mascotStateLabels[state]).toMatch(/^Sutra /);
    expect(new Set(Object.values(mascotStateLabels)).size).toBe(mascotStates.length);
  });
});

describe("SutraMascot markup", () => {
  it("is a decorative svg by default, idle, with the slot and state attributes", () => {
    const svg = svgOf(render(<SutraMascot />).container);
    expect(svg).toHaveAttribute("data-slot", "sutra-mascot");
    expect(svg).toHaveAttribute("data-state", "idle");
    expect(svg).toHaveAttribute("data-shape", "bare");
    expect(svg).toHaveAttribute("viewBox", "0 0 64 64");
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg.querySelector("title")).toBeNull();
    expect(svg).toHaveClass("sutra-mascot", "shrink-0");
  });

  it.each(mascotStates)("renders the %s state and reports it in data-state", (state) => {
    const svg = svgOf(render(<SutraMascot state={state} />).container);
    expect(svg).toHaveAttribute("data-state", state);
    expect(part(svg, "bead")).toHaveLength(1);
    expect(part(svg, "eye")).toHaveLength(2);
  });

  it("falls back to idle for an unknown state", () => {
    const svg = svgOf(render(<SutraMascot state={"dancing" as MascotState} />).container);
    expect(svg).toHaveAttribute("data-state", "idle");
  });

  it("looks different in every state without any motion: face and extras are markup", () => {
    const looks = mascotStates.map((state) => expression(svgOf(render(<SutraMascot state={state} />).container)));
    expect(new Set(looks).size).toBe(mascotStates.length);
  });

  it("draws the extras of each state", () => {
    const count = (state: MascotState, name: string) => part(svgOf(render(<SutraMascot state={state} />).container), name).length;
    expect(count("listening", "ring")).toBe(4);
    expect(count("thinking", "dot")).toBe(3);
    expect(count("working", "spark")).toBe(2);
    expect(count("happy", "sparkle")).toBe(3);
    expect(count("sleeping", "zee")).toBe(3);
    expect(count("error", "bang")).toBe(1);
    expect(count("error", "brows")).toBe(1);
    for (const state of ["idle", "speaking"] as const) {
      const svg = svgOf(render(<SutraMascot state={state} />).container);
      expect(svg.querySelectorAll('[data-part="rings"], [data-part="dots"], [data-part="sparks"], [data-part="sparkles"], [data-part="zees"], [data-part="bang"]')).toHaveLength(0);
    }
  });

  it("cuts the face and the thread gap out of the bead with a mask (see-through on any theme)", () => {
    const svg = svgOf(render(<SutraMascot state="happy" />).container);
    const bead = part(svg, "bead")[0]!;
    const maskId = /url\(#(.+)\)/.exec(bead.getAttribute("mask")!)![1]!;
    const mask = svg.querySelector(`mask[id="${maskId}"]`)!;
    expect(mask.querySelector('[data-part="eyes"]')).not.toBeNull();
    expect(mask.querySelector('[data-part="mouth"]')).not.toBeNull();
    expect(mask.querySelector('[data-part="thread-l-gap"]')).not.toBeNull();
    // nothing of the face is painted on the bead itself
    expect(bead.parentElement!.querySelector('[data-part="eyes"]')).toBeNull();
    // the right piece of the thread runs under the bead: it is masked by a circle a little larger than the bead
    const under = part(svg, "thread-r")[0]!;
    expect(svg.querySelector(`mask[id="${/url\(#(.+)\)/.exec(under.getAttribute("mask")!)![1]}"] circle`)).not.toBeNull();
  });

  it("gives every instance its own mask ids", () => {
    const { container } = render(
      <>
        <SutraMascot state="idle" />
        <SutraMascot state="idle" />
      </>
    );
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is the same drawing in right-to-left text: the character faces the viewer and is not mirrored", () => {
    const norm = (html: string) => html.replace(/sutra-mascot-_r_\w+_/g, "ID");
    const ltr = norm(svgOf(render(<div dir="ltr"><SutraMascot state="listening" /></div>).container).outerHTML);
    const rtl = norm(svgOf(render(<div dir="rtl"><SutraMascot state="listening" /></div>).container).outerHTML);
    expect(rtl).toBe(ltr);
  });
});

describe("accessible name", () => {
  it("a string title names the graphic with role img", () => {
    render(<SutraMascot title="Sutra assistant" />);
    const img = screen.getByRole("img", { name: "Sutra assistant" });
    expect(img).not.toHaveAttribute("aria-hidden");
    expect(img.querySelector("title")).toHaveTextContent("Sutra assistant");
    expect(img.getAttribute("aria-labelledby")).toBe(img.querySelector("title")!.id);
  });

  it("title=true uses the label of the current state and follows it", () => {
    const { rerender } = render(<SutraMascot state="listening" title />);
    expect(screen.getByRole("img", { name: "Sutra is listening" })).toBeInTheDocument();
    rerender(<SutraMascot state="sleeping" title />);
    expect(screen.getByRole("img", { name: mascotStateLabels.sleeping })).toBeInTheDocument();
  });

  it("title=false and an empty title stay decorative", () => {
    const { container, rerender } = render(<SutraMascot title={false} />);
    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true");
    rerender(<SutraMascot title="" />);
    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("has no axe violations: decorative, named, and as a tile", async () => {
    const { container } = render(
      <div>
        <SutraMascot />
        <SutraMascot title="Sutra" state="thinking" />
        <SutraMascot title shape="circle" state="error" />
        <SutraMascot title shape="squircle" tone="dyed" app="mail" state="happy" />
      </div>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("shape, tone and size", () => {
  it("bare has no tile, no clip and follows the text colour", () => {
    const svg = svgOf(render(<SutraMascot />).container);
    expect(svg.querySelector("rect[rx]")).toBeNull();
    expect(svg.querySelector("clipPath")).toBeNull();
    expect(part(svg, "bead")[0]).toHaveAttribute("fill", "currentColor");
    expect(part(svg, "thread-l")[0]).toHaveAttribute("stroke", "currentColor");
  });

  it.each([
    ["circle", "32"],
    ["squircle", "19"],
  ] as const)("%s is a paper tile with a hairline, ink inside, clipped to the tile", (shape, rx) => {
    const svg = svgOf(render(<SutraMascot shape={shape} />).container);
    expect(svg).toHaveAttribute("data-shape", shape);
    const tiles = Array.from(svg.querySelectorAll(":scope > rect"));
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveAttribute("rx", rx);
    expect(tiles[0]).toHaveAttribute("fill", "#f7f5f0");
    expect(tiles[1]).toHaveAttribute("stroke", "#1c1915");
    expect(part(svg, "bead")[0]).toHaveAttribute("fill", "#1c1915");
    expect(svg.querySelector("clipPath rect")).toHaveAttribute("rx", rx);
    expect(svg.querySelector("g[clip-path]")).not.toBeNull();
  });

  it("dyed puts the dye of the app in the bead, flat, without a gradient", () => {
    for (const app of sutraApps) {
      const svg = svgOf(render(<SutraMascot shape="circle" tone="dyed" app={app} />).container);
      expect(part(svg, "bead")[0]).toHaveAttribute("fill", sutraAppMeta[app].dye);
      expect(svg.querySelector("linearGradient, radialGradient")).toBeNull();
    }
  });

  it("dyed without an app, and mono with an app, keep the ink", () => {
    const a = svgOf(render(<SutraMascot shape="circle" tone="dyed" />).container);
    const b = svgOf(render(<SutraMascot shape="circle" app="mail" />).container);
    expect(part(a, "bead")[0]).toHaveAttribute("fill", "#1c1915");
    expect(part(b, "bead")[0]).toHaveAttribute("fill", "#1c1915");
  });

  it("size takes pixels or any css length", () => {
    const px = svgOf(render(<SutraMascot size={24} />).container);
    expect([px.getAttribute("width"), px.getAttribute("height")]).toEqual(["24", "24"]);
    const rem = svgOf(render(<SutraMascot size="3rem" />).container);
    expect(rem).toHaveAttribute("width", "3rem");
  });
});

describe("pause, replay and props", () => {
  it("paused sets data-paused (the CSS freezes the animation), and clears it again", () => {
    const { container, rerender } = render(<SutraMascot paused />);
    expect(svgOf(container)).toHaveAttribute("data-paused", "true");
    rerender(<SutraMascot />);
    expect(svgOf(container)).not.toHaveAttribute("data-paused");
  });

  it("a state change keeps the same svg node: the animation swaps without remounting", () => {
    const { container, rerender } = render(<SutraMascot state="idle" />);
    const svg = svgOf(container);
    const stage = part(svg, "stage")[0];
    rerender(<SutraMascot state="thinking" />);
    expect(svgOf(container)).toBe(svg);
    expect(svg).toHaveAttribute("data-state", "thinking");
    expect(part(svg, "stage")[0]).toBe(stage);
  });

  it("replayKey remounts only the animated stage, so a one-shot plays again in the same state", () => {
    const { container, rerender } = render(<SutraMascot state="happy" replayKey={1} />);
    const svg = svgOf(container);
    const stage = part(svg, "stage")[0];
    rerender(<SutraMascot state="happy" replayKey={1} />);
    expect(part(svg, "stage")[0]).toBe(stage);
    rerender(<SutraMascot state="happy" replayKey={2} />);
    expect(svgOf(container)).toBe(svg);
    expect(part(svg, "stage")[0]).not.toBe(stage);
    expect(part(svg, "stage")).toHaveLength(1);
  });

  it("forwards the ref, merges className last and lets the caller override defaults", () => {
    const ref = React.createRef<SVGSVGElement>();
    const { container } = render(
      <SutraMascot ref={ref} className="size-10 text-primary" data-slot="my-mascot" aria-hidden={false} data-testid="m" />
    );
    expect(ref.current).toBe(svgOf(container));
    expect(ref.current).toHaveClass("sutra-mascot", "size-10", "text-primary");
    expect(ref.current).toHaveAttribute("data-slot", "my-mascot");
    expect(ref.current).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByTestId("m")).toBe(ref.current);
  });
});

describe("no scripted motion", () => {
  it("does no animation work of its own under reduced motion: no frame, interval or timer is requested", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ ...original(query), matches: query.includes("reduce") })) as typeof window.matchMedia;
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const interval = vi.spyOn(window, "setInterval");
    const { unmount, rerender } = render(<SutraMascot state="working" />);
    rerender(<SutraMascot state="speaking" />);
    unmount();
    window.matchMedia = original;
    expect(raf).not.toHaveBeenCalled();
    expect(interval).not.toHaveBeenCalled();
  });

  it("the source has no effect, timer, frame loop or WAAPI call (nothing to clean up on unmount)", () => {
    for (const file of ["mascot.tsx", "mascot-art-internal.tsx"]) {
      const code = readFileSync(path.join(__dirname, "../src/assets", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(code, file).not.toMatch(/useEffect|useLayoutEffect|setTimeout|setInterval|requestAnimationFrame|\.animate\(/);
      expect(code.split("\n").length, file).toBeLessThan(700);
    }
  });
});

/* ------------------------------------------------------------------ */
/* The CSS contract                                                    */
/* ------------------------------------------------------------------ */

const raw = readFileSync(path.join(__dirname, "../src/styles/sutra.css"), "utf8");
const MARKER = "Sutra mascot (assets/mascot)";
// The mascot rules run from its header to the next section header (other sections follow it: file format icons).
const fromMascot = raw.slice(raw.indexOf("/* ====", raw.indexOf(MARKER)));
const nextSection = fromMascot.slice(10).search(/\n\/\* =+ \*\/\n\/\* [A-Z]/);
const css = (nextSection < 0 ? fromMascot : fromMascot.slice(0, nextSection + 10)).replace(/\/\*[\s\S]*?\*\//g, "");
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

describe("the mascot section of sutra.css", () => {
  it("sits after the Motion II section (the guard's effects span ends where it starts) and ends at the next section header", () => {
    expect(raw.indexOf(MARKER)).toBeGreaterThan(raw.indexOf("Motion II: view transitions"));
    expect(css).not.toContain("file-format-icon");
  });

  it("starts an animation for every state, and every animation-name has keyframes", () => {
    for (const state of mascotStates) expect(css, state).toMatch(new RegExp(`\\[data-state="${state}"\\][^{]*\\{[^}]*animation-name:`));
    const used = new Set([...css.matchAll(/animation-name:\s*([\w-]+)/g)].map((m) => m[1]!));
    const defined = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]!));
    expect(used.size).toBeGreaterThan(15);
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
    expect([...defined].filter((name) => !used.has(name))).toEqual([]);
  });

  it("takes every cycle length from the motion token and writes no hand-made duration or curve", () => {
    const durations = [...css.matchAll(/animation-duration:\s*([^;]+);/g)].map((m) => m[1]!);
    expect(durations.length).toBeGreaterThan(15);
    expect(durations.filter((d) => !/^calc\(var\(--sutra-mascot-unit\) \* [\d.]+\)$/.test(d))).toEqual([]);
    expect(css).toContain("--sutra-mascot-unit: var(--sutra-duration-fill)");
    expect(css).not.toMatch(/(?<![\w-])linear\(|cubic-bezier\(/);
    expect([...css.matchAll(/(?:animation|transition)(?:-duration)?:[^;]*?(\d+(?:\.\d+)?m?s)\b/g)].map((m) => m[1])).toEqual([]);
  });

  it("loops the idle motion with a plain infinite count; the one-shots play once", () => {
    expect(css).toMatch(/\[data-part\]\s*\{[^}]*animation-iteration-count:\s*infinite;/);
    for (const state of ["happy", "error"]) {
      expect(css, state).toMatch(new RegExp(`\\[data-state="${state}"\\] \\[data-part="stage"\\]\\s*\\{[^}]*animation-iteration-count:\\s*1;`));
    }
  });

  it("stops everything under reduced motion with twin blocks: the system request unless `full`, and data-motion=reduce", () => {
    const media = /@media \(prefers-reduced-motion: reduce\)\s*\{\s*(:where\(:root:not\(\[data-motion="full"\]\)\) \.sutra-mascot \[data-part\])\s*\{([^}]*)\}\s*\}/.exec(css);
    const attr = /(:where\(:root\[data-motion="reduce"\]\) \.sutra-mascot \[data-part\])\s*\{([^}]*)\}/.exec(css);
    expect(media).not.toBeNull();
    expect(attr).not.toBeNull();
    expect(squash(media![2]!)).toBe(squash(attr![2]!));
    expect(squash(media![2]!)).toBe("animation: none !important;");
  });

  it("freezes the animation when paused, and keeps the still poses as plain style (they are what reduced motion shows)", () => {
    expect(css).toMatch(/\.sutra-mascot\[data-paused\] \[data-part\]\s*\{\s*animation-play-state:\s*paused;/);
    expect(css).toMatch(/\[data-state="listening"\] \[data-part="stage"\]\s*\{\s*transform:/);
    expect(css).toMatch(/\[data-state="thinking"\] \[data-part="eyes"\]\s*\{\s*transform:/);
  });

  it("only animates transform and opacity", () => {
    const frames = [...css.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]*\{[^}]*\})+)\s*\}/g)].map((m) => m[1]!);
    expect(frames.length).toBeGreaterThan(15);
    const props = new Set(frames.flatMap((f) => [...f.matchAll(/([\w-]+):\s*[^;]+;/g)].map((m) => m[1]!)));
    expect([...props].sort()).toEqual(["opacity", "transform"]);
  });
});
