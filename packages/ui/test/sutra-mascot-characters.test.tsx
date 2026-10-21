/**
 * SutraMascot characters: the bead (CSS keyframes, unchanged) and the frame-drawn characters (pendant, mala, bindu,
 * knot-pendant, bow, bun, sutradhar). Every character draws all eight states in every shape as markup (so the still pose
 * shows on the server and under reduced motion), with its own mask ids, the dye in its beads, an accessible name when titled,
 * and a frame loop that runs only while motion is allowed and the mascot is not paused.
 */
import * as React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SutraMascot, mascotCharacterLabels, mascotCharacters, mascotStateLabels, mascotStates, type MascotCharacter } from "../src/assets/mascot";
import { sutraAppMeta } from "../src/assets/brand";
import { activeFrameCount } from "../src/assets/mascot-driver-internal";
import { characterFrames } from "../src/assets/mascot-frames-internal";
import type { FNode } from "../src/assets/mascot-kit-internal";
import { axeViolations } from "./helpers/a11y";

const drawn = mascotCharacters.filter((c) => c !== "bead") as Exclude<MascotCharacter, "bead">[];
const svgOf = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;
const art = (svg: SVGSVGElement) => svg.querySelector('[data-part="art"]') as SVGGElement;

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

describe("characters", () => {
  it("lists eight characters in picker order, the bead first, each with a picker name", () => {
    expect(mascotCharacters).toEqual(["bead", "pendant", "mala", "bindu", "knot-pendant", "bow", "bun", "sutradhar"]);
    for (const c of mascotCharacters) expect(mascotCharacterLabels[c]).toMatch(/\S/);
    expect(new Set(Object.values(mascotCharacterLabels)).size).toBe(mascotCharacters.length);
  });

  it("defaults to the bead, which keeps its CSS drawing", () => {
    const { container } = render(<SutraMascot />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute("data-character", "bead");
    expect(svg.querySelector('[data-part="bead"]')).not.toBeNull();
    expect(art(svg)).toBeNull();
  });

  it("draws every character in every state and shape, with the root hooks the bead has", () => {
    for (const character of drawn) {
      for (const shape of ["bare", "circle", "squircle"] as const) {
        for (const state of mascotStates) {
          const { container, unmount } = render(<SutraMascot character={character} state={state} shape={shape} />);
          const svg = svgOf(container);
          expect(svg).toHaveAttribute("data-slot", "sutra-mascot");
          expect(svg).toHaveAttribute("data-character", character);
          expect(svg).toHaveAttribute("data-state", state);
          expect(svg).toHaveAttribute("data-shape", shape);
          expect(art(svg).querySelectorAll("[data-k]").length).toBeGreaterThan(3);
          unmount();
        }
      }
    }
  });

  it("looks different in every state without any motion (the still pose is the markup)", () => {
    withReducedMotion(() => {
      for (const character of drawn) {
        const looks = new Set(
          mascotStates.map((state) => {
            const { container, unmount } = render(<SutraMascot character={character} state={state} />);
            const markup = art(svgOf(container)).innerHTML.replace(/id="[^"]*"|url\(#[^)]*\)/g, "");
            unmount();
            return markup;
          })
        );
        expect(looks.size, character).toBe(mascotStates.length);
      }
    });
  });

  it("gives every instance its own mask and clip ids", () => {
    const { container } = render(
      <>
        <SutraMascot character="pendant" />
        <SutraMascot character="pendant" />
        <SutraMascot character="sutradhar" shape="circle" />
        <SutraMascot character="sutradhar" shape="circle" />
      </>
    );
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(ids.length).toBeGreaterThan(4);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of Array.from(container.querySelectorAll("[mask]")).map((el) => el.getAttribute("mask")!)) {
      const id = ref.replace(/^url\(#|\)$/g, "");
      expect(container.querySelector(`[id="${id}"]`), ref).not.toBeNull();
    }
  });

  it("clips the drawing to its box (a pendant's thread runs off the top edge) and keeps the tile inks", () => {
    const { container } = render(<SutraMascot character="pendant" shape="circle" />);
    const svg = svgOf(container);
    expect(svg.style.overflow).toBe("hidden");
    expect(svg.querySelector('rect[fill="#f7f5f0"]')).not.toBeNull();
    expect(svg.querySelector("[clip-path]")).not.toBeNull();
  });

  it("dyed puts the dye of the app in the beads; the thread stays ink", () => {
    const dye = sutraAppMeta.notes.dye;
    for (const character of drawn) {
      const { container, unmount } = render(<SutraMascot character={character} tone="dyed" app="notes" />);
      const paints = Array.from(art(svgOf(container)).querySelectorAll("[fill], [stroke]")).flatMap((el) => [el.getAttribute("fill"), el.getAttribute("stroke")]);
      expect(paints, character).toContain(dye);
      expect(paints, character).toContain("currentColor");
      unmount();
    }
  });
});

describe("accessible name", () => {
  it("is decorative by default and named by title; title=true follows the state", async () => {
    const { container, rerender } = render(<SutraMascot character="mala" />);
    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true");
    rerender(<SutraMascot character="mala" state="thinking" title />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute("role", "img");
    expect(svg.querySelector("title")).toHaveTextContent(mascotStateLabels.thinking);
    rerender(<SutraMascot character="bow" shape="circle" title="Your Sutra" />);
    expect(await axeViolations(container)).toEqual([]);
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

describe("frame loop", () => {
  it("keys every element of every frame once, so the frame driver patches the right one", () => {
    for (const [name, frame] of Object.entries(characterFrames))
      for (const state of mascotStates)
        for (const form of ["bare", "tile"] as const)
          for (const tt of [0, 0.7, 1.9, 3.3]) {
            const keys = keysOf(frame({ state, t: tt, tt, still: false, form, size: 96, k: 1, ink: "#111", bead: "#222" }));
            expect(keys.filter((k, i) => keys.indexOf(k) !== i), `${name} ${state} ${form} at ${tt} s`).toEqual([]);
          }
  });

  it("joins the shared frame while motion is allowed, and leaves it when paused or unmounted", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const { rerender, unmount } = render(<SutraMascot character="bindu" />);
    expect(raf).toHaveBeenCalled();
    expect(activeFrameCount()).toBe(1);
    rerender(<SutraMascot character="bindu" paused />);
    expect(activeFrameCount()).toBe(0);
    rerender(<SutraMascot character="bindu" />);
    expect(activeFrameCount()).toBe(1);
    unmount();
    expect(activeFrameCount()).toBe(0);
  });

  it("requests no frame at all under reduced motion: each state stands in its still pose", () => {
    withReducedMotion(() => {
      const raf = vi.spyOn(window, "requestAnimationFrame");
      const { rerender, unmount } = render(<SutraMascot character="sutradhar" state="happy" />);
      rerender(<SutraMascot character="sutradhar" state="error" />);
      unmount();
      expect(raf).not.toHaveBeenCalled();
    });
  });

  it("moves the drawing on a frame without rendering React again, and keeps the svg on a state change", async () => {
    const { container, rerender } = render(<SutraMascot character="pendant" state="happy" />);
    const svg = svgOf(container);
    /* the first frame goes in at mount (so the still markup never shows); the next ones move the drawing */
    const drawing = () => art(svg).innerHTML;
    const before = drawing();
    await act(() => new Promise((r) => setTimeout(r, 120)));
    expect(drawing()).not.toBe(before);
    rerender(<SutraMascot character="pendant" state="sleeping" replayKey={1} />);
    expect(svgOf(container)).toBe(svg);
    expect(svg).toHaveAttribute("data-state", "sleeping");
  });
});
