import * as React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChangeKey } from "../src/hooks/use-change-key";

const STYLES = path.resolve(__dirname, "../src/styles");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const sutraCss = strip(readFileSync(path.join(STYLES, "sutra.css"), "utf8"));
const paperCss = strip(readFileSync(path.join(STYLES, "paper.css"), "utf8"));

/** The body of the block that starts at `header` (balanced braces). */
function blockAfter(css: string, header: string): string {
  const at = css.indexOf(header);
  if (at < 0) throw new Error(`no block: ${header}`);
  let i = css.indexOf("{", at);
  const start = i + 1;
  for (let depth = 1; depth > 0; ) {
    i++;
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
  }
  return css.slice(start, i);
}
const decls = (body: string) => new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim().replace(/\s+/g, " ")]));

const theme = decls(blockAfter(sutraCss, "@theme {"));
const net = blockAfter(sutraCss, "@media (prefers-reduced-motion: reduce)");
const paperLight = decls(blockAfter(paperCss, '[data-style="paper"] {'));

describe("motion tokens", () => {
  it("the stock theme defines one ease and four speeds on :root", () => {
    for (const [name, value] of [
      ["--sutra-ease", "cubic-bezier(0.25, 1, 0.5, 1)"],
      ["--sutra-ease-spring", "cubic-bezier(0.34, 1.56, 0.64, 1)"],
      ["--sutra-duration-fast", "150ms"],
      ["--sutra-duration", "200ms"],
      ["--sutra-duration-slow", "300ms"],
      ["--sutra-duration-fill", "500ms"],
    ] as const) {
      expect(sutraCss, name).toMatch(new RegExp(`${name}:\\s*${value.replace(/[().]/g, "\\$&")}`));
    }
  });

  it("the theme derives the ease and the default transition from them", () => {
    expect(theme.get("--ease-out-quart")).toBe("var(--sutra-ease)");
    expect(theme.get("--ease-spring")).toBe("var(--sutra-ease-spring)");
    expect(theme.get("--default-transition-duration")).toBe("var(--sutra-duration-fast)");
    expect(theme.get("--default-transition-timing-function")).toBe("var(--sutra-ease)");
  });

  it("paper re-points every derived token whose source it overrides (a var() chain resolves where it is declared)", () => {
    const derived = [...theme].filter(([, v]) => /^var\(--sutra-[\w-]+\)$/.test(v));
    expect(derived.length).toBeGreaterThanOrEqual(4);
    for (const [name, value] of derived) {
      const source = /var\((--sutra-[\w-]+)\)/.exec(value)![1]!;
      if (paperLight.has(source)) expect(paperLight.get(name), `${name} (from ${source})`).toBe(value);
    }
    // Paper's values themselves stay literal.
    expect(paperLight.get("--sutra-ease")).toMatch(/^cubic-bezier\(/);
  });
});

describe("keyframes and utilities", () => {
  it("pop, tick and flash exist in the numeric NNNms form the paper tests rely on", () => {
    expect(theme.get("--animate-pop")).toBe("sutra-pop 200ms var(--ease-spring) both");
    expect(theme.get("--animate-tick")).toBe("sutra-tick 200ms var(--ease-out-quart) both");
    expect(theme.get("--animate-flash")).toBe("sutra-flash 700ms var(--ease-out-quart) both");
    for (const name of ["pop", "tick", "flash"]) expect(sutraCss).toContain(`@keyframes sutra-${name}`);
  });

  it("collapsibles and accordions fade as they open and close", () => {
    for (const kind of ["accordion", "collapsible"]) {
      expect(blockAfter(sutraCss, `@keyframes sutra-${kind}-down`)).toMatch(/from \{ height: 0; opacity: 0; \}[\s\S]*to \{[^}]*opacity: 1;/);
      expect(blockAfter(sutraCss, `@keyframes sutra-${kind}-up`)).toMatch(/from \{[^}]*opacity: 1;[^}]*\}[\s\S]*to \{ height: 0; opacity: 0; \}/);
    }
  });

  it("chevron-turn reads the shared tokens", () => {
    const body = blockAfter(sutraCss, "@utility chevron-turn");
    // Tailwind v4 rotate-90 / scale-* set the individual properties, so all of them must transition.
    expect(body).toMatch(/transition-property:\s*transform,\s*translate,\s*scale,\s*rotate/);
    expect(body).toContain("var(--sutra-duration)");
    expect(body).toContain("var(--sutra-ease)");
  });
});

describe("reduced motion net", () => {
  const covered = new Set([...net.matchAll(/(?:\.animate-|\[class\*="animate-)([\w-]+)/g)].map((m) => m[1]!));

  it("matches variant-prefixed classes too (data-[state=open]:animate-accordion-down)", () => {
    expect(net).toContain('[class*="animate-accordion-down"]');
    expect(net).not.toMatch(/(^|[\s,{])\.animate-/);
  });

  it("stops decorative loops and entrances, and keeps animate-spin", () => {
    for (const name of ["pop", "tick", "flash", "fade-up", "bob", "ring", "pulse", "ping", "caret-blink", "dot-bounce", "bar-scale", "mesh"]) {
      expect(covered.has(name), name).toBe(true);
    }
    expect(covered.has("spin")).toBe(false);
  });

  it("ends transitions at once and strips overlay movement but not their fade", () => {
    expect(net).toMatch(/transition-duration:\s*1ms !important/);
    for (const v of ["enter-translate-x", "enter-translate-y", "enter-scale", "exit-translate-x", "exit-translate-y", "exit-scale"]) {
      expect(net, v).toContain(`--tw-${v}:`);
    }
    expect(net).not.toMatch(/--tw-enter-opacity/);
    // collapsibles end at once but still fire animationend
    expect(net).toMatch(/\[class\*="animate-collapsible-up"\]\s*\{\s*animation-duration:\s*1ms/);
  });

  it("covers every looping utility (the ones that guard themselves are listed)", () => {
    const SELF_GUARDED = new Set(["marquee", "shimmer"]); // Marquee has its own media query, Skeleton uses motion-reduce
    const looping = [...theme].filter(([k, v]) => k.startsWith("--animate-") && /\binfinite\b/.test(v)).map(([k]) => k.replace("--animate-", ""));
    expect(looping.length).toBeGreaterThanOrEqual(8);
    expect(looping.filter((n) => !covered.has(n) && !SELF_GUARDED.has(n))).toEqual([]);
  });
});

describe("base layer", () => {
  const base = blockAfter(sutraCss, "@layer base");

  it("fades colour changes on interactive elements without touching menu items", () => {
    const rule = /:where\(([^)]*\)?[^)]*)\)\s*\{[^}]*transition-property:[^}]*\}/.exec(base);
    expect(rule).not.toBeNull();
    expect(rule![0]).toContain("button");
    expect(rule![0]).toContain("var(--sutra-duration-fast)");
    expect(rule![0]).not.toContain("menuitem");
    expect(rule![0]).not.toContain("option");
    expect(rule![0]).not.toMatch(/transition-property:[^;]*transform/);
  });

  it("popper content scales from its trigger", () => {
    expect(base).toMatch(/\[data-radix-popper-content-wrapper\] > \[data-side\]\s*\{\s*transform-origin:\s*var\(--radix-popper-transform-origin\)/);
  });
});

describe("useChangeKey", () => {
  it("is 0 until the value changes, then counts changes", () => {
    const { result, rerender } = renderHook(({ v }) => useChangeKey(v), { initialProps: { v: "a" } });
    expect(result.current).toBe(0);
    rerender({ v: "a" });
    expect(result.current).toBe(0);
    rerender({ v: "b" });
    expect(result.current).toBe(1);
    rerender({ v: "b" });
    expect(result.current).toBe(1);
    rerender({ v: "c" });
    expect(result.current).toBe(2);
  });

  it("gives the new key in the same render as the new value", () => {
    const seen: [string, number][] = [];
    const { rerender } = renderHook(
      ({ v }) => {
        const n = useChangeKey(v);
        seen.push([v, n]);
        return n;
      },
      { initialProps: { v: "a" } }
    );
    rerender({ v: "b" });
    // No render ever pairs the new value with the old key.
    expect(seen.every(([v, n]) => (v === "a" ? n === 0 : n === 1))).toBe(true);
  });

  it("is StrictMode safe and treats NaN as unchanged", () => {
    const { result, rerender } = renderHook(({ v }) => useChangeKey(v), {
      initialProps: { v: Number.NaN as unknown },
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });
    expect(result.current).toBe(0);
    rerender({ v: Number.NaN });
    expect(result.current).toBe(0);
    act(() => rerender({ v: 1 }));
    expect(result.current).toBe(1);
  });
});
