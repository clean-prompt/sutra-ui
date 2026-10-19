/**
 * Motion lint. Reads the CSS and every source file under src/ (nothing is rendered) and keeps the motion rules from
 * CONVENTIONS.md ("Motion tokens and rules") honest as components are added:
 *
 *   1. The reduced-motion net in styles/sutra.css exists, and covers every looping `--animate-*`.
 *   2. Every looping animation used in a component is covered by that net or carries its own `motion-safe:` /
 *      `motion-reduce:` guard (`animate-spin` is exempt: it is a progress indicator). Inline `infinite` animations
 *      and WAAPI calls need a reduced-motion check in the same file.
 *   3. Durations sit on the scale (75, 150, 200, 300, 500, 1000 ms).
 *   4. Curves come from the shared ease: no `cubic-bezier(` / `ease-[` literals and no bare `ease-out` / `ease-in`.
 *   5. No JS animation library.
 *   6. Springs are tokens: no `linear(` easing literal in a component (it is generated into the token file), the files of
 *      the native motion layer read reduced motion, and each stays within its gzip budget.
 *
 * Rules 2 to 4 keep an ALLOW map of the deliberate exceptions, keyed `"<path under src> <token>"`. A map is asserted
 * both ways: a site that offends and is not listed fails, and so does an entry that no longer offends (like KIT_DEPS
 * in layering.test.ts). To regenerate the maps after a sweep, print the current offenders and paste them in:
 *
 *   MOTION_GUARD_PRINT=1 npx vitest run test/motion-guard.test.ts
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

/* ------------------------------------------------------------------ */
/* Allowlists                                                          */
/* ------------------------------------------------------------------ */

interface Allowed {
  /** How many times the token occurs in the file. */
  n: number;
  why: string;
}

/** Looping utilities with neither net coverage nor a per-site guard. */
const ALLOW_LOOPS: Record<string, Allowed> = {};

/** `duration-N` classes outside the scale. */
const ALLOW_DURATIONS: Record<string, Allowed> = {
  "kits/social/presence.tsx duration-100": { n: 1, why: "remote cursor glides between pointer updates; a longer tween would lag behind the pointer" },
  "patterns/tiling-layout-group-internal.tsx duration-100": { n: 1, why: "drop-zone highlight follows the drag pointer" },
};

/** Hand-written curves and bare `ease-*` keywords. */
const ALLOW_CURVES: Record<string, Allowed> = {
  "kits/identity/qr-scanner.tsx ease-in-out": { n: 2, why: "CSS keywords in the inline keyframe loops of the scan line and corners, not Tailwind classes" },
  "patterns/chart-cartesian-internal.tsx ease-out": { n: 1, why: "charts tween their own data (own engine, motion-safe)" },
  "patterns/chart-donut.tsx ease-out": { n: 1, why: "charts tween their own data (own engine, motion-safe)" },
  "primitives/drawer.tsx cubic-bezier(": { n: 1, why: "the drawer translates with a gesture-matched curve while it is dragged and released" },
};

/** `linear(` easing literals outside the generated token file. */
const ALLOW_LINEAR: Record<string, Allowed> = {
  "lib/spring.ts linear(": { n: 1, why: "springToLinear builds the string that scripts/gen-springs.mjs writes into the token files" },
};

/* ------------------------------------------------------------------ */
/* CSS helpers                                                         */
/* ------------------------------------------------------------------ */

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const sutraCss = strip(readFileSync(path.join(SRC, "styles/sutra.css"), "utf8"));

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

const theme = new Map([...blockAfter(sutraCss, "@theme {").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
const net = blockAfter(sutraCss, "@media (prefers-reduced-motion: reduce)");

/** Rules of the net: selector list -> declarations (the net has no nested blocks). */
const netRules = [...net.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1]!.split(",").map((s) => s.trim()), body: m[2]! }));
/** `.animate-pop` or the variant-proof `[class*="animate-pop"]` -> `pop`. */
const animateNames = (selectors: string[]) =>
  selectors.flatMap((s) => {
    const m = /^(?:\.animate-|\[class\*="animate-)([\w-]+)"?\]?$/.exec(s);
    return m ? [m[1]!] : [];
  });
/** Utilities the net stops (`animation: none`) or slows to an end state (`animation-duration`). */
const netStopped = new Set(netRules.filter((r) => /animation:\s*none/.test(r.body)).flatMap((r) => animateNames(r.selectors)));
const netSlowed = new Set(netRules.filter((r) => /animation-duration:/.test(r.body)).flatMap((r) => animateNames(r.selectors)));
const netCovered = new Set([...netStopped, ...netSlowed]);

/** Loops that carry their own guard wherever they are used (checked by the source scan below). */
const SELF_GUARDED = new Set(["marquee", "shimmer"]);
/** Progress indicators: they stay in motion under reduced motion. */
const ESSENTIAL = new Set(["spin"]);
/** Tailwind's own looping utilities, which are not in `@theme`. */
const BUILTIN_LOOPS = ["pulse", "ping", "bounce"];
const themeLoops = [...theme].filter(([k, v]) => k.startsWith("--animate-") && /\binfinite\b/.test(v)).map(([k]) => k.slice("--animate-".length));
const LOOPS = new Set([...themeLoops, ...BUILTIN_LOOPS]);

/* ------------------------------------------------------------------ */
/* Source scanning                                                     */
/* ------------------------------------------------------------------ */

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "styles" ? [] : walk(full);
    return /\.tsx?$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [full] : [];
  });
}

/** Comments become blanks (line numbers survive); `//` inside a URL or a string start is left alone. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (_, before: string) => before);
}

const LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;

/** String literals of a source text, template literals included (their `${…}` expressions are scanned too). */
function literals(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(LITERAL)) {
    const body = m[1] ?? m[2] ?? m[3] ?? "";
    if (m[3] === undefined) {
      out.push(body);
      continue;
    }
    // Template literal: the static text, then the expressions as code of their own.
    let text = "";
    let depth = 0;
    let expr = "";
    for (let i = 0; i < body.length; i++) {
      if (depth === 0 && body[i] === "$" && body[i + 1] === "{") {
        depth = 1;
        i++;
        text += " ";
      } else if (depth > 0) {
        if (body[i] === "{") depth++;
        if (body[i] === "}" && --depth === 0) {
          out.push(...literals(expr));
          expr = "";
        } else expr += body[i];
      } else text += body[i];
    }
    out.push(text);
  }
  return out;
}

interface Source {
  rel: string;
  code: string;
  literals: string[];
}

const sources: Source[] = walk(SRC)
  .sort()
  .map((file) => {
    const code = stripComments(readFileSync(file, "utf8"));
    return { rel: path.relative(SRC, file).split(path.sep).join("/"), code, literals: literals(code) };
  });

const tokensOf = (literal: string) => literal.split(/\s+/).filter(Boolean);
/** `group-hover:motion-safe:animate-pulse` -> { variants: "group-hover:motion-safe:", utility: "animate-pulse" }. */
function splitToken(token: string) {
  const at = token.replace(/\[[^\]]*\]/g, (b) => "_".repeat(b.length)).lastIndexOf(":");
  return { variants: token.slice(0, at + 1), utility: token.slice(at + 1).replace(/^!|!$/g, "") };
}

const count = (found: Record<string, number>, key: string) => (found[key] = (found[key] ?? 0) + 1);

/** Offending looping utilities: not in the net, not `motion-safe:`, no `motion-reduce:animate-*` in the same string. */
function scanLoops(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const s of sources) {
    for (const literal of s.literals) {
      const tokens = tokensOf(literal);
      const guardedHere = tokens.some((t) => /(^|:)motion-reduce:animate-/.test(t));
      for (const token of tokens) {
        const { variants, utility } = splitToken(token);
        const name = /^animate-([a-z-]+)$/.exec(utility)?.[1];
        if (!name || !LOOPS.has(name) || ESSENTIAL.has(name) || netCovered.has(name)) continue;
        if (/(^|:)motion-safe:/.test(variants) || guardedHere) continue;
        count(found, `${s.rel} animate-${name}`);
      }
    }
  }
  return found;
}

/** `duration-N` classes (any variant) whose N is off the scale. */
const DURATION_SCALE = new Set([75, 150, 200, 300, 500, 1000]);
function scanDurations(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const s of sources) {
    for (const literal of s.literals) {
      for (const token of tokensOf(literal)) {
        const n = /^duration-(\d+)$/.exec(splitToken(token).utility)?.[1];
        if (n && !DURATION_SCALE.has(Number(n))) count(found, `${s.rel} duration-${n}`);
      }
    }
  }
  return found;
}

/** Hand-written curves: `cubic-bezier(` and `ease-[` anywhere in code, bare `ease-out|in|in-out` classes. */
function scanCurves(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const s of sources) {
    for (const m of s.code.matchAll(/cubic-bezier\(|(?<![\w-])ease-\[/g)) count(found, `${s.rel} ${m[0]}`);
    for (const literal of s.literals) {
      for (const token of tokensOf(literal)) {
        const utility = splitToken(token).utility;
        if (/^ease-(out|in|in-out)$/.test(utility)) count(found, `${s.rel} ${utility}`);
      }
    }
  }
  return found;
}

/** `linear(` easings: they are generated tokens (--sutra-spring-*), never pasted into a component. */
function scanLinear(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const s of sources) for (const m of s.code.matchAll(/(?<![\w-])linear\(/g)) count(found, `${s.rel} ${m[0]}`);
  return found;
}

const counts = (allow: Record<string, Allowed>) => Object.fromEntries(Object.entries(allow).map(([k, v]) => [k, v.n]));
const sorted = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

/* ------------------------------------------------------------------ */
/* Printing helper                                                     */
/* ------------------------------------------------------------------ */

const asMap = (name: string, found: Record<string, number>, known: Record<string, Allowed>) =>
  `const ${name}: Record<string, Allowed> = {\n${Object.entries(sorted(found))
    .map(([key, n]) => `  ${JSON.stringify(key)}: { n: ${n}, why: ${JSON.stringify(known[key]?.why ?? "TODO")} },`)
    .join("\n")}\n};`;

// MOTION_GUARD_PRINT=1 prints the maps as they would have to be for the tree as it is now.
it.runIf(process.env.MOTION_GUARD_PRINT)("prints the current offenders as ALLOW maps", () => {
  console.log(
    [
      asMap("ALLOW_LOOPS", scanLoops(), ALLOW_LOOPS),
      asMap("ALLOW_DURATIONS", scanDurations(), ALLOW_DURATIONS),
      asMap("ALLOW_CURVES", scanCurves(), ALLOW_CURVES),
      asMap("ALLOW_LINEAR", scanLinear(), ALLOW_LINEAR),
    ].join("\n\n")
  );
});

/* ------------------------------------------------------------------ */
/* 1. The net                                                          */
/* ------------------------------------------------------------------ */

describe("reduced-motion net (styles/sutra.css)", () => {
  it("exists, ends transitions at once and strips the movement of overlay enter/exit", () => {
    expect(net).toMatch(/transition-duration:\s*1ms/);
    for (const axis of ["translate-x", "translate-y", "scale", "rotate"]) {
      expect(net, `--tw-enter-${axis}`).toContain(`--tw-enter-${axis}:`);
      expect(net, `--tw-exit-${axis}`).toContain(`--tw-exit-${axis}:`);
    }
  });

  it("covers every looping --animate-* (marquee and shimmer guard themselves where they are used)", () => {
    expect(themeLoops.length).toBeGreaterThanOrEqual(8);
    expect(themeLoops.filter((n) => !netCovered.has(n) && !SELF_GUARDED.has(n) && !ESSENTIAL.has(n))).toEqual([]);
    // Tailwind's own pulse and ping are in the net; bounce is not, so each use of it carries `motion-safe:`.
    for (const name of ["pulse", "ping"]) expect(netCovered.has(name), `animate-${name}`).toBe(true);
  });

  it("keeps progress indicators moving", () => {
    for (const name of ESSENTIAL) expect(netCovered.has(name), `animate-${name}`).toBe(false);
  });

  it("never stops (animation: none) what unmounts on animationend: collapsibles end in 1ms, overlays keep their fade", () => {
    for (const name of ["accordion-down", "accordion-up", "collapsible-down", "collapsible-up", "in", "out"]) {
      expect(netStopped.has(name), `animate-${name}`).toBe(false);
    }
    for (const name of ["accordion-down", "accordion-up", "collapsible-down", "collapsible-up"]) {
      expect(netSlowed.has(name), `animate-${name}`).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 2. Loops in components                                              */
/* ------------------------------------------------------------------ */

describe("looping animations in source", () => {
  it("the scanner sees the sources it should", () => {
    expect(sources.length).toBeGreaterThan(300);
    expect(sources.some((s) => s.rel === "primitives/spinner.tsx" && s.literals.some((l) => l.includes("animate-dot-bounce")))).toBe(true);
    // The literal scanner loses nothing: every use of a loop, found by a plain search, is also found inside a string.
    const names = [...LOOPS, ...ESSENTIAL].join("|");
    const plain = new RegExp(`(?<![\\w-])animate-(?:${names})(?![\\w-])`, "g");
    const asClass = new RegExp(`^animate-(?:${names})$`);
    const raw = sources.reduce((n, s) => n + (s.code.match(plain)?.length ?? 0), 0);
    const scanned = sources.reduce((n, s) => n + s.literals.reduce((m, l) => m + tokensOf(l).filter((t) => asClass.test(splitToken(t).utility)).length, 0), 0);
    expect(scanned).toBe(raw);
    // A utility in a template-literal expression is found too.
    expect(literals("const a = `x ${on ? \"animate-pulse\" : \"\"} y`;")).toContain("animate-pulse");
  });

  it("every loop is covered by the net, guarded with motion-safe:/motion-reduce: on the site, or allowed", () => {
    expect(sorted(scanLoops())).toEqual(sorted(counts(ALLOW_LOOPS)));
  });

  it("inline `infinite` animations and WAAPI calls check reduced motion in the same file", () => {
    const REDUCED = /prefers-reduced-motion|motion-reduce|prefersReducedMotion|usePrefersReducedMotion/;
    const inline = sources.filter((s) => s.literals.some((l) => /\binfinite\b/.test(l)) && !REDUCED.test(s.code)).map((s) => s.rel);
    const waapi = sources.filter((s) => /\.animate\(\s*[\[{]/.test(s.code) && !REDUCED.test(s.code)).map((s) => s.rel);
    expect({ inline, waapi }).toEqual({ inline: [], waapi: [] });
  });
});

/* ------------------------------------------------------------------ */
/* 3 and 4. The scale and the ease                                     */
/* ------------------------------------------------------------------ */

describe("duration scale", () => {
  it("only 75, 150, 200, 300, 500 and 1000 ms, except the listed live-feedback sites", () => {
    expect(sorted(scanDurations())).toEqual(sorted(counts(ALLOW_DURATIONS)));
  });
});

describe("shared ease", () => {
  it("no cubic-bezier( / ease-[ literal and no bare ease-out / ease-in except the listed sites", () => {
    expect(sorted(scanCurves())).toEqual(sorted(counts(ALLOW_CURVES)));
  });
});

/* ------------------------------------------------------------------ */
/* 5. CSS only                                                         */
/* ------------------------------------------------------------------ */

describe("no JS animation library", () => {
  it("package.json depends on none", () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as Record<string, Record<string, string> | undefined>;
    const names = ["dependencies", "peerDependencies", "optionalDependencies"].flatMap((k) => Object.keys(pkg[k] ?? {}));
    const banned = /^(framer-motion|motion|motion-dom|gsap|animejs|popmotion|react-spring|@react-spring\/.+|react-transition-group|lottie-web|@lottiefiles\/.+)$/;
    expect(names.filter((n) => banned.test(n))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* 6. Springs and the native motion layer                              */
/* ------------------------------------------------------------------ */

/** The files of the CSS-first motion layer (JS that runs timers or frames, or builds motion markup). */
const MOTION_LAYER = [
  "lib/spring.ts",
  "hooks/use-spring-value.ts",
  "hooks/use-presence.ts",
  "hooks/use-stagger.ts",
  "hooks/use-typewriter.ts",
  "patterns/presence.tsx",
  "patterns/animated-list.tsx",
  "patterns/split-text.tsx",
  "patterns/typewriter.tsx",
  "hooks/use-flip.ts",
  "lib/flip.ts",
];
/** The ones that animate over time and so must look at the preference (directly or through the hook that does). */
const READS_REDUCED = ["hooks/use-spring-value.ts", "hooks/use-presence.ts", "hooks/use-typewriter.ts", "patterns/presence.tsx", "patterns/split-text.tsx", "hooks/use-flip.ts"];
/** Gzip budgets in bytes, minified (esbuild). The whole layer stays near the 8 KB of the plan: a library would cost 27 to 40 KB. */
const BUDGET_EACH = 1024;
const BUDGET_TOTAL = 8192;
/** FLIP measures, inverts and plays in one hook; the plan gives it 1.5 KB. */
const BUDGET_OVERRIDES: Record<string, number> = { "hooks/use-flip.ts": 1536 };

describe("spring tokens and the native motion layer", () => {
  it("no linear() easing literal in a component: springs come from the generated --sutra-spring-* tokens", () => {
    expect(sorted(scanLinear())).toEqual(sorted(counts(ALLOW_LINEAR)));
    // the scanner sees a literal when there is one
    expect(sources.some((s) => /(?<![\w-])linear\(/.test(s.code))).toBe(true);
    expect(/(?<![\w-])linear\(/.test("background: linear-gradient(red, blue); linearPath(x)")).toBe(false);
  });

  it("the motion layer files exist and the animating ones read prefers-reduced-motion", () => {
    const REDUCED = /prefers-reduced-motion|motion-reduce|prefersReducedMotion|usePrefersReducedMotion/;
    for (const rel of MOTION_LAYER) expect(sources.some((s) => s.rel === rel), rel).toBe(true);
    expect(READS_REDUCED.filter((rel) => !REDUCED.test(sources.find((s) => s.rel === rel)!.code))).toEqual([]);
  });

  it("the token file defines each spring easing and its -duration once", () => {
    for (const name of ["gentle", "snappy", "bouncy"]) {
      expect(sutraCss.match(new RegExp(`--sutra-spring-${name}:`, "g")), name).toHaveLength(1);
      expect(sutraCss.match(new RegExp(`--sutra-spring-${name}-duration:`, "g")), name).toHaveLength(1);
    }
  });

  const esbuild = path.join(ROOT, "node_modules/.bin/esbuild");
  it.skipIf(!existsSync(esbuild))("each file stays within its gzip budget and the layer within the total (minified with esbuild)", () => {
    const sizes = MOTION_LAYER.map((rel) => {
      const out = execFileSync(esbuild, [path.join(SRC, rel), "--minify", "--format=esm", "--log-level=error"], { encoding: "utf8", maxBuffer: 1 << 24 });
      return [rel, gzipSync(out, { level: 9 }).length] as const;
    });
    expect(sizes.filter(([rel, n]) => n > (BUDGET_OVERRIDES[rel] ?? BUDGET_EACH))).toEqual([]);
    expect(sizes.reduce((sum, [, n]) => sum + n, 0)).toBeLessThanOrEqual(BUDGET_TOTAL);
    expect(sizes.find(([rel]) => rel === "lib/spring.ts")![1]).toBeLessThanOrEqual(1024);
  });
});

/* ------------------------------------------------------------------ */
/* 7. View transitions, scroll-driven and pointer effects              */
/* ------------------------------------------------------------------ */

/** Hooks and patterns of the navigation, scroll and pointer effects (group GN), each with its own gzip budget. */
const EFFECTS_LAYER = [
  "hooks/use-view-transition.ts",
  "hooks/use-scroll-progress.ts",
  "hooks/use-pointer-vars.ts",
  "patterns/shared-element.tsx",
  "patterns/scroll-reveal.tsx",
  "patterns/scroll-stage.tsx",
  "patterns/pointer-fx.tsx",
];
/** The hooks that depend on motion and so must look at the preference (directly or through the hook that does). */
const EFFECTS_READ_REDUCED = ["hooks/use-view-transition.ts", "hooks/use-scroll-progress.ts", "hooks/use-pointer-vars.ts"];
const EFFECTS_BUDGET_EACH = 1024;
const EFFECTS_BUDGET_TOTAL = 5120;

describe("view transitions, scroll-driven and pointer effects", () => {
  const REDUCED = /prefers-reduced-motion|motion-reduce|prefersReducedMotion|usePrefersReducedMotion/;
  const effect = (rel: string) => sources.find((s) => s.rel === rel)!;
  /** The "Motion II" section of sutra.css (comments stripped): view transitions, scroll-driven and pointer effects. */
  const effectsCss = () => {
    const raw = readFileSync(path.join(SRC, "styles/sutra.css"), "utf8");
    const from = raw.indexOf("Motion II: view transitions");
    expect(from).toBeGreaterThan(-1);
    return strip(raw.slice(from));
  };

  it("the files exist and the hooks read prefers-reduced-motion", () => {
    for (const rel of EFFECTS_LAYER) expect(sources.some((s) => s.rel === rel), rel).toBe(true);
    expect(EFFECTS_READ_REDUCED.filter((rel) => !REDUCED.test(effect(rel).code))).toEqual([]);
  });

  it("they animate with CSS tokens only: no linear( or cubic-bezier( literal, no infinite loop, no WAAPI, no timers", () => {
    for (const rel of EFFECTS_LAYER) {
      const { code, literals: lits } = effect(rel);
      expect(/(?<![\w-])linear\(/.test(code), `${rel} linear(`).toBe(false);
      expect(/cubic-bezier\(/.test(code), `${rel} cubic-bezier(`).toBe(false);
      expect(lits.some((l) => /\binfinite\b/.test(l)), `${rel} infinite`).toBe(false);
      expect(/\.animate\(|setInterval\(|setTimeout\(/.test(code), `${rel} animate/timer`).toBe(false);
    }
  });

  it("the CSS of the three effects has no infinite animation, no linear( easing and no hand-written duration", () => {
    const css = effectsCss();
    expect(css).not.toMatch(/\binfinite\b|(?<![\w-])linear\(|cubic-bezier\(/);
    // a scroll timeline is the only place `linear` appears (keyword, not a function), and times come from the tokens
    expect([...css.matchAll(/(?:animation|transition)(?:-duration)?:[^;]*?(\d+(?:\.\d+)?m?s)\b/g)].map((m) => m[1])).toEqual([]);
  });

  it("every new utility with motion respects reduced motion (net, @media, or end state by default)", () => {
    const css = effectsCss();
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*::view-transition-group\(\*\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*scroll-reveal/);
    expect(blockAfter(css, "@utility tilt")).toContain("prefers-reduced-motion: no-preference");
    expect(blockAfter(css, "@utility magnetic")).toContain("prefers-reduced-motion: no-preference");
  });

  const esbuild2 = path.join(ROOT, "node_modules/.bin/esbuild");
  it.skipIf(!existsSync(esbuild2))("each file stays within its gzip budget (minified with esbuild)", () => {
    const sizes = EFFECTS_LAYER.map((rel) => {
      const out = execFileSync(esbuild2, [path.join(SRC, rel), "--minify", "--format=esm", "--log-level=error"], { encoding: "utf8", maxBuffer: 1 << 24 });
      return [rel, gzipSync(out, { level: 9 }).length] as const;
    });
    expect(sizes.filter(([, n]) => n > EFFECTS_BUDGET_EACH)).toEqual([]);
    expect(sizes.reduce((sum, [, n]) => sum + n, 0)).toBeLessThanOrEqual(EFFECTS_BUDGET_TOTAL);
  });
});
