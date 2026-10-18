import ts from "typescript";

/** A replacement of `code.slice(start, end)` by `text`, confined to one line. */
export interface Edit {
  start: number;
  end: number;
  text: string;
}

export interface SourceMapLike {
  mappings: string;
  [key: string]: unknown;
}

export const USE_CLIENT = '"use client";';
const PURE = "/* @__PURE__ */ ";

/** Calls that are safe to drop when their result is unused. */
const PURE_CALLEES = new Set(["React.forwardRef", "React.memo", "React.createContext", "cva", "cn"]);
/** Calls whose result is a component or context that may carry a `displayName`. */
const NAMEABLE_CALLEES = new Set(["React.forwardRef", "React.memo", "React.createContext"]);

/**
 * Whether an emitted module needs the `"use client"` directive. Components (`.tsx`) and hooks do;
 * pure modules (`lib/`, `*-model.ts`, `*-client.ts`, barrels) do not, so server components can import them.
 * A `.tsx` that only re-exports other modules does not need it either: each target carries its own.
 * A plain `.ts` outside `lib/` that imports runtime values from React is treated as client code.
 */
export function needsUseClient(srcPath: string, source: string): boolean {
  const p = srcPath.replace(/\\/g, "/");
  if (/(^|\/)lib\//.test(p)) return false;
  if (/(^|\/)hooks\//.test(p)) return true;
  const sf = ts.createSourceFile(p, source, ts.ScriptTarget.Latest, false, p.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (!p.endsWith(".tsx")) return importsReactValues(sf);
  return !isReExportBarrel(sf);
}

function importsReactValues(sf: ts.SourceFile): boolean {
  return sf.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      /^react(-dom)?(\/|$)/.test(s.moduleSpecifier.text) &&
      s.importClause?.isTypeOnly !== true &&
      !(
        s.importClause?.namedBindings &&
        ts.isNamedImports(s.importClause.namedBindings) &&
        !s.importClause.name &&
        s.importClause.namedBindings.elements.every((e) => e.isTypeOnly)
      )
  );
}

function isReExportBarrel(sf: ts.SourceFile): boolean {
  return (
    sf.statements.length > 0 &&
    sf.statements.every(
      (s) =>
        (ts.isExportDeclaration(s) && (s.moduleSpecifier !== undefined || s.isTypeOnly)) ||
        ts.isInterfaceDeclaration(s) ||
        ts.isTypeAliasDeclaration(s) ||
        (ts.isImportDeclaration(s) && s.importClause?.isTypeOnly === true)
    )
  );
}

function calleeName(call: ts.CallExpression, sf: ts.SourceFile): string {
  return call.expression.getText(sf);
}

function hasPureComment(code: string, pos: number): boolean {
  return /\/\*\s*[@#]__PURE__\s*\*\/\s*$/.test(code.slice(Math.max(0, pos - 40), pos));
}

/** A top-level binding whose initializer can be marked pure and can absorb a `displayName`. */
type Candidate =
  | { kind: "call"; node: ts.CallExpression; nameable: boolean }
  | { kind: "function"; node: ts.ArrowFunction | ts.FunctionExpression }
  | { kind: "declaration"; node: ts.FunctionDeclaration; index: number };

function referencesName(node: ts.Node, name: string): boolean {
  if (ts.isIdentifier(node) && node.text === name) return true;
  return ts.forEachChild(node, (child) => referencesName(child, name) || undefined) === true;
}

/**
 * Edits that make an esbuild ESM module tree-shakeable per export:
 * - annotate top-level `var X = React.forwardRef(...)` (and memo, createContext, cva, cn) as pure;
 * - fold a later top-level `X.displayName = "X";` into the binding as
 *   `var X = /* @__PURE__ *\/ Object.assign(React.forwardRef(...), { displayName: "X" })`,
 *   because a bare property assignment keeps `X` alive in every bundler. Arrow/function-expression
 *   bindings are folded the same way, and so are `function X() {}` declarations, which become
 *   `var X = Object.assign(function X() {}, …)` when no earlier top-level statement mentions `X`
 *   (the declaration stops being hoisted).
 * The displayName statement is blanked (its line is kept) so line numbers in the source map do not move.
 */
export function treeShakeEdits(code: string, fileName = "module.js"): Edit[] {
  const sf = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const candidates = new Map<string, Candidate>();
  const edits: Edit[] = [];

  sf.statements.forEach((stmt, index) => {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
      const exported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!exported) candidates.set(stmt.name.text, { kind: "declaration", node: stmt, index });
      return;
    }
    if (!ts.isVariableStatement(stmt)) return;
    for (const d of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || !d.initializer) continue;
      const init = d.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        candidates.set(d.name.text, { kind: "function", node: init });
      } else if (ts.isCallExpression(init) && PURE_CALLEES.has(calleeName(init, sf))) {
        candidates.set(d.name.text, { kind: "call", node: init, nameable: NAMEABLE_CALLEES.has(calleeName(init, sf)) });
      }
    }
  });

  const folded = new Map<string, string>();
  for (const stmt of sf.statements) {
    if (!ts.isExpressionStatement(stmt)) continue;
    const e = stmt.expression;
    if (!ts.isBinaryExpression(e) || e.operatorToken.kind !== ts.SyntaxKind.EqualsToken) continue;
    if (!ts.isPropertyAccessExpression(e.left) || e.left.name.text !== "displayName") continue;
    if (!ts.isIdentifier(e.left.expression)) continue;
    if (!ts.isStringLiteral(e.right) && !ts.isNoSubstitutionTemplateLiteral(e.right)) continue;
    const name = e.left.expression.text;
    const c = candidates.get(name);
    if (!c || folded.has(name) || (c.kind === "call" && !c.nameable)) continue;
    // Import specifiers name the other module's export, not a local use, so they do not count as references.
    const earlier = sf.statements.slice(0, c.kind === "declaration" ? c.index : 0).filter((p) => !ts.isImportDeclaration(p));
    if (earlier.some((prev) => referencesName(prev, name))) continue;
    const start = stmt.getStart(sf);
    const end = stmt.getEnd();
    if (code.slice(start, end).includes("\n")) continue;
    folded.set(name, e.right.getText(sf));
    edits.push({ start, end, text: "" });
  }

  for (const [name, c] of candidates) {
    const start = c.node.getStart(sf);
    const end = c.node.getEnd();
    const displayName = folded.get(name);
    const pure = hasPureComment(code, start) ? "" : PURE;
    if (displayName !== undefined) {
      // Both calls need the annotation: a pure call is only dropped when its arguments are side-effect free too.
      const inner = c.kind === "call" ? PURE : "";
      const head = c.kind === "declaration" ? `var ${name} = ${PURE}Object.assign(` : `${pure}Object.assign(${inner}`;
      edits.push({ start, end: start, text: head });
      edits.push({ start: end, end, text: `, { displayName: ${displayName} })${c.kind === "declaration" ? ";" : ""}` });
    } else if (c.kind === "call" && pure) {
      edits.push({ start, end: start, text: pure });
    }
  }

  return edits;
}

// ---- source map plumbing ------------------------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_INDEX = new Map([...B64].map((c, i) => [c, i]));

type Segment = number[];

/** Decode `mappings` into absolute segments per generated line. */
export function decodeMappings(mappings: string): Segment[][] {
  const lines: Segment[][] = [];
  const state = [0, 0, 0, 0, 0];
  for (const line of mappings.split(";")) {
    state[0] = 0;
    const segs: Segment[] = [];
    for (const raw of line.split(",")) {
      if (!raw) continue;
      const fields: number[] = [];
      let value = 0;
      let shift = 0;
      for (const ch of raw) {
        const digit = B64_INDEX.get(ch);
        if (digit === undefined) throw new Error(`Invalid VLQ character "${ch}"`);
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
          value = 0;
          shift = 0;
        }
      }
      const seg = fields.map((f, i) => (state[i] += f));
      segs.push(seg);
    }
    lines.push(segs);
  }
  return lines;
}

function encodeVlq(n: number): string {
  let v = n < 0 ? (-n << 1) | 1 : n << 1;
  let out = "";
  do {
    let digit = v & 31;
    v >>>= 5;
    if (v > 0) digit |= 32;
    out += B64[digit];
  } while (v > 0);
  return out;
}

/** Encode absolute segments per generated line back into `mappings`. */
export function encodeMappings(lines: Segment[][]): string {
  const state = [0, 0, 0, 0, 0];
  return lines
    .map((segs) => {
      state[0] = 0;
      return segs
        .map((seg) => {
          const out = seg.map((f, i) => encodeVlq(f - state[i]!)).join("");
          seg.forEach((f, i) => (state[i] = f));
          return out;
        })
        .join(",");
    })
    .join(";");
}

/** Apply single-line edits to code and shift the generated columns of its source map to match. */
export function applyEdits<M extends SourceMapLike>(
  code: string,
  map: M | null,
  edits: Edit[]
): { code: string; map: M | null } {
  if (edits.length === 0) return { code, map };
  const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.start < sorted[i - 1]!.end) throw new Error("Overlapping edits");
  }

  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (pos: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid]! <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  let out = "";
  let cursor = 0;
  const byLine = new Map<number, { col: number; endCol: number; delta: number }[]>();
  for (const e of sorted) {
    const line = lineOf(e.start);
    if (lineOf(e.end) !== line || e.text.includes("\n")) throw new Error("Edits must stay on one line");
    out += code.slice(cursor, e.start) + e.text;
    cursor = e.end;
    const col = e.start - lineStarts[line]!;
    const list = byLine.get(line) ?? [];
    list.push({ col, endCol: col + (e.end - e.start), delta: e.text.length - (e.end - e.start) });
    byLine.set(line, list);
  }
  out += code.slice(cursor);

  if (!map) return { code: out, map };
  const lines = decodeMappings(map.mappings);
  for (const [line, lineEdits] of byLine) {
    const segs = lines[line];
    if (!segs) continue;
    lines[line] = segs
      .filter((seg) => !lineEdits.some((e) => e.col < e.endCol && seg[0]! >= e.col && seg[0]! < e.endCol))
      .map((seg) => {
        const shift = lineEdits.reduce((sum, e) => (e.endCol <= seg[0]! ? sum + e.delta : sum), 0);
        return [seg[0]! + shift, ...seg.slice(1)];
      });
  }
  return { code: out, map: { ...map, mappings: encodeMappings(lines) } };
}

/** Put `"use client";` on its own first line; the source map moves down by exactly one line. */
export function prependDirective<M extends SourceMapLike>(code: string, map: M | null): { code: string; map: M | null } {
  if (code.startsWith(USE_CLIENT) || code.startsWith("'use client'")) return { code, map };
  return {
    code: `${USE_CLIENT}\n${code}`,
    map: map ? { ...map, mappings: `;${map.mappings}` } : map,
  };
}
