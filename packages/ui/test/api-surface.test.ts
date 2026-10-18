import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

/**
 * Public API guard: package.json `exports` <-> src/entries, entries <-> root, no orphan modules,
 * src/index.ts matches scripts/gen-index.mjs, and the root's names match test/__snapshots__/api-root.json.
 * After an intended root API change, run `npx vitest run test/api-surface.test.ts -u` to update the snapshot.
 */

const PKG = path.resolve(__dirname, "..");
const SRC = path.join(PKG, "src");
const ENTRIES = path.join(SRC, "entries");
const SOURCE_EXTS = [".ts", ".tsx"];
const pkg = JSON.parse(fs.readFileSync(path.join(PKG, "package.json"), "utf8"));

/** Modules in src/primitives, src/patterns and src/kits that are deliberately reachable from no public barrel. */
const INTERNAL_MODULES = [
  // Private constants shared by the kanban modules (see the header of the file).
  "kits/workspace/kanban-internal",
  // Back-compat barrel: every name it re-exports reaches the root through the real modules, so
  // gen-index leaves it out; old imports keep working via @sutra/ui/components/primitives-extra.
  "kits/ai/primitives-extra",
];

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

const ROOT_FILE = path.join(SRC, "index.ts");
const entryFiles = filesIn(ENTRIES);

// One program for every assertion: the root plus each entry.
let program: ts.Program;
let checker: ts.TypeChecker;
const exportsOf = new Map<string, ts.Symbol[]>();

beforeAll(() => {
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

  it("every primitive, pattern and kit module is reachable from the root or an entry", () => {
    const reachable = new Set<string>();
    const visit = (file: string) => {
      if (reachable.has(file)) return;
      reachable.add(file);
      reExportTargets(file).forEach(visit);
    };
    [ROOT_FILE, ...entryFiles].forEach(visit);
    const modules = ["primitives", "patterns", "kits"].flatMap((d) => filesIn(path.join(SRC, d)));
    const orphans = modules.filter((f) => !reachable.has(f)).map(rel);
    expect(orphans.sort()).toEqual([...INTERNAL_MODULES].sort());
  });

  it("src/index.ts and src/entries/core.ts are what scripts/gen-index.mjs generates", () => {
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
