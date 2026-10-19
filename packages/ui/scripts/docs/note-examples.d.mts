import type { ParsedNote } from "./notes.mjs";
export function checkNoteExamples(args: { root: string; notes: Map<string, ParsedNote>; only?: string[] }): { name: string; line: number; message: string }[];
