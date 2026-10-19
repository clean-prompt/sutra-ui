// Types for notes.mjs (the generators are plain ESM; tests and the playground import them through these).
export type NoteBlock = { type: "p"; text: string } | { type: "ul"; items: string[] } | { type: "table"; head: string[]; rows: string[][] };

export interface ParsedNote {
  component: string;
  module: string;
  covers: string[];
  use: string;
  instead: [string, string][];
  server: string;
  keyboard: NoteBlock[];
  screenReaders: NoteBlock[];
  motion: NoteBlock[];
  ssr: NoteBlock[];
  slots: string[];
  gotchas: string[];
  example: string;
  chars: number;
  file?: string;
  __present: string[];
}

export interface ApiIndexLike {
  components: Record<string, { module: string; layer: string }>;
  hooks: Record<string, unknown>;
}

export const SECTIONS: string[];
export const SERVER_MODES: string[];
export function notesDir(root: string): string;
export function parseBlocks(lines: string[]): NoteBlock[];
export function parseNote(text: string, file?: string): { note?: ParsedNote; errors: string[]; present?: string[] };
export function loadNotes(root: string): { notes: Map<string, ParsedNote>; errors: string[]; files: string[] };
export function lintNotes(args: { root: string; api: ApiIndexLike; notes: Map<string, ParsedNote>; parseErrors?: string[]; only?: string[] }): string[];
export function modulesWithoutNote(api: ApiIndexLike, notes: Map<string, ParsedNote>, layer?: string): string[];
export function serializeNotes(notes: Map<string, ParsedNote>, api: ApiIndexLike): string;
export function noteFor(name: string, entry: { module: string } | undefined, notes: Record<string, { module: string; covers?: string[] }>): string | null;
