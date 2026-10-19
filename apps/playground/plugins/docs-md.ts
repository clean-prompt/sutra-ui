/**
 * Serves the generated markdown pages (docs/components and docs/hooks at the repo root, written by `pnpm docs:llms`) at
 * `/md/<Name>.md` and `/md/hooks/<name>.md`, so the links in `llms.txt` resolve. Dev: a middleware that reads the file on
 * request (no copy to go stale); build: each file is emitted into `dist/md`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const ROOT = path.resolve(__dirname, "../../..");
const FOLDERS: Record<string, string> = { "md/": "docs/components", "md/hooks/": "docs/hooks" };
const SAFE = /^[\w-]+\.md$/;

export function docsMarkdownPlugin(): Plugin {
  return {
    name: "sutra-docs-md",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0]!.replace(/^\//, "");
        for (const [prefix, folder] of Object.entries(FOLDERS)) {
          if (!url.startsWith(prefix)) continue;
          const file = url.slice(prefix.length);
          if (!SAFE.test(file)) continue;
          const abs = path.join(ROOT, folder, file);
          if (!existsSync(abs)) continue;
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.end(readFileSync(abs, "utf8"));
          return;
        }
        next();
      });
    },
    generateBundle() {
      for (const [prefix, folder] of Object.entries(FOLDERS)) {
        const dir = path.join(ROOT, folder);
        if (!existsSync(dir)) continue;
        for (const file of readdirSync(dir).filter((f) => SAFE.test(f))) {
          this.emitFile({ type: "asset", fileName: `${prefix}${file}`, source: readFileSync(path.join(dir, file), "utf8") });
        }
      }
    },
  };
}
