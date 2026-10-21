/* Folder and drag-and-drop file helpers: pure functions over the browser's File and FileSystem entry APIs. No React. */

/**
 * A `File` that came from a picked or dropped folder, carrying its path inside that folder
 * (`"Trip/Photos/a.jpg"`). `Dropzone` and `FileUpload` set `relativePath` in their folder flows;
 * read it through `getFileRelativePath`, which also covers plain files.
 */
export type FileWithPath = File & { readonly relativePath?: string };

/** Sets `relativePath` on a file (not enumerable). A frozen or exotic `File` is returned as it is. */
export function withRelativePath(file: File, path: string): FileWithPath {
  try {
    Object.defineProperty(file, "relativePath", { value: path, enumerable: false, configurable: true });
  } catch {
    // A frozen or exotic File keeps working without the path.
  }
  return file as FileWithPath;
}

function readEntryFile(entry: FileSystemFileEntry) {
  return new Promise<File>((resolve, reject) => entry.file(resolve, reject));
}

/** All children of a directory: `readEntries` hands them out in batches until it returns an empty one. */
async function readDirectory(entry: FileSystemDirectoryEntry) {
  const reader = entry.createReader();
  const all: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return all;
    all.push(...batch);
  }
}

async function walkEntry(entry: FileSystemEntry, parent: string): Promise<FileWithPath[]> {
  const path = parent ? `${parent}/${entry.name}` : entry.name;
  try {
    if (entry.isFile) return [withRelativePath(await readEntryFile(entry as FileSystemFileEntry), path)];
    if (entry.isDirectory) {
      const children = await readDirectory(entry as FileSystemDirectoryEntry);
      return (await Promise.all(children.map((child) => walkEntry(child, path)))).flat();
    }
  } catch {
    // An unreadable entry (permissions, a file removed mid-walk) is skipped; the rest still arrive.
  }
  return [];
}

/**
 * Every file in a drop, with dropped folders walked recursively and each file's `relativePath` set
 * (`"Trip/Photos/a.jpg"`; a loose file's path is its name). Call it synchronously inside the `drop`
 * handler: the browser empties `dataTransfer` once the event returns. Falls back to `dataTransfer.files`
 * where the entry API (`webkitGetAsEntry`) is missing.
 */
export function getDroppedFiles(dataTransfer: Pick<DataTransfer, "items" | "files">): Promise<FileWithPath[]> {
  const items = Array.from(dataTransfer.items ?? []).filter((item) => item.kind === "file");
  if (items.length === 0 || typeof items[0]!.webkitGetAsEntry !== "function") {
    return Promise.resolve(Array.from(dataTransfer.files ?? []));
  }
  const sources = items.map((item) => item.webkitGetAsEntry() ?? item.getAsFile());
  return Promise.all(
    sources.map((source) =>
      !source ? [] : source instanceof File ? [source] : walkEntry(source, "")
    )
  ).then((groups) => groups.flat());
}
