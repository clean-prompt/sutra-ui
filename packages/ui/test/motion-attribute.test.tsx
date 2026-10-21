/**
 * `<html data-motion="reduce" | "full">`: the in-app twin of `prefers-reduced-motion`.
 * CSS: the net has an identical twin for "reduce", "full" lifts it, `motion-reduce:` / `motion-safe:` follow the attribute
 * (compiled with Tailwind itself). JS: `prefersReducedMotion()`, `usePrefersReducedMotion()` and the components that read
 * them (Carousel autoplay, usePresence) honour the attribute over the system setting.
 */
import * as React from "react";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compile } from "tailwindcss";
import { prefersReducedMotion, usePrefersReducedMotion } from "../src/hooks/use-media-query";
import { usePresence } from "../src/hooks/use-presence";
import { Carousel } from "../src/patterns/carousel";
import { reduceMotion as system, resetMedia } from "./helpers/media";
import { readSutraCss } from "./helpers/css";

const raw = readSutraCss();
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the block that starts at `header` (balanced braces). */
function blockAfter(source: string, header: string, from = 0): string {
  const at = source.indexOf(header, from);
  if (at < 0) throw new Error(`no block: ${header}`);
  let i = source.indexOf("{", at);
  const start = i + 1;
  for (let depth = 1; depth > 0; ) {
    i++;
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
  }
  return source.slice(start, i);
}
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

const setMotion = (value: string | null) => {
  if (value === null) document.documentElement.removeAttribute("data-motion");
  else document.documentElement.setAttribute("data-motion", value);
};
const flush = () => act(async () => void (await Promise.resolve()));

beforeEach(() => system(false));
afterEach(() => {
  cleanup(); // unmount first: the observer would report the reset below to a component outside act()
  resetMedia();
  setMotion(null);
});

describe("data-motion in CSS", () => {
  it("the reduce twin has the same rules as the media net, and `full` lifts the net", () => {
    const media = blockAfter(css, "@media (prefers-reduced-motion: reduce)");
    const net = blockAfter(media, ':where(:root:not([data-motion="full"]))');
    const twin = blockAfter(css, ':where(:root[data-motion="reduce"])');
    expect(squash(twin)).toBe(squash(net));
    expect(net).toContain('[class*="animate-pop"]');
    expect(net).toMatch(/transition-duration:\s*1ms !important/);
    expect(squash(blockAfter(media, ':root:not([data-motion="full"]) {'))).toBe("--sutra-stagger: 0ms;");
    expect(squash(blockAfter(css, ':root[data-motion="reduce"] {'))).toBe("--sutra-stagger: 0ms;");
  });

  it("view transitions and scroll effects have the attribute twin too", () => {
    expect(css).toMatch(/:root\[data-motion="reduce"\]::view-transition-group\(\*\)/);
    expect(css).toMatch(/:where\(:root\[data-motion="reduce"\]\) \[class\*="scroll-reveal"\]/);
    expect(css).toMatch(/:root:not\(\[data-motion="full"\]\)::view-transition-old\(\*\)/);
    expect(css).toMatch(/:where\(:root:not\(\[data-motion="full"\]\)\) \[class\*="scroll-progress-bar"\]/);
    const full = blockAfter(css, '@media (prefers-reduced-motion: reduce) {\n  :root[data-motion="full"] .tilt');
    expect(full).toContain(".magnetic");
  });

  it("motion-reduce: and motion-safe: follow the attribute (compiled by Tailwind)", async () => {
    const variants = [...raw.matchAll(/@custom-variant motion-(?:reduce|safe)[\s\S]*?\n\}\n/g)].map((m) => m[0]).join("\n");
    expect(variants).toContain("@custom-variant motion-reduce");
    expect(variants).toContain("@custom-variant motion-safe");
    const out = (await compile(`@tailwind utilities;\n${variants}`)).build(["motion-reduce:hidden", "motion-safe:flex"]);
    // reduce: the system's request unless the page says "full", or the page says "reduce"
    expect(out).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.motion-reduce\\:hidden:not\(:where\(:root\[data-motion="full"\]/);
    expect(out).toMatch(/\.motion-reduce\\:hidden:where\(:root\[data-motion="reduce"\], :root\[data-motion="reduce"\] \*\)/);
    // safe: the system allows it unless the page says "reduce", or the page says "full"
    expect(out).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*\.motion-safe\\:flex:not\(:where\(:root\[data-motion="reduce"\]/);
    expect(out).toMatch(/\.motion-safe\\:flex:where\(:root\[data-motion="full"\], :root\[data-motion="full"\] \*\)/);
  });
});

describe("prefersReducedMotion", () => {
  it("follows the system when the attribute is missing or has another value", () => {
    expect(prefersReducedMotion()).toBe(false);
    system(true);
    expect(prefersReducedMotion()).toBe(true);
    setMotion("system");
    expect(prefersReducedMotion()).toBe(true);
    system(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('"reduce" wins over a system that allows motion, "full" over a system that asks for less', () => {
    setMotion("reduce");
    expect(prefersReducedMotion()).toBe(true);
    system(true);
    setMotion("full");
    expect(prefersReducedMotion()).toBe(false);
    setMotion(null);
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe("usePrefersReducedMotion", () => {
  it("re-renders when the attribute changes, in both directions", async () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    setMotion("reduce");
    await flush();
    expect(result.current).toBe(true);
    setMotion("full");
    await flush();
    expect(result.current).toBe(false);
    setMotion(null);
    await flush();
    expect(result.current).toBe(false);
  });

  it('"full" keeps motion on under a system that asks for less, and removing it goes back to the system', async () => {
    system(true);
    setMotion("full");
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    setMotion(null);
    await flush();
    expect(result.current).toBe(true);
  });

  it("starts from the attribute that is already set", () => {
    setMotion("reduce");
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
    return flush();
  });

  it("shares one observer between subscribers and disconnects with the last one", async () => {
    const instances: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; cb: () => void }[] = [];
    const Real = globalThis.MutationObserver;
    class Spy {
      observe = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
      cb: () => void;
      constructor(cb: () => void) {
        this.cb = cb;
        instances.push(this);
      }
    }
    globalThis.MutationObserver = Spy as unknown as typeof MutationObserver;
    try {
      const a = renderHook(() => usePrefersReducedMotion());
      const b = renderHook(() => usePrefersReducedMotion());
      const live = () => instances.filter((i) => i.observe.mock.calls.length > 0 && i.disconnect.mock.calls.length === 0);
      expect(live().length).toBe(1);
      expect(live()[0]!.observe.mock.calls[0]![1]).toEqual({ attributes: true, attributeFilter: ["data-motion"] });
      a.unmount();
      expect(live().length).toBe(1);
      b.unmount();
      expect(live().length).toBe(0);
    } finally {
      globalThis.MutationObserver = Real;
    }
  });
});

describe("components read the attribute", () => {
  it("Carousel autoplay is off under data-motion=reduce and runs under data-motion=full on a reduced system", async () => {
    const slides = [0, 1, 2].map((n) => <div key={n}>Slide {n}</div>);
    setMotion("reduce");
    const first = render(<Carousel label="Featured" autoplay={2000}>{slides}</Carousel>);
    expect(screen.getByRole("button", { name: "Start slide show" })).toBeInTheDocument();
    first.unmount();

    system(true);
    setMotion("full");
    render(<Carousel label="Featured" autoplay={2000}>{slides}</Carousel>);
    expect(screen.getByRole("button", { name: "Pause slide show" })).toBeInTheDocument();
  });

  it("Carousel follows a change of the attribute while mounted", async () => {
    const slides = [0, 1].map((n) => <div key={n}>Slide {n}</div>);
    render(<Carousel label="Featured" autoplay={2000}>{slides}</Carousel>);
    expect(screen.getByRole("button", { name: "Pause slide show" })).toBeInTheDocument();
    setMotion("reduce");
    await flush();
    expect(screen.getByRole("button", { name: "Start slide show" })).toBeInTheDocument();
  });

  it("usePresence removes at once under data-motion=reduce and keeps an exiting row under data-motion=full", () => {
    vi.useFakeTimers();
    try {
      const run = (motion: string) => {
        setMotion(motion);
        const { result, rerender, unmount } = renderHook(({ items }) => usePresence(items, (i: string) => i), { initialProps: { items: ["a", "b"] } });
        rerender({ items: ["a"] });
        const states = result.current.map((p) => `${p.key}:${p.state}`);
        unmount();
        return states;
      };
      system(true);
      expect(run("reduce")).toEqual(["a:idle"]);
      expect(run("full")).toEqual(["a:idle", "b:exit"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
