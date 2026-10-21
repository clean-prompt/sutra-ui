import { statusMeta } from "./git-review-internal";

export type ChangedFileStatus = "added" | "modified" | "deleted" | "renamed" | "untracked" | "conflicted";

export interface ChangedFile {
  path: string;
  status?: ChangedFileStatus;
  additions?: number;
  deletions?: number;
  /** Previous path for renames. */
  oldPath?: string;
}

/** One-letter git status code (A / M / D / R / U / !). */
export function gitStatusLetter(status: ChangedFileStatus = "modified") {
  return statusMeta[status].letter;
}

/** Split a path into its directory (with trailing slash) and base name. */
export function splitFilePath(path: string): { dir: string; base: string } {
  const i = path.lastIndexOf("/");
  return i < 0 ? { dir: "", base: path } : { dir: path.slice(0, i + 1), base: path.slice(i + 1) };
}

/** Truncate a branch name from the head so the tail (the distinctive part) stays visible. */
export function truncateBranchHead(name: string, max: number): string {
  if (max <= 0) return "";
  if (name.length <= max) return name;
  if (max === 1) return "…";
  return `…${name.slice(name.length - (max - 1))}`;
}

/** Sum additions / deletions over files. */
export function sumChangedFiles(files: readonly ChangedFile[]) {
  return files.reduce(
    (acc, f) => ({ additions: acc.additions + (f.additions ?? 0), deletions: acc.deletions + (f.deletions ?? 0) }),
    { additions: 0, deletions: 0 }
  );
}
