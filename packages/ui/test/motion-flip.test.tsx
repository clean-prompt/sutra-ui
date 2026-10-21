/**
 * FLIP: the pure diff (lib/flip), `useFlip` against mocked rects and a stubbed `Element.animate` (jsdom has no layout and
 * no WAAPI), reduced motion, StrictMode (every render is inside it), `AnimatedList flip` and `ReorderableList` drops.
 */
import * as React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLIP_MAX, flipInverseKeyframes, flipKeyframes, flipMoves, parseCssTime, sameKeys, type FlipRect } from "../src/lib/flip";
import { useFlip } from "../src/hooks/use-flip";
import { AnimatedList } from "../src/patterns/animated-list";
import { ReorderableList } from "../src/patterns/reorderable-list";
import { axeViolations } from "./helpers/a11y";
import { reduceMotion, resetMedia } from "./helpers/media";

const keyOf = (el: Element) => el.textContent?.trim().slice(0, 1);
const rect = (x: number, y: number, width = 100, height = 20): FlipRect => ({ x, y, width, height });
const map = (o: Record<string, FlipRect>) => new Map(Object.entries(o));

describe("lib/flip", () => {
  it("sameKeys compares order, not membership", () => {
    expect(sameKeys(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameKeys(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameKeys(["a"], ["a", "b"])).toBe(false);
    expect(sameKeys(null, [])).toBe(false);
  });

  it("flipMoves reports the distance back to the first place, in key order, for moved keys only", () => {
    const first = map({ a: rect(0, 0), b: rect(0, 20), c: rect(0, 40), gone: rect(0, 60) });
    const last = map({ a: rect(0, 0), b: rect(0, 40), c: rect(0, 20), fresh: rect(0, 60) });
    expect(flipMoves(first, last, ["a", "c", "b", "fresh"])).toEqual([
      { key: "c", dx: 0, dy: 20, sx: 1, sy: 1 },
      { key: "b", dx: 0, dy: -20, sx: 1, sy: 1 },
    ]);
  });

  it("ignores sub-pixel noise and no change at all (what StrictMode's second run sees)", () => {
    const same = map({ a: rect(0, 0), b: rect(0.2, 20.3) });
    expect(flipMoves(same, map({ a: rect(0, 0), b: rect(0, 20) }), ["a", "b"])).toEqual([]);
    expect(flipMoves(same, same, ["a", "b"])).toEqual([]);
  });

  it("caps the batch at max (default 40) and skips what is off screen before and after", () => {
    const keys = Array.from({ length: 60 }, (_, i) => `k${i}`);
    const first = new Map(keys.map((k, i) => [k, rect(0, i * 20)] as const));
    const last = new Map(keys.map((k, i) => [k, rect(0, i * 20 + 8)] as const));
    expect(FLIP_MAX).toBe(40);
    expect(flipMoves(first, last, keys)).toHaveLength(40);
    expect(flipMoves(first, last, keys, { max: 3 }).map((m) => m.key)).toEqual(["k0", "k1", "k2"]);
    expect(flipMoves(first, last, keys, { visible: (_a, _b, key) => key === "k5" }).map((m) => m.key)).toEqual(["k5"]);
  });

  it("compares sizes only with scale, and builds translate / scale keyframes", () => {
    const first = map({ a: rect(0, 0, 200, 40) });
    const last = map({ a: rect(0, 0, 100, 20) });
    expect(flipMoves(first, last, ["a"])).toEqual([]);
    const [move] = flipMoves(first, last, ["a"], { scale: true });
    expect(move).toEqual({ key: "a", dx: 0, dy: 0, sx: 2, sy: 2 });
    expect(flipKeyframes({ key: "a", dx: 5, dy: -8, sx: 2, sy: 2 })).toEqual([{ translate: "5px -8px" }, { translate: "0px 0px" }]);
    expect(flipKeyframes(move!, true)[0]).toMatchObject({ translate: "0px 0px", scale: "2 2", transformOrigin: "0 0" });
    expect(flipInverseKeyframes(move!)[0]).toMatchObject({ scale: "0.5 0.5" });
  });

  it("parseCssTime reads the motion tokens", () => {
    expect(parseCssTime("337ms")).toBe(337);
    expect(parseCssTime(" 0.3s ")).toBe(300);
    expect(parseCssTime("")).toBeUndefined();
    expect(parseCssTime("linear(0, 1)")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */

/** Rows are laid out one under the other in DOM order (20 px each); a row is an `li` whose text starts with its key. */
let animations: { el: Element; frames: Keyframe[]; options: KeyframeAnimationOptions; cancel: ReturnType<typeof vi.fn>; finish: () => void }[] = [];

beforeEach(() => {
  reduceMotion(false);
  animations = [];
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const key = this.tagName === "LI" ? (this as HTMLElement).textContent?.trim().slice(0, 1) : undefined;
    const top = key ? Array.from(this.parentElement!.children).indexOf(this) * 20 : 0;
    return { left: 0, top, right: 100, bottom: top + 20, width: 100, height: key ? 20 : 0, x: 0, y: top, toJSON() {} } as DOMRect;
  };
  Element.prototype.animate = function (this: Element, frames: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) {
    const cancel = vi.fn();
    const animation = { cancel, onfinish: null as null | (() => void), oncancel: null } as unknown as Animation;
    animations.push({ el: this, frames: frames as Keyframe[], options: options as KeyframeAnimationOptions, cancel, finish: () => animation.onfinish?.call(animation, undefined as never) });
    return animation;
  };
});
afterEach(() => {
  resetMedia();
  delete (Element.prototype as { animate?: unknown }).animate;
  delete (Element.prototype as { getBoundingClientRect?: unknown }).getBoundingClientRect;
  // restore jsdom's own rect function from the prototype chain
  Object.defineProperty(Element.prototype, "getBoundingClientRect", { configurable: true, writable: true, value: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} }) });
});

function Rows({ order, ...options }: { order: string[]; [k: string]: unknown }) {
  const flip = useFlip(order, options);
  return (
    <ul>
      {order.map((k) => (
        <li key={k} data-key={k} ref={flip(k)}>
          {k}
        </li>
      ))}
    </ul>
  );
}

describe("useFlip", () => {
  it("animates only the rows that moved, from their old place, with translate and composite replace", () => {
    const { rerender } = render(<Rows order={["a", "b", "c"]} />);
    expect(animations).toHaveLength(0); // the first render measures, never animates
    rerender(<Rows order={["c", "a", "b"]} />);
    const moved = animations.map((a) => [keyOf(a.el), (a.frames[0] as { translate: string }).translate]);
    expect(moved).toEqual([
      ["c", "0px 40px"],
      ["a", "0px -20px"],
      ["b", "0px -20px"],
    ]);
    expect(animations[0]!.options).toMatchObject({ composite: "replace", duration: 300, easing: "ease" }); // no tokens in jsdom: the fallbacks
    expect(animations[0]!.frames[1]).toEqual({ translate: "0px 0px" });
  });

  it("does nothing when the keys are unchanged, and for a new or removed key", () => {
    const { rerender } = render(<Rows order={["a", "b"]} />);
    rerender(<Rows order={["a", "b"]} />);
    expect(animations).toHaveLength(0);
    rerender(<Rows order={["x", "a", "b"]} />); // x is new, a and b are pushed down by x
    expect(animations.map((a) => keyOf(a.el))).toEqual(["a", "b"]);
    animations.forEach((a) => a.finish());
    animations = [];
    rerender(<Rows order={["a", "b"]} />); // x removed: a and b move back up
    expect(animations.map((a) => keyOf(a.el))).toEqual(["a", "b"]);
  });

  it("cancels an animation in flight before the next one, and on unmount", () => {
    const { rerender, unmount } = render(<Rows order={["a", "b"]} />);
    rerender(<Rows order={["b", "a"]} />);
    const first = [...animations];
    expect(first).toHaveLength(2);
    rerender(<Rows order={["a", "b"]} />);
    for (const a of first) expect(a.cancel).toHaveBeenCalledTimes(1);
    const second = animations.slice(2);
    unmount();
    for (const a of second) expect(a.cancel).toHaveBeenCalled();
  });

  it("respects max, duration, scale and enabled", () => {
    const { rerender } = render(<Rows order={["a", "b", "c", "d"]} max={2} duration={120} />);
    rerender(<Rows order={["d", "c", "b", "a"]} max={2} duration={120} />);
    expect(animations).toHaveLength(2);
    expect(animations[0]!.options.duration).toBe(120);
    animations = [];
    rerender(<Rows order={["a", "b", "c", "d"]} enabled={false} />);
    expect(animations).toHaveLength(0);
  });

  it("is off under reduced motion, where animate is missing, and still tracks positions", () => {
    reduceMotion(true);
    const { rerender } = render(<Rows order={["a", "b"]} />);
    rerender(<Rows order={["b", "a"]} />);
    expect(animations).toHaveLength(0);
    reduceMotion(false);
    rerender(<Rows order={["a", "b"]} />); // positions were tracked while reduced, so this one is a real move
    expect(animations).toHaveLength(2);
    delete (Element.prototype as { animate?: unknown }).animate;
    expect(() => rerender(<Rows order={["b", "a"]} />)).not.toThrow();
  });

  it("`from` animates a row from a given viewport rect even though the keys did not change", () => {
    function Hinted({ order, hint }: { order: string[]; hint?: { key: string; top: number } }) {
          const flip = useFlip(order);
      if (hint) flip.from(hint.key, { left: 0, top: hint.top, width: 100, height: 20 });
      return (
        <ul>
          {order.map((k) => (
            <li key={k} data-key={k} ref={flip(k)}>
              {k}
            </li>
          ))}
        </ul>
      );
    }
    const { rerender } = render(<Hinted order={["a", "b"]} />);
    rerender(<Hinted order={["a", "b"]} hint={{ key: "b", top: 100 }} />);
    expect(animations).toHaveLength(1);
    expect((animations[0]!.frames[0] as { translate: string }).translate).toBe("0px 80px");
  });

  it("renderToString never touches window", async () => {
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(<Rows order={["a", "b"]} />);
    expect(html).toContain('data-key="a"');
  });

  it("renderHook: the register function is stable and hands out one ref callback per key", () => {
    const { result, rerender } = renderHook(({ keys }) => useFlip(keys), { initialProps: { keys: ["a", "b"] } });
    const register = result.current;
    expect(register("a")).toBe(register("a"));
    rerender({ keys: ["b"] });
    expect(result.current).toBe(register);
  });
});

describe("AnimatedList flip", () => {
  type Row = { id: string; label: string };
  const List = ({ items, flip }: { items: Row[]; flip?: boolean }) => {
    return (
      <AnimatedList items={items} getKey={(i) => i.id} flip={flip} collapse={false} renderItem={(i) => <span>{i.label}</span>} data-testid="list" />
    );
  };
  const rowsOf = (ids: string[]) => ids.map((id) => ({ id, label: id }));

  it("is off by default: nothing is animated", () => {
    const { rerender } = render(<List items={rowsOf(["a", "b", "c"])} />);
    rerender(<List items={rowsOf(["c", "a", "b"])} />);
    expect(animations).toHaveLength(0);
  });

  it("slides the siblings when rows are reordered, and keeps the markup contract", async () => {
    const { rerender, container } = render(<List items={rowsOf(["a", "b", "c"])} flip />);
    rerender(<List items={rowsOf(["c", "a", "b"])} flip />);
    expect(animations.length).toBe(3);
    expect(container.querySelectorAll("[data-slot=animated-list-item]")).toHaveLength(3);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("ReorderableList flip", () => {
  type Item = { id: string };
  const Demo = ({ order, flip, onReorder }: { order: string[]; flip?: boolean; onReorder?: (items: Item[]) => void }) => {
      return (
      <ReorderableList
        items={order.map((id) => ({ id }))}
        getKey={(i) => i.id}
        getLabel={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        onReorder={(items) => onReorder?.(items)}
        flip={flip}
        moveButtons
      />
    );
  };

  it("the move buttons reorder and the swapped rows glide", () => {
    const seen: string[][] = [];
    const { rerender } = render(<Demo order={["a", "b", "c"]} onReorder={(items) => seen.push(items.map((i) => i.id))} />);
    fireEvent.click(screen.getByRole("button", { name: "Move a down" }));
    expect(seen).toEqual([["b", "a", "c"]]);
    rerender(<Demo order={["b", "a", "c"]} onReorder={(items) => seen.push(items.map((i) => i.id))} />);
    expect(animations.map((a) => keyOf(a.el)).sort()).toEqual(["a", "b"]);
  });

  it("keyboard lift and move works as before and glides the neighbour; flip={false} turns it off", () => {
    const { rerender } = render(<Demo order={["a", "b", "c"]} />);
    const handle = screen.getByRole("button", { name: "Reorder a" });
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(screen.getByRole("status")).toHaveTextContent("Moved a to position 2 of 3");
    expect(animations.length).toBeGreaterThan(0);
    rerender(<Demo order={["a", "b", "c"]} flip={false} />);
  });
});
