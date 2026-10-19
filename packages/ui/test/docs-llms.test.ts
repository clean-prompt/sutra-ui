import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildOutputs, collectDemos, componentMarkdown, exampleCode, familyOf, hookMarkdown, oneLine, parentOf, pickExamples } from "../scripts/docs/llms.mjs";
import { loadNotes } from "../scripts/docs/notes.mjs";
import { buildSizingRows, describeRow, lengthPx, parseSizeClasses, sizingMarkdown } from "../scripts/docs/sizing.mjs";

/**
 * The agent-readable docs (llms.txt, llms-full.txt, one markdown page per component, the skill), the sizing table and the
 * data-slot snapshot. The generators are pure functions; `pnpm docs:llms --check` (in `verify`) compares them with the files on disk.
 */
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");
const api = JSON.parse(readFileSync(path.join(REPO, "apps/playground/src/generated/api.json"), "utf8"));

const fixture = {
  components: {
    Dialog: { kind: "component", module: "primitives/dialog", layer: "primitives", entries: ["index", "overlays"], entry: "overlays", description: "A modal.\n\nSecond paragraph.", slot: "dialog", props: [{ name: "open", type: "boolean | \"a\" | \"b\"", required: false, default: "false", description: "Open state." }] },
    DialogContent: { kind: "component", module: "primitives/dialog", layer: "primitives", entries: ["index"], entry: "overlays", props: [{ name: "size", type: "\"sm\" | \"md\"", required: true }] },
    Sheet: { kind: "component", module: "primitives/dialog", layer: "primitives", entries: ["index"], entry: "overlays", props: [] },
  },
  hooks: {
    useThing: { kind: "hook", module: "hooks/use-thing", layer: "hooks", entry: "tokens", entries: ["tokens"], description: "Does a thing.", signature: "(n: number): number", props: [] },
  },
  entries: {},
};

describe("page helpers", () => {
  it("finds the parent and the parts of a family inside one module", () => {
    expect(parentOf("DialogContent", fixture.components.DialogContent, fixture)).toBe("Dialog");
    expect(parentOf("Dialog", fixture.components.Dialog, fixture)).toBeNull();
    expect(parentOf("Sheet", fixture.components.Sheet, fixture)).toBeNull();
    expect(familyOf("Dialog", fixture.components.Dialog, fixture)).toEqual(["DialogContent"]);
  });

  it("cuts descriptions at a sentence for index lines", () => {
    expect(oneLine("Short one.\n\nMore.")).toBe("Short one.");
    const long = `${"word ".repeat(60)}end`;
    expect(oneLine(long, 40).length).toBeLessThanOrEqual(41);
    expect(oneLine(long, 40).endsWith("…")).toBe(true);
  });

  it("writes a component page with escaped table cells, parts and slots", () => {
    const md = componentMarkdown({ name: "Dialog", entry: fixture.components.Dialog, api: fixture, notes: {}, noteIndex: {}, examples: new Map() });
    expect(md).toContain("# Dialog");
    expect(md).toContain('import { Dialog } from "@sutra/ui"');
    expect(md).toContain("(or from `@sutra/ui/overlays`)");
    expect(md).toContain("`data-slot`: `dialog`");
    expect(md).toContain('`boolean \\| "a" \\| "b"`');
    expect(md).toContain("[`DialogContent`](DialogContent.md)");
    expect(md).toContain("### DialogContent");
    expect(md).toContain("`size` (required)");
    expect(md).toContain("Second paragraph.");
    const part = componentMarkdown({ name: "DialogContent", entry: fixture.components.DialogContent, api: fixture, notes: {}, noteIndex: {}, examples: new Map() });
    expect(part).toContain("Part of [`Dialog`](Dialog.md)");
  });

  it("writes a hook page with its signature", () => {
    const md = hookMarkdown({ name: "useThing", entry: fixture.hooks.useThing, examples: new Map() });
    expect(md).toContain("useThing(n: number): number");
    expect(md).toContain('import { useThing } from "@sutra/ui/tokens"');
  });

  it("turns playground captions into comments in a quoted example", () => {
    expect(exampleCode({ code: "<DemoLabel>Primary</DemoLabel>\n<Button />" })).toBe("{/* Primary */}\n<Button />");
  });

  it("prefers a demo whose subject is the component and that stands alone", () => {
    const demo = (props: string[], helpers: string[], lines: number) => ({ code: Array.from({ length: lines }, () => "x").join("\n"), imports: "", names: [], helpers, props });
    const picked = pickExamples(
      [
        { route: "a/b", key: "wide", demo: demo(["Sheet", "Dialog"], [], 5) },
        { route: "a/b", key: "own-with-helper", demo: demo(["Dialog"], ["Row"], 5) },
        { route: "a/b", key: "own", demo: demo(["Dialog"], [], 8) },
        { route: "a/b", key: "huge", demo: demo(["Dialog"], ["Row"], 90) },
      ],
      fixture
    );
    expect(picked.get("Dialog")?.key).toBe("own");
    expect(picked.get("Sheet")?.key).toBe("wide");
  });
});

describe("sizing table", () => {
  it("reads lengths in px", () => {
    expect([lengthPx("9"), lengthPx("2.5"), lengthPx("px"), lengthPx("[18px]"), lengthPx("[1.5rem]"), lengthPx("(--x)")]).toEqual([36, 10, 1, 18, 24, null]);
  });

  it("splits a size's classes into columns", () => {
    expect(parseSizeClasses("h-9 px-3.5 text-sm [&_svg]:size-4")).toMatchObject({ height: 36, padX: 14, text: { name: "sm", px: 14 }, icon: 16 });
    expect(parseSizeClasses("size-8 [&_svg]:size-4 @hitAreaTouch")).toMatchObject({ height: 32, width: 32, hit: true });
    expect(parseSizeClasses("sm:max-w-lg")).toMatchObject({ maxWidth: 512, height: null });
    expect(parseSizeClasses("track: h-1 thumb: size-4").parts).toEqual(["track", "thumb"]);
  });

  it("flags targets under 24px and whether the module extends them", () => {
    const rows = buildSizingRows({
      components: {
        Tiny: { layer: "primitives", entry: "core", sizes: { sm: "size-3.5" }, hitArea: true, props: [] },
        Static: { layer: "primitives", entry: "core", sizes: { sm: "size-2.5", md: "size-9" }, props: [{ name: "size", default: '"md"' }] },
      },
    });
    const by = (c: string, s: string) => rows.find((r) => r.component === c && r.size === s)!;
    expect(by("Tiny", "sm")).toMatchObject({ under: true, hit: true });
    expect(describeRow(by("Tiny", "sm")).target).toBe("under 24px, hit area extended");
    expect(by("Static", "sm")).toMatchObject({ under: true, hit: false });
    expect(by("Static", "md")).toMatchObject({ under: false, isDefault: true });
  });

  it("covers the real components with a size variant", () => {
    const rows = buildSizingRows(api);
    expect(rows.length).toBeGreaterThan(150);
    const button = rows.filter((r) => r.component === "Button");
    expect(button.find((r) => r.size === "md")).toMatchObject({ height: 36, padX: 14, isDefault: true });
    expect(button.find((r) => r.size === "xl")).toMatchObject({ height: 48 });
    const md = sizingMarkdown(rows);
    expect(md).toContain("| Button | md (default) | h 36px | x 14px | sm (14px) | 16px |");
  });
});

describe("generated agent docs", () => {
  const { notes } = loadNotes(ROOT);
  const built = buildOutputs({ root: ROOT, repo: REPO, api, notesMap: notes, demos: collectDemos(REPO, api) });
  const text = (p: string) => built.files.get(p)!;

  it("has a page for every component and hook", () => {
    for (const name of Object.keys(api.components)) expect(built.files.has(`docs/components/${name}.md`), name).toBe(true);
    for (const name of Object.keys(api.hooks)) expect(built.files.has(`docs/hooks/${name}.md`), name).toBe(true);
  });

  it("links every component family from llms.txt, to pages that exist", () => {
    const index = text("apps/playground/public/llms.txt");
    const links = [...index.matchAll(/\]\((md\/(?:hooks\/)?[\w-]+\.md)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(700);
    for (const link of links) {
      const file = link.startsWith("md/hooks/") ? `docs/hooks/${link.slice(9)}` : `docs/components/${link.slice(3)}`;
      expect(built.files.has(file), link).toBe(true);
    }
    for (const name of ["Button", "Dialog", "Select", "useDrag"]) expect(index).toContain(`[${name}](md/`);
  });

  it("keeps the sizes sane", () => {
    expect(Buffer.byteLength(text("apps/playground/public/llms.txt"))).toBeLessThan(80_000);
    expect(Buffer.byteLength(text("apps/playground/public/llms-full.txt"))).toBeLessThan(900_000);
    for (const [file, body] of built.files) if (file.startsWith("docs/components/")) expect(Buffer.byteLength(body), file).toBeLessThan(150_000);
  });

  it("puts notes and an example in the pages that have them", () => {
    const select = text("docs/components/Select.md");
    expect(select).toContain("## Notes");
    expect(select).toContain("### Keyboard");
    expect(select).toContain("### Gotchas");
    expect(text("docs/components/SelectTrigger.md")).toContain("See the notes in [`Select`]");
    expect(built.stats.examples).toBeGreaterThan(300);
    // An example written in a note replaces the demo-derived one (no playground helpers, no live link).
    expect(text("docs/components/Button.md")).not.toContain("Playground helpers");
    expect(text("docs/components/Button.md")).toContain("## Example");
    expect(text("docs/components/Button.md")).toContain("export function Example");
  });

  it("leaves no empty or undefined placeholders in any page", () => {
    for (const [file, full] of built.files) {
      const body = full.replace(/```[\s\S]*?```/g, "");
      // Template slips: a missing value printed as text, or a link to a page named after one. (Code blocks may say undefined, so they are skipped.)
      expect(body, file).not.toMatch(/undefined\.md|null\.md|\(default undefined\)|^- (Import|Source): .*undefined/m);
      expect(body, file).not.toMatch(/^\|.*\[object Object\]/m); // table cells; a note may mention it in prose
    }
  });

  it("ships a small skill with its references", () => {
    const skill = readFileSync(path.join(REPO, "skills/sutra-ui/SKILL.md"), "utf8");
    expect(skill.split("\n").length).toBeLessThanOrEqual(200);
    expect(skill).toMatch(/^---\nname: sutra-ui\ndescription: .{60,}\n---\n/);
    for (const ref of ["entries", "components", "sizing", "conventions"]) expect(skill).toContain(`references/${ref}.md`);
    expect(built.files.has("skills/sutra-ui/references/entries.md")).toBe(true);
    expect(text("skills/sutra-ui/references/components.md")).toContain("`Button` (core)");
  });
});

describe("data-slot names", () => {
  it("are snapshotted per module, so a rename shows up in review (update with vitest -u)", async () => {
    const byModule: Record<string, string[]> = {};
    for (const entry of Object.values(api.components) as { module: string; slot?: string; slots?: string[] }[]) {
      const slots = entry.slots ?? (entry.slot ? [entry.slot] : []);
      if (slots.length) byModule[entry.module] = [...new Set([...(byModule[entry.module] ?? []), ...slots])].sort();
    }
    const sorted = Object.fromEntries(Object.entries(byModule).sort(([a], [b]) => a.localeCompare(b)));
    await expect(`${Object.entries(sorted).map(([m, s]) => `${JSON.stringify(m)}: ${JSON.stringify(s)}`).join("\n")}\n`).toMatchFileSnapshot("./slots-snapshot.txt");
  });
});
