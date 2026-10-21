import { readFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error plain .mjs without types
import { scanSource as scan, sourceFilesOf as sourceFiles, transformText as transform, transformToken as token } from "../scripts/rtl-codemod.mjs";

type Scanned = { token: string; line: number; why: string; kept?: string | null };
const scanSource = scan as (file: string, source: string) => Scanned[];
const sourceFilesOf = sourceFiles as () => string[];
const transformText = transform as (text: string, opts?: { startsOpen?: boolean; endsOpen?: boolean }) => { text: string; changes: unknown[]; manual: unknown[] };
const transformToken = token as (token: string, siblings?: Set<string>) => { out?: string; kind?: string; manual?: string } | null;

/**
 * RTL ratchet (the sibling of conventions.test.ts). Utilities are logical (`ms-`, `pe-`, `start-`, `text-end`, `border-s`,
 * `rounded-ss` ...); direction itself is handled with `rtl:` variants; physical ones need a reason.
 *
 *   - A physical utility in a class string or cva map fails the test unless a `// rtl-physical xN: why` comment covers its line
 *     AND its file is listed in PHYSICAL_BY_DESIGN with the number of tokens and the reason. The count must match exactly: it
 *     fails when it rises, and when an entry is fixed but still listed.
 *   - `useDirection` / `lib/direction` is the one place that reads the reading direction: no ad hoc `document.dir`,
 *     `documentElement.dir`, `getComputedStyle(...).direction` or `closest("[dir]")` elsewhere.
 *   - The codemod (scripts/rtl-codemod.mjs) is idempotent and its token rules are pinned below.
 * To move a file off the list, switch its classes to the logical form and delete the comment and the entry.
 */
const SRC = path.resolve(__dirname, "../src");
const rel = (f: string) => path.relative(SRC, f).split(path.sep).join("/");

const PHYSICAL_BY_DESIGN: Record<string, { count: number; why: string }> = {
  "kits/agent/plan-review.tsx": { count: 1, why: "the selection toolbar is placed at the pixel position of the selection (inline style left)" },
  "kits/editor/pdf-viewer.tsx": { count: 2, why: "pdf.js text layer: absolute spans placed from the page's physical top-left corner" },
  "kits/social/call-overlay.tsx": { count: 4, why: "picture-in-picture corners are named and snapped by physical position" },
  "kits/voice/translate-conversation.tsx": { count: 3, why: "conversation speakers are named left and right (the conversation root is dir=ltr)" },
  "patterns/fan-menu.tsx": { count: 4, why: "the fan direction names a physical side" },
  "patterns/tiling-layout-group-internal.tsx": { count: 8, why: "drop zones and previews sit on the physical edge nearest the pointer" },
  "patterns/transfer-list.tsx": { count: 2, why: "corner position names (bottom-right, bottom-left) are physical" },
  "patterns/zoom-pan.tsx": { count: 4, why: "control corner names (top-right ...) are physical" },
  "primitives/dialog.tsx": { count: 8, why: "Sheet side=left and side=right name a physical edge; side=start and side=end are the logical ones" },
  "primitives/fab.tsx": { count: 8, why: "FAB corner names (bottom-right ...) are physical" },
  "primitives/segmented-control.tsx": { count: 1, why: "the thumb is placed with translateX(offsetLeft), which is measured from the physical left" },
};

/** Reviewed physical-looking tokens the codemod leaves for a person (counts today). Rotate and scale-x are not direction by themselves. */
const REVIEWED: Record<string, { count: number; why: string }> = {
  "corner gradient": { count: 10, why: "decorative tile and avatar gradients (bg-gradient-to-br): art, not reading direction" },
  "object/bg position": { count: 1, why: "an image crop anchored to its physical left edge" },
  slide: { count: 8, why: "Sheet side=left/right and the start/end entries that already carry rtl: slide variants" },
};
const NOT_COUNTED = new Set(["rotate", "scale-x"]);

const files = sourceFilesOf().filter((f) => !f.endsWith(".d.ts"));
const found = files.flatMap((f) => scanSource(f, readFileSync(f, "utf8")).map((s) => ({ file: rel(f), ...s })));
const isManual = (why: string) => why in REVIEWED || NOT_COUNTED.has(why);

describe("RTL conventions: logical utilities", () => {
  it("no physical utility sits in a class string or cva map without a rtl-physical comment", () => {
    const loose = found.filter((s) => !isManual(s.why) && !s.kept).map((s) => `${s.file}:${s.line} ${s.token}`);
    expect(loose, "use the logical form (ml -> ms, pr -> pe, left -> start, text-left -> text-start, border-l -> border-s, rounded-l -> rounded-s), or add `// rtl-physical xN: why` and an allowlist entry").toEqual([]);
  });

  it("the commented physical tokens match the allowlist exactly (rising counts and stale entries fail)", () => {
    const counts: Record<string, number> = {};
    for (const s of found) if (!isManual(s.why) && s.kept) counts[s.file] = (counts[s.file] ?? 0) + 1;
    const rose = Object.entries(counts).filter(([f, n]) => n > (PHYSICAL_BY_DESIGN[f]?.count ?? 0)).map(([f, n]) => `${f}: ${PHYSICAL_BY_DESIGN[f]?.count ?? 0} -> ${n} (add an entry with a reason, or use the logical form)`);
    expect(rose).toEqual([]);
    const stale = Object.entries(PHYSICAL_BY_DESIGN).filter(([f, e]) => (counts[f] ?? 0) !== e.count).map(([f, e]) => `${f}: listed ${e.count}, found ${counts[f] ?? 0} (update or delete the entry)`);
    expect(stale).toEqual([]);
    for (const [f, e] of Object.entries(PHYSICAL_BY_DESIGN)) expect(e.why.length, f).toBeGreaterThan(10);
  });

  it("the reviewed leftovers do not grow (corner gradients, object position, slide-in/out)", () => {
    const counts: Record<string, number> = {};
    for (const s of found) if (s.why in REVIEWED) counts[s.why] = (counts[s.why] ?? 0) + 1;
    for (const [kind, e] of Object.entries(REVIEWED)) expect(counts[kind] ?? 0, `${kind}: ${e.why}`).toBe(e.count);
  });
});

describe("RTL conventions: one reader of the reading direction", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  const ALLOWED = new Set(["lib/direction.ts", "hooks/use-direction.ts"]);
  const AD_HOC = [
    /documentElement\.dir\b/,
    /\bdocument\.dir\b/,
    /document\.body\.dir\b/,
    /getComputedStyle\([^)]*\)\.direction/,
    /getAttribute\(\s*["']dir["']\s*\)/,
    /closest\(\s*["']\[dir[\]=]/,
  ];

  it("components use useDirection (or lib/direction) instead of reading dir ad hoc", () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (ALLOWED.has(rel(f))) continue;
      const text = strip(readFileSync(f, "utf8"));
      for (const re of AD_HOC) if (re.test(text)) offenders.push(`${rel(f)} matches ${re}`);
    }
    expect(offenders, "read the direction with useDirection() in render, or directionOf(el) in an event handler").toEqual([]);
  });

  it("useDirection and directionOf are the reading points: they read dir attributes", () => {
    expect(readFileSync(path.join(SRC, "lib/direction.ts"), "utf8")).toMatch(/getAttribute\("dir"\)/);
    expect(readFileSync(path.join(SRC, "hooks/use-direction.ts"), "utf8")).toMatch(/directionOf/);
  });
});

describe("rtl-codemod token rules", () => {
  const tok = (t: string, siblings: string[] = []) => transformToken(t, new Set(siblings));

  it("renames physical utilities to logical ones and keeps variants, signs and arbitrary values", () => {
    const cases: Record<string, string> = {
      "ml-2": "ms-2",
      "-ml-1.5": "-ms-1.5",
      "mr-auto": "me-auto",
      "pl-[calc(1rem+2px)]": "ps-[calc(1rem+2px)]",
      "sm:pr-4": "sm:pe-4",
      "left-0": "start-0",
      "-right-1": "-end-1",
      "right-1/2": "end-1/2",
      "text-left": "text-start",
      "text-right": "text-end",
      "border-l": "border-s",
      "border-r-2": "border-e-2",
      "border-l-transparent": "border-s-transparent",
      "rounded-l-md": "rounded-s-md",
      "rounded-r": "rounded-e",
      "rounded-tl-xl": "rounded-ss-xl",
      "rounded-tr-xl": "rounded-se-xl",
      "rounded-bl-none": "rounded-es-none",
      "rounded-br-sm": "rounded-ee-sm",
      "float-left": "float-start",
      "scroll-ml-4": "scroll-ms-4",
      "[&_th]:text-left": "[&_th]:text-start",
      "data-[state=open]:after:left-0": "data-[state=open]:after:start-0",
      "hover:[&_svg]:mr-1": "hover:[&_svg]:me-1",
      "ml-2!": "ms-2!",
      "!ml-2": "!ms-2",
    };
    for (const [from, to] of Object.entries(cases)) expect(tok(from)?.out, from).toBe(to);
  });

  it("adds an rtl: partner for movement that is direction itself (the original stays)", () => {
    expect(tok("-translate-x-1/2")?.out).toBe("-translate-x-1/2 rtl:translate-x-1/2");
    expect(tok("translate-x-0.5")?.out).toBe("translate-x-0.5 rtl:-translate-x-0.5");
    expect(tok("group-hover:translate-x-1")?.out).toBe("group-hover:translate-x-1 rtl:group-hover:-translate-x-1");
    expect(tok("origin-left")?.out).toBe("origin-left rtl:origin-right");
    expect(tok("origin-top-right")?.out).toBe("origin-top-right rtl:origin-top-left");
    expect(tok("bg-linear-to-r")?.out).toBe("bg-linear-to-r rtl:bg-linear-to-l");
    expect(tok("translate-x-0")).toBeNull();
    expect(tok("-translate-x-1/2", ["rtl:translate-x-1/2"])).toBeNull();
  });

  it("leaves alone: physical-side variants, tokens that already carry rtl:/ltr:, and logical or neutral utilities", () => {
    for (const t of ["data-[side=left]:mr-2", "[&[align=right]]:text-right", "rtl:ml-2", "ltr:pr-2", "ms-2", "text-start", "start-0", "mx-auto", "px-2", "flex", "left", "rounded-md"]) {
      expect(tok(t), t).toBeNull();
    }
    expect(tok("rotate-90")).toEqual({ manual: "rotate" });
    expect(tok("bg-gradient-to-br")).toEqual({ manual: "corner gradient" });
    expect(tok("data-[motion=from-end]:slide-in-from-right-12")?.out).toBe("data-[motion=from-end]:slide-in-from-end-12");
  });

  it("is idempotent, handles runs of classes, and reports a token split by ${}", () => {
    const once = transformText("flex ml-2 pr-4 -translate-x-1/2 text-left").text;
    expect(once).toBe("flex ms-2 pe-4 -translate-x-1/2 rtl:translate-x-1/2 text-start");
    expect(transformText(once).text).toBe(once);
    expect(transformText("pl-", { endsOpen: true }).manual).toHaveLength(1);
    expect(transformText("flex ", { endsOpen: true }).manual).toHaveLength(0);
  });
});
