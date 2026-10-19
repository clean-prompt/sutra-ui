import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkNoteExamples } from "../scripts/docs/note-examples.mjs";
import { loadNotes } from "../scripts/docs/notes.mjs";

/**
 * The `## Example` blocks in docs/notes are type-checked against the real source, so an example shipped to agents (in
 * docs/components/<Name>.md and the Notes panel) cannot name a prop that does not exist. One TypeScript program for all of them.
 */
const ROOT = path.resolve(__dirname, "..");

describe("note examples", () => {
  const { notes } = loadNotes(ROOT);

  it("type-check against the package source", () => {
    const problems = checkNoteExamples({ root: ROOT, notes });
    expect(problems.map((p) => `${p.name}.md line ${p.line}: ${p.message}`)).toEqual([]);
  }, 120_000);

  it("catches a wrong prop value", () => {
    const bad = new Map([["Bad", { example: 'import { Button } from "@sutra/ui";\nexport function Example() {\n  return <Button variant="nope">x</Button>;\n}\n' }]]);
    const problems = checkNoteExamples({ root: ROOT, notes: bad as never });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ name: "Bad", line: 3 });
  }, 120_000);

  it("are small, imported and exported", () => {
    for (const [name, note] of notes) {
      if (!note.example) continue;
      expect(note.example.split("\n").length, name).toBeLessThanOrEqual(30);
      expect(note.example, name).toMatch(/^import /m);
      expect(note.example, name).toMatch(/^export function Example/m);
    }
  });
});
