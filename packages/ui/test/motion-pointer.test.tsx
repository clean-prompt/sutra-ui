/**
 * Pointer effects: the maths (pointerVarsFor), usePointerVars (hover-capable fine pointers only, rAF-throttled, reset on
 * leave, off under reduced motion, cleanup, StrictMode), SpotlightCard / TiltCard / Magnetic, and the stylesheet
 * (utilities read the variables, moving rules only without reduced motion, paper retunes the strengths).
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pointerVarsFor, usePointerVars, type UsePointerVarsOptions } from "../src/hooks/use-pointer-vars";
import { Magnetic, SpotlightCard, TiltCard } from "../src/patterns/pointer-fx";
import { axeViolations } from "./helpers/a11y";

const original = window.matchMedia;
/** A browser with these media queries matching (substring match on the query). */
const media = (...matching: string[]) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: matching.some((m) => query.includes(m)) })) as typeof window.matchMedia;
};
const mouse = () => media("hover: hover");

let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
const flush = () => {
  const q = [...queue.values()];
  queue = new Map();
  act(() => q.forEach((cb) => cb(0)));
};
beforeEach(() => {
  queue = new Map();
  nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => (queue.set(nextId, cb), nextId++));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => queue.delete(id));
  // every element is a 200 x 100 box at (100, 50)
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ left: 100, top: 50, width: 200, height: 100, right: 300, bottom: 150, x: 100, y: 50, toJSON() {} }) as DOMRect);
});
afterEach(() => {
  window.matchMedia = original;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const box = { left: 100, top: 50, width: 200, height: 100 };

describe("pointerVarsFor", () => {
  it("gives the position inside the box and the offset from the centre as -1..1", () => {
    const centre = pointerVarsFor(box, 200, 100);
    expect(centre).toMatchObject({ px: 100, py: 50, tx: 0, ty: 0, pullX: 0, pullY: 0, near: true });
    const corner = pointerVarsFor(box, 300, 150);
    expect(corner).toMatchObject({ px: 200, py: 100, tx: 1, ty: 1, near: true });
    const topLeft = pointerVarsFor(box, 100, 50);
    expect(topLeft).toMatchObject({ tx: -1, ty: -1 });
  });

  it("without a radius it is near only over the box, and never pulls", () => {
    expect(pointerVarsFor(box, 99, 100).near).toBe(false);
    expect(pointerVarsFor(box, 200, 151).near).toBe(false);
    expect(pointerVarsFor(box, 250, 120, { strength: 1 })).toMatchObject({ pullX: 0, pullY: 0 });
  });

  it("with a radius it reaches past the box, pulls toward the pointer and fades out at the edge of the reach", () => {
    const opts = { radius: 80, strength: 0.5 };
    const reach = 100 + 80; // half the longer side plus the radius
    // 40 px right of the centre: pull = 40 * 0.5 * (1 - 40/180)
    const inside = pointerVarsFor(box, 240, 100, opts);
    expect(inside.near).toBe(true);
    expect(inside.pullX).toBeCloseTo(40 * 0.5 * (1 - 40 / reach), 6);
    expect(inside.pullY).toBeCloseTo(0, 6);
    // outside the box, inside the reach
    const outside = pointerVarsFor(box, 360, 100, opts);
    expect(outside.px).toBe(260);
    expect(outside.near).toBe(true);
    expect(outside.tx).toBe(1); // clamped
    expect(outside.pullX).toBeGreaterThan(0);
    // fades to nothing at the reach, and is not near beyond it
    expect(pointerVarsFor(box, 200 + reach, 100, opts).pullX).toBeCloseTo(0, 6);
    expect(pointerVarsFor(box, 200 + reach + 1, 100, opts)).toMatchObject({ near: false, pullX: 0, pullY: 0 });
    // the pull never exceeds half the strength times a quarter of the reach
    for (let x = 100; x < 400; x += 7) expect(Math.abs(pointerVarsFor(box, x, 100, opts).pullX)).toBeLessThanOrEqual(0.5 * (reach / 4) + 1e-9);
    // direction follows the pointer on both axes
    const up = pointerVarsFor(box, 200, 20, opts);
    expect(up.pullY).toBeLessThan(0);
    expect(pointerVarsFor(box, 160, 100, opts).pullX).toBeLessThan(0);
  });

  it("survives a zero-size box", () => {
    const v = pointerVarsFor({ left: 0, top: 0, width: 0, height: 0 }, 5, 5, { radius: 10 });
    expect(Number.isFinite(v.tx) && Number.isFinite(v.ty) && Number.isFinite(v.pullX)).toBe(true);
  });
});

function Probe(props: UsePointerVarsOptions) {
  const ref = usePointerVars<HTMLDivElement>(props);
  return <div ref={ref} data-testid="box" />;
}
const move = (target: Element | Document, x: number, y: number, pointerType = "mouse") => {
  fireEvent.pointerMove(target, { clientX: x, clientY: y, pointerType });
};

describe("usePointerVars", () => {
  it("while the mouse is over the element it writes the variables once per frame, and the attribute", () => {
    mouse();
    render(<Probe />);
    const el = screen.getByTestId("box");
    move(el, 150, 75);
    move(el, 160, 80);
    move(el, 200, 100);
    expect(queue.size).toBe(1); // one frame for three moves
    expect(el).not.toHaveAttribute("data-pointer"); // nothing is written before the frame
    flush();
    expect(el).toHaveAttribute("data-pointer", "active");
    expect(el.style.getPropertyValue("--px")).toBe("100px");
    expect(el.style.getPropertyValue("--py")).toBe("50px");
    expect(el.style.getPropertyValue("--tx")).toBe("0");
    expect(el.style.getPropertyValue("--ty")).toBe("0");
    expect(el.style.getPropertyValue("--pull-x")).toBe("0");
    move(el, 250, 125);
    flush();
    expect(el.style.getPropertyValue("--tx")).toBe("0.5");
    expect(el.style.getPropertyValue("--ty")).toBe("0.5");
  });

  it("resets everything on leave, and drops a frame that was still pending", () => {
    mouse();
    render(<Probe />);
    const el = screen.getByTestId("box");
    move(el, 150, 75);
    flush();
    expect(el).toHaveAttribute("data-pointer");
    move(el, 160, 80);
    expect(queue.size).toBe(1);
    fireEvent.pointerLeave(el);
    expect(queue.size).toBe(0);
    expect(el).not.toHaveAttribute("data-pointer");
    for (const name of ["--px", "--py", "--tx", "--ty", "--pull-x", "--pull-y"]) expect(el.style.getPropertyValue(name)).toBe("");
    flush();
    expect(el).not.toHaveAttribute("data-pointer");
  });

  it("ignores touch and does nothing at all when the primary pointer cannot hover (no listeners, no writes)", () => {
    mouse();
    const { unmount } = render(<Probe />);
    move(screen.getByTestId("box"), 150, 75, "touch");
    expect(queue.size).toBe(0);
    unmount();
    // a phone: no hover-capable fine pointer
    media();
    const add = vi.spyOn(Element.prototype, "addEventListener");
    render(<Probe />);
    const own = screen.getByTestId("box");
    expect(add.mock.calls.filter(([type], i) => type === "pointermove" && add.mock.contexts[i] === own)).toHaveLength(0); // React's own root listeners are not ours
    move(own, 150, 75);
    expect(queue.size).toBe(0);
    expect(screen.getByTestId("box")).not.toHaveAttribute("data-pointer");
  });

  it("is off under reduced motion, even with a mouse", () => {
    media("hover: hover", "reduce");
    render(<Probe />);
    move(screen.getByTestId("box"), 150, 75);
    expect(queue.size).toBe(0);
    expect(screen.getByTestId("box")).not.toHaveAttribute("data-pointer");
  });

  it("can be disabled", () => {
    mouse();
    render(<Probe enabled={false} />);
    move(screen.getByTestId("box"), 150, 75);
    expect(queue.size).toBe(0);
  });

  it("with a radius it listens on the document, pulls while the pointer is near and resets when it moves away", () => {
    mouse();
    render(<Probe radius={80} strength={0.5} />);
    const el = screen.getByTestId("box");
    move(document, 340, 100); // 40 px right of the box, inside the reach
    flush();
    expect(el).toHaveAttribute("data-pointer", "active");
    expect(Number(el.style.getPropertyValue("--pull-x"))).toBeGreaterThan(0);
    move(document, 600, 100); // far away
    flush();
    expect(el).not.toHaveAttribute("data-pointer");
    expect(el.style.getPropertyValue("--pull-x")).toBe("");
    // and the pointer leaving the page resets too
    move(document, 340, 100);
    flush();
    expect(el).toHaveAttribute("data-pointer");
    fireEvent.pointerLeave(document.documentElement);
    expect(el).not.toHaveAttribute("data-pointer");
  });

  it("cleans up on unmount (listeners, frame, variables) and works after StrictMode's remount", () => {
    mouse();
    const removeDoc = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<Probe radius={50} />);
    const el = screen.getByTestId("box");
    move(document, 300, 100);
    flush();
    expect(el).toHaveAttribute("data-pointer");
    move(document, 310, 100);
    expect(queue.size).toBe(1);
    unmount();
    expect(queue.size).toBe(0);
    expect(removeDoc.mock.calls.some(([type]) => type === "pointermove")).toBe(true);
    expect(el).not.toHaveAttribute("data-pointer");
    // a fresh mount (StrictMode already mounted, unmounted and mounted this one) still works
    render(<Probe />);
    const fresh = screen.getAllByTestId("box").at(-1)!;
    move(fresh, 150, 75);
    flush();
    expect(fresh).toHaveAttribute("data-pointer", "active");
  });

  it("does not touch window or document while rendering on the server", () => {
    expect(renderToString(<Probe />)).toContain("data-testid");
    expect(renderToString(<SpotlightCard>Hi</SpotlightCard>)).toContain("spotlight");
    expect(renderToString(<TiltCard>Hi</TiltCard>)).toContain("tilt");
    expect(renderToString(<Magnetic>Hi</Magnetic>)).toContain("magnetic");
  });
});

describe("SpotlightCard", () => {
  it("is a Card with the spotlight utility that follows the mouse", () => {
    mouse();
    render(
      <SpotlightCard data-testid="card" glowSize={120} className="p-4" aria-label="Plan">
        Pro
      </SpotlightCard>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-slot", "card");
    expect(card).toHaveClass("spotlight", "p-4");
    expect(card.style.getPropertyValue("--sutra-spotlight-size")).toBe("120px");
    move(card, 150, 75);
    flush();
    expect(card).toHaveAttribute("data-pointer", "active");
    expect(card.style.getPropertyValue("--px")).toBe("50px");
  });

  it("forwards the ref and keeps its content reachable and accessible", async () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <SpotlightCard ref={ref} as="article">
        <a href="#x">Read more</a>
      </SpotlightCard>
    );
    expect(ref.current?.tagName).toBe("ARTICLE");
    expect(screen.getByRole("link", { name: "Read more" })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("TiltCard", () => {
  it("reads the pointer on a still wrapper and tilts the card inside it", () => {
    mouse();
    render(
      <TiltCard data-testid="card" max={10} spotlight>
        Hello
      </TiltCard>
    );
    const card = screen.getByTestId("card");
    const field = card.parentElement!;
    expect(field).toHaveAttribute("data-slot", "tilt-card-field");
    expect(card).toHaveClass("tilt", "spotlight");
    expect(card.style.getPropertyValue("--sutra-tilt-max")).toBe("10deg");
    expect(field).not.toHaveClass("tilt");
    move(field, 280, 140);
    flush();
    expect(field).toHaveAttribute("data-pointer", "active");
    expect(card).not.toHaveAttribute("data-pointer"); // the card inherits the variables, it does not hold the pointer
    expect(field.style.getPropertyValue("--tx")).toBe("0.8");
    expect(field.style.getPropertyValue("--ty")).toBe("0.8");
  });

  it("has no tilt class on a plain card and forwards the ref to the card", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<TiltCard ref={ref} data-testid="card" />);
    expect(ref.current).toBe(screen.getByTestId("card"));
    expect(screen.getByTestId("card")).not.toHaveClass("spotlight");
  });
});

describe("Magnetic", () => {
  it("measures on the wrapper and moves an inner box, with the radius and strength passed to the hook", () => {
    mouse();
    render(
      <Magnetic radius={60} strength={0.5} data-testid="mag" className="w-fit">
        <button type="button">Buy</button>
      </Magnetic>
    );
    const wrapper = screen.getByTestId("mag");
    const inner = screen.getByRole("button", { name: "Buy" }).parentElement!;
    expect(wrapper).toHaveClass("inline-flex", "w-fit");
    expect(inner).toHaveClass("magnetic");
    move(document, 320, 100); // 20 px past the right edge
    flush();
    expect(wrapper).toHaveAttribute("data-pointer", "active");
    expect(Number(wrapper.style.getPropertyValue("--pull-x"))).toBeGreaterThan(0);
    expect(inner).not.toHaveAttribute("data-pointer");
    move(document, 700, 100);
    flush();
    expect(wrapper).not.toHaveAttribute("data-pointer");
  });

  it("does not get in the way of the child", () => {
    const onClick = vi.fn();
    render(
      <Magnetic>
        <button type="button" onClick={onClick}>
          Go
        </button>
      </Magnetic>
    );
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Magnetic>
        <button type="button">Go</button>
      </Magnetic>
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("pointer utilities in styles/*.css", () => {
  const sutra = readFileSync(path.resolve(__dirname, "../src/styles/sutra.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const paper = readFileSync(path.resolve(__dirname, "../src/styles/paper.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const body = (css: string, header: string) => {
    const start = css.indexOf(header);
    expect(start, header).toBeGreaterThan(-1);
    let i = css.indexOf("{", start);
    const open = i;
    for (let depth = 1; depth > 0; ) {
      i++;
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    return css.slice(open + 1, i);
  };

  it("the three utilities read the hook's variables", () => {
    expect(body(sutra, "@utility spotlight")).toContain("var(--px, 50%) var(--py, 50%)");
    expect(body(sutra, "@utility tilt")).toMatch(/var\(--ty, 0\)[\s\S]*var\(--tx, 0\)/);
    expect(body(sutra, "@utility magnetic")).toMatch(/var\(--pull-x, 0\)[\s\S]*var\(--pull-y, 0\)/);
  });

  it("tilt and magnetic move only without reduced motion, and only while the pointer is active", () => {
    for (const utility of ["tilt", "magnetic"]) {
      const css = body(sutra, `@utility ${utility}`);
      const media = body(css, "@media (prefers-reduced-motion: no-preference)");
      expect(media, utility).toContain('[data-pointer="active"]');
      expect(css.replace(media, ""), utility).not.toMatch(/\b(transform|translate):/);
      // spring tokens, never a literal curve
      expect(css, utility).toContain("var(--sutra-spring-snappy)");
      expect(css, utility).not.toMatch(/linear\(|cubic-bezier\(/);
    }
  });

  it("the glow shows on hover and on keyboard focus, and the strengths are tokens that paper retunes", () => {
    const spotlight = body(sutra, "@utility spotlight");
    expect(spotlight).toContain('&[data-pointer="active"]::before');
    expect(spotlight).toContain("&:has(:focus-visible)::before");
    for (const token of ["--sutra-spotlight-alpha", "--sutra-tilt-max", "--sutra-magnetic-scale"]) {
      expect(sutra, token).toContain(`${token}:`);
      expect(paper, token).toContain(`${token}:`);
    }
    // calmer than stock
    const num = (css: string, token: string) => parseFloat(new RegExp(`${token}:\\s*([\\d.]+)`).exec(css)![1]!);
    expect(num(paper, "--sutra-tilt-max")).toBeLessThan(num(sutra, "--sutra-tilt-max"));
    expect(num(paper, "--sutra-spotlight-alpha")).toBeLessThan(num(sutra, "--sutra-spotlight-alpha"));
    expect(num(paper, "--sutra-magnetic-scale")).toBeLessThan(num(sutra, "--sutra-magnetic-scale"));
  });
});
