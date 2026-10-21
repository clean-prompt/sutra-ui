import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Layering guard for the folder structure:
 *
 *   lib/  hooks/  assets/   pure helpers, generic hooks, art (never import UI layers)
 *   primitives/             basic controls; import only primitives, lib, hooks, assets, styles
 *   patterns/               composed views; may also import primitives
 *   kits/<domain>/          domain features; may also import patterns and the kits listed in KIT_DEPS
 *   blocks/, entries/, index.ts   top level; may import anything
 */

const SRC = path.resolve(__dirname, "../src");
const SOURCE_EXTS = [".ts", ".tsx"];

/** Which other kits each kit may import. Anything not listed here is a layering violation. */
const KIT_DEPS: Record<string, string[]> = {
  ai: [],
  agent: ["ai"],
  "agent-admin": ["ai", "agent", "identity"],
  identity: ["geo"],
  billing: [],
  workspace: [],
  ops: ["ai", "geo"],
  media: [],
  voice: [],
  social: [],
  editor: [],
  terminal: [],
  system: [],
  geo: [],
};

const BASE = ["lib", "hooks", "assets", "styles"];

/** Allowed target layers per source layer. */
function allowed(from: string): (to: string) => boolean {
  if (from === "lib") return (to) => to === "lib";
  if (from === "hooks") return (to) => to === "lib" || to === "hooks";
  if (from === "assets") return (to) => ["lib", "hooks", "assets"].includes(to);
  if (from === "primitives") return (to) => BASE.includes(to) || to === "primitives";
  if (from === "patterns") return (to) => BASE.includes(to) || to === "primitives" || to === "patterns";
  if (from.startsWith("kits/")) {
    const kit = from.slice(5);
    return (to) =>
      BASE.includes(to) ||
      to === "primitives" ||
      to === "patterns" ||
      to === from ||
      (to.startsWith("kits/") && (KIT_DEPS[kit] ?? []).includes(to.slice(5)));
  }
  return () => true; // blocks, entries, index
}

function layerOf(rel: string): string {
  const [top, second] = rel.split("/");
  if (top === "kits") return `kits/${second}`;
  if (!rel.includes("/")) return rel.replace(/\.tsx?$/, "");
  return top!;
}

function filesIn(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? filesIn(path.join(dir, e.name)) : [path.join(dir, e.name)]))
    .filter((f) => SOURCE_EXTS.includes(path.extname(f)) && !/\.test\.tsx?$/.test(f));
}

/** Relative specifiers of every static import / export-from / dynamic import in a file. */
function relativeSpecifiers(file: string): string[] {
  const src = fs.readFileSync(file, "utf8");
  const specs = new Set<string>();
  const patterns = [
    /\b(?:import|export)\s[^;]*?\bfrom\s*["'](\.[^"']+)["']/gs,
    /\bimport\s*["'](\.[^"']+)["']/g,
    /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) specs.add(m[1]!);
  return [...specs];
}

const files = filesIn(SRC);

describe("layering", () => {
  it("every source file sits in a known layer", () => {
    const known = new Set(["lib", "hooks", "assets", "styles", "primitives", "patterns", "blocks", "entries", "index"]);
    const strays = files
      .map((f) => path.relative(SRC, f).split(path.sep).join("/"))
      .filter((rel) => {
        const layer = layerOf(rel);
        return layer.startsWith("kits/") ? !(layer.slice(5) in KIT_DEPS) : !known.has(layer);
      });
    expect(strays).toEqual([]);
  });

  it("no file imports a higher layer or an unlisted kit", () => {
    const violations: string[] = [];
    for (const file of files) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      const from = layerOf(rel);
      const ok = allowed(from);
      for (const spec of relativeSpecifiers(file)) {
        const target = path.relative(SRC, path.resolve(path.dirname(file), spec)).split(path.sep).join("/");
        const to = layerOf(target);
        if (!ok(to)) violations.push(`${rel} -> ${target}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("KIT_DEPS lists only edges that exist (keeps the table honest)", () => {
    const used = new Set<string>();
    for (const file of files) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      const from = layerOf(rel);
      if (!from.startsWith("kits/")) continue;
      for (const spec of relativeSpecifiers(file)) {
        const to = layerOf(path.relative(SRC, path.resolve(path.dirname(file), spec)).split(path.sep).join("/"));
        if (to.startsWith("kits/") && to !== from) used.add(`${from.slice(5)} -> ${to.slice(5)}`);
      }
    }
    const declared = Object.entries(KIT_DEPS).flatMap(([kit, deps]) => deps.map((d) => `${kit} -> ${d}`));
    expect(declared.filter((e) => !used.has(e))).toEqual([]);
  });

  it("lib stays free of React components (type-only React imports are fine)", () => {
    const violations = filesIn(path.join(SRC, "lib")).filter((file) => {
      if (file.endsWith(".tsx")) return true;
      const src = fs.readFileSync(file, "utf8");
      return /^import\s+(?!type\b)[^;]*from\s+["']react["']/m.test(src);
    });
    expect(violations.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
