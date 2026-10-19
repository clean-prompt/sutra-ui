// Types for llms.mjs (the generators are plain ESM; tests import them through these).
export interface ApiEntryLike {
  kind?: string;
  module: string;
  layer: string;
  kit?: string;
  entries?: string[];
  entry: string;
  description?: string;
  deprecated?: string;
  slot?: string;
  slots?: string[];
  sizes?: Record<string, string>;
  inherits?: string[];
  signature?: string;
  variants?: Record<string, string[]>;
  props: { name: string; type: string; required: boolean; default?: string; description?: string; deprecated?: string }[];
}
export interface ApiLike {
  components: Record<string, ApiEntryLike>;
  hooks: Record<string, ApiEntryLike>;
  entries: Record<string, string>;
}
export interface DemoLike {
  code: string;
  imports: string;
  names: string[];
  helpers: string[];
  props: string[];
}
export interface DemoRef {
  route: string;
  key: string;
  demo: DemoLike;
}
export interface Example extends DemoRef {
  lines: number;
  helpers: string[];
  primary: boolean;
}
export function importPath(entry: string): string;
export function oneLine(text: string | undefined, max?: number): string;
export function parentOf(name: string, entry: ApiEntryLike, api: ApiLike): string | null;
export function familyOf(name: string, entry: ApiEntryLike, api: ApiLike): string[];
export function loadDemoSource(repo: string): Record<string, unknown>;
export function collectDemos(repo: string, api: ApiLike): DemoRef[];
export function exampleCode(demo: { code: string }): string;
export function pickExamples(demos: DemoRef[], api: ApiLike): Map<string, Example>;
export function noteMarkdown(note: unknown, h?: string): string;
export function componentMarkdown(args: { name: string; entry: ApiEntryLike; api: ApiLike; notes: Record<string, any>; noteIndex: Record<string, string>; examples: Map<string, any>; trim?: boolean }): string;
export function compactMarkdown(args: { name: string; entry: ApiEntryLike; api: ApiLike; notes: Record<string, any>; noteIndex: Record<string, string> }): string;
export function hookMarkdown(args: { name: string; entry: ApiEntryLike; examples: Map<string, any> }): string;
export function entryDescriptions(root: string): Record<string, string>;
export function buildOutputs(args: { root: string; repo: string; api: ApiLike; notesMap: Map<string, any>; demos: DemoRef[] }): { files: Map<string, string>; stats: { components: number; hooks: number; roots: number; examples: number } };
