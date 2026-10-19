/**
 * useViewTransition / runViewTransition / viewTransitionName / SharedElement: the feature test and the fallback (just run
 * the update), reduced motion, flushSync, types, the CSS in sutra.css, server rendering. jsdom has no
 * startViewTransition, so the browser is a stub that runs the callback on a microtask like the real one.
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runViewTransition, supportsViewTransitions, useViewTransition, viewTransitionName } from "../src/hooks/use-view-transition";
import { SharedElement } from "../src/patterns/shared-element";

const original = window.matchMedia;
const reduceMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({ ...original(query), matches: on && query.includes("reduce") })) as typeof window.matchMedia;
};
const doc = document as unknown as { startViewTransition?: unknown };

/** A browser: the update runs after the "snapshot" (a microtask), `finished` resolves after it. */
function stubBrowser() {
  const calls: unknown[] = [];
  doc.startViewTransition = vi.fn((arg: unknown) => {
    calls.push(arg);
    const update = typeof arg === "function" ? arg : (arg as { update: () => void }).update;
    const done = Promise.resolve().then(() => update());
    return { finished: done, ready: done.then(() => {}) };
  });
  return calls;
}
afterEach(() => {
  delete doc.startViewTransition;
  window.matchMedia = original;
  vi.restoreAllMocks();
});

describe("viewTransitionName", () => {
  it("builds a valid, stable, unique identifier from an entity id", () => {
    expect(viewTransitionName("note-12").viewTransitionName).toBe("sutra-note-12");
    expect(viewTransitionName(7).viewTransitionName).toBe("sutra-7");
    // characters that are not valid in an identifier are escaped, and different ids never collide
    const names = ["a b", "a_b", "a.b", "a/b", "a:b", "é", "a_20_b"].map((id) => viewTransitionName(id).viewTransitionName as string);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^sutra-[A-Za-z0-9_-]+$/);
  });

  it("adds the view-transition-class only when asked", () => {
    expect(viewTransitionName("x")).not.toHaveProperty("viewTransitionClass");
    expect(viewTransitionName("x", "card")).toMatchObject({ viewTransitionName: "sutra-x", viewTransitionClass: "card" });
  });
});

describe("runViewTransition", () => {
  it("without browser support it runs the update at once and resolves", async () => {
    expect(supportsViewTransitions()).toBe(false);
    const update = vi.fn();
    const done = runViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1); // synchronously: nothing is deferred in the fallback
    await expect(done).resolves.toBeUndefined();
  });

  it("with support it wraps the update in startViewTransition, committed by flushSync before the new snapshot", async () => {
    const seen: string[] = [];
    doc.startViewTransition = vi.fn((arg: unknown) => {
      const finished = Promise.resolve().then(() => {
        (arg as () => void)();
        seen.push(document.querySelector("button")!.textContent!); // what the browser would snapshot
      });
      return { finished, ready: finished };
    });
    expect(supportsViewTransitions()).toBe(true);
    function Counter() {
      const [n, setN] = React.useState(0);
      const run = useViewTransition();
      return <button onClick={() => void run(() => setN((v) => v + 1))}>{n}</button>;
    }
    render(<Counter />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(["1"]);
    expect(screen.getByRole("button")).toHaveTextContent("1");
  });

  it("skips the transition under reduced motion, or with skip, and just runs the update", async () => {
    stubBrowser();
    reduceMotion(true);
    const a = vi.fn();
    await runViewTransition(a);
    expect(a).toHaveBeenCalledTimes(1);
    expect(doc.startViewTransition).not.toHaveBeenCalled();
    reduceMotion(false);
    const b = vi.fn();
    await runViewTransition(b, { skip: true });
    expect(b).toHaveBeenCalledTimes(1);
    expect(doc.startViewTransition).not.toHaveBeenCalled();
    // an explicit skip: false wins over the preference
    reduceMotion(true);
    await act(async () => {
      await runViewTransition(vi.fn(), { skip: false });
    });
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
  });

  it("passes types as the object form only where ViewTransition.types exists", async () => {
    const calls = stubBrowser();
    await act(async () => {
      await runViewTransition(vi.fn(), { types: ["forward"] });
    });
    expect(typeof calls[0]).toBe("function"); // jsdom has no ViewTransition global: the plain callback form is used
    vi.stubGlobal("ViewTransition", class { get types() { return new Set(); } });
    await act(async () => {
      await runViewTransition(vi.fn(), { types: ["forward"] });
    });
    expect(calls[1]).toMatchObject({ types: ["forward"] });
    expect(typeof (calls[1] as { update: unknown }).update).toBe("function");
    vi.unstubAllGlobals();
  });

  it("rejects only when the update throws; a skipped transition (ready rejects) is swallowed", async () => {
    doc.startViewTransition = vi.fn((arg: unknown) => {
      const update = arg as () => void;
      const finished = Promise.resolve().then(() => update());
      return { finished, ready: Promise.reject(new DOMException("skipped", "AbortError")) };
    });
    await expect(runViewTransition(() => {})).resolves.toBeUndefined();
    await expect(
      runViewTransition(() => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });

  it("useViewTransition returns one stable function (StrictMode safe)", () => {
    const { result, rerender } = renderHook(() => useViewTransition());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe("SharedElement", () => {
  it("names the element from the entity id with the shared class", () => {
    render(<SharedElement name="photo 3" data-testid="e" className="rounded" style={{ color: "red" }} />);
    const el = screen.getByTestId("e");
    expect(el.style.viewTransitionName).toBe("sutra-photo_20_3");
    expect(el).toHaveAttribute("data-shared-element", "photo 3");
    expect(el).toHaveClass("rounded");
    expect(el.style.color).toBe("red");
  });

  it("is unnamed while inactive, renders the requested element and forwards the ref", () => {
    const ref = React.createRef<HTMLElement>();
    render(<SharedElement ref={ref} name="x" active={false} as="article" data-testid="e" />);
    const el = screen.getByTestId("e");
    expect(el.tagName).toBe("ARTICLE");
    expect(ref.current).toBe(el);
    expect(el.style.viewTransitionName).toBeFalsy();
    expect(el).not.toHaveAttribute("data-shared-element");
  });

  it("lets a consumer prop through and renders on the server without touching document", () => {
    expect(renderToString(<SharedElement name="a" aria-label="Photo" />)).toContain('aria-label="Photo"');
    expect(renderToString(<SharedElement name="a" />)).toContain("view-transition-name:sutra-a");
  });
});

describe("view transition CSS (styles/sutra.css)", () => {
  const css = readFileSync(path.resolve(__dirname, "../src/styles/sutra.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("takes the speeds and the ease from the motion tokens", () => {
    expect(css).toMatch(/::view-transition-group\(\*\)\s*\{[^}]*animation-duration:\s*var\(--sutra-duration-slow\)[^}]*var\(--sutra-ease\)/);
    expect(css).toMatch(/::view-transition-old\(root\),\s*::view-transition-new\(root\)\s*\{[^}]*var\(--sutra-duration\)/);
  });
  it("stops every view-transition animation under reduced motion", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce)", css.indexOf("::view-transition-new(root)"));
    const block = css.slice(at, at + 400);
    for (const part of ["group", "old", "new"]) expect(block).toContain(`::view-transition-${part}(*)`);
    expect(block).toMatch(/animation:\s*none\s*!important/);
  });
});
