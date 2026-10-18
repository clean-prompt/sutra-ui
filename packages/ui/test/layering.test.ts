import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Layering guard: primitives must not depend on patterns or kits, and lib/, hooks/ and assets/ must not depend on
 * components at all. A later phase turns these lists into folder rules (src/primitives, src/patterns, src/kits).
 */

const SRC = path.resolve(__dirname, "../src");
const COMPONENTS = path.join(SRC, "components");

/** Basenames in src/components that form the primitive layer. They may import only each other, lib, hooks, assets, styles. */
const PRIMITIVES = [
  "button",
  "button-group",
  "close-button",
  "text-link",
  "badge",
  "chip",
  "status-badge",
  "spinner",
  "progress",
  "avatar",
  "separator",
  "label",
  "field",
  "input",
  "textarea",
  "checkbox",
  "radio",
  "switch",
  "select",
  "tooltip",
  "popover",
  "dialog",
  "drawer",
  "dropdown-menu",
  "context-menu",
  "tabs",
  "typography",
  "layout",
  "table",
  "inline-alert",
  "alert-banner",
  "toast",
  "empty-state",
  "meter",
  "shortcut-keys",
  "scroll-area",
  "kbd",
];

/** Directories (relative to src) any primitive may import from. */
const ALLOWED_DIRS = ["lib", "hooks", "assets", "styles"];

/**
 * Cross-layer imports that are known and owned elsewhere. Each entry must still exist (stale entries fail),
 * so remove it when the import is fixed.
 */
const KNOWN_EXCEPTIONS: Record<string, string[]> = {
};

const SOURCE_EXTS = [".ts", ".tsx"];

function sourceFile(dir: string, base: string): string | null {
  for (const ext of SOURCE_EXTS) {
    const p = path.join(dir, base + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
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

/** Resolve a relative specifier to a src-relative module id without extension, e.g. "components/button", "lib/cn". */
function resolveToSrc(file: string, spec: string): string {
  const abs = path.resolve(path.dirname(file), spec);
  return path.relative(SRC, abs).split(path.sep).join("/").replace(/\.(tsx?|css)$/, "").replace(/\/index$/, "");
}

function filesIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? filesIn(path.join(dir, e.name)) : [path.join(dir, e.name)]))
    .filter((f) => SOURCE_EXTS.includes(path.extname(f)) && !/\.test\.tsx?$/.test(f));
}

const primitiveSet = new Set(PRIMITIVES);

function isAllowedForPrimitive(target: string) {
  const [top, ...rest] = target.split("/");
  if (ALLOWED_DIRS.includes(top!)) return true;
  return top === "components" && rest.length === 1 && primitiveSet.has(rest[0]!);
}

describe("layering", () => {
  const present = PRIMITIVES.filter((name) => sourceFile(COMPONENTS, name));

  it("finds the primitive files", () => {
    // `kbd` is optional (Kbd currently lives in typography); everything else should exist.
    const missing = PRIMITIVES.filter((name) => name !== "kbd" && !present.includes(name));
    expect(missing).toEqual([]);
  });

  it("primitives import only primitives, lib, hooks, assets and styles", () => {
    const violations: string[] = [];
    const usedExceptions = new Set<string>();
    for (const name of present) {
      const file = sourceFile(COMPONENTS, name)!;
      for (const spec of relativeSpecifiers(file)) {
        const target = resolveToSrc(file, spec);
        if (isAllowedForPrimitive(target)) continue;
        if (KNOWN_EXCEPTIONS[name]?.includes(target)) {
          usedExceptions.add(`${name} -> ${target}`);
          continue;
        }
        violations.push(`components/${name} -> ${target}`);
      }
    }
    expect(violations).toEqual([]);

    const stale = Object.entries(KNOWN_EXCEPTIONS).flatMap(([name, targets]) =>
      targets.map((t) => `${name} -> ${t}`).filter((e) => !usedExceptions.has(e))
    );
    expect(stale, "remove fixed entries from KNOWN_EXCEPTIONS").toEqual([]);
  });

  it("lib, hooks and assets never import components or blocks", () => {
    const violations: string[] = [];
    for (const dir of ["lib", "hooks", "assets"]) {
      for (const file of filesIn(path.join(SRC, dir))) {
        for (const spec of relativeSpecifiers(file)) {
          const target = resolveToSrc(file, spec);
          if (/^(components|blocks|entries)(\/|$)/.test(target) || target === "index") {
            violations.push(`${path.relative(SRC, file)} -> ${target}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
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
