/** PromptInput attachment and context parts: the attachments slot, drop overlay, context chip and add-context menu. */
import * as React from "react";
import {
  RiAddLine,
  RiAtLine,
  RiAttachment2,
  RiClipboardLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCodeLine,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useIsoLayoutEffect } from "../../hooks/use-iso-layout-effect";
import { DropdownMenu as Menu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../primitives/dropdown-menu";
import { PromptInputContext, usePromptInput } from "./prompt-input-internal";
import { PromptInputButton, type PromptInputButtonProps } from "./prompt-input-toolbar";

/** Slot above the textarea for attachment previews. Renders nothing when empty. */
export const PromptInputAttachments = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    if (React.Children.count(children) === 0) return null;
    return (
      <div
        ref={ref}
        data-prompt-input-ignore=""
        className={cn("scrollbar-none flex cursor-default items-center gap-2 overflow-x-auto px-3 pb-0.5 pt-3 [&>*]:shrink-0", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PromptInputAttachments.displayName = "PromptInputAttachments";

/* ------------------------------------------------------------------ */
/* Drop overlay                                                        */
/* ------------------------------------------------------------------ */

export interface PromptInputDropOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Main line. Default "Drop to attach as context". */
  label?: React.ReactNode;
  /** Secondary line (e.g. accepted types). */
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

/** Full-composer overlay shown while files (or `onContextDrop` data) are dragged over the PromptInput; replaces the default hint. */
export const PromptInputDropOverlay = React.forwardRef<HTMLDivElement, PromptInputDropOverlayProps>(
  ({ label = "Drop to attach as context", description, icon, className, children, ...props }, ref) => {
    const { dragging, registerDropOverlay } = usePromptInput();
    useIsoLayoutEffect(() => registerDropOverlay(), [registerDropOverlay]);
    if (!dragging) return null;
    return (
      <div
        ref={ref}
        data-slot="prompt-input-drop-overlay"
        className={cn(
          "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 rounded-[inherit] border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px] animate-in fade-in-0",
          className
        )}
        {...props}
      >
        <span className="inline-flex items-center gap-2 rounded-box bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md">
          {icon ?? <RiUploadCloud2Line aria-hidden className="size-4" />}
          {label}
        </span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
        {children}
      </div>
    );
  }
);
PromptInputDropOverlay.displayName = "PromptInputDropOverlay";

/* ------------------------------------------------------------------ */
/* Context chip                                                        */
/* ------------------------------------------------------------------ */

/** A line or [start, end] line range. */
export type PromptInputLineRange = number | readonly [number, number];

/** `src/app.tsx` + [10, 20] → `src/app.tsx#L10-20`. */
export function formatContextRange(path: string, lines?: PromptInputLineRange) {
  if (lines == null) return path;
  if (typeof lines === "number") return `${path}#L${lines}`;
  const [a, b] = lines;
  return a === b ? `${path}#L${a}` : `${path}#L${a}-${b}`;
}

export interface PromptInputContextChipProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** File path, shown as its base name (full path in the tooltip). */
  path: string;
  lines?: PromptInputLineRange;
  /** Overrides the visible label. */
  label?: React.ReactNode;
  icon?: React.ReactNode;
  /** Whether the context is sent with the prompt (eye toggle). */
  included?: boolean;
  defaultIncluded?: boolean;
  onIncludedChange?: (included: boolean) => void;
  /** Show the eye toggle. Default true. */
  toggleable?: boolean;
  onRemove?: () => void;
  /** Makes the label a button (e.g. open the file). */
  onOpen?: () => void;
}

/** Removable chip for attached context such as the editor selection or the open file, with an include/exclude eye toggle. */
export const PromptInputContextChip = React.forwardRef<HTMLDivElement, PromptInputContextChipProps>(
  (
    {
      path,
      lines,
      label,
      icon,
      included: includedProp,
      defaultIncluded = true,
      onIncludedChange,
      toggleable = true,
      onRemove,
      onOpen,
      className,
      ...props
    },
    ref
  ) => {
    const [included, setIncluded] = useControllableState<boolean>({
      value: includedProp,
      defaultValue: defaultIncluded,
      onChange: onIncludedChange,
    });
    const full = formatContextRange(path, lines);
    const base = path.split(/[\\/]/).filter(Boolean).pop() ?? path;
    const range = formatContextRange("", lines);
    const iconButton = cn(
      "inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-3.5",
      focusRing
    );
    const text = label ?? (
      <>
        <span className="truncate">{base}</span>
        {range && <span className="shrink-0 text-muted-foreground">{range}</span>}
      </>
    );
    return (
      <div
        ref={ref}
        role="group"
        aria-label={`Context: ${full}`}
        title={full}
        data-included={included ? "" : undefined}
        data-prompt-input-ignore=""
        className={cn(
          "inline-flex h-7 max-w-64 shrink-0 cursor-default items-center gap-1 rounded-control border border-border bg-subtle pl-1.5 pr-0.5 text-xs font-medium text-foreground",
          !included && "border-dashed bg-transparent text-muted-foreground",
          className
        )}
        {...props}
      >
        <span aria-hidden className="inline-flex shrink-0 text-muted-foreground [&_svg]:size-3.5">
          {icon ?? <RiFileCodeLine aria-hidden />}
        </span>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className={cn("flex min-w-0 items-center rounded-xs font-mono hover:underline", !included && "line-through", focusRing)}
          >
            {text}
          </button>
        ) : (
          <span className={cn("flex min-w-0 items-center font-mono", !included && "line-through")}>{text}</span>
        )}
        {toggleable && (
          <button
            type="button"
            aria-pressed={included}
            aria-label={included ? `Exclude ${full} from context` : `Include ${full} in context`}
            title={included ? "Exclude from context" : "Include in context"}
            onClick={() => setIncluded(!included)}
            className={iconButton}
          >
            {included ? <RiEyeLine aria-hidden /> : <RiEyeOffLine aria-hidden />}
          </button>
        )}
        {onRemove && (
          <button type="button" aria-label={`Remove ${full}`} title="Remove" onClick={onRemove} className={iconButton}>
            <RiCloseLine aria-hidden />
          </button>
        )}
      </div>
    );
  }
);
PromptInputContextChip.displayName = "PromptInputContextChip";

/* ------------------------------------------------------------------ */
/* Add-context menu                                                    */
/* ------------------------------------------------------------------ */

export interface PromptInputAddContextItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  shortcut?: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export interface PromptInputAddContextMenuProps extends Omit<PromptInputButtonProps, "onChange"> {
  /** "Attach file…" (e.g. an editor file picker). Hidden when unset. */
  onAttachFile?: () => void;
  /** "Mention a file from this project…" (open a file search). Default: inserts "@" at the caret. */
  onMentionFile?: () => void;
  /** "Paste image". Default: reads images from the clipboard into `onFilesAdded` (when supported). */
  onPasteImage?: () => void;
  /** File input `accept` for "Upload from computer". */
  accept?: string;
  /** Replace or extend the item list: an array, or a function receiving the defaults. */
  items?: PromptInputAddContextItem[] | ((defaults: PromptInputAddContextItem[]) => PromptInputAddContextItem[]);
  /** Heading inside the menu. Default "Add context". */
  menuLabel?: string;
  align?: "start" | "center" | "end";
}

/** "+" menu for adding context: attach file, mention a project file, upload, paste image, or custom items. */
export const PromptInputAddContextMenu = React.forwardRef<HTMLButtonElement, PromptInputAddContextMenuProps>(
  (
    {
      onAttachFile,
      onMentionFile,
      onPasteImage,
      accept,
      items,
      menuLabel = "Add context",
      align = "start",
      label = "Add context",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const ctx = React.useContext(PromptInputContext);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const acceptsFiles = !!ctx?.acceptsFiles;
    const canReadClipboard =
      typeof navigator !== "undefined" && typeof (navigator.clipboard as Clipboard | undefined)?.read === "function";

    const insertAt = () => {
      const el = ctx?.textareaRef.current;
      if (!ctx || !el) return;
      const start = el.selectionStart ?? ctx.value.length;
      const end = el.selectionEnd ?? start;
      const before = ctx.value.slice(0, start);
      const insert = (before && !/\s$/.test(before) ? " " : "") + "@";
      ctx.setValue(before + insert + ctx.value.slice(end));
      const caret = start + insert.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    };

    const pasteImage = async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        const files: File[] = [];
        for (const item of clipboardItems) {
          const type = item.types.find((t) => t.startsWith("image/"));
          if (!type) continue;
          const blob = await item.getType(type);
          files.push(new File([blob], `pasted-image.${type.split("/")[1] ?? "png"}`, { type }));
        }
        ctx?.addFiles(files);
      } catch {
        /* permission denied or nothing to paste */
      }
    };

    const defaults: PromptInputAddContextItem[] = [];
    if (onAttachFile) defaults.push({ id: "attach-file", label: "Attach file…", icon: <RiAttachment2 aria-hidden />, onSelect: onAttachFile });
    if (onMentionFile || ctx)
      defaults.push({
        id: "mention-file",
        label: "Mention a file from this project…",
        icon: <RiAtLine aria-hidden />,
        shortcut: "@",
        onSelect: onMentionFile ?? insertAt,
      });
    if (acceptsFiles)
      defaults.push({
        id: "upload",
        label: "Upload from computer",
        icon: <RiUploadCloud2Line aria-hidden />,
        onSelect: () => inputRef.current?.click(),
      });
    if (onPasteImage || (acceptsFiles && canReadClipboard))
      defaults.push({ id: "paste-image", label: "Paste image", icon: <RiClipboardLine aria-hidden />, onSelect: onPasteImage ?? (() => void pasteImage()) });

    const list = typeof items === "function" ? items(defaults) : (items ?? defaults);

    return (
      <>
        <Menu>
          <DropdownMenuTrigger asChild>
            <PromptInputButton ref={ref} label={label} disabled={disabled ?? (!!ctx?.disabled || list.length === 0)} {...props}>
              {children ?? <RiAddLine aria-hidden />}
            </PromptInputButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} side="top" className="min-w-64">
            {menuLabel && (
              <>
                <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            {list.map((item) => (
              <DropdownMenuItem
                key={item.id}
                icon={item.icon}
                description={item.description}
                shortcut={item.shortcut}
                disabled={item.disabled}
                onSelect={item.onSelect}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Menu>
        {acceptsFiles && (
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            tabIndex={-1}
            accept={accept}
            onChange={(e) => {
              ctx?.addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        )}
      </>
    );
  }
);
PromptInputAddContextMenu.displayName = "PromptInputAddContextMenu";
