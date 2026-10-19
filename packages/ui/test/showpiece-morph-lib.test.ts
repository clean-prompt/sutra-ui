/** lib/morph: the two ends of a card-to-panel morph in both reading directions, keyframes, radius and rect helpers. */
import { describe, expect, it } from "vitest";
import { liftKeyframes, morphFadeKeyframes, morphFrames, morphKeyframes, morphScrimKeyframes, parseRadius, sameRect } from "../src/lib/morph";

const card = { left: 100, top: 200, width: 300, height: 80 };
const panel = { left: 250, top: 100, width: 500, height: 400 };

describe("helpers", () => {
  it("parses the first length of a radius and ignores percentages and junk", () => {
    expect([parseRadius("16px"), parseRadius("12px 4px"), parseRadius("50%"), parseRadius(""), parseRadius(undefined), parseRadius("-3px")]).toEqual([16, 12, 0, 0, 0, 0]);
  });
  it("compares boxes to half a pixel", () => {
    expect(sameRect(card, { ...card, left: 100.3 })).toBe(true);
    expect(sameRect(card, { ...card, width: 301 })).toBe(false);
  });
});

describe("morphFrames", () => {
  it("lines the panel's start-top corner up with the card's and clips it to the card's size and radius", () => {
    const { collapsed, expanded } = morphFrames(card, panel, { radiusFrom: 12, radiusTo: 16 });
    expect(collapsed.transform).toBe("translate(-150px, 100px)");
    expect(collapsed.clipPath).toBe("inset(0px 200px 320px 0px round 12px)");
    expect(expanded.transform).toBe("translate(0px, 0px)");
    expect(expanded.clipPath).toBe("inset(0px 0px 0px 0px round 16px)");
  });
  it("anchors the right corner in right-to-left text", () => {
    const { collapsed } = morphFrames(card, panel, { rtl: true, radiusFrom: 12, radiusTo: 16 });
    expect(collapsed.transform).toBe("translate(-350px, 100px)"); // card right 400, panel right 750
    expect(collapsed.clipPath).toBe("inset(0px 0px 320px 200px round 12px)");
  });
  it("never clips below zero when the card is bigger than the panel", () => {
    const { collapsed } = morphFrames({ left: 0, top: 0, width: 900, height: 700 }, panel);
    expect(collapsed.clipPath).toBe("inset(0px 0px 0px 0px round 0px)");
  });
});

describe("keyframes", () => {
  const frames = morphFrames(card, panel, { radiusFrom: 12, radiusTo: 16 });
  it("opens from the collapsed end and closes back to it", () => {
    const open = morphKeyframes(frames, "in");
    const close = morphKeyframes(frames, "out");
    expect(open.frame[0]).toEqual({ transform: frames.collapsed.transform });
    expect(open.panel[1]).toEqual({ clipPath: frames.expanded.clipPath });
    expect(close.frame[0]).toEqual({ transform: frames.expanded.transform });
    expect(close.panel[1]).toEqual({ clipPath: frames.collapsed.clipPath });
  });
  it("fades the detail in late and out early, and the scrim straight", () => {
    expect(morphFadeKeyframes("in")).toEqual([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }]);
    expect(morphFadeKeyframes("out")[1]).toMatchObject({ opacity: 0, offset: 0.35 });
    expect(morphScrimKeyframes("in")).toEqual([{ opacity: 0 }, { opacity: 1 }]);
  });
  it("lifts with no origin: a frame animation only", () => {
    const lift = liftKeyframes("in");
    expect(lift.panel).toEqual([]);
    expect(lift.frame[0]).toMatchObject({ opacity: 0 });
    expect(lift.frame[1]).toMatchObject({ opacity: 1 });
    expect(liftKeyframes("out").frame[1]).toMatchObject({ opacity: 0 });
  });
});
