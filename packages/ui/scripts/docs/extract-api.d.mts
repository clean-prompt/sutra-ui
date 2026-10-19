export interface ApiProp {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  default?: string;
  deprecated?: string;
}
export interface ApiEntry {
  kind: "component" | "hook";
  module: string;
  layer: string;
  entries: string[];
  entry: string;
  description?: string;
  slot?: string;
  slots?: string[];
  variants?: Record<string, string[]>;
  sizes?: Record<string, string>;
  hitArea?: boolean;
  inherits?: string[];
  props: ApiProp[];
}
export interface Api {
  components: Record<string, ApiEntry>;
  hooks: Record<string, ApiEntry>;
  entries: Record<string, string>;
}
export function buildApi(options: { root: string }): Api;
export function serialize(api: Api): string;
export function coverage(api: Api): { components: number; props: number; undocumentedProps: number; missing: Record<string, number> };
export const hasSource: (root: string) => boolean;
