import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig, type Options } from "tsup";

type EsbuildPlugin = NonNullable<Options["esbuildPlugins"]>[number];

const require = createRequire(import.meta.url);
const SOURCE_EXTS = [".ts", ".tsx"];

/** Map a relative specifier to its emitted `.js` path (`./button` → `./button.js`, `./blocks` → `./blocks/index.js`). */
function toJsSpecifier(fromDir: string, spec: string): string | null {
  const abs = path.resolve(fromDir, spec);
  if (SOURCE_EXTS.some((ext) => existsSync(abs + ext))) return `${spec}.js`;
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    if (SOURCE_EXTS.some((ext) => existsSync(path.join(abs, `index${ext}`)))) return `${spec.replace(/\/$/, "")}/index.js`;
  }
  return null;
}

/**
 * Per-module output: every source file is its own entry and every relative import is
 * left as an external `.js` import, so dist mirrors src one-to-one and resolves under Node ESM.
 */
const preserveModules: EsbuildPlugin = {
  name: "sutra-preserve-modules",
  setup(build) {
    build.onResolve({ filter: /^\.\.?(\/|$)/ }, (args) => {
      if (args.kind === "entry-point") return undefined;
      const spec = toJsSpecifier(args.resolveDir, args.path);
      return spec ? { path: spec, external: true } : undefined;
    });
  },
};

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

/** Emit declarations with tsc, then add `.js` extensions to their relative imports too. */
function emitDeclarations() {
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "-p", "tsconfig.build.json"], {
    stdio: "inherit",
  });
  const srcRoot = path.resolve("src");
  const distRoot = path.resolve("dist");
  for (const file of walk(distRoot).filter((f) => f.endsWith(".d.ts"))) {
    const srcDir = path.join(srcRoot, path.relative(distRoot, path.dirname(file)));
    const before = readFileSync(file, "utf8");
    const after = before.replace(
      /((?:from|import)\s*\(?\s*["'])(\.\.?(?:\/[^"']*)?)(["'])/g,
      (all, pre: string, spec: string, post: string) => {
        const next = toJsSpecifier(srcDir, spec);
        return next ? `${pre}${next}${post}` : all;
      }
    );
    if (after !== before) writeFileSync(file, after);
  }
}

export default defineConfig({
  entry: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}", "!src/**/*.d.ts"],
  format: ["esm"],
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "es2022",
  // Everything that is not a relative import stays external (dependencies and peers).
  skipNodeModulesBundle: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  esbuildPlugins: [preserveModules],
  banner: { js: '"use client";' },
  dts: false,
  onSuccess: async () => emitDeclarations(),
});
