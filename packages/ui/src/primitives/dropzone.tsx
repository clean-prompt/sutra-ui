import * as React from "react";
import { RiUploadCloud2Line } from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../lib/cn";
import { formatBytes } from "../lib/format";
import { useMountedRef } from "../hooks/use-async-action";
import { useMergedRefs } from "../hooks/use-merged-refs";
import { getFileCategory } from "../assets/file-format";

export type FileRejectionCode = "file-invalid-type" | "file-too-large" | "too-many-files";

export interface FileRejection {
  file: File;
  errors: { code: FileRejectionCode; message: string }[];
}

export interface FileValidationOptions {
  /** Comma-separated MIME types / extensions, e.g. `"image/*,.pdf"`. */
  accept?: string;
  /** Max size per file in bytes. */
  maxSize?: number;
  /** Max number of files in total (including `currentCount`). */
  maxFiles?: number;
  multiple?: boolean;
  /** Files already selected elsewhere, counted against `maxFiles`. */
  currentCount?: number;
}

function parseAccept(accept?: string) {
  return (accept ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/** Broad MIME family guessed from the extension, for files whose `type` the browser left empty (e.g. HEIC). */
function guessMimeFamily(name: string | undefined) {
  if (!name) return "";
  const category = getFileCategory(name);
  return category === "image" || category === "audio" || category === "video" ? `${category}/` : "";
}

function matchesType(type: string, name: string | undefined, tokens: string[]) {
  if (tokens.length === 0) return true;
  const mime = type.toLowerCase();
  const lower = name?.toLowerCase();
  return tokens.some((token) => {
    if (token === "*" || token === "*/*") return true;
    if (token.startsWith(".")) return lower ? lower.endsWith(token) : true;
    if (token.endsWith("/*")) return (mime || guessMimeFamily(lower)).startsWith(token.slice(0, -1));
    return mime === token;
  });
}

/** Whether a file matches an `accept` string such as `"image/*,.pdf"`. */
export function isFileAccepted(file: File, accept?: string) {
  return matchesType(file.type, file.name, parseAccept(accept));
}

/** Splits files into accepted files and rejections with reasons. */
export function validateFiles(
  files: File[],
  { accept, maxSize, maxFiles, multiple = true, currentCount = 0 }: FileValidationOptions = {}
) {
  const accepted: File[] = [];
  const rejections: FileRejection[] = [];
  const limit = multiple ? (maxFiles ?? Infinity) : 1;
  const tokens = parseAccept(accept);

  for (const file of files) {
    const errors: FileRejection["errors"] = [];
    if (!matchesType(file.type, file.name, tokens)) {
      errors.push({ code: "file-invalid-type", message: `${file.name} isn't a supported file type.` });
    }
    if (maxSize !== undefined && file.size > maxSize) {
      errors.push({ code: "file-too-large", message: `${file.name} is larger than ${formatBytes(maxSize)}.` });
    }
    if (errors.length === 0 && currentCount + accepted.length >= limit) {
      errors.push({
        code: "too-many-files",
        message: limit === 1 ? "Only one file can be uploaded." : `You can upload up to ${limit} files.`,
      });
    }
    if (errors.length) rejections.push({ file, errors });
    else accepted.push(file);
  }
  return { accepted, rejections };
}

const typeLabels: Record<string, string> = {
  "image/*": "Images",
  "video/*": "Videos",
  "audio/*": "Audio",
  "text/*": "Text files",
  "application/pdf": "PDF",
  "application/json": "JSON",
  "application/zip": "ZIP",
  "text/csv": "CSV",
};

/** Human hint built from `accept` / `maxSize` / `maxFiles`, e.g. "Images, PDF · up to 10 MB". */
export function describeFileConstraints({ accept, maxSize, maxFiles }: FileValidationOptions) {
  const types = parseAccept(accept).map((t) =>
    typeLabels[t] ?? (t.startsWith(".") ? t.slice(1).toUpperCase() : (t.split("/")[1] ?? t).toUpperCase())
  );
  const parts: string[] = [];
  if (types.length) parts.push([...new Set(types)].join(", "));
  if (maxSize !== undefined) parts.push(`up to ${formatBytes(maxSize)}`);
  if (maxFiles !== undefined && maxFiles > 1) parts.push(`max ${maxFiles} files`);
  return parts.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Folders                                                             */
/* ------------------------------------------------------------------ */

/**
 * A `File` that came from a picked or dropped folder, carrying its path inside that folder
 * (`"Trip/Photos/a.jpg"`). `Dropzone` and `FileUpload` set `relativePath` in their folder flows;
 * read it through `getFileRelativePath`, which also covers plain files.
 */
export type FileWithPath = File & { readonly relativePath?: string };

function withRelativePath(file: File, path: string): FileWithPath {
  try {
    Object.defineProperty(file, "relativePath", { value: path, enumerable: false, configurable: true });
  } catch {
    // A frozen or exotic File keeps working without the path.
  }
  return file as FileWithPath;
}

/** Marks files from an `<input webkitdirectory>` pick with their `relativePath` (from `webkitRelativePath`). */
export function withPickedPaths(files: File[]): FileWithPath[] {
  return files.map((file) => withRelativePath(file, file.webkitRelativePath || file.name));
}

/** A file's path inside the folder it came from: `relativePath`, else `webkitRelativePath`, else its name. */
export function getFileRelativePath(file: File): string {
  const f = file as FileWithPath;
  return f.relativePath || f.webkitRelativePath || f.name;
}

/** Whether this browser can open a folder picker (`webkitdirectory` on a real input). False during SSR. */
export function supportsDirectoryPicker(): boolean {
  return typeof document !== "undefined" && "webkitdirectory" in document.createElement("input");
}

/** Attributes that turn a file input into a folder picker (React has no typed prop for them). */
export const directoryInputAttrs = { webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>;

/** Shown (and announced) where a folder option can't work. */
export const DIRECTORY_UNSUPPORTED_REASON = "This browser can't choose folders. Choose files instead.";

/** Brand text that stays AA on the page, the hover fill and the accept tint in both themes (plain `text-primary` is 4.35:1 on the stock dark page). */
const READABLE_PRIMARY = "text-[color-mix(in_oklab,var(--primary)_88%,var(--foreground))]";

const noSubscribe = () => () => {};

/** `supportsDirectoryPicker()` as a hook: `false` on the server and during hydration, then the real answer. */
export function useDirectoryPickerSupport(): boolean {
  return React.useSyncExternalStore(noSubscribe, supportsDirectoryPicker, () => false);
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


export interface DropzoneProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrop" | "title"> {
  /** Called with accepted files and rejections after a drop or pick. */
  onDrop?: (files: File[], rejections: FileRejection[]) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** `compact` is a single-row layout for tight spaces. Default `normal`. */
  density?: Density;
  /** @deprecated Use `density="compact"`. */
  compact?: boolean;
  /** Files already selected elsewhere, counted against `maxFiles`. */
  currentCount?: number;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  /** Defaults to a description of `accept` / `maxSize`. */
  hint?: React.ReactNode;
  /** Name for the underlying file input. */
  name?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  /**
   * Upload whole folders: clicking opens a folder picker (`webkitdirectory`) and dropped folders are
   * walked recursively. Every file is validated on its own and carries its `relativePath`
   * (see `getFileRelativePath`). Where the browser can't pick folders, clicking falls back to the file
   * picker and the hint says why.
   */
  directory?: boolean;
}

/** Drag-and-drop file area that also opens the file picker on click, Enter or Space. */
export const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
  (
    {
      onDrop,
      accept,
      maxSize,
      maxFiles,
      multiple = true,
      disabled = false,
      density: densityProp,
      compact: compactProp,
      currentCount = 0,
      icon,
      title,
      hint,
      name,
      inputRef: inputRefProp,
      directory = false,
      className,
      children,
      onClick,
      onKeyDown,
      onDragEnter,
      onDragOver,
      onDragLeave,
      ...props
    },
    ref
  ) => {
    const density = normalizeDensity(densityProp ?? compactProp);
    const compact = density === "compact";
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const dragDepth = React.useRef(0);
    const [dragState, setDragState] = React.useState<"idle" | "accept" | "reject">("idle");
    const hintId = React.useId();
    const reasonId = React.useId();
    const canPickFolder = useDirectoryPickerSupport();
    const folderPick = directory && canPickFolder;
    const [reading, setReading] = React.useState(false);
    const alive = useMountedRef();
    const setInputRef = useMergedRefs(inputRef, inputRefProp);

    const open = () => {
      if (!disabled) inputRef.current?.click();
    };

    const handleFiles = (list: FileList | File[] | null) => {
      if (!list || disabled) return;
      const { accepted, rejections } = validateFiles(Array.from(list), {
        accept,
        maxSize,
        maxFiles,
        multiple,
        currentCount,
      });
      onDrop?.(accepted, rejections);
    };

    const isDragAcceptable = (e: React.DragEvent) => {
      const items = Array.from(e.dataTransfer.items ?? []).filter((item) => item.kind === "file");
      if (!multiple && items.length > 1) return false;
      const tokens = parseAccept(accept);
      return items.every((item) => !item.type || matchesType(item.type, undefined, tokens));
    };

    const hintText = hint ?? describeFileConstraints({ accept, maxSize, maxFiles });
    const titleNode =
      title ??
      (folderPick ? (
        <>
          <span className={cn("font-semibold", READABLE_PRIMARY)}>Click to choose a folder</span> or drag and drop
        </>
      ) : (
        <>
          <span className={cn("font-semibold", READABLE_PRIMARY)}>Click to upload</span> or drag and drop
        </>
      ));
    const folderReason = directory && !canPickFolder;
    const describedBy = [hintText ? hintId : "", folderReason ? reasonId : ""].filter(Boolean).join(" ");

    return (
      <>
        <div
          ref={ref}
          role="button"
          {...props}
          tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
          aria-disabled={disabled ? true : props["aria-disabled"]}
          aria-describedby={[props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined}
          aria-busy={reading ? true : props["aria-busy"]}
          data-drag={dragState === "idle" ? undefined : dragState}
          data-density={density}
          onClick={(e) => {
            onClick?.(e);
            if (!e.defaultPrevented) open();
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented || e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          }}
          onDragEnter={(e) => {
            onDragEnter?.(e);
            e.preventDefault();
            if (disabled) return;
            dragDepth.current += 1;
            setDragState(isDragAcceptable(e) ? "accept" : "reject");
          }}
          onDragOver={(e) => {
            onDragOver?.(e);
            e.preventDefault();
            if (!disabled) e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            onDragLeave?.(e);
            e.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragState("idle");
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDragState("idle");
            if (!directory) {
              handleFiles(e.dataTransfer.files);
              return;
            }
            if (disabled) return;
            setReading(true);
            getDroppedFiles(e.dataTransfer)
              .catch(() => [] as File[])
              .then((files) => {
                if (!alive.current) return;
                setReading(false);
                handleFiles(files);
              });
          }}
          className={cn(
            "group/dropzone relative flex cursor-pointer rounded-box border border-dashed border-border-strong bg-background text-center",
            "transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/50 hover:bg-subtle",
            "data-[drag=accept]:border-primary data-[drag=accept]:bg-primary-soft/60 data-[drag=accept]:ring-4 data-[drag=accept]:ring-primary/10",
            "data-[drag=reject]:border-destructive data-[drag=reject]:bg-destructive-soft/60",
            "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-border-strong aria-disabled:hover:bg-background",
            compact ? "flex-row items-center gap-3 px-4 py-3 text-left" : "flex-col items-center justify-center gap-3 px-6 py-8",
            focusRing,
            className
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs ring-4 ring-muted",
              "transition-[color,transform,translate,scale,rotate,box-shadow] duration-200 group-hover/dropzone:text-foreground",
              "group-data-[drag=accept]/dropzone:-translate-y-0.5 group-data-[drag=accept]/dropzone:text-primary group-data-[drag=accept]/dropzone:ring-primary-soft",
              "group-data-[drag=reject]/dropzone:text-destructive group-data-[drag=reject]/dropzone:ring-destructive-soft",
              compact ? "size-9 [&_svg]:size-4" : "size-11 [&_svg]:size-5"
            )}
          >
            {icon ?? <RiUploadCloud2Line aria-hidden />}
          </span>
          <span className={cn("flex min-w-0 flex-col gap-1", compact && "flex-1")}>
            <span className="text-sm text-muted-foreground">
              {dragState === "reject" ? (
                <span className="font-medium text-destructive">Some files aren't supported</span>
              ) : dragState === "accept" ? (
                <span className={cn("font-medium", READABLE_PRIMARY)}>Drop to upload</span>
              ) : (
                titleNode
              )}
            </span>
            {hintText && (
              <span id={hintId} className="text-xs text-muted-foreground">
                {hintText}
              </span>
            )}
            {folderReason && (
              <span id={reasonId} className="text-xs text-muted-foreground">
                {DIRECTORY_UNSUPPORTED_REASON}
              </span>
            )}
          </span>
          {children}
        </div>
        {/* A sibling, not a child: an input inside role="button" is nested-interactive. */}
        <input
          ref={setInputRef}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          {...(folderPick ? directoryInputAttrs : null)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const picked = Array.from(e.currentTarget.files ?? []);
            handleFiles(folderPick ? withPickedPaths(picked) : picked);
            e.currentTarget.value = "";
          }}
        />
      </>
    );
  }
);
Dropzone.displayName = "Dropzone";
