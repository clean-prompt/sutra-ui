/// <reference types="vite/client" />

/** The @cleanprompt/sutra-ui version (packages/ui/package.json), injected by vite.config.ts. */
declare const __SUTRA_UI_VERSION__: string;

/** Demo sources per page, built from src/pages (and the src/demos modules each page imports) by plugins/demo-source.ts: route -> lazy module of Demo key -> source. */
declare module "virtual:demo-source" {
  const sources: Record<string, () => Promise<{ default: Record<string, import("./components/demo-panels").DemoSource>; imports: string }>>;
  export default sources;
}

/** The generated props reference (packages/ui/scripts/gen-docs.mjs); typed where it is read, see components/demo-panels.tsx. */
declare module "*/generated/api.json" {
  const api: unknown;
  export default api;
}
