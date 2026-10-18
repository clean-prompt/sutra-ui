import * as React from "react";
import { RiUploadCloud2Line } from "@remixicon/react";
import { cn, focusRing, normalizeDensity, type Density } from "../lib/cn";
import { formatBytes } from "../lib/format";
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
      className,
      children,
      onClick,
      onKeyDown,
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

    const setInputRef = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof inputRefProp === "function") inputRefProp(node);
      else if (inputRefProp) (inputRefProp as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    const open = () => {
      if (!disabled) inputRef.current?.click();
    };

    const handleFiles = (list: FileList | null) => {
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
    const titleNode = title ?? (
      <>
        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
      </>
    );

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={hintText ? hintId : undefined}
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
          e.preventDefault();
          if (disabled) return;
          dragDepth.current += 1;
          setDragState(isDragAcceptable(e) ? "accept" : "reject");
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragState("idle");
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragState("idle");
          handleFiles(e.dataTransfer.files);
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
        {...props}
      >
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
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            handleFiles(e.currentTarget.files);
            e.currentTarget.value = "";
          }}
        />
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs ring-4 ring-muted",
            "transition-[color,transform,box-shadow] duration-200 group-hover/dropzone:text-foreground",
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
              <span className="font-medium text-primary">Drop to upload</span>
            ) : (
              titleNode
            )}
          </span>
          {hintText && (
            <span id={hintId} className="text-xs text-muted-foreground">
              {hintText}
            </span>
          )}
        </span>
        {children}
      </div>
    );
  }
);
Dropzone.displayName = "Dropzone";
