// Per-component notes: the hand-written part of the docs (when to use it, keys, screen reader behaviour, reduced
// motion, server rendering, styling slots, gotchas). Source of truth is one markdown file per component in
// docs/notes/<Name>.md; this module parses them, lints them against the generated API and the source, and serializes
// them for the playground (apps/playground/src/generated/notes.json) and the llms generator.
//
// File format (see docs/notes/README.md for the full template):
//
//   ---
//   component: Select              the exported component this note is about (key of api.json)
//   module: primitives/select      where it lives (must match api.json)
//   covers: SelectTrigger, ...     optional: other exported names the note also explains
//   use: One or two sentences: what it is for.
//   instead: Combobox = the list is long; RadioGroup = options stay visible      optional, `;` separated
//   server: ssr-safe               ssr-safe | mixed | client-only (see docs/notes/README.md)
//   ---
//   ## Keyboard            a `| Key | Action |` table, or a sentence when there is no keyboard interaction
//   ## Screen readers      paragraphs or `- ` bullets
//   ## Reduced motion
//   ## Server rendering
//   ## Slots               optional: - `data-slot-name`: what it is (names must appear in the module's source)
//   ## Gotchas             2 to 4 bullets
//   ## Example             optional: one ```tsx block, a small self-contained module (imports + an exported component) that type-checks
//                          (scripts/docs/note-examples.mjs, test/docs-note-examples.test.ts); shown in the pages for agents
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const SECTIONS = ["Keyboard", "Screen readers", "Reduced motion", "Server rendering", "Slots", "Gotchas", "Example"];
const REQUIRED = ["Keyboard", "Screen readers", "Reduced motion", "Server rendering", "Gotchas"];
export const SERVER_MODES = ["ssr-safe", "mixed", "client-only"];
const MAX_CHARS = 5200;

/** `notes dir` of a repo checkout: docs/notes at the repo root. */
export const notesDir = (root) => path.resolve(root, "../../docs/notes");

const splitList = (s) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Turns the lines of one section into blocks: paragraphs, bullet lists and tables. */
export function parseBlocks(lines) {
  const blocks = [];
  let para = [];
  let list = null;
  let table = null;
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    if (list) blocks.push({ type: "ul", items: list });
    if (table) blocks.push({ type: "table", head: table[0], rows: table.slice(1) });
    para = [];
    list = null;
    table = null;
  };
  const cells = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, "|"));
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
    } else if (line.trimStart().startsWith("|")) {
      if (!table) {
        flush();
        table = [];
      }
      const row = cells(line);
      if (!row.every((c) => /^:?-{2,}:?$/.test(c))) table.push(row);
    } else if (/^\s*[-*] /.test(line)) {
      if (!list) {
        flush();
        list = [];
      }
      list.push(line.replace(/^\s*[-*] /, "").trim());
    } else if (list && /^\s{2,}\S/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      if (list || table) flush();
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** Parses one note file. Never throws: problems come back in `errors`. */
export function parseNote(text, file = "note") {
  const errors = [];
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, "\n"));
  if (!m) return { errors: [`${file}: missing front-matter (--- ... ---)`] };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!kv) {
      if (line.trim()) errors.push(`${file}: bad front-matter line "${line}"`);
      continue;
    }
    fm[kv[1]] = kv[2].trim();
  }
  for (const key of Object.keys(fm)) {
    if (!["component", "module", "covers", "use", "instead", "server"].includes(key)) errors.push(`${file}: unknown front-matter key "${key}"`);
  }
  const sections = {};
  let current = null;
  for (const line of m[2].split("\n")) {
    const h = /^## (.+?)\s*$/.exec(line);
    if (h) {
      current = h[1];
      if (!SECTIONS.includes(current)) errors.push(`${file}: unknown section "## ${current}" (use ${SECTIONS.join(", ")})`);
      if (sections[current]) errors.push(`${file}: duplicate section "## ${current}"`);
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    } else if (line.trim()) {
      errors.push(`${file}: text before the first "## " heading`);
    }
  }
  let example = "";
  if (sections.Example) {
    const text = sections.Example.join("\n");
    const fence = /```tsx\n([\s\S]*?)\n```/.exec(text);
    if (fence) example = fence[1];
    else errors.push(`${file}: ## Example needs one \`\`\`tsx fenced block`);
    delete sections.Example;
    sections.__example = [];
  }
  const blocks = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, parseBlocks(v)]));
  const instead = (fm.instead ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf("=");
      return i < 0 ? [s, ""] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
    });
  const note = {
    component: fm.component ?? "",
    module: fm.module ?? "",
    covers: splitList(fm.covers),
    use: fm.use ?? "",
    instead,
    server: fm.server ?? "",
    keyboard: blocks.Keyboard ?? [],
    screenReaders: blocks["Screen readers"] ?? [],
    motion: blocks["Reduced motion"] ?? [],
    ssr: blocks["Server rendering"] ?? [],
    slots: (blocks.Slots ?? []).flatMap((b) => (b.type === "ul" ? b.items : [])),
    gotchas: (blocks.Gotchas ?? []).flatMap((b) => (b.type === "ul" ? b.items : [])),
    example,
    chars: text.length,
  };
  return { note, errors, present: Object.keys(sections).filter((k) => k !== "__example") };
}

/** Every note in docs/notes as `Map<component, note>`, plus parse errors. */
export function loadNotes(root) {
  const dir = notesDir(root);
  const notes = new Map();
  const errors = [];
  if (!existsSync(dir)) return { notes, errors, files: [] };
  const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md").sort();
  for (const f of files) {
    const text = readFileSync(path.join(dir, f), "utf8");
    const r = parseNote(text, f);
    errors.push(...r.errors);
    if (!r.note) continue;
    r.note.file = f;
    r.present = r.present ?? [];
    r.note.__present = r.present;
    if (r.note.component && f !== `${r.note.component}.md`) errors.push(`${f}: the file name must be <component>.md (component: ${r.note.component})`);
    if (notes.has(r.note.component)) errors.push(`${f}: duplicate note for ${r.note.component}`);
    notes.set(r.note.component, r.note);
  }
  return { notes, errors, files };
}

const slotsInSource = (root, module) => {
  const base = path.join(root, "src", module);
  const dir = path.dirname(base);
  const stem = path.basename(base);
  const out = new Set();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!(f === `${stem}.tsx` || f === `${stem}.ts` || f.startsWith(`${stem}-`))) continue;
    const text = readFileSync(path.join(dir, f), "utf8");
    for (const s of text.matchAll(/data-slot=(?:"([^"]+)"|\{"([^"]+)"\})/g)) out.add(s[1] ?? s[2]);
  }
  return out;
};

/** Checks the notes against the API index and the source. Returns a list of problems (empty = fine). */
export function lintNotes({ root, api, notes, parseErrors = [], only }) {
  const errors = [...parseErrors];
  const known = (n) => n in api.components || n in api.hooks;
  for (const [name, note] of notes) {
    if (only && !only.includes(name)) continue;
    const at = `${name}.md`;
    const entry = api.components[name];
    if (!entry) {
      errors.push(`${at}: "${name}" is not an exported component in api.json`);
      continue;
    }
    if (note.module !== entry.module) errors.push(`${at}: module is "${note.module}" but ${name} lives in "${entry.module}"`);
    if (!note.use || note.use.length < 20) errors.push(`${at}: "use" needs a sentence of what it is for`);
    if (!SERVER_MODES.includes(note.server)) errors.push(`${at}: server must be one of ${SERVER_MODES.join(", ")}`);
    for (const c of note.covers) {
      if (!known(c)) errors.push(`${at}: covers "${c}" is not exported`);
      else if (api.components[c]?.module !== entry.module) errors.push(`${at}: covers "${c}" lives in another module`);
    }
    for (const [n] of note.instead) if (!known(n)) errors.push(`${at}: instead "${n}" is not exported`);
    for (const s of REQUIRED) if (!note.__present.includes(s)) errors.push(`${at}: missing "## ${s}"`);
    const kb = note.keyboard;
    const table = kb.find((b) => b.type === "table");
    if (table) {
      if (table.head.length !== 2) errors.push(`${at}: the Keyboard table has two columns (Key | Action)`);
      if (table.rows.length === 0) errors.push(`${at}: the Keyboard table has no rows`);
      for (const r of table.rows) if (r.length !== 2 || !r[0] || !r[1]) errors.push(`${at}: Keyboard row "${r.join(" | ")}" needs a key and an action`);
    } else if (!kb.some((b) => b.type === "p")) errors.push(`${at}: Keyboard needs a table, or one sentence saying there is none`);
    if (note.screenReaders.length === 0) errors.push(`${at}: Screen readers is empty`);
    if (note.motion.length === 0) errors.push(`${at}: Reduced motion is empty`);
    if (note.ssr.length === 0) errors.push(`${at}: Server rendering is empty`);
    if (note.gotchas.length < 2 || note.gotchas.length > 4) errors.push(`${at}: Gotchas needs 2 to 4 bullets (has ${note.gotchas.length})`);
    if (note.example) {
      const lines = note.example.split("\n").length;
      if (lines > 30) errors.push(`${at}: the example has ${lines} lines; keep it under 30`);
      if (!/^import /m.test(note.example)) errors.push(`${at}: the example needs its import lines`);
      if (!/^export /m.test(note.example)) errors.push(`${at}: the example exports its component (export function Example)`);
    }
    if (note.chars > MAX_CHARS) errors.push(`${at}: ${note.chars} characters; keep a note under ${MAX_CHARS}`);
    if (note.slots.length) {
      const inSource = slotsInSource(root, note.module);
      for (const line of note.slots) {
        const slot = /^`([^`]+)`/.exec(line)?.[1];
        if (!slot) errors.push(`${at}: a Slots bullet starts with the \`data-slot\` name in backticks ("${line.slice(0, 40)}")`);
        else if (!inSource.has(slot)) errors.push(`${at}: data-slot "${slot}" does not appear in ${note.module}`);
      }
    }
  }
  return errors;
}

/** The file-per-module coverage: the primitive modules in api.json that no note names. */
export function modulesWithoutNote(api, notes, layer = "primitives") {
  const have = new Set([...notes.values()].map((n) => n.module));
  const mods = new Set(Object.values(api.components).filter((c) => c.layer === layer).map((c) => c.module));
  return [...mods].filter((m) => !have.has(m)).sort();
}

/**
 * What the playground reads: `notes` keyed by component and `index`, every exported component that a note explains
 * (its own, a `covers` entry or a same-module prefix) mapped to the note's name.
 */
export function serializeNotes(notes, api) {
  const out = {};
  for (const name of [...notes.keys()].sort()) {
    const { __present, chars, file, ...rest } = notes.get(name);
    out[name] = rest;
  }
  const plain = Object.fromEntries(Object.entries(out));
  const index = {};
  for (const [name, entry] of Object.entries(api.components).sort(([a], [b]) => a.localeCompare(b))) {
    const note = noteFor(name, entry, plain);
    if (note) index[name] = note;
  }
  const lines = Object.entries(out).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`);
  return `{\n"notes":{\n${lines.join(",\n")}\n},\n"index":${JSON.stringify(index)}\n}\n`;
}

/** Which note explains a component: its own, one that covers it, else the longest note name that prefixes it in the same module. */
export function noteFor(name, entry, notes) {
  if (notes[name]) return name;
  let best = null;
  for (const [n, note] of Object.entries(notes)) {
    if (note.covers?.includes(name)) return n;
    if (entry && note.module === entry.module && name.startsWith(n) && (!best || n.length > best.length)) best = n;
  }
  if (!best && entry) {
    const same = Object.entries(notes).filter(([, note]) => note.module === entry.module);
    if (same.length === 1) best = same[0][0];
  }
  return best;
}
