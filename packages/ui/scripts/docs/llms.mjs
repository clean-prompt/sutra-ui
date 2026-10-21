// Builds the agent-readable docs from the generated API (api.json), the hand-written notes (docs/notes) and the
// playground's demo sources: llms.txt, llms-full.txt, one markdown file per component and hook, and the generated
// references of the Claude skill (skills/sutra-ui/references/entries.md and components.md).
//
// Pure functions: `buildOutputs` returns `Map<repo-relative path, text>`; scripts/gen-llms.mjs writes or checks them.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import { noteFor } from "./notes.mjs";
import { buildSizingRows, sizingMarkdown } from "./sizing.mjs";

const LAYER_ORDER = ["primitives", "patterns", "kits", "blocks", "assets"];
const DOC_MAX = 160;
const EXAMPLE_MAX_LINES = 70;
const EXAMPLE_HARD_MAX = 120;

/* ---------------------------------------------------------------------------------------------- */
/* Helpers                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

const squash = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const firstParagraph = (text) => squash(String(text ?? "").split(/\n\s*\n/)[0]);
const cell = (s) => squash(s).replace(/\|/g, "\\|");
export const importPath = (entry) => (entry === "index" ? "@sutra/ui" : `@sutra/ui/${entry}`);

/** First sentence-ish chunk of a JSDoc description, capped for index lines. */
export function oneLine(text, max = DOC_MAX) {
  const p = firstParagraph(text);
  if (p.length <= max) return p;
  const cut = p.slice(0, max);
  const dot = cut.lastIndexOf(". ");
  return dot > 60 ? cut.slice(0, dot + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Components that are a part of another component of the same module (`DialogContent` of `Dialog`). */
export function parentOf(name, entry, api) {
  let best = null;
  for (const [other, o] of Object.entries(api.components)) {
    if (other === name || o.module !== entry.module || !name.startsWith(other)) continue;
    if (!best || other.length > best.length) best = other;
  }
  return best;
}

export function familyOf(name, entry, api) {
  return Object.entries(api.components)
    .filter(([n, c]) => n !== name && c.module === entry.module && n.startsWith(name))
    .map(([n]) => n)
    .sort();
}

/* ---------------------------------------------------------------------------------------------- */
/* Demo sources (loaded through the playground's own extractor)                                     */
/* ---------------------------------------------------------------------------------------------- */

/** Loads apps/playground/plugins/demo-source.ts without a TS loader: transpile to CommonJS and evaluate. */
export function loadDemoSource(repo) {
  const file = path.join(repo, "apps/playground/plugins/demo-source.ts");
  const out = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const req = createRequire(file);
  new Function("require", "module", "exports", "__dirname", out)(req, mod, mod.exports, path.dirname(file));
  return mod.exports;
}

/** Every page's demos: `[{ route, key, demo }]` in route and source order. */
export function collectDemos(repo, api) {
  const { extractDemos, declarationsOf, pageFiles } = loadDemoSource(repo);
  const pages = path.join(repo, "apps/playground/src/pages");
  const routes = pageFiles(readFileSync(path.join(repo, "apps/playground/src/App.tsx"), "utf8"));
  const read = (f) => readFileSync(path.join(pages, `${f}.tsx`), "utf8");
  const closure = (file) => {
    const seen = [];
    const queue = [file];
    while (queue.length) {
      const f = queue.shift();
      if (seen.includes(f) || !existsSync(path.join(pages, `${f}.tsx`))) continue;
      seen.push(f);
      for (const rel of extractDemos(f, read(f), null).relativeImports) {
        const m = /^\.\/([\w-]+)$/.exec(rel);
        if (m) queue.push(m[1]);
      }
    }
    return seen;
  };
  const out = [];
  for (const [route, file] of Object.entries(routes).sort(([a], [b]) => a.localeCompare(b))) {
    const files = closure(file);
    const declarations = new Map();
    for (const f of files) for (const [n, d] of declarationsOf(f, read(f))) if (!declarations.has(n)) declarations.set(n, d);
    const seen = new Set();
    for (const f of files) {
      const found = extractDemos(f, read(f), api, declarations);
      for (const [key, demo] of Object.entries(found.demos)) {
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ route, key, demo });
      }
    }
  }
  return out;
}

// Playground captions become comments in a quoted example (a DemoLabel with text becomes a JSX comment holding the text).
export function exampleCode(demo) {
  return demo.code.replace(/<DemoLabel[^>]*>([\s\S]*?)<\/DemoLabel>/g, (_, text) => `{/* ${squash(text).replace(/\*\//g, "")} */}`);
}

/**
 * For each component, the demo to quote: one where it is the subject, preferably with no playground helpers, and short
 * (the first of that class up to 70 lines, else the shortest; with helpers at most 70 lines, without up to 120). Helpers that remain are named under the example.
 */
export function pickExamples(demos, api) {
  const cand = new Map();
  for (const d of demos) {
    const helpers = d.demo.helpers.filter((h) => h !== "DemoLabel");
    const lines = (d.demo.imports ? d.demo.imports.split("\n").length + 1 : 0) + exampleCode(d.demo).split("\n").length;
    // A snippet that leans on playground helpers must be short; one that stands alone may run longer.
    if (lines > (helpers.length ? EXAMPLE_MAX_LINES : EXAMPLE_HARD_MAX)) continue;
    d.demo.props.forEach((name, i) => {
      if (!(name in api.components) && !(name in api.hooks)) return;
      const list = cand.get(name) ?? [];
      list.push({ ...d, lines, helpers, primary: i === 0 });
      cand.set(name, list);
    });
  }
  const out = new Map();
  for (const [name, list] of cand) {
    const rank = (c) => (c.primary ? 0 : 2) + (c.helpers.length ? 1 : 0);
    const best = Math.min(...list.map(rank));
    const pool = list.filter((c) => rank(c) === best);
    out.set(name, pool.find((c) => c.lines <= EXAMPLE_MAX_LINES) ?? [...pool].sort((x, y) => x.lines - y.lines)[0]);
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------- */
/* Markdown                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

function propsTable(props) {
  const rows = props.map((p) => {
    const desc = `${p.deprecated ? `**Deprecated.** ${p.deprecated === "Deprecated." ? "" : `${squash(p.deprecated)} `}` : ""}${squash(p.description)}`.trim();
    return `| \`${p.name}\`${p.required ? " (required)" : ""} | \`${cell(p.type)}\` | ${p.default ? `\`${cell(p.default)}\`` : ""} | ${cell(desc)} |`;
  });
  return ["| Prop | Type | Default | Description |", "|---|---|---|---|", ...rows].join("\n");
}

function variantsList(entry) {
  const v = entry.variants;
  if (!v) return "";
  const defaults = Object.fromEntries((entry.props ?? []).filter((p) => p.default).map((p) => [p.name, p.default]));
  return Object.entries(v)
    .map(([k, values]) => `- \`${k}\`: ${values.map((x) => `\`${x}\``).join(", ")}${defaults[k] ? ` (default ${defaults[k]})` : ""}`)
    .join("\n");
}

function blockMd(blocks) {
  return blocks
    .map((b) => {
      if (b.type === "p") return b.text;
      if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n");
      return [`| ${b.head.join(" | ")} |`, `|${b.head.map(() => "---").join("|")}|`, ...b.rows.map((r) => `| ${r.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
    })
    .join("\n\n");
}

const SERVER_TEXT = {
  "ssr-safe": "Server render: same markup as the client.",
  mixed: "Server render: part of it fills in after mount.",
  "client-only": "Server render: client only (a placeholder or nothing).",
};

/** The note as markdown sections (heading level `h`). */
export function noteMarkdown(note, h = "###") {
  const parts = [`**When to use:** ${note.use}`];
  if (note.instead.length) parts.push(`**Use instead when:**\n${note.instead.map(([n, why]) => `- \`${n}\`: ${why}`).join("\n")}`);
  parts.push(`${h} Keyboard\n\n${blockMd(note.keyboard)}`);
  parts.push(`${h} Screen readers\n\n${blockMd(note.screenReaders)}`);
  parts.push(`${h} Reduced motion\n\n${blockMd(note.motion)}`);
  parts.push(`${h} Server rendering\n\n${SERVER_TEXT[note.server] ?? ""} ${blockMd(note.ssr)}`.trim());
  if (note.slots.length) parts.push(`${h} Slots\n\n${note.slots.map((s) => `- ${s}`).join("\n")}`);
  parts.push(`${h} Gotchas\n\n${note.gotchas.map((g) => `- ${g}`).join("\n")}`);
  return parts.join("\n\n");
}

function exampleMd(example) {
  if (!example) return "";
  // Written in the note and type-checked against the source: no playground link, no helpers.
  if (example.fromNote) return `## Example\n\n\`\`\`tsx\n${example.code}\n\`\`\``;
  const body = exampleCode(example.demo);
  const code = example.demo.imports ? `${example.demo.imports}\n\n${body}` : body;
  const live = /^[a-z0-9][a-z0-9-]*$/.test(example.key) ? ` (live: \`#/${example.route}/${example.key}\` in the playground)` : "";
  const note = example.helpers.length ? `\n\nPlayground helpers in this snippet (not part of the library): ${example.helpers.join(", ")}.` : "";
  return `## Example${live}\n\n\`\`\`tsx\n${code}\n\`\`\`${note}`;
}

function slotsOf(entry) {
  return entry.slots ?? (entry.slot ? [entry.slot] : []);
}

/** The import line: the root when it exports the name, else its subpath; the subpath is named too. */
function importLine(name, entry) {
  const root = entry.entries?.includes("index");
  if (root) return `- Import: \`import { ${name} } from "@sutra/ui"\`${entry.entry !== "index" ? ` (or from \`${importPath(entry.entry)}\`)` : ""}`;
  return `- Import: \`import { ${name} } from "${importPath(entry.entry)}"\``;
}

export function componentMarkdown({ name, entry, api, notes, noteIndex, examples, trim = false }) {
  const parent = parentOf(name, entry, api);
  const parts = familyOf(name, entry, api);
  const lines = [`# ${name}`, ""];
  if (entry.description) lines.push(`> ${firstParagraph(entry.description)}`, "");
  if (entry.deprecated) lines.push(`**Deprecated:** ${squash(entry.deprecated)}`, "");
  const where = entry.kit ? `kit \`${entry.kit}\`` : entry.layer;
  lines.push(importLine(name, entry));
  lines.push(`- Source: \`packages/ui/src/${entry.module}\` (${where})`);
  const slots = slotsOf(entry);
  if (slots.length) lines.push(`- \`data-slot\`: ${slots.map((s) => `\`${s}\``).join(", ")}`);
  if (parent) lines.push(`- Part of [\`${parent}\`](${parent}.md)`);
  if (parts.length) lines.push(`- Parts: ${parts.map((p) => `[\`${p}\`](${p}.md)`).join(", ")}`);
  if (entry.inherits?.length) lines.push(`- Also accepts the props of ${entry.inherits.join(", ")}`);
  lines.push("");
  const description = String(entry.description ?? "");
  const rest = description.split(/\n\s*\n/).slice(1).map(squash).filter(Boolean).join("\n\n");
  if (rest) lines.push(rest, "");
  lines.push("## Props", "");
  lines.push(entry.props.length ? propsTable(entry.props) : "No props of its own.", "");
  const variants = variantsList(entry);
  if (variants) lines.push("## Variants", "", variants, "");
  const withProps = parts.filter((p) => api.components[p].props.length > 0);
  if (trim && withProps.length) lines.push("## Part props", "", `Props of ${withProps.map((p) => `\`${p}\``).join(", ")}: see [the full page](md/${name}.md).`, "");
  else if (withProps.length) {
    lines.push("## Part props", "");
    for (const p of withProps) {
      const pe = api.components[p];
      lines.push(`### ${p}`, "", ...(pe.description ? [firstParagraph(pe.description), ""] : []), propsTable(pe.props), "");
    }
  }
  const key = noteIndex[name];
  if (key && notes[key]) {
    if (key === name || !parent || noteIndex[parent] !== key) lines.push("## Notes", "", noteMarkdown(notes[key]), "");
    else lines.push(`## Notes`, "", `See the notes in [\`${parent}\`](${parent}.md#notes).`, "");
  }
  const noteKey = noteIndex[name];
  const fromNote = noteKey && notes[noteKey]?.example ? { fromNote: true, code: notes[noteKey].example } : undefined;
  const ex = fromNote ?? examples.get(name) ?? (parent ? examples.get(parent) : undefined);
  const exampleText = trim ? "" : exampleMd(ex);
  if (exampleText) lines.push(exampleText, "");
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

/** A family in the short form llms-full.txt uses for patterns: description, import, prop names, the notes. */
export function compactMarkdown({ name, entry, api, notes, noteIndex }) {
  const lines = [`# ${name}`, ""];
  if (entry.description) lines.push(`> ${firstParagraph(entry.description)}`, "");
  lines.push(`- Import: \`import { ${name} } from "${importPath(entry.entry)}"\` ([full page](md/${name}.md))`);
  const parts = familyOf(name, entry, api);
  if (parts.length) lines.push(`- Parts: ${parts.map((p) => `\`${p}\``).join(", ")}`);
  const names = entry.props.map((p) => `\`${p.name}\`${p.required ? "*" : ""}`);
  if (names.length) lines.push(`- Props: ${names.join(", ")} (* required)`);
  const key = noteIndex[name];
  if (key === name && notes[key]) lines.push("", noteMarkdown(notes[key]));
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

export function hookMarkdown({ name, entry, examples }) {
  const lines = [`# ${name}`, ""];
  if (entry.description) lines.push(firstParagraph(entry.description).replace(/^/, "> "), "");
  if (entry.deprecated) lines.push(`**Deprecated:** ${squash(entry.deprecated)}`, "");
  lines.push(`- Import: \`import { ${name} } from "${importPath(entry.entry)}"\``);
  lines.push(`- Source: \`packages/ui/src/${entry.module}\``, "");
  if (entry.signature) lines.push("## Signature", "", "```ts", `${name}${entry.signature}`, "```", "");
  const rest = String(entry.description ?? "").split(/\n\s*\n/).slice(1).map(squash).filter(Boolean).join("\n\n");
  if (rest) lines.push(rest, "");
  if (entry.props?.length) lines.push("## Options and result", "", propsTable(entry.props), "");
  const ex = exampleMd(examples.get(name));
  if (ex) lines.push(ex, "");
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

/* ---------------------------------------------------------------------------------------------- */
/* Entries                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

/** The first comment of src/entries/<entry>.ts, as the entry's description. */
export function entryDescriptions(root) {
  const dir = path.join(root, "src/entries");
  const out = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    const text = readFileSync(path.join(dir, f), "utf8");
    const m = /^\/\*\s*([\s\S]*?)\*\//.exec(text);
    if (!m) continue;
    out[f.replace(/\.ts$/, "")] = squash(m[1].replace(/^\s*\*\s?/gm, " ").replace(/^@sutra\/ui\/?[\w-]*:\s*/, ""));
  }
  return out;
}

const rootComponents = (api) =>
  Object.entries(api.components)
    .filter(([n, c]) => !parentOf(n, c, api))
    .sort(([a], [b]) => a.localeCompare(b));

function indexLine(name, entry, partCount, href) {
  const d = oneLine(entry.description, 80);
  return `- [${name}](${href}${name}.md)${partCount ? ` (+${partCount} parts)` : ""}${d ? `: ${d}` : ""}`;
}

/* ---------------------------------------------------------------------------------------------- */
/* All outputs                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

const INTRO = `Sutra UI (\`@sutra/ui\`) is a React 19 + TypeScript + Tailwind CSS v4 component library built on Radix UI: primitives, patterns, domain kits and full-page blocks, with design tokens (light, dark and a paper style), right-to-left support and CSS-first motion that respects \`prefers-reduced-motion\`.`;

const USAGE = `Install and set up:

\`\`\`
pnpm add @sutra/ui
\`\`\`

\`\`\`css
/* your Tailwind v4 stylesheet */
@import "@sutra/ui/styles.css";
\`\`\`

Imports: everything is a flat named export of the root (\`import { Button } from "@sutra/ui"\`); the same names come from subpaths by domain (\`@sutra/ui/overlays\`, \`@sutra/ui/forms\`, \`@sutra/ui/dataviz\`, \`@sutra/ui/icons\` for Remix icons). Optional peers load only from their own subpaths (\`@sutra/ui/editor\`, \`@sutra/ui/terminal\`, \`@sutra/ui/pdf\`).`;

export function buildOutputs({ root, repo, api, notesMap, demos }) {
  const out = new Map();
  const notes = Object.fromEntries([...notesMap.entries()].map(([k, v]) => [k, v]));
  const noteIndex = {};
  for (const [name, entry] of Object.entries(api.components)) {
    const k = noteFor(name, entry, notes);
    if (k) noteIndex[name] = k;
  }
  const examples = pickExamples(demos, api);

  const comps = {};
  for (const [name, entry] of Object.entries(api.components)) {
    comps[name] = componentMarkdown({ name, entry, api, notes, noteIndex, examples });
    out.set(`docs/components/${name}.md`, comps[name]);
  }
  const hooks = {};
  for (const [name, entry] of Object.entries(api.hooks)) {
    hooks[name] = hookMarkdown({ name, entry, examples });
    out.set(`docs/hooks/${name}.md`, hooks[name]);
  }

  const entryText = entryDescriptions(root);
  const roots = rootComponents(api);
  const byEntry = new Map();
  for (const [name, entry] of roots) {
    const list = byEntry.get(entry.entry) ?? [];
    list.push([name, entry]);
    byEntry.set(entry.entry, list);
  }
  const hooksByEntry = new Map();
  for (const [name, entry] of Object.entries(api.hooks).sort(([a], [b]) => a.localeCompare(b))) {
    const list = hooksByEntry.get(entry.entry) ?? [];
    list.push([name, entry]);
    hooksByEntry.set(entry.entry, list);
  }
  const entryOrder = ["core", ...[...byEntry.keys()].filter((e) => e !== "core").sort()];

  // llms.txt: the short index, links relative to where it is served (the playground serves docs/components at md/).
  const index = [`# Sutra UI`, "", `> ${INTRO}`, "", USAGE, ""];
  index.push(
    "Rules every component follows (read `llms-full.txt` or the skill `skills/sutra-ui` for the full digest): colour comes from tokens (`bg-primary`, `text-muted-foreground`), never palette classes or `dark:` overrides; semantic colour is `tone` (`neutral | primary | success | warning | destructive | info`), categorical colour is `accent`; loading is `loading`, empty is `emptyState`; layout uses logical utilities (`ms-`, `ps-`, `start-`) so RTL works; motion uses the `--sutra-*` tokens and stands still under reduced motion.",
    ""
  );
  index.push("## Components", "", "One markdown file per component (props, variants, notes, an example). Parts of a family (`DialogContent`) are linked from the family page.", "");
  for (const e of entryOrder) {
    const list = byEntry.get(e) ?? [];
    index.push(`### ${importPath(e)}`, "", ...(entryText[e] ? [`${entryText[e]}`, ""] : []));
    // Primitives and patterns get a described line; domain components (kits, blocks, assets) are links only, to keep the index short.
    const core = list.filter(([, c]) => c.layer === "primitives" || c.layer === "patterns");
    const domain = list.filter(([, c]) => c.layer !== "primitives" && c.layer !== "patterns");
    for (const [name, entry] of core) index.push(indexLine(name, entry, familyOf(name, entry, api).length, "md/"));
    if (domain.length) index.push("", `${domain.map(([name]) => `[${name}](md/${name}.md)`).join(", ")}`);
    index.push("");
  }
  index.push("## Hooks", "");
  for (const [name, entry] of Object.entries(api.hooks).sort(([a], [b]) => a.localeCompare(b))) {
    const d = oneLine(entry.description, 80);
    index.push(`- [${name}](md/hooks/${name}.md)${d ? `: ${d}` : ""}`);
  }
  out.set("apps/playground/public/llms.txt", `${index.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`);

  // llms-full.txt: the guide and the component pages of the core layers in full, the rest as the same index lines.
  const full = [`# Sutra UI: full reference`, "", `> ${INTRO}`, "", USAGE, ""];
  const conventionsPath = path.join(repo, "skills/sutra-ui/references/conventions.md");
  if (existsSync(conventionsPath)) full.push("## Conventions digest", "", readFileSync(conventionsPath, "utf8").replace(/<!--[\s\S]*?-->\n?/g, "").replace(/^# .*\n+/, "").trim(), "");
  full.push("## Components", "");
  const demote = (md) => md.replace(/^(#{1,5}) /gm, (_, h) => `${h}# `);
  for (const [name, entry] of roots) {
    if (entry.layer === "primitives") full.push(demote(componentMarkdown({ name, entry, api, notes, noteIndex, examples, trim: true })).trimEnd(), "");
  }
  full.push("## Patterns", "", "Domain-neutral compositions in short form; `md/<Name>.md` has the props tables, variants and an example.", "");
  for (const [name, entry] of roots) {
    if (entry.layer === "patterns") full.push(demote(compactMarkdown({ name, entry, api, notes, noteIndex })).trimEnd(), "");
  }
  full.push("## Kits, blocks and assets", "", "These are domain components; open `md/<Name>.md` for props and notes.", "");
  for (const [name, entry] of roots) {
    if (entry.layer === "primitives" || entry.layer === "patterns") continue;
    const d = oneLine(entry.description, 140);
    full.push(`- \`${name}\` (\`${importPath(entry.entry)}\`)${d ? `: ${d}` : ""}`);
  }
  full.push("", "## Hooks", "");
  for (const [name, entry] of Object.entries(api.hooks).sort(([a], [b]) => a.localeCompare(b))) {
    const d = oneLine(entry.description, 140);
    full.push(`- \`${name}\` (\`${importPath(entry.entry)}\`)${d ? `: ${d}` : ""}`);
  }
  out.set("apps/playground/public/llms-full.txt", `${full.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`);

  // Skill references: the entry map and the component index.
  const ent = [
    "<!-- Generated by packages/ui/scripts/gen-llms.mjs (pnpm docs:llms). Do not edit. -->",
    "# Entry map",
    "",
    "Every name is also exported from the root `@sutra/ui` (except the optional-peer entries `code-editor`, `rich-text-editor`, `terminal` and `pdf`, and `format`, which is subpath-only on purpose). Import from the entry to keep a bundle small or to be explicit.",
    "",
  ];
  for (const e of entryOrder) {
    const list = byEntry.get(e) ?? [];
    const hl = hooksByEntry.get(e) ?? [];
    ent.push(`## \`${importPath(e)}\``, "", ...(entryText[e] ? [entryText[e], ""] : []));
    ent.push(`${list.length} components${hl.length ? `, ${hl.length} hooks` : ""}.`, "");
    ent.push(list.map(([n]) => `\`${n}\``).join(", "), "");
    if (hl.length) ent.push(`Hooks: ${hl.map(([n]) => `\`${n}\``).join(", ")}`, "");
  }
  // Entries without components (tokens, format): described, with their hooks.
  for (const e of Object.keys(entryText).sort()) {
    if (entryOrder.includes(e) || e === "index") continue;
    const hl = hooksByEntry.get(e) ?? [];
    ent.push(`## \`${importPath(e)}\``, "", entryText[e], "");
    if (hl.length) ent.push(`Hooks: ${hl.map(([n]) => `\`${n}\``).join(", ")}`, "");
  }
  out.set("skills/sutra-ui/references/entries.md", `${ent.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`);

  const idx = [
    "<!-- Generated by packages/ui/scripts/gen-llms.mjs (pnpm docs:llms). Do not edit. -->",
    "# Component index",
    "",
    "One line per component family (parts such as `DialogContent` live in the family's page). Open `docs/components/<Name>.md` in the Sutra repo, or `md/<Name>.md` on the docs site, for props, variants, notes and an example.",
    "",
  ];
  for (const layer of LAYER_ORDER) {
    const list = roots.filter(([, e]) => e.layer === layer);
    if (!list.length) continue;
    idx.push(`## ${layer}`, "");
    for (const [name, entry] of list) {
      const d = oneLine(entry.description, 90);
      idx.push(`- \`${name}\` (${entry.entry})${d ? `: ${d}` : ""}`);
    }
    idx.push("");
  }
  out.set("skills/sutra-ui/references/sizing.md", sizingMarkdown(buildSizingRows(api)));
  out.set("skills/sutra-ui/references/components.md", `${idx.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`);
  return { files: out, stats: { components: Object.keys(comps).length, hooks: Object.keys(hooks).length, roots: roots.length, examples: [...examples.keys()].filter((n) => n in api.components).length } };
}
