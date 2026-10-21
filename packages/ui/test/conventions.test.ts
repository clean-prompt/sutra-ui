import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_LITERAL, DARK_VARIANT, LEGACY_TONE, PALETTE_CLASS, SRC, count, sourceFiles, unlabelledIconButtons } from "./helpers/conventions-scan";

/**
 * Convention checks as tests (R5). Each scan has a ratchet allowlist: `file: [count, why]`.
 * The test fails when a file not on the list breaks the rule, when a listed file breaks it MORE often, and when a listed
 * file was fixed (count went down or to zero) but the entry was left behind. Lower the number or delete the entry.
 */

type Allow = Record<string, [count: number, why: string]>;

const files = sourceFiles();

function checkRatchet(re: RegExp, allow: Allow) {
  const actual = new Map<string, number>();
  for (const [file, text] of files) {
    const n = count(text, re);
    if (n > 0) actual.set(file, n);
  }
  const unlisted = [...actual].filter(([f]) => !allow[f]).map(([f, n]) => `${f} (${n})`);
  const grew = Object.entries(allow).filter(([f, [n]]) => (actual.get(f) ?? 0) > n).map(([f, [n]]) => `${f}: ${actual.get(f)} > ${n}`);
  const stale = Object.entries(allow).filter(([f, [n]]) => (actual.get(f) ?? 0) < n).map(([f, [n]]) => `${f}: now ${actual.get(f) ?? 0}, listed ${n}`);
  const missing = Object.keys(allow).filter((f) => !existsSync(path.join(SRC, f)));
  return { unlisted, grew, stale, missing, total: [...actual.values()].reduce((a, b) => a + b, 0), filesWith: actual.size };
}

function expectRatchet(re: RegExp, allow: Allow) {
  const r = checkRatchet(re, allow);
  expect(r.unlisted, "new violations (fix them, or list them with a reason)").toEqual([]);
  expect(r.grew, "more violations than listed").toEqual([]);
  expect(r.stale, "fixed but still listed: lower the count or remove the entry").toEqual([]);
  expect(r.missing, "listed file does not exist").toEqual([]);
}

/* ---- 1. raw colour literals ---------------------------------------------------------------------------------- */

const COLOR_ALLOW: Allow = {
  // brand and third-party art (the colours are the point)
  "assets/brand.tsx": [28, "Sutra brand art: the two brand inks"],
  "assets/brand-internal.ts": [2, "Sutra brand art: the two brand inks, declared once for the marks, the mascot and the sting"],
  "assets/country-flags.tsx": [163, "national flag colours"],
  "assets/file-format.tsx": [115, "file-type brand colours"],
  "assets/device-frame.tsx": [10, "device and traffic-light art"],
  "assets/qr-placeholder.tsx": [1, "a QR code stays dark ink on light"],
  "kits/identity/qr-code.tsx": [2, "a QR code stays dark ink on light"],
  "kits/identity/kunji-buttons.tsx": [8, "kunji brand palette"],
  "kits/identity/kunji-sign-in.tsx": [5, "kunji brand palette"],
  "blocks/kunji-blocks.tsx": [1, "kunji ink on the kunji paper card"],
  "kits/ai/usage-quota.tsx": [1, "provider brand colour"],
  "kits/billing/payment-card.tsx": [16, "card network brand gradients"],
  "kits/identity/credential-card.tsx": [16, "credential card art gradients"],
  "primitives/app-store-badge.tsx": [12, "store badge art"],
  "primitives/social-button.tsx": [46, "provider brand colours"],
  "patterns/agent-avatar.tsx": [5, "generated face art"],
  "blocks/marketing-blocks.tsx": [3, "generated hue gradients (oklch)"],
  // palettes and canvas code that cannot read CSS variables
  "lib/accent.ts": [17, "the named accent palette"],
  "lib/tokens.ts": [8, "chart palette and design tokens as JS values"],
  "kits/terminal/terminal.tsx": [35, "ANSI palettes"],
  "kits/workspace/memory-map-canvas-internal.ts": [5, "canvas fallbacks for CSS variables"],
  // mask stops: only the alpha of #000 matters, never a visible colour
  "assets/backgrounds.tsx": [5, "mask stops"],
  "patterns/fade-text.tsx": [2, "mask stops"],
  "primitives/scroll-area.tsx": [8, "mask stops"],
  "kits/media/media-cards.tsx": [4, "mask stops"],
  // match keys, not applied colours
  "kits/editor/code-editor.tsx": [9, "match keys: CodeMirror's default highlight colours, looked up so the theme can swap each for a token"],
  // debt that is left on purpose (listed so the count can only fall)
  "kits/identity/secret.tsx": [1, "debt (kits/identity): canvas fallback ink"],
  "primitives/avatar.tsx": [3, "solid fills take white or dark ink initials, whichever contrasts more (fixed inks, not theme colours)"],
};

/* ---- 1b. Tailwind palette classes instead of tokens -------------------------------------------------------- */

const PALETTE_ALLOW: Allow = {
  "primitives/badge.tsx": [50, "Badge colour=gray|blue|purple|pink|orange: a fixed categorical palette whose names are the API (CONVENTIONS: categorical palettes stay on color)"],
  "patterns/log-viewer.tsx": [30, "the ANSI SGR colour map (16 foregrounds and backgrounds) on the fixed dark log surface"],
  "patterns/code-block.tsx": [27, "syntax palettes: a fixed dark-surface set and a light set that carries its own dark: steps"],
  "kits/billing/payment-card.tsx": [3, "card chip and network art"],
  "kits/identity/qr-scanner.tsx": [3, "debt: scanner overlay"],
  "primitives/app-store-badge.tsx": [1, "store badge art"],
};

/* ---- 2. dark: prefixes ------------------------------------------------------------------------------------- */

const DARK_ALLOW: Allow = {
  "primitives/badge.tsx": [20, "Badge's categorical palette needs its own dark steps (a hue has no token pair)"],
  "patterns/code-block.tsx": [9, "syntax palettes: a light set and a dark set per token type"],
  "assets/backgrounds.tsx": [1, "mix-blend-mode is not a colour, so no light-dark() token can carry it"],
};

/* ---- 3. legacy tone aliases -------------------------------------------------------------------------------- */

const TONE_ALLOW: Allow = {
  // these are a component's own variant keys, not the shared `Tone` vocabulary (the scan cannot tell the difference)
  "kits/agent/tool-timeline-bodies.tsx": [1, "TruncatedOutput's own `tone: error` prop"],
  "kits/media/media-controls-base.tsx": [2, "the control button's own `default | overlay` variant"],
  "kits/ops/progress-dialog.tsx": [1, "DialogHeader's own `DialogTone` (default | success | ...)"],
  "primitives/typography.tsx": [1, "Text's own `default | muted | ...` variant"],
};

describe("conventions: raw colours", () => {
  it("no raw colour literals (#hex, rgb(), hsl(), oklch()) outside the allowlist", () => expectRatchet(COLOR_LITERAL, COLOR_ALLOW));
  it("no Tailwind palette classes (bg-red-500 ...) outside the allowlist", () => expectRatchet(PALETTE_CLASS, PALETTE_ALLOW));
  it("the scanners recognise what they should", () => {
    const hits = (s: string) => count(s, COLOR_LITERAL);
    expect(hits('style={{ color: "#fff" }}')).toBe(1);
    expect(hits('className="text-[#09090b]"')).toBe(1);
    expect(hits("bg-[rgb(0_0_0/0.1)]")).toBe(1);
    expect(hits("`hsl(${h} 50% 50%)`")).toBe(1);
    expect(hits('href="#details"')).toBe(0);
    expect(hits("url(#bead)")).toBe(0);
    expect(hits("`${seed}#face`")).toBe(0);
    expect(count('className="bg-red-500 hover:text-zinc-700"', PALETTE_CLASS)).toBe(2);
    expect(count('className="bg-primary text-muted-foreground"', PALETTE_CLASS)).toBe(0);
  });
});

describe("conventions: dark mode comes from tokens", () => {
  it("no dark: prefixes in components outside the allowlist", () => expectRatchet(DARK_VARIANT, DARK_ALLOW));
});

describe("conventions: tone vocabulary", () => {
  it("no deprecated tone aliases passed as literals outside the allowlist", () => expectRatchet(LEGACY_TONE, TONE_ALLOW));
  it("the scanner recognises the aliases and not the canonical names", () => {
    expect(count('<Pill tone="brand" /> <Pill tone={"warn"} /> {tone: "danger"}', LEGACY_TONE)).toBe(3);
    expect(count('<Pill tone="primary" /> <Pill tone="warning" /> <Pill tone="neutral" /> toneClass()', LEGACY_TONE)).toBe(0);
  });
});

/* ---- 4. icon-only buttons need a name ---------------------------------------------------------------------- */

describe("conventions: icon-only buttons are labelled", () => {
  /** `file:line <Tag>` entries that are known to be unlabelled (none today). */
  const UNLABELLED_ALLOW: string[] = [];

  it("every icon-only Button has an aria-label, title or sr-only text (as far as a static scan can tell)", () => {
    const found = files.filter(([f]) => f.endsWith(".tsx")).flatMap(([f, s]) => unlabelledIconButtons(f, s));
    expect(found.filter((x) => !UNLABELLED_ALLOW.includes(x))).toEqual([]);
    expect(UNLABELLED_ALLOW.filter((x) => !found.includes(x)), "fixed but still listed").toEqual([]);
  });

  it("the scanner flags unnamed icon buttons and accepts every way of naming one", () => {
    const scan = (jsx: string) => unlabelledIconButtons("x.tsx", jsx);
    expect(scan('<Button size="icon"><RiCloseLine /></Button>')).toHaveLength(1);
    expect(scan('<Button size={dense ? "icon-sm" : "icon"} onClick={() => go(a > b)}><X /></Button>')).toHaveLength(1);
    expect(scan('<Button variant="ghost"><RiCloseLine aria-hidden /></Button>')).toHaveLength(1);
    expect(scan('<button type="button"><svg viewBox="0 0 1 1" /></button>')).toHaveLength(1);
    expect(scan('<Button size="icon" aria-label="Close"><RiCloseLine /></Button>')).toHaveLength(0);
    expect(scan('<Button size="icon" aria-label={t("close")}><RiCloseLine /></Button>')).toHaveLength(0);
    expect(scan('<Button size="icon" title="Close"><RiCloseLine /></Button>')).toHaveLength(0);
    expect(scan('<Button size="icon"><RiCloseLine /><span className="sr-only">Close</span></Button>')).toHaveLength(0);
    expect(scan('<Button asChild size="icon"><a href="/x" aria-label="Docs"><RiBook /></a></Button>')).toHaveLength(0);
    expect(scan('<Button size="icon" {...props}><RiCloseLine /></Button>')).toHaveLength(0);
    expect(scan('<button type="button" tabIndex={-1} aria-hidden><RiArrow /></button>')).toHaveLength(0);
    expect(scan('<Button>Save</Button> <Button leadingIcon={<RiAdd />}>Add</Button> <ButtonGroup size="icon" />')).toHaveLength(0);
  });
});
