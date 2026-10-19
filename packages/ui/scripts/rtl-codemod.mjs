#!/usr/bin/env node
// Moves Tailwind utilities from physical to logical (RTL-safe) forms across src, and finds the ones still physical.
//
//   node scripts/rtl-codemod.mjs                 dry run: prints the report, writes nothing
//   node scripts/rtl-codemod.mjs --write         rewrite the files in place
//   node scripts/rtl-codemod.mjs --scan          list the physical utilities that remain (what test/rtl-conventions.test.ts counts)
//   node scripts/rtl-codemod.mjs --verbose       also print every change
//   node scripts/rtl-codemod.mjs --from-head     start from the committed (HEAD) text of each tracked file instead of the working tree,
//                                                so the whole pass can be re-derived after the rules change (drops later hand edits!)
//   node scripts/rtl-codemod.mjs [--write] src/primitives/tabs.tsx ...   limit to some files or folders
//
// What it does (string literals and template chunks only, token by token, variants kept):
//   ml/mr/pl/pr        -> ms/me/ps/pe            (also scroll-m*/scroll-p*)
//   left/right (inset) -> start/end
//   text-left/right    -> text-start/end         float-*, clear-* likewise
//   border-l/r[-x]     -> border-s/e[-x]
//   rounded-l/r[-x]    -> rounded-s/e[-x]; rounded-tl/tr/bl/br -> rounded-ss/se/es/ee
// and for things that are direction itself it ADDS a mirrored partner after the token (the original stays):
//   translate-x-N      -> + rtl:-translate-x-N   (a sign flip; `left-1/2 -translate-x-1/2` centring works through it)
//   origin-left/right and corners, bg-gradient-to-r/l -> + rtl: partner
// Direction glyphs (pass 2, JSX only): <RiArrowRightSLine>, <RiArrowLeftLine> and the other arrow, login/logout, reply and forward icons get
// `rtl:-scale-x-100` on their className (added when there is none), and a `rotate-90` / `-rotate-90` on the same icon gets the opposite
// rotation under `rtl:` (the glyph is mirrored first, then turned: a chevron that turns down when open must turn the other way).
// Left alone on purpose: tokens whose variants select a physical side (`data-[side=left]:`, `[align=right]`), tokens that
// already carry an `rtl:`/`ltr:` variant, `space-x-*` and `divide-x-*` (Tailwind v4 emits logical properties for them), dynamic
// `${}` pieces (reported), and everything that needs judgement (rotate, scale-x, slide-in/out, to-br gradients, arbitrary
// properties): those are listed under MANUAL for a person to decide. The script is idempotent: a second run changes nothing.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const SPACE = String.raw`(?:\d+(?:\.\d+)?|px|\[[^\]]+\]|\([^)]+\))`;
const MARGIN = String.raw`(?:${SPACE}|auto)`;
const INSET = String.raw`(?:${SPACE}|auto|full|\d+/\d+)`;

/** Direct renames: `[regex, replacement]` on the utility (without variants, sign or important marker). */
const RENAMES = [
  [new RegExp(`^ml-(${MARGIN})$`), "ms-$1"],
  [new RegExp(`^mr-(${MARGIN})$`), "me-$1"],
  [new RegExp(`^pl-(${SPACE})$`), "ps-$1"],
  [new RegExp(`^pr-(${SPACE})$`), "pe-$1"],
  [new RegExp(`^scroll-ml-(${SPACE})$`), "scroll-ms-$1"],
  [new RegExp(`^scroll-mr-(${SPACE})$`), "scroll-me-$1"],
  [new RegExp(`^scroll-pl-(${SPACE})$`), "scroll-ps-$1"],
  [new RegExp(`^scroll-pr-(${SPACE})$`), "scroll-pe-$1"],
  [new RegExp(`^left-(${INSET})$`), "start-$1"],
  [new RegExp(`^right-(${INSET})$`), "end-$1"],
  [/^text-left$/, "text-start"],
  [/^text-right$/, "text-end"],
  [/^float-left$/, "float-start"],
  [/^float-right$/, "float-end"],
  [/^clear-left$/, "clear-start"],
  [/^clear-right$/, "clear-end"],
  [/^border-l(-[\w\[\]()/.#%-]+)?$/, "border-s$1"],
  [/^border-r(-[\w\[\]()/.#%-]+)?$/, "border-e$1"],
  [/^rounded-l(-[\w\[\]()/.-]+)?$/, "rounded-s$1"],
  [/^rounded-r(-[\w\[\]()/.-]+)?$/, "rounded-e$1"],
  [/^rounded-tl(-[\w\[\]()/.-]+)?$/, "rounded-ss$1"],
  [/^rounded-tr(-[\w\[\]()/.-]+)?$/, "rounded-se$1"],
  [/^rounded-bl(-[\w\[\]()/.-]+)?$/, "rounded-es$1"],
  [/^rounded-br(-[\w\[\]()/.-]+)?$/, "rounded-ee$1"],
];

/** Mirrored partners added next to a token: `[regex, partner name, flip the sign?, label]`. */
const MIRRORS = [
  [/^translate-x-(?!0$)(.+)$/, (m) => `translate-x-${m[1]}`, true, "translate-x"],
  [/^origin-(left|right)$/, (m) => `origin-${m[1] === "left" ? "right" : "left"}`, false, "origin"],
  [/^origin-(top|bottom)-(left|right)$/, (m) => `origin-${m[1]}-${m[2] === "left" ? "right" : "left"}`, false, "origin"],
  [/^bg-(gradient|linear)-to-(r|l)$/, (m) => `bg-${m[1]}-to-${m[2] === "r" ? "l" : "r"}`, false, "gradient"],
];

/** Needs a person: reported, never rewritten. */
const MANUAL = [
  [/^(?:-?)rotate-(?!0$)\S+$/, "rotate"],
  [/^-?scale-x-\S+$/, "scale-x"],
  [/^(?:-?)slide-(?:in-from|out-to)-(?:left|right)(?:-\S+)?$/, "slide"],
  [/^bg-gradient-to-(?:tr|tl|br|bl)$/, "corner gradient"],
  [/^(?:object|bg)-(?:left|right)(?:-\S+)?$/, "object/bg position"],
  [/^(?:-?)(?:ml|mr|pl|pr|left|right)-\S+$/, "unrecognised spacing value"],
  [/^\[(?:margin|padding|inset|border|scroll-margin|scroll-padding|float|clear|text-align)(?:-\w+)*-?(?:left|right)\b.*\]$/, "arbitrary property"],
  [/^\[(?:left|right):.*\]$/, "arbitrary property"],
];

/** A literal near one of these words may name a physical side on purpose (`side === "left"`, a `left:` key): reported as SUSPECT for a person to confirm. */
const SUSPECT = /["'`](?:[a-z]+-)?(?:left|right)(?:-[a-z]+)?["'`]|\b(?:left|right)\??\s*:|\b(?:side|placement|position|edge|direction|align|orientation|labelSide|labelPosition|legend)\b/;

/** Variants that select a physical side on purpose (Radix `data-side`, table `align`): keep the utility physical there. */
const PHYSICAL_VARIANT = /(?:side|align|placement|orientation|position|origin)=["']?(?:left|right)\b|\bdata-\[?(?:left|right)\b/;

/** Splits `sm:data-[x=y]:ml-2` into its variants (`sm:data-[x=y]:`) and the utility, ignoring colons inside brackets. */
export function splitToken(token) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) cut = i;
  }
  return { variants: token.slice(0, cut + 1), utility: token.slice(cut + 1) };
}

/** Reads the sign and important markers off a utility: `!-ml-2` / `-ml-2!` -> `{ lead, tail, neg, name }`. */
function unwrap(utility) {
  let u = utility;
  const lead = u.startsWith("!");
  if (lead) u = u.slice(1);
  const tail = u.endsWith("!");
  if (tail) u = u.slice(0, -1);
  const neg = u.startsWith("-");
  if (neg) u = u.slice(1);
  return { lead, tail, neg, name: u };
}

/** Transforms one class token. `{ out, kind }`: `out` is the replacement text (may hold two tokens), `kind` names the rule; or `{ manual }`. */
export function transformToken(token, siblings = new Set()) {
  const { variants, utility } = splitToken(token);
  if (/(?:^|:)(?:rtl|ltr):/.test(variants)) return null;
  if (PHYSICAL_VARIANT.test(variants)) return null;
  const { lead, tail, neg, name } = unwrap(utility);
  const wrap = (n, negative = neg) => `${lead ? "!" : ""}${negative ? "-" : ""}${n}${tail ? "!" : ""}`;
  for (const [re, to] of RENAMES) {
    if (re.test(name)) return { out: variants + wrap(name.replace(re, to)), kind: "rename" };
  }
  for (const [re, mirror, flip, label] of MIRRORS) {
    const m = re.exec(name);
    if (!m) continue;
    const partner = `rtl:${variants}${wrap(mirror(m), flip ? !neg : neg)}`;
    if (siblings.has(partner)) return null;
    return { out: `${token} ${partner}`, kind: `mirror:${label}` };
  }
  if (/(?:^|:)data-\[motion=/.test(variants)) {
    const m = /^slide-(in-from|out-to)-(left|right)(-\S+)?$/.exec(name);
    if (m) return { out: variants + wrap(`slide-${m[1]}-${m[2] === "left" ? "start" : "end"}${m[3] ?? ""}`), kind: "rename" };
  }
  for (const [re, label] of MANUAL) if (re.test(name)) return { manual: label };
  return null;
}

/** Transforms a run of class text. `boundary` says whether the first / last token touches a `${}` (and so may be partial). */
export function transformText(text, { startsOpen = false, endsOpen = false } = {}) {
  startsOpen = startsOpen && !/^\s/.test(text);
  endsOpen = endsOpen && !/\s$/.test(text);
  const parts = text.split(/(\s+)/);
  const tokens = parts.filter((p, i) => i % 2 === 0 && p);
  const siblings = new Set(tokens);
  const changes = [];
  const manual = [];
  const firstIdx = parts.findIndex((p, i) => i % 2 === 0 && p);
  let lastIdx = -1;
  parts.forEach((p, i) => { if (i % 2 === 0 && p) lastIdx = i; });
  const out = parts.map((p, i) => {
    if (i % 2 === 1 || !p) return p;
    if ((startsOpen && i === firstIdx) || (endsOpen && i === lastIdx)) {
      const probe = transformToken(p.replace(/-$/, "-0"), siblings);
      if (probe && (probe.manual || probe.out !== p)) manual.push({ token: p, why: "dynamic piece (split by ${})" });
      return p;
    }
    const r = transformToken(p, siblings);
    if (!r) return p;
    if (r.manual) { manual.push({ token: p, why: r.manual }); return p; }
    changes.push({ from: p, to: r.out, kind: r.kind });
    return r.out;
  }).join("");
  return { text: out, changes, manual };
}

function walk(p) {
  if (statSync(p).isFile()) return [p];
  return readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]));
}

/** True when a literal is deliberately physical: a `// rtl-physical xN: why` comment covers its line (N lines below the comment; 1 when omitted), or sits on the same line. */
function isKept(node, source, line) {
  const lines = source.split("\n");
  for (let n = line; n >= Math.max(1, line - 12); n--) {
    const m = /rtl-physical(?: x(\d+))?/.exec(lines[n - 1] ?? "");
    if (m && line - n <= Number(m[1] ?? 1)) return "marker";
    if (m) return null;
  }
  return null;
}

/** Every string-ish literal of a source file as `{ start, end, startsOpen, endsOpen, line, kept }` (offsets of the text between the delimiters). */
function literals(sf, source) {
  const found = [];
  const visit = (node) => {
    const k = node.kind;
    const s = node.getStart(sf);
    const line = source.slice(0, s).split("\n").length;
    if (k === ts.SyntaxKind.StringLiteral || k === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
      found.push({ start: s + 1, end: node.end - 1, startsOpen: false, endsOpen: false, line, kept: isKept(node, source, line) });
    } else if (k === ts.SyntaxKind.TemplateHead) {
      found.push({ start: s + 1, end: node.end - 2, startsOpen: false, endsOpen: true, line, kept: isKept(node, source, line) });
    } else if (k === ts.SyntaxKind.TemplateMiddle) {
      found.push({ start: s + 1, end: node.end - 2, startsOpen: true, endsOpen: true, line, kept: isKept(node, source, line) });
    } else if (k === ts.SyntaxKind.TemplateTail) {
      found.push({ start: s + 1, end: node.end - 1, startsOpen: true, endsOpen: false, line, kept: isKept(node, source, line) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Icons whose shape means a direction: they mirror in right-to-left. Media transport, undo and the enter-key glyph stay as drawn. */
export const DIRECTIONAL_ICON = /^Ri(?:Arrow(?:Left|Right)S?(?:Line|Fill)|LogoutBoxRLine|LoginBoxLine|ReplyLine|ShareForwardLine)$/;
const MIRROR_GLYPH = "rtl:-scale-x-100";

/** Adds the glyph mirror and the rotation partners to one className text. `mirror` says whether to add the glyph token here. */
export function transformIconClass(text, mirror) {
  const parts = text.split(/(\s+)/);
  const tokens = new Set(parts.filter((p, i) => i % 2 === 0 && p));
  const out = parts.map((p, i) => {
    if (i % 2 === 1 || !p) return p;
    const { variants, utility } = splitToken(p);
    if (/(?:^|:)(?:rtl|ltr):/.test(variants)) return p;
    const { lead, tail, neg, name } = unwrap(utility);
    if (name !== "rotate-90") return p;
    const partner = `rtl:${variants}${lead ? "!" : ""}${neg ? "" : "-"}rotate-90${tail ? "!" : ""}`;
    return tokens.has(partner) ? p : `${p} ${partner}`;
  }).join("");
  const body = mirror && !tokens.has(MIRROR_GLYPH) ? (out.trim() ? `${out.replace(/\s+$/, "")} ${MIRROR_GLYPH}` : MIRROR_GLYPH) : out;
  return body;
}

/** Pass 2: direction glyphs. Returns `{ text, changes, manual }` like `transformSource`. */
export function transformIcons(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const changes = [];
  const manual = [];
  const lineOf = (pos) => source.slice(0, pos).split("\n").length;
  const visit = (node) => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && DIRECTIONAL_ICON.test(node.tagName.getText(sf))) {
      const attr = node.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "className");
      if (!attr) {
        const at = node.tagName.end;
        edits.push({ start: at, end: at, text: ` className="${MIRROR_GLYPH}"` });
        changes.push({ from: node.tagName.getText(sf), to: MIRROR_GLYPH, kind: "icon", line: lineOf(at) });
      } else {
        const lits = [];
        const collect = (n) => {
          if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) lits.push(n);
          else ts.forEachChild(n, collect);
        };
        collect(attr.initializer);
        if (!lits.length) manual.push({ token: node.tagName.getText(sf), why: "direction icon with a className expression that has no string", line: lineOf(node.getStart(sf)) });
        lits.forEach((lit, i) => {
          const start = lit.getStart(sf) + 1;
          const raw = source.slice(start, lit.end - 1);
          const next = transformIconClass(raw, i === 0);
          if (next !== raw) {
            edits.push({ start, end: lit.end - 1, text: next });
            changes.push({ from: raw, to: next, kind: "icon", line: lineOf(start) });
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  let out = source;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { text: out, changes, manual };
}

/** Runs over one file's text: `{ text, changes, manual }` with line numbers. */
function transformClasses(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const changes = [];
  const manual = [];
  const lineOf = (pos) => source.slice(0, pos).split("\n").length;
  for (const lit of literals(sf, source)) {
    const raw = source.slice(lit.start, lit.end);
    if (lit.kept) continue;
    if (!/(?:ml|mr|pl|pr|left|right|translate|rotate|scale|origin|gradient|border-[lr]|rounded|slide|object|bg-|float|clear|text-)/.test(raw)) continue;
    const r = transformText(raw, lit);
    const ctx = `${source.split("\n")[lit.line - 2] ?? ""}\n${source.split("\n")[lit.line - 1] ?? ""}`;
    const suspect = r.changes.length && SUSPECT.test(ctx);
    for (const c of r.changes) changes.push({ ...c, line: lineOf(lit.start), suspect: !!suspect });
    for (const m of r.manual) manual.push({ ...m, line: lineOf(lit.start) });
    if (r.text !== raw) edits.push({ start: lit.start, end: lit.end, text: r.text });
  }
  let out = source;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { text: out, changes, manual };
}

/** Both passes: class utilities, then direction glyphs. */
export function transformSource(file, source) {
  const a = transformClasses(file, source);
  const b = transformIcons(file, a.text);
  return { text: b.text, changes: [...a.changes, ...b.changes], manual: [...a.manual, ...b.manual] };
}

/** Physical utilities still present in a source text: `{ token, line, why }` (renamable ones, plus the manual list). */
export function scanSource(file, source) {
  const lines = [];
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const lit of literals(sf, source)) {
    const raw = source.slice(lit.start, lit.end);
    const res = transformText(raw, lit);
    for (const c of res.changes) lines.push({ token: c.from, line: lit.line, why: c.kind, kept: lit.kept });
    for (const m of res.manual) lines.push({ token: m.token, line: lit.line, why: m.why, kept: lit.kept });
  }
  return lines;
}

export const sourceFilesOf = (paths = [SRC]) =>
  paths.flatMap((p) => walk(path.resolve(p))).filter((f) => /\.tsx?$/.test(f)).sort();

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const scan = args.includes("--scan");
  const verbose = args.includes("--verbose");
  const fromHead = args.includes("--from-head");
  const repoRoot = path.resolve(ROOT, "../..");
  const headText = (file) => {
    try { return execFileSync("git", ["show", `HEAD:${path.relative(repoRoot, file)}`], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 }); } catch { return null; }
  };
  const targets = args.filter((a) => !a.startsWith("--"));
  const files = sourceFilesOf(targets.length ? targets : [SRC]);
  const byKind = {};
  const manualAll = [];
  const suspects = [];
  let touched = 0;
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const current = readFileSync(file, "utf8");
    const source = fromHead ? headText(file) ?? current : current;
    if (scan) {
      for (const s of scanSource(file, source)) console.log(`${rel}:${s.line} ${s.token} (${s.why})`);
      continue;
    }
    const r = transformSource(file, source);
    for (const c of r.changes) {
      byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
      if (verbose) console.log(`${rel}:${c.line} ${c.from} -> ${c.to}`);
      if (c.suspect) suspects.push(`${rel}:${c.line} ${c.from} -> ${c.to}`);
    }
    for (const m of r.manual) manualAll.push(`${rel}:${m.line} ${m.token} (${m.why})`);
    if (r.text !== current) {
      touched++;
      if (write) writeFileSync(file, r.text);
    }
  }
  if (!scan) {
    console.log(`${write ? "rewrote" : "would rewrite"} ${touched} files; changes by rule:`, JSON.stringify(byKind));
    console.log(`SUSPECT (${suspects.length}): changed next to a side/left/right word; confirm, or add a rtl-physical comment and re-run`);
    for (const m of suspects) console.log("  " + m);
    console.log(`MANUAL (${manualAll.length}):`);
    for (const m of manualAll) console.log("  " + m);
  }
}
