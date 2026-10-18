import * as React from "react";
import {
  RiCheckboxCircleFill,
  RiCloseLine,
  RiErrorWarningFill,
  RiUploadLine,
} from "@remixicon/react";
import { cn } from "../lib/cn";
import { Progress } from "../primitives/progress";
import { formatBytes as formatBytesLib } from "../lib/format";
import { normalizeTaskStatus, type TaskStatusInput } from "../lib/status";
import { Button, type ButtonProps } from "../primitives/button";
import { Dropzone, validateFiles, type DropzoneProps, type FileRejection } from "../primitives/dropzone";

export interface UploadFile {
  id: string;
  file: File;
  /** Upload progress, 0–100. */
  progress?: number;
  /** Upload state. Canonical lifecycle names (`pending`, `running`, `succeeded`, `failed`, `canceled`) are also accepted. */
  status?: "idle" | "uploading" | "complete" | "error" | TaskStatusInput;
  error?: string;
}

const TB = 1024 ** 4;

/** Formats a byte count as a short human string, e.g. `1.4 MB` (`"0 B"` for zero, negative or non-numeric input). */
export function formatBytes(bytes: number, decimals = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  // TB is this API's largest unit ("1048576 TB").
  if (bytes >= TB) return `${(bytes / TB).toFixed(decimals).replace(/\.0+$/, "")} TB`;
  // Keep "1.50 MB" at decimals=2 but drop an all-zero fraction ("2.0 KB" → "2 KB").
  return formatBytesLib(bytes, { decimals, trimZeros: false }).replace(/\.0+ /, " ");
}

let uid = 0;
const createId = () => `file-${Date.now().toString(36)}-${(uid++).toString(36)}`;

interface FileUploadContextValue {
  files: UploadFile[];
  rejections: FileRejection[];
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple: boolean;
  disabled: boolean;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearRejections: () => void;
  openPicker: () => void;
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(null);

/** Access the nearest `FileUpload` state (files, add/remove, picker). */
export function useFileUpload() {
  const ctx = React.useContext(FileUploadContext);
  if (!ctx) throw new Error("useFileUpload must be used within <FileUpload>");
  return ctx;
}

export interface FileUploadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Controlled list of files. */
  files?: UploadFile[];
  defaultFiles?: UploadFile[];
  onFilesChange?: (files: UploadFile[]) => void;
  /** Called with newly added files only — a good place to start uploads. */
  onFilesAdded?: (files: UploadFile[]) => void;
  onFilesRejected?: (rejections: FileRejection[]) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** Render validation errors under the children. */
  showErrors?: boolean;
  name?: string;
}

/** Compound file uploader root: owns file state, validation and the hidden input. */
export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      files: filesProp,
      defaultFiles = [],
      onFilesChange,
      onFilesAdded,
      onFilesRejected,
      accept,
      maxSize,
      maxFiles,
      multiple = true,
      disabled = false,
      showErrors = true,
      name,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [internal, setInternal] = React.useState<UploadFile[]>(defaultFiles);
    const files = filesProp ?? internal;
    const filesRef = React.useRef(files);
    filesRef.current = files;
    const [rejections, setRejections] = React.useState<FileRejection[]>([]);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const commit = React.useCallback(
      (next: UploadFile[]) => {
        if (filesProp === undefined) setInternal(next);
        onFilesChange?.(next);
      },
      [filesProp, onFilesChange]
    );

    const addFiles = React.useCallback(
      (incoming: File[]) => {
        if (disabled) return;
        const current = multiple ? filesRef.current : [];
        const { accepted, rejections: rejected } = validateFiles(incoming, {
          accept,
          maxSize,
          maxFiles,
          multiple,
          currentCount: current.length,
        });
        setRejections(rejected);
        if (rejected.length) onFilesRejected?.(rejected);
        if (!accepted.length) return;
        const added: UploadFile[] = accepted.map((file) => ({ id: createId(), file, status: "idle" }));
        commit([...current, ...added]);
        onFilesAdded?.(added);
      },
      [accept, maxSize, maxFiles, multiple, disabled, commit, onFilesAdded, onFilesRejected]
    );

    const removeFile = React.useCallback(
      (id: string) => commit(filesRef.current.filter((f) => f.id !== id)),
      [commit]
    );

    const ctx = React.useMemo<FileUploadContextValue>(
      () => ({
        files,
        rejections,
        accept,
        maxSize,
        maxFiles,
        multiple,
        disabled,
        addFiles,
        removeFile,
        clearRejections: () => setRejections([]),
        openPicker: () => {
          if (!disabled) inputRef.current?.click();
        },
      }),
      [files, rejections, accept, maxSize, maxFiles, multiple, disabled, addFiles, removeFile]
    );

    return (
      <FileUploadContext.Provider value={ctx}>
        <div
          ref={ref}
          data-disabled={disabled ? "" : undefined}
          className={cn("flex flex-col gap-3", className)}
          {...props}
        >
          <input
            ref={inputRef}
            type="file"
            name={name}
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            onChange={(e) => {
              addFiles(Array.from(e.currentTarget.files ?? []));
              e.currentTarget.value = "";
            }}
          />
          {children}
          {showErrors && rejections.length > 0 && (
            <ul role="alert" className="flex flex-col gap-1">
              {rejections.map((r, i) => (
                <li key={`${r.file.name}-${i}`} className="flex items-start gap-1.5 text-xs text-destructive">
                  <RiErrorWarningFill aria-hidden className="mt-px size-3.5 shrink-0" />
                  {r.errors[0]?.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </FileUploadContext.Provider>
    );
  }
);
FileUpload.displayName = "FileUpload";

export interface FileUploadTriggerProps extends ButtonProps {}

/** Button that opens the file picker. */
export const FileUploadTrigger = React.forwardRef<HTMLButtonElement, FileUploadTriggerProps>(
  ({ children, onClick, variant = "secondary", leadingIcon, disabled, ...props }, ref) => {
    const { openPicker, disabled: ctxDisabled, multiple } = useFileUpload();
    return (
      <Button
        ref={ref}
        variant={variant}
        disabled={disabled || ctxDisabled}
        leadingIcon={leadingIcon ?? <RiUploadLine aria-hidden />}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) openPicker();
        }}
        {...props}
      >
        {children ?? (multiple ? "Upload files" : "Upload file")}
      </Button>
    );
  }
);
FileUploadTrigger.displayName = "FileUploadTrigger";

export interface FileUploadDropzoneProps
  extends Omit<DropzoneProps, "onDrop" | "accept" | "maxSize" | "maxFiles" | "multiple" | "currentCount"> {}

/** `Dropzone` wired to the surrounding `FileUpload` state and limits. */
export const FileUploadDropzone = React.forwardRef<HTMLDivElement, FileUploadDropzoneProps>(
  ({ disabled, ...props }, ref) => {
    const ctx = useFileUpload();
    return (
      <Dropzone
        ref={ref}
        accept={ctx.accept}
        maxSize={ctx.maxSize}
        maxFiles={ctx.maxFiles}
        multiple={ctx.multiple}
        disabled={disabled || ctx.disabled}
        onDrop={(accepted, rejected) => {
          if (rejected.length) {
            ctx.addFiles([...accepted, ...rejected.map((r) => r.file)]);
          } else {
            ctx.addFiles(accepted);
          }
        }}
        {...props}
      />
    );
  }
);
FileUploadDropzone.displayName = "FileUploadDropzone";

export interface FileUploadListProps extends React.HTMLAttributes<HTMLUListElement> {}

/** List of selected files. Renders a `FileUploadItem` per file when no children are given. */
export const FileUploadList = React.forwardRef<HTMLUListElement, FileUploadListProps>(
  ({ className, children, ...props }, ref) => {
    const { files } = useFileUpload();
    if (!children && files.length === 0) return null;
    return (
      <ul ref={ref} aria-label="Files" className={cn("flex flex-col gap-2", className)} {...props}>
        {children ?? files.map((f) => <FileUploadItem key={f.id} file={f} />)}
      </ul>
    );
  }
);
FileUploadList.displayName = "FileUploadList";

const extColors: [RegExp, string][] = [
  [/^pdf$/, "bg-destructive text-destructive-foreground"],
  [/^(docx?|rtf|odt|pages|txt|md)$/, "bg-info text-info-foreground"],
  [/^(xlsx?|csv|ods|numbers|tsv)$/, "bg-success text-success-foreground"],
  [/^(pptx?|key|odp)$/, "bg-orange-500 text-white"],
  [/^(zip|rar|7z|tar|gz)$/, "bg-warning text-warning-foreground"],
  [/^(png|jpe?g|gif|webp|svg|avif|heic|bmp|ico)$/, "bg-primary text-primary-foreground"],
  [/^(mp4|mov|webm|avi|mkv|mp3|wav|ogg|flac|m4a)$/, "bg-fuchsia-500 text-white"],
  [/^(js|jsx|ts|tsx|json|html|css|py|go|rs|java|rb|sh|yml|yaml)$/, "bg-inverse text-inverse-foreground"],
];

function getExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** File glyph with a colored extension badge. */
function FileTypeIcon({ name }: { name: string }) {
  const ext = getExtension(name);
  const color = extColors.find(([re]) => re.test(ext))?.[1] ?? "bg-muted-foreground text-background";
  return (
    <span
      aria-hidden
      className="relative ml-1.5 flex h-10 w-8 shrink-0 rounded-[5px] border border-border bg-background shadow-xs"
    >
      <span
        className={cn(
          "absolute bottom-1.5 -left-1.5 rounded-[3px] shadow-xs px-1 py-px text-[8px] font-bold uppercase leading-none tracking-wide",
          color
        )}
      >
        {ext ? ext.slice(0, 4) : "file"}
      </span>
    </span>
  );
}

export interface FileUploadItemProps extends Omit<React.HTMLAttributes<HTMLLIElement>, "onRemove"> {
  file: UploadFile;
  /** Overrides the default remove behaviour (removing from `FileUpload` state). */
  onRemove?: (file: UploadFile) => void;
  /** Hide the remove button. */
  hideRemove?: boolean;
}

/** A single file row: type badge, name, size, progress and status. */
export const FileUploadItem = React.forwardRef<HTMLLIElement, FileUploadItemProps>(
  ({ file: item, onRemove, hideRemove, className, ...props }, ref) => {
    const ctx = React.useContext(FileUploadContext);
    const { file, progress, status = "idle", error } = item;
    const phase = status === "uploading" ? "running" : normalizeTaskStatus(status);
    const pct = Math.min(100, Math.max(0, progress ?? 0));
    const showProgress = phase === "running" || (progress !== undefined && phase !== "succeeded" && phase !== "failed");
    const isError = phase === "failed";

    return (
      <li
        ref={ref}
        data-status={status}
        className={cn(
          "group/file flex items-center gap-3 rounded-box border border-border bg-card p-3 shadow-xs transition-colors",
          isError && "border-destructive/40 bg-destructive-soft/40",
          className
        )}
        {...props}
      >
        <FileTypeIcon name={file.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground" title={file.name}>
              {file.name}
            </span>
            {phase === "succeeded" && (
              <RiCheckboxCircleFill aria-label="Uploaded" className="size-4 shrink-0 text-success" />
            )}
            {isError && <RiErrorWarningFill aria-label="Failed" className="size-4 shrink-0 text-destructive" />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <span>{formatBytes(file.size)}</span>
            {showProgress && (
              <>
                <span aria-hidden>·</span>
                <span>{phase === "running" && progress === undefined ? "Uploading…" : `${Math.round(pct)}%`}</span>
              </>
            )}
            {phase === "succeeded" && (
              <>
                <span aria-hidden>·</span>
                <span className="text-success">Complete</span>
              </>
            )}
            {isError && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate text-destructive">{error ?? "Upload failed"}</span>
              </>
            )}
          </div>
          {showProgress && (
            <Progress
              size="sm"
              value={progress === undefined ? null : Math.round(pct)}
              aria-label={`Uploading ${file.name}`}
              className="mt-1"
              indicatorClassName="duration-300"
            />
          )}
        </div>
        {!hideRemove && (onRemove || ctx) && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${file.name}`}
            className="shrink-0 self-start text-muted-foreground hover:text-foreground"
            onClick={() => (onRemove ? onRemove(item) : ctx?.removeFile(item.id))}
          >
            <RiCloseLine aria-hidden />
          </Button>
        )}
      </li>
    );
  }
);
FileUploadItem.displayName = "FileUploadItem";
