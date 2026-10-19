/**
 * Puts `files` on a file input through `DataTransfer`, so a native form post carries them. Returns false where the browser
 * cannot do it (no `DataTransfer` constructor, or an input whose `files` is read-only); the caller keeps its own list either way.
 */
export function setInputFiles(input: HTMLInputElement | null | undefined, files: readonly File[]): boolean {
  if (!input || typeof DataTransfer === "undefined") return false;
  try {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
    return true;
  } catch {
    return false;
  }
}

/** The same file picked twice: equal name, size, type and modified time. */
export const sameFile = (a: File, b: File) =>
  a === b || (a.name === b.name && a.size === b.size && a.type === b.type && a.lastModified === b.lastModified);
