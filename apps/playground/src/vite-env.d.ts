/// <reference types="vite/client" />

/** Demo sources per page, built from src/pages by plugins/demo-source.ts: route -> lazy module of Demo key -> source. */
declare module "virtual:demo-source" {
  const sources: Record<string, () => Promise<{ default: Record<string, import("./components/demo-panels").DemoSource>; imports: string }>>;
  export default sources;
}

/** The generated props reference (packages/ui/scripts/gen-docs.mjs); typed where it is read, see components/demo-panels.tsx. */
declare module "*/generated/api.json" {
  const api: unknown;
  export default api;
}
