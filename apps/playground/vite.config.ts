import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { demoSourcePlugin } from "./plugins/demo-source";
import { docsMarkdownPlugin } from "./plugins/docs-md";

const ui = path.resolve(__dirname, "../../packages/ui/src");

export default defineConfig({
  plugins: [react(), tailwindcss(), demoSourcePlugin(), docsMarkdownPlugin()],
  resolve: {
    // Point straight at the package source so edits hot-reload without a build.
    alias: [
      { find: /^@sutra\/ui$/, replacement: path.join(ui, "index.ts") },
      { find: "@sutra/ui/styles.css", replacement: path.join(ui, "styles/sutra.css") },
      { find: "@sutra/ui/paper.css", replacement: path.join(ui, "styles/paper.css") },
      // Per-file subpaths: @sutra/ui/primitives/button, @sutra/ui/kits/ai/chat-message → src/… (same for patterns, blocks, assets).
      { find: /^@sutra\/ui\/(primitives|patterns|blocks|assets)\/([\w-]+)$/, replacement: `${ui}/$1/$2` },
      { find: /^@sutra\/ui\/kits\/([\w-]+)\/([\w-]+)$/, replacement: `${ui}/kits/$1/$2` },
      // Category barrels: @sutra/ui/icons, /ai, /forms, … → src/entries/<name>.ts
      { find: /^@sutra\/ui\/([\w-]+)$/, replacement: `${ui}/entries/$1.ts` },
    ],
  },
  // Pre-bundle the optional editor/terminal peers at startup so the first visit
  // to those pages doesn't trigger a mid-session dependency re-optimization.
  optimizeDeps: {
    include: [
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/search",
      "@codemirror/lang-markdown",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-placeholder",
      "@xterm/xterm",
      "@xterm/addon-fit",
      "katex",
      "uqr",
      "jsqr",
    ],
  },
});
