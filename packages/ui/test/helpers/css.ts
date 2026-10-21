import { readFileSync } from "node:fs";
import path from "node:path";

const STYLES = path.resolve(__dirname, "../../src/styles");
const LOCAL_IMPORT = /^@import\s+"(\.\/[\w-]+\.css)";[ \t]*$/gm;

/**
 * The whole `sutra.css` as a consumer receives it: the entry file with every local `@import "./x.css";` replaced by that file's
 * text, in cascade order (Tailwind inlines the imports in place, so this is the order of the built CSS). Tests that look for a
 * rule, a token or a section read this, whichever split file it lives in. Comments are kept: strip them in the test if needed.
 */
export function readSutraCss(): string {
  return readFileSync(path.join(STYLES, "sutra.css"), "utf8").replace(LOCAL_IMPORT, (_all, spec: string) =>
    readFileSync(path.join(STYLES, spec), "utf8")
  );
}
