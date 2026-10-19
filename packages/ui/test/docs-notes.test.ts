import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lintNotes, loadNotes, modulesWithoutNote, noteFor, parseBlocks, parseNote, serializeNotes } from "../scripts/docs/notes.mjs";

/**
 * Per-component notes (docs/notes/*.md): the parser, the lint rules, the resolution of a component to its note, and the ratchet
 * that every primitive module has one. The notes are shown by the playground's Notes panel and shipped in the llms files.
 */
const ROOT = path.resolve(__dirname, "..");
const api = JSON.parse(readFileSync(path.resolve(ROOT, "../../apps/playground/src/generated/api.json"), "utf8"));
const BASELINE = path.join(__dirname, "notes-baseline.json");

const SAMPLE = `---
component: Button
module: primitives/button
covers:
use: The standard action with a long enough sentence.
instead: TextLink = it is inline in text; SplitButton = it needs a menu
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Enter, Space | Activates \`it\` |
| A \\| B | Escaped pipe |

## Screen readers
- One
  continued
- Two

Plain paragraph
on two lines.

## Reduced motion
Nothing moves.

## Server rendering
Same markup.

## Gotchas
- First
- Second
`;

describe("note parser", () => {
  it("reads front-matter, tables, bullets and paragraphs", () => {
    const { note, errors } = parseNote(SAMPLE, "Button.md");
    expect(errors).toEqual([]);
    expect(note).toMatchObject({ component: "Button", module: "primitives/button", server: "ssr-safe" });
    expect(note!.instead).toEqual([
      ["TextLink", "it is inline in text"],
      ["SplitButton", "it needs a menu"],
    ]);
    expect(note!.keyboard).toEqual([
      { type: "table", head: ["Key", "Action"], rows: [["Enter, Space", "Activates `it`"], ["A | B", "Escaped pipe"]] },
    ]);
    expect(note!.screenReaders).toEqual([
      { type: "ul", items: ["One continued", "Two"] },
      { type: "p", text: "Plain paragraph on two lines." },
    ]);
    expect(note!.gotchas).toEqual(["First", "Second"]);
  });

  it("reports malformed files instead of throwing", () => {
    expect(parseNote("no front matter", "x.md").errors[0]).toMatch(/front-matter/);
    const bad = parseNote(SAMPLE.replace("## Gotchas", "## Mystery").replace("server: ssr-safe", "server: ssr-safe\nwhat: no"), "x.md");
    expect(bad.errors.join("\n")).toMatch(/unknown section "## Mystery"/);
    expect(bad.errors.join("\n")).toMatch(/unknown front-matter key "what"/);
  });

  it("splits blocks on blank lines", () => {
    expect(parseBlocks(["a", "b", "", "- c", "", "| h | i |", "|--|--|", "| 1 | 2 |"])).toEqual([
      { type: "p", text: "a b" },
      { type: "ul", items: ["c"] },
      { type: "table", head: ["h", "i"], rows: [["1", "2"]] },
    ]);
  });
});

describe("note resolution", () => {
  const notes = {
    Dialog: { module: "primitives/dialog", covers: ["AlertDialog"] },
    Sheet: { module: "primitives/dialog", covers: [] },
    Text: { module: "primitives/typography", covers: [] },
  };
  it("prefers the component's own note, then covers, then the longest same-module prefix, then a lone note in the module", () => {
    expect(noteFor("Sheet", { module: "primitives/dialog" }, notes)).toBe("Sheet");
    expect(noteFor("AlertDialog", { module: "primitives/dialog" }, notes)).toBe("Dialog");
    expect(noteFor("SheetContent", { module: "primitives/dialog" }, notes)).toBe("Sheet");
    expect(noteFor("DialogTitle", { module: "primitives/dialog" }, notes)).toBe("Dialog");
    expect(noteFor("Kbd", { module: "primitives/typography" }, notes)).toBe("Text");
    expect(noteFor("Kbd", { module: "primitives/other" }, notes)).toBeNull();
  });
});

describe("notes in docs/notes", () => {
  const { notes, errors } = loadNotes(ROOT);

  it("parse and lint clean against api.json and the source", () => {
    expect(lintNotes({ root: ROOT, api, notes, parseErrors: errors })).toEqual([]);
  });

  it("names a note for the exemplar components", () => {
    for (const name of ["Button", "Select", "Dialog"]) expect(notes.has(name), name).toBe(true);
  });

  it("serializes every note and an index that resolves component names to notes", () => {
    const data = JSON.parse(serializeNotes(notes, api));
    expect(Object.keys(data.notes).sort()).toEqual([...notes.keys()].sort());
    for (const [component, note] of Object.entries(data.index)) {
      expect(api.components[component], component).toBeTruthy();
      expect(data.notes[note as string], component).toBeTruthy();
    }
    expect(data.index.SelectTrigger).toBe("Select");
  });

  it("covers every primitive module (ratchet: the list in notes-baseline.json may only shrink)", () => {
    const baseline: string[] = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")).primitiveModulesWithoutNote : [];
    const missing = modulesWithoutNote(api, notes);
    expect(missing.filter((m) => !baseline.includes(m)), "primitive modules that have no note: add docs/notes/<Name>.md").toEqual([]);
    expect(baseline.filter((m) => !missing.includes(m)), "these now have a note: remove them from test/notes-baseline.json").toEqual([]);
  });
});
