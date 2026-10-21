import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

/**
 * Public API guard: package.json `exports` <-> src/entries, entries <-> root, no orphan modules, no entry on a frozen
 * back-compat barrel, every documented hook reachable from an entry, no generic helper leaked, `exports` explicit (no
 * wildcard, no `*-internal`), src/index.ts and package.json `exports` match scripts/gen-index.mjs, and the root's names
 * match test/__snapshots__/api-root.json.
 * After an intended root API change, run `npx vitest run test/api-surface.test.ts -u` to update the snapshot.
 */

const PKG = path.resolve(__dirname, "..");
const SRC = path.join(PKG, "src");
const ENTRIES = path.join(SRC, "entries");
const SOURCE_EXTS = [".ts", ".tsx"];
const pkg = JSON.parse(fs.readFileSync(path.join(PKG, "package.json"), "utf8"));

/** Modules in src/primitives, src/patterns and src/kits that are deliberately reachable from no public barrel. */
const INTERNAL_MODULES = [
  "kits/agent-admin/secret-row",
  // Frozen back-compat barrels (see CONVENTIONS): every name they re-export reaches the root and the entries through the
  // real modules, so gen-index leaves them out and no entry may import them. Old deep imports keep working.
  "kits/ai/ai-extras",
  "kits/ai/primitives-extra",
  "kits/workspace/kanban",
  "patterns/counters",
];

/**
 * Generic helpers that are internal on purpose: no root name, no entry name (the formatting and date helpers are not here: they
 * are public, but only from the subpath-only `@sutra/ui/format` entry). Import them by relative path inside the
 * package. (Making one public means documenting it and listing it in src/entries/tokens.ts; then remove it here.)
 */
const INTERNAL_NAMES = [
  "clamp", "roundTo", "toPercent", "pad2", "hashString", "mulberry32", "seededRandom", "pickForSeed", "escapeRegExp", "slugify",
  "capitalize", "truncateMiddle", "graphemes", "matchRanges", "hostnameOf", "base64UrlEncode", "base64UrlDecode", "base32Encode",
  "normalizeDensity", "rampColor", "isTerminalStatus", "getPaginationRange", "errorMessage", "useLatestRef", "useIsoLayoutEffect",
  "useMountedRef", "useFollowListProp", "usePendingRemoval",
];

/** Names the subpath-only entries share with the root on purpose: types that public props name (they also live in `tokens`). */
const SHARED_WITH_ROOT = ["DateInput", "TimeInput"];

/** Hooks in src/hooks that are internal plumbing (every other one must reach an entry). */
const INTERNAL_HOOKS = ["useFollowListProp", "usePendingRemoval", "useLatestRef", "useIsoLayoutEffect", "useMountedRef"];

const toPosix = (p: string) => p.split(path.sep).join("/");
const rel = (file: string) => toPosix(path.relative(SRC, file)).replace(/\.tsx?$/, "");

function filesIn(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? filesIn(path.join(dir, e.name)) : [path.join(dir, e.name)]))
    .filter((f) => SOURCE_EXTS.includes(path.extname(f)) && !/\.(test|d)\.tsx?$/.test(f))
    .sort();
}

/** Absolute source file a relative specifier points at (directories resolve to their index). */
function resolveSpec(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [...SOURCE_EXTS.map((e) => base + e), ...SOURCE_EXTS.map((e) => path.join(base, `index${e}`))]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const SPEC_RES = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']/gs,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];
const specsCache = new Map<string, string[]>();
function specifiers(file: string): string[] {
  if (!specsCache.has(file)) {
    const src = fs.readFileSync(file, "utf8");
    const specs = new Set<string>();
    for (const re of SPEC_RES) for (const m of src.matchAll(re)) specs.add(m[1]!);
    specsCache.set(file, [...specs]);
  }
  return specsCache.get(file)!;
}

/** Relative targets of `export … from` statements (the re-export graph). */
function reExportTargets(file: string): string[] {
  const src = fs.readFileSync(file, "utf8");
  return [...src.matchAll(/\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s*["'](\.[^"']+)["']/gs)]
    .map((m) => resolveSpec(file, m[1]!))
    .filter((f): f is string => f !== null);
}

let SUBPATH_ONLY: string[] = [];

const OPTIONAL_PEERS = Object.entries(pkg.peerDependenciesMeta ?? {})
  .filter(([, meta]) => (meta as { optional?: boolean }).optional)
  .map(([name]) => name);
const peerMemo = new Map<string, boolean>();
/** Whether a source file reaches an optional peer through its (transitive) relative imports. */
function reachesOptionalPeer(file: string, seen = new Set<string>()): boolean {
  if (peerMemo.has(file)) return peerMemo.get(file)!;
  if (seen.has(file)) return false;
  seen.add(file);
  const hit = specifiers(file).some((spec) => {
    if (!spec.startsWith(".")) return OPTIONAL_PEERS.some((p) => spec === p || spec.startsWith(`${p}/`));
    const target = resolveSpec(file, spec);
    return target !== null && reachesOptionalPeer(target, seen);
  });
  peerMemo.set(file, hit);
  return hit;
}

/** A frozen back-compat barrel: its header comment says so (assets/misc, kits/ai/ai-extras, kanban, counters, primitives-extra). */
const isBackCompatBarrel = (file: string) => /Back-compat barrel/.test(fs.readFileSync(file, "utf8").slice(0, 200));

const ROOT_FILE = path.join(SRC, "index.ts");
const entryFiles = filesIn(ENTRIES);

// One program for every assertion: the root plus each entry.
let program: ts.Program;
let checker: ts.TypeChecker;
const exportsOf = new Map<string, ts.Symbol[]>();

beforeAll(async () => {
  SUBPATH_ONLY = (await import(path.join(PKG, "scripts/gen-index.mjs"))).SUBPATH_ONLY;
  const config = ts.getParsedCommandLineOfConfigFile(path.join(PKG, "tsconfig.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => {},
  })!;
  program = ts.createProgram([ROOT_FILE, ...entryFiles], { ...config.options, noEmit: true, types: [] });
  checker = program.getTypeChecker();
  for (const file of [ROOT_FILE, ...entryFiles]) {
    const sf = program.getSourceFile(file)!;
    exportsOf.set(file, checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!));
  }
}, 60_000);

const names = (file: string) => exportsOf.get(file)!.map((s) => s.name);

/** Source file that declares an exported symbol (aliases followed). */
function declaringFile(symbol: ts.Symbol): string | undefined {
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  return target.declarations?.[0]?.getSourceFile().fileName;
}

describe("public API surface", () => {
  it("package.json entry exports and src/entries match one-to-one", () => {
    const fromExports = Object.entries(pkg.exports as Record<string, string | { import?: string }>)
      .map(([key, value]) => [key, typeof value === "string" ? value : value.import] as const)
      .flatMap(([key, target]) => {
        const m = /^\.\/dist\/entries\/([^*/]+)\.js$/.exec(target ?? "");
        return m ? [{ key, entry: m[1]! }] : [];
      });
    for (const { key, entry } of fromExports) {
      expect(fs.existsSync(path.join(ENTRIES, `${entry}.ts`)), `${key} has no src/entries/${entry}.ts`).toBe(true);
    }
    const exported = new Set(fromExports.map((e) => e.entry));
    for (const file of entryFiles) {
      const entry = path.basename(file).replace(/\.tsx?$/, "");
      expect(exported.has(entry), `src/entries/${entry}.ts has no package.json exports key`).toBe(true);
    }
  });

  it("the root and every entry type-check (no ambiguous `export *` names)", () => {
    for (const file of [ROOT_FILE, ...entryFiles]) {
      const diagnostics = program.getSemanticDiagnostics(program.getSourceFile(file));
      const messages = diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
      expect(messages, rel(file)).toEqual([]);
    }
  });

  it("every entry's names are also root names (except optional-peer modules and external packages)", () => {
    const root = new Set(names(ROOT_FILE));
    for (const file of entryFiles) {
      if (SUBPATH_ONLY.includes(path.basename(file, ".ts"))) continue; // checked the other way round below
      const missing = exportsOf
        .get(file)!
        .filter((symbol) => {
          const decl = declaringFile(symbol);
          if (!decl || !decl.startsWith(SRC + path.sep)) return false; // e.g. Remix icons in @sutra/ui/icons
          if (reachesOptionalPeer(decl)) return false; // CodeEditor, RichTextEditor, Terminal
          return !root.has(symbol.name);
        })
        .map((s) => s.name);
      expect(missing, `${rel(file)} exports names the root lacks`).toEqual([]);
    }
  });

  it("subpath-only entries (format) export no name the root has, apart from shared prop types", () => {
    expect(SUBPATH_ONLY).toContain("format");
    const root = new Set(names(ROOT_FILE));
    for (const entry of SUBPATH_ONLY) {
      const file = path.join(ENTRIES, `${entry}.ts`);
      expect(fs.existsSync(file), `src/entries/${entry}.ts`).toBe(true);
      expect(names(file).length).toBeGreaterThan(20);
      const leaked = names(file).filter((n) => root.has(n) && !SHARED_WITH_ROOT.includes(n));
      expect(leaked, `${entry} names that are also on the root`).toEqual([]);
      expect(fs.readFileSync(ROOT_FILE, "utf8"), "root must not export the entry").not.toMatch(new RegExp(`entries/${entry}"`));
    }
  });

  it("no entry imports a frozen back-compat barrel", () => {
    const offenders = entryFiles.flatMap((file) =>
      reExportTargets(file).filter(isBackCompatBarrel).map((target) => `${rel(file)} -> ${rel(target)}`)
    );
    expect(offenders, "re-export the real modules from the entry instead").toEqual([]);
  });

  it("every primitive, pattern and kit module is reachable from the root or an entry (not through a frozen barrel)", () => {
    const reachable = new Set<string>();
    const visit = (file: string) => {
      if (reachable.has(file) || isBackCompatBarrel(file)) return;
      reachable.add(file);
      reExportTargets(file).forEach(visit);
    };
    [ROOT_FILE, ...entryFiles].forEach(visit);
    const modules = ["primitives", "patterns", "kits"].flatMap((d) => filesIn(path.join(SRC, d)));
    // `*-internal` modules hold private helpers shared by sibling modules and are never public.
    const orphans = modules.filter((f) => !reachable.has(f)).map(rel).filter((id) => !id.endsWith("-internal"));
    expect(orphans.sort()).toEqual([...INTERNAL_MODULES].sort());
  });

  it("src/index.ts, src/entries/core.ts and package.json exports are what scripts/gen-index.mjs generates", () => {
    let output = "";
    try {
      execFileSync(process.execPath, [path.join(PKG, "scripts/gen-index.mjs"), "--check"], { encoding: "utf8", stdio: "pipe" });
    } catch (err) {
      output = String((err as { stderr?: string }).stderr ?? err);
    }
    expect(output).toBe("");
  });

  it("@sutra/ui/core exports every primitive the root exports", () => {
    const core = path.join(ENTRIES, "core.ts");
    const primitives = new Set(filesIn(path.join(SRC, "primitives")));
    const fromPrimitives = exportsOf
      .get(ROOT_FILE)!
      .filter((s) => primitives.has(declaringFile(s) ?? ""))
      .map((s) => s.name);
    const coreNames = new Set(names(core));
    expect(fromPrimitives.filter((n) => !coreNames.has(n))).toEqual([]);
  });

  it("every documented hook is reachable from a subpath entry, and so is every hook in src/hooks except the internal plumbing", () => {
    const api = JSON.parse(fs.readFileSync(path.resolve(PKG, "../../apps/playground/src/generated/api.json"), "utf8")) as { hooks: Record<string, unknown> };
    const inEntries = new Set(entryFiles.flatMap((file) => names(file)));
    const root = new Set(names(ROOT_FILE));
    const documented = Object.keys(api.hooks);
    expect(documented.length).toBeGreaterThan(80);
    expect(documented.filter((n) => !inEntries.has(n)), "documented hooks no entry exports").toEqual([]);

    const declared = filesIn(path.join(SRC, "hooks")).flatMap((f) =>
      [...fs.readFileSync(f, "utf8").matchAll(/^export (?:function|const) (use[A-Z]\w*)/gm)].map((m) => m[1]!)
    );
    expect(declared.length).toBeGreaterThan(40);
    expect(declared.filter((n) => !inEntries.has(n) && !INTERNAL_HOOKS.includes(n)), "hooks in src/hooks that reach no entry").toEqual([]);
    expect(INTERNAL_HOOKS.filter((n) => inEntries.has(n) || root.has(n)), "INTERNAL_HOOKS that are exported").toEqual([]);
  });

  it("the internal generic helpers are exported from neither the root nor any entry", () => {
    const leaked = [ROOT_FILE, ...entryFiles].flatMap((file) =>
      names(file).filter((n) => INTERNAL_NAMES.includes(n)).map((n) => `${file === ROOT_FILE ? "index" : rel(file)}: ${n}`)
    );
    expect(leaked).toEqual([]);
  });

  it("package.json exports are explicit: no wildcard, no *-internal module, every target exists in src", () => {
    const keys = Object.keys(pkg.exports as Record<string, unknown>);
    expect(keys.filter((k) => k.includes("*")), "wildcard export keys").toEqual([]);
    expect(keys.filter((k) => k.endsWith("-internal")), "internal modules with a subpath").toEqual([]);
    const missing = Object.entries(pkg.exports as Record<string, string | { import?: string }>).flatMap(([key, value]) => {
      const target = typeof value === "string" ? value : value.import!;
      const m = /^\.\/dist\/(.+)\.js$/.exec(target);
      if (!m) return fs.existsSync(path.join(PKG, target)) ? [] : [key];
      return SOURCE_EXTS.some((e) => fs.existsSync(path.join(SRC, m[1] + e))) ? [] : [key];
    });
    expect(missing, "exports keys whose source module is missing").toEqual([]);
    // Every non-internal module of a deep layer has a subpath (nothing is hidden by accident).
    const deep = ["assets", "primitives", "patterns", "kits", "blocks"].flatMap((d) => filesIn(path.join(SRC, d)).map(rel));
    const unreachable = deep.filter((id) => !id.endsWith("-internal") && id !== "blocks/index" && !keys.includes(`./${id}`));
    expect(unreachable).toEqual([]);
  });

  it("root export names match the committed snapshot (no silent drops)", async () => {
    const current = [...new Set(names(ROOT_FILE))].sort();
    const snapshotFile = path.join(__dirname, "__snapshots__/api-root.json");
    if (fs.existsSync(snapshotFile)) {
      const previous: string[] = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
      const have = new Set(current);
      expect(previous.filter((n) => !have.has(n)), "names dropped from the root").toEqual([]);
    }
    await expect(JSON.stringify(current, null, 2) + "\n").toMatchFileSnapshot("./__snapshots__/api-root.json");
  });
});
