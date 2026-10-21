/**
 * useSpringValue, stagger, SplitText, Typewriter / useTypewriter: behaviour, accessibility (real text for screen
 * readers, aria-hidden pieces), reduced motion, StrictMode (every test renders inside it) and server rendering.
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stagger, useStagger } from "../src/hooks/use-stagger";
import { useSpringValue } from "../src/hooks/use-spring-value";
import { useTypewriter } from "../src/hooks/use-typewriter";
import { SplitText } from "../src/patterns/split-text";
import { Typewriter } from "../src/patterns/typewriter";
import { axeViolations } from "./helpers/a11y";
import { reduceMotion, resetMedia } from "./helpers/media";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetMedia();
});

describe("stagger", () => {
  it("sets --i, optionally with a step, and floors bad input to 0", () => {
    expect(stagger(3)).toEqual({ "--i": 3 });
    expect(stagger(2, 45)).toEqual({ "--i": 2, "--sutra-stagger": "45ms" });
    expect(stagger(-2)["--i"]).toBe(0);
    expect(stagger(Number.NaN)["--i"]).toBe(0);
    expect(stagger(1.9)["--i"]).toBe(1);
  });

  it("useStagger returns a stable function for a step", () => {
    const { result, rerender } = renderHook(({ step }) => useStagger(step), { initialProps: { step: 20 } });
    const first = result.current;
    rerender({ step: 20 });
    expect(result.current).toBe(first);
    expect(first(1)).toEqual({ "--i": 1, "--sutra-stagger": "20ms" });
    rerender({ step: 40 });
    expect(result.current).not.toBe(first);
  });
});

describe("useSpringValue", () => {
  let queue: FrameRequestCallback[] = [];
  let clock = 0;
  /** Runs the queued frames, one act each so React renders every step (a single act batches them into one render). */
  const frames = () => {
    let n = 0;
    while (queue.length && n < 600) {
      clock += 16;
      const frame = queue.shift()!;
      act(() => frame(clock));
      n++;
    }
    return n;
  };
  beforeEach(() => {
    queue = [];
    clock = 1000;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => queue.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => (queue = []));
    vi.spyOn(performance, "now").mockImplementation(() => clock);
  });

  it("starts at the target (no animation on mount), springs to a new one and rests", () => {
    const { result, rerender } = renderHook(({ t }) => useSpringValue(t, { config: "snappy" }), { initialProps: { t: 10 } });
    expect(result.current).toBe(10);
    expect(queue).toHaveLength(0);
    rerender({ t: 50 });
    frames();
    expect(result.current).toBe(50);
    expect(queue).toHaveLength(0); // nothing keeps running at rest
  });

  it("moves through intermediate values and overshoots with the bouncy spring", () => {
    const seen: number[] = [];
    const { rerender } = renderHook(
      ({ t }) => {
        const v = useSpringValue(t, { config: "bouncy" });
        seen.push(v);
        return v;
      },
      { initialProps: { t: 0 } }
    );
    rerender({ t: 100 });
    frames();
    expect(new Set(seen).size).toBeGreaterThan(8);
    expect(Math.max(...seen)).toBeGreaterThan(105);
    expect(seen.at(-1)).toBe(100);
  });

  it("with onUpdate it reports every frame and never re-renders", () => {
    const onUpdate = vi.fn();
    let renders = 0;
    const { rerender } = renderHook(
      ({ t }) => {
        renders++;
        return useSpringValue(t, { onUpdate });
      },
      { initialProps: { t: 0 } }
    );
    const before = renders;
    rerender({ t: 1 });
    const afterRerender = renders;
    frames();
    expect(renders).toBe(afterRerender);
    expect(afterRerender).toBeGreaterThan(before);
    expect(onUpdate.mock.calls.length).toBeGreaterThan(5);
    expect(onUpdate).toHaveBeenLastCalledWith(1);
  });

  it("retargets mid-flight and honours an initial value", () => {
    const { result, rerender } = renderHook(({ t }) => useSpringValue(t, { initial: 0 }), { initialProps: { t: 20 } });
    frames();
    expect(result.current).toBe(20);
    rerender({ t: 40 });
    act(() => {
      for (let i = 0; i < 3; i++) queue.shift()?.((clock += 16));
    });
    const mid = result.current;
    expect(mid).toBeGreaterThan(20);
    expect(mid).toBeLessThan(40);
    rerender({ t: 0 });
    frames();
    expect(result.current).toBe(0);
  });

  it("under reduced motion it jumps to the target, with no frames", () => {
    reduceMotion(true);
    const { result, rerender } = renderHook(({ t }) => useSpringValue(t), { initialProps: { t: 1 } });
    rerender({ t: 99 });
    expect(result.current).toBe(99);
    frames();
    expect(result.current).toBe(99);
    expect(queue).toHaveLength(0);
  });

  it("stops its frame loop on unmount", () => {
    const cancel = vi.fn(() => (queue = []));
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const { rerender, unmount } = renderHook(({ t }) => useSpringValue(t), { initialProps: { t: 0 } });
    rerender({ t: 5 });
    expect(queue.length).toBe(1);
    unmount();
    expect(queue).toHaveLength(0);
    expect(cancel).toHaveBeenCalled();
  });

  it("does not touch window on the server", () => {
    function Probe() {
      return <span>{useSpringValue(3)}</span>;
    }
    expect(renderToString(<Probe />)).toContain("3");
  });
});

describe("useTypewriter", () => {
  beforeEach(() => vi.useFakeTimers());
  /** Advances in 1 ms steps, one act each: a timer's state update must render before the next timer is scheduled. */
  const tick = (ms: number) => {
    for (let i = 0; i < ms; i++) act(() => void vi.advanceTimersByTime(1));
  };

  it("types a line one character at a time, then is done (and calls onDone once)", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useTypewriter("Hi!", { speed: 10, delay: 100, onDone }));
    expect(result.current).toMatchObject({ text: "", line: "Hi!", done: false });
    tick(109);
    expect(result.current.text).toBe("");
    tick(1);
    expect(result.current.text).toBe("H");
    tick(10);
    expect(result.current.text).toBe("Hi");
    tick(10);
    expect(result.current.text).toBe("Hi!");
    tick(5);
    expect(result.current.done).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
    tick(5000);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0); // nothing runs at rest
  });

  it("does not split an emoji or a combined character", () => {
    const { result } = renderHook(() => useTypewriter("a👩‍👩‍👧b", { speed: 5 }));
    tick(10);
    expect(result.current.text).toBe("a👩‍👩‍👧");
    tick(5);
    expect(result.current.text).toBe("a👩‍👩‍👧b");
  });

  it("types several lines in turn, deleting each, and keeps the last", () => {
    const { result } = renderHook(() => useTypewriter(["ab", "c"], { speed: 10, deleteSpeed: 10, hold: 50 }));
    tick(20);
    expect(result.current).toMatchObject({ text: "ab", index: 0 });
    tick(62); // held for 50, then the first character is deleted
    expect(result.current.text).toBe("a");
    tick(10);
    expect(result.current.text).toBe("");
    tick(25); // the next line starts, its first character is typed
    expect(result.current).toMatchObject({ index: 1, text: "c", line: "c" });
    tick(100);
    expect(result.current).toMatchObject({ index: 1, text: "c", done: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("with loop it wraps around and never finishes", () => {
    const { result } = renderHook(() => useTypewriter(["a", "b"], { speed: 5, deleteSpeed: 5, hold: 10, loop: true }));
    tick(1000);
    expect(result.current.done).toBe(false);
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) {
      tick(5);
      seen.add(result.current.index);
    }
    expect(seen).toEqual(new Set([0, 1]));
  });

  it("starts over when the text changes", () => {
    const { result, rerender } = renderHook(({ t }) => useTypewriter(t, { speed: 10 }), { initialProps: { t: "one" } });
    tick(100);
    expect(result.current.text).toBe("one");
    rerender({ t: "two!" });
    expect(result.current).toMatchObject({ text: "", line: "two!", done: false });
    tick(100);
    expect(result.current.text).toBe("two!");
  });

  it("clears its timer on unmount", () => {
    const { unmount } = renderHook(() => useTypewriter("hello", { speed: 10 }));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("under reduced motion the finished text is there at once and nothing runs", () => {
    reduceMotion(true);
    const { result } = renderHook(() => useTypewriter("full text", { speed: 10 }));
    expect(result.current).toMatchObject({ text: "full text", done: true });
    expect(vi.getTimerCount()).toBe(0);
    const many = renderHook(() => useTypewriter(["first", "last"]));
    expect(many.result.current.text).toBe("last");
    const looping = renderHook(() => useTypewriter(["first", "last"], { loop: true }));
    expect(looping.result.current.text).toBe("first");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Typewriter", () => {
  beforeEach(() => vi.useFakeTimers());
  const tick = (ms: number) => {
    for (let i = 0; i < ms; i++) act(() => void vi.advanceTimersByTime(1));
  };

  it("keeps the whole line as real text for assistive tech and hides the typed part and the caret", () => {
    const { container } = render(<Typewriter text="Hello there" speed={10} />);
    expect(screen.getByText("Hello there")).toHaveClass("sr-only");
    const visible = container.querySelector("[aria-hidden=true]")!;
    expect(visible.textContent).toBe("");
    tick(30);
    expect(visible.textContent).toBe("Hel");
    expect(container.querySelector("[data-slot=typewriter-caret]")).not.toBeNull();
    expect(container.querySelector("[data-slot=typewriter-caret]")!.closest("[aria-hidden=true]")).toBe(visible);
  });

  it("the caret goes when it is done, so nothing blinks at rest; cursor='always' blinks, 'none' never shows", () => {
    const { container, rerender } = render(<Typewriter text="ab" speed={5} />);
    tick(100);
    expect(container.firstElementChild).toHaveAttribute("data-state", "done");
    expect(container.querySelector("[data-slot=typewriter-caret]")).toBeNull();
    rerender(<Typewriter text="ab" speed={5} cursor="always" />);
    expect(container.querySelector("[data-slot=typewriter-caret]")).toHaveClass("animate-caret-blink");
    rerender(<Typewriter text="ab" speed={5} cursor="none" />);
    expect(container.querySelector("[data-slot=typewriter-caret]")).toBeNull();
  });

  it("a multi-line typewriter exposes the current line, forwards ref and props, and can reserve space", () => {
    const ref = React.createRef<HTMLElement>();
    const { container } = render(<Typewriter ref={ref} text={["short", "a longer line"]} reserve as="p" id="t" className="x" speed={5} />);
    expect(ref.current?.tagName).toBe("P");
    expect(ref.current).toHaveAttribute("id", "t");
    expect(ref.current).toHaveClass("x", "inline-grid");
    expect(container.querySelector(".invisible")!.textContent).toBe("a longer line");
    expect(screen.getByText("short")).toHaveClass("sr-only");
  });

  it("under reduced motion it prints the text at once, without a caret", () => {
    reduceMotion(true);
    const { container } = render(<Typewriter text="all of it" />);
    expect(container.querySelector("[aria-hidden=true]")!.textContent).toBe("all of it");
    expect(container.querySelector("[data-slot=typewriter-caret]")).toBeNull();
  });

  it("is axe clean while typing", async () => {
    vi.useRealTimers();
    const { container } = render(
      <main>
        <h1>
          <Typewriter text="Hello" />
        </h1>
      </main>
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("renders the full text on the server for crawlers and no-JS", () => {
    expect(renderToString(<Typewriter text="Server text" />)).toContain("Server text");
  });
});

describe("SplitText", () => {
  it("holds the real text once for screen readers and hides the pieces", () => {
    const { container } = render(<SplitText text="Hello world" />);
    expect(screen.getByText("Hello world")).toHaveClass("sr-only");
    const visual = container.querySelector("[aria-hidden=true]")!;
    expect(visual.textContent).toBe("Hello world");
    expect(visual.querySelectorAll("[data-slot=split-text-piece]")).toHaveLength(10); // letters, no space
  });

  it("splits by character with --i per piece, keeps words unbroken and staggers", () => {
    const { container } = render(<SplitText text="ab cd" step={30} />);
    const pieces = [...container.querySelectorAll<HTMLElement>("[data-slot=split-text-piece]")];
    expect(pieces.map((p) => p.textContent)).toEqual(["a", "b", "c", "d"]);
    expect(pieces.map((p) => p.style.getPropertyValue("--i"))).toEqual(["0", "1", "2", "3"]);
    for (const p of pieces) expect(p).toHaveClass("animate-fade-up", "stagger", "inline-block");
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--sutra-stagger")).toBe("30ms");
    expect(root.style.getPropertyValue("--sutra-stagger-max")).toBe("4"); // no cap at 12 for text
    expect(pieces[0]!.parentElement).toHaveClass("whitespace-nowrap");
  });

  it("splits by word, with the other effects", () => {
    const { container, rerender } = render(<SplitText text="one two  three" by="word" effect="pop-in" />);
    const pieces = [...container.querySelectorAll("[data-slot=split-text-piece]")];
    expect(pieces.map((p) => p.textContent)).toEqual(["one", "two", "three"]);
    expect(pieces[0]).toHaveClass("animate-pop-in");
    rerender(<SplitText text="one two  three" by="word" effect="fade-in" />);
    expect(container.querySelector("[data-slot=split-text-piece]")).toHaveClass("animate-fade-in");
  });

  it("keeps a long text's reveal under about 1.2 s and does not split emoji", () => {
    const long = "word ".repeat(200).trim();
    const { container } = render(<SplitText text={long} />);
    const root = container.firstElementChild as HTMLElement;
    const step = parseFloat(root.style.getPropertyValue("--sutra-stagger"));
    const count = Number(root.style.getPropertyValue("--sutra-stagger-max"));
    expect(step * (count - 1)).toBeLessThanOrEqual(1200 + 1e-6);
    const emoji = render(<SplitText text="👍🏽 ok" />);
    expect(emoji.container.querySelectorAll("[data-slot=split-text-piece]")[0]!.textContent).toBe("👍🏽");
  });

  it("renders the plain text under reduced motion or with animate={false}", () => {
    const off = render(<SplitText text="Plain" animate={false} className="x" />);
    expect(off.container.firstElementChild!.textContent).toBe("Plain");
    expect(off.container.querySelector("[data-slot=split-text-piece]")).toBeNull();
    off.unmount();
    reduceMotion(true);
    const reduced = render(<SplitText text="Still" />);
    expect(reduced.container.firstElementChild!.textContent).toBe("Still");
    expect(reduced.container.querySelector(".sr-only")).toBeNull();
  });

  it("forwards ref, as and props; changing the text replays the reveal", () => {
    const ref = React.createRef<HTMLElement>();
    const { container, rerender } = render(<SplitText ref={ref} as="h2" id="h" text="First" />);
    expect(ref.current?.tagName).toBe("H2");
    expect(ref.current).toHaveAttribute("id", "h");
    const first = container.querySelector("[data-slot=split-text-piece]");
    rerender(<SplitText ref={ref} as="h2" id="h" text="Second" />);
    expect(container.querySelector("[data-slot=split-text-piece]")).not.toBe(first);
  });

  it("is axe clean inside a heading and renders on the server", async () => {
    const { container } = render(
      <main>
        <SplitText as="h1" text="Hello world" />
      </main>
    );
    expect(await axeViolations(container)).toEqual([]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("Hello world");
    expect(renderToString(<SplitText text="Server" />)).toContain("Server");
  });
});
