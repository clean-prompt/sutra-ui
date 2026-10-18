import * as React from "react";
import { EditorContent, useEditor, useEditorState, type Editor, type Extensions, type JSONContent } from "@tiptap/react";
import StarterKit, { type StarterKitOptions } from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiBold,
  RiCheckLine,
  RiCodeBoxLine,
  RiCodeLine,
  RiDoubleQuotesL,
  RiHeading,
  RiItalic,
  RiLink,
  RiLinkUnlink,
  RiListOrdered,
  RiListUnordered,
  RiSeparator,
  RiStrikethrough,
} from "@remixicon/react";
import { cn, focusRing } from "../../lib/cn";
import { isEmail } from "../../lib/validate";
import { BlogContent } from "../../patterns/blog-content";
import { Button } from "../../primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../primitives/popover";
import { EditorToolbar, EditorToolbarButton, EditorToolbarMenu, EditorToolbarSeparator } from "./editor-toolbar";

export type { Editor as RichTextEditorInstance, JSONContent as RichTextJSON } from "@tiptap/react";

/* ------------------------------------------------------------------ */
/* Shared state                                                        */
/* ------------------------------------------------------------------ */

interface FormatState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  heading: number;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  link: string | undefined;
  /** The editor has undo/redo commands. */
  history: boolean;
  canUndo: boolean;
  canRedo: boolean;
  empty: boolean;
  focused: boolean;
  editable: boolean;
  from: number;
  to: number;
}

/**
 * Whether the editor registers undo/redo commands: StarterKit's UndoRedo, or a replacement such as
 * TipTap's Collaboration extension (Yjs undo). False when `history={false}` and nothing else adds them.
 */
function hasHistory(e: Editor | null | undefined) {
  // The editor is null on the first browser render (and its extension manager is gone once destroyed).
  const commands = e?.extensionManager?.commands as Record<string, unknown> | undefined;
  return !!commands && typeof commands.undo === "function" && typeof commands.redo === "function";
}

function useFormatState(editor: Editor | null): FormatState | null {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const { from, to, empty } = e.state.selection;
      const undoable = hasHistory(e);
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        heading: [1, 2, 3, 4].find((level) => e.isActive("heading", { level })) ?? 0,
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        codeBlock: e.isActive("codeBlock"),
        link: e.getAttributes("link").href as string | undefined,
        history: undoable,
        canUndo: undoable && e.can().undo(),
        canRedo: undoable && e.can().redo(),
        empty,
        focused: e.isFocused,
        editable: e.isEditable,
        from,
        to,
      };
    },
  });
}

function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) return url;
  if (isEmail(url)) return `mailto:${url}`;
  return `https://${url}`;
}

function applyLink(editor: Editor, href: string) {
  const url = normalizeUrl(href);
  const chain = editor.chain().focus().extendMarkRange("link");
  if (url) chain.setLink({ href: url }).run();
  else chain.unsetLink().run();
}

interface LinkFormProps {
  initial?: string;
  onApply: (url: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
  className?: string;
}

function LinkForm({ initial = "", onApply, onRemove, onCancel, className }: LinkFormProps) {
  const [url, setUrl] = React.useState(initial);
  return (
    <form
      className={cn("flex items-center gap-1", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onApply(url);
      }}
    >
      <input
        autoFocus
        type="text"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        placeholder="Paste or type a link"
        aria-label="Link URL"
        className={cn(
          "h-7 w-56 min-w-0 rounded-control border border-input bg-background px-2 text-sm shadow-xs placeholder:text-muted-foreground",
          focusRing
        )}
      />
      <Button type="submit" size="icon-xs" variant="primary" aria-label="Apply link">
        <RiCheckLine aria-hidden />
      </Button>
      {onRemove && initial && (
        <Button type="button" size="icon-xs" variant="ghost" aria-label="Remove link" onClick={onRemove}>
          <RiLinkUnlink aria-hidden />
        </Button>
      )}
    </form>
  );
}

const headingItems = (editor: Editor) => [
  { id: "p", label: "Paragraph", onSelect: () => editor.chain().focus().setParagraph().run() },
  ...[1, 2, 3].map((level) => ({
    id: `h${level}`,
    label: `Heading ${level}`,
    shortcut: `mod+alt+${level}`,
    onSelect: () => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run(),
  })),
];

/** Mark and block buttons shared by the fixed and bubble toolbars. */
function FormatButtons({ editor, state, onLink, compact }: { editor: Editor; state: FormatState; onLink: React.ReactNode; compact?: boolean }) {
  const disabled = !state.editable;
  return (
    <>
      <EditorToolbarButton label="Bold" shortcut="mod+b" icon={<RiBold aria-hidden />} pressed={state.bold} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()} />
      <EditorToolbarButton label="Italic" shortcut="mod+i" icon={<RiItalic aria-hidden />} pressed={state.italic} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <EditorToolbarButton label="Strikethrough" shortcut="mod+shift+s" icon={<RiStrikethrough aria-hidden />} pressed={state.strike} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <EditorToolbarButton label="Inline code" shortcut="mod+e" icon={<RiCodeLine aria-hidden />} pressed={state.code} disabled={disabled} onClick={() => editor.chain().focus().toggleCode().run()} />
      {onLink}
      <EditorToolbarSeparator />
      <EditorToolbarMenu
        label={state.heading ? `Heading ${state.heading}` : compact ? "Text" : "Paragraph"}
        icon={compact ? <RiHeading aria-hidden /> : undefined}
        showLabel={!compact}
        disabled={disabled}
        items={headingItems(editor)}
      />
      <EditorToolbarButton label="Bulleted list" shortcut="mod+shift+8" icon={<RiListUnordered aria-hidden />} pressed={state.bulletList} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <EditorToolbarButton label="Numbered list" shortcut="mod+shift+7" icon={<RiListOrdered aria-hidden />} pressed={state.orderedList} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <EditorToolbarButton label="Quote" shortcut="mod+shift+b" icon={<RiDoubleQuotesL aria-hidden />} pressed={state.blockquote} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* RichTextToolbar                                                     */
/* ------------------------------------------------------------------ */

export interface RichTextToolbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  editor: Editor | null;
  /** Extra tools appended after the defaults. */
  children?: React.ReactNode;
  /**
   * Undo / redo buttons. Default true; they are left out anyway when the editor has no undo/redo commands
   * (`RichTextEditor history={false}` without a replacement such as TipTap's Collaboration extension).
   */
  history?: boolean;
}

/** Fixed formatting toolbar for a `RichTextEditor` (or any TipTap editor with StarterKit + Link). */
export const RichTextToolbar = React.forwardRef<HTMLDivElement, RichTextToolbarProps>(
  ({ editor, children, history = true, className, ...props }, ref) => {
    const state = useFormatState(editor);
    const [linkOpen, setLinkOpen] = React.useState(false);
    if (!editor || !state) return null;
    const link = (
      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <EditorToolbarButton label="Link" shortcut="mod+k" icon={<RiLink aria-hidden />} pressed={!!state.link} disabled={!state.editable} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1.5">
          <LinkForm
            initial={state.link}
            onApply={(url) => {
              applyLink(editor, url);
              setLinkOpen(false);
            }}
            onRemove={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              setLinkOpen(false);
            }}
            onCancel={() => setLinkOpen(false)}
          />
        </PopoverContent>
      </Popover>
    );
    return (
      <EditorToolbar ref={ref} aria-label="Text formatting" className={className} {...props}>
        {history && state.history && (
          <>
            <EditorToolbarButton label="Undo" shortcut="mod+z" icon={<RiArrowGoBackLine aria-hidden />} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
            <EditorToolbarButton label="Redo" shortcut="mod+shift+z" icon={<RiArrowGoForwardLine aria-hidden />} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
            <EditorToolbarSeparator />
          </>
        )}
        <FormatButtons editor={editor} state={state} onLink={link} />
        <EditorToolbarButton label="Code block" shortcut="mod+alt+c" icon={<RiCodeBoxLine aria-hidden />} pressed={state.codeBlock} disabled={!state.editable} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <EditorToolbarButton label="Divider" icon={<RiSeparator aria-hidden />} disabled={!state.editable} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        {children}
      </EditorToolbar>
    );
  }
);
RichTextToolbar.displayName = "RichTextToolbar";

/* ------------------------------------------------------------------ */
/* Bubble toolbar                                                      */
/* ------------------------------------------------------------------ */

function RichTextBubble({
  editor,
  container,
  linkMode,
  setLinkMode,
}: {
  editor: Editor;
  container: React.RefObject<HTMLDivElement | null>;
  linkMode: boolean;
  setLinkMode: (on: boolean) => void;
}) {
  const state = useFormatState(editor);
  const [within, setWithin] = React.useState(false);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(hideTimer.current), []);
  const visible = !!state && state.editable && (linkMode || (!state.empty && (state.focused || within)));

  let pos = { top: 0, left: 0, below: false };
  if (visible && state && container.current) {
    try {
      const box = container.current.getBoundingClientRect();
      const a = editor.view.coordsAtPos(state.from);
      const b = editor.view.coordsAtPos(state.to);
      const top = Math.min(a.top, b.top) - box.top;
      // Too close to the top edge: show the bubble under the selection instead.
      const below = top < 48;
      pos = { top: below ? Math.max(a.bottom, b.bottom) - box.top : top, left: (a.left + b.right) / 2 - box.left, below };
    } catch {
      pos = { top: 0, left: 0, below: false };
    }
  }
  if (!visible || !state) return null;

  return (
    <div
      data-slot="rich-text-bubble"
      className={cn("absolute z-50 -translate-x-1/2", pos.below ? "pt-2" : "-translate-y-full pb-2")}
      style={{ top: pos.top, left: Math.max(pos.left, 0) }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
      onFocus={() => {
        clearTimeout(hideTimer.current);
        setWithin(true);
      }}
      onBlur={() => {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setWithin(false), 0);
      }}
    >
      <div className="rounded-box border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
        {linkMode ? (
          <LinkForm
            initial={state.link}
            onApply={(url) => {
              applyLink(editor, url);
              setLinkMode(false);
            }}
            onRemove={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              setLinkMode(false);
            }}
            onCancel={() => {
              setLinkMode(false);
              editor.commands.focus();
            }}
          />
        ) : (
          <EditorToolbar aria-label="Selection formatting" overflow={false} className="border-0 bg-transparent p-0">
            <FormatButtons
              compact
              editor={editor}
              state={state}
              onLink={
                <EditorToolbarButton label="Link" shortcut="mod+k" icon={<RiLink aria-hidden />} pressed={!!state.link} onClick={() => setLinkMode(true)} />
              }
            />
          </EditorToolbar>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RichTextEditor                                                      */
/* ------------------------------------------------------------------ */

export type RichTextFormat = "html" | "json";
export type RichTextValue = string | JSONContent;

export interface RichTextEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** HTML string (`format="html"`) or ProseMirror JSON (`format="json"`). */
  value?: RichTextValue;
  defaultValue?: RichTextValue;
  /** Default "html". */
  format?: RichTextFormat;
  /** Called on every edit with the serialized value and the TipTap editor. */
  onValueChange?: (value: RichTextValue, editor: Editor) => void;
  /** @deprecated Use `onValueChange`. */
  onChange?: (value: RichTextValue, editor: Editor) => void;
  readOnly?: boolean;
  placeholder?: string;
  /** "bubble" (on selection), "fixed" (above), "both" or "none". Default "bubble". */
  toolbar?: "bubble" | "fixed" | "both" | "none";
  /**
   * Extra TipTap extensions (mentions, tables, Collaboration…), appended after the built-ins. Read once at mount:
   * the TipTap editor is created once, so remount (change `key`) to apply a different set.
   */
  extensions?: Extensions;
  /**
   * StarterKit's undo/redo history. Default true. Set false when something else owns undo, e.g. Yjs through TipTap's
   * Collaboration extension (which brings its own undo/redo, so the toolbar buttons stay). Without a replacement the
   * toolbar's undo/redo buttons are hidden. Read once at mount (remount with a new `key` to change it); wins over
   * `starterKit.undoRedo`.
   */
  history?: boolean;
  /**
   * StarterKit options merged over the defaults (`{ link: false }`; the editor adds its own Link). Set a key to `false`
   * to drop that extension, e.g. `{ heading: { levels: [1, 2] }, codeBlock: false }`. Read once at mount.
   */
  starterKit?: Partial<StarterKitOptions>;
  /** Receives the TipTap editor instance. */
  editorRef?: React.Ref<Editor | null>;
  /** Prose size. Default "md". */
  size?: "sm" | "md" | "lg";
  /** Classes for the editable content area. */
  contentClassName?: string;
  autoFocus?: boolean;
  /** Accessible name of the editable area. Default "Rich text editor". */
  label?: string;
}

function serialize(editor: Editor, format: RichTextFormat): RichTextValue {
  return format === "json" ? editor.getJSON() : editor.getHTML();
}

function sameValue(a: RichTextValue, b: RichTextValue) {
  return typeof a === "string" || typeof b === "string" ? a === b : JSON.stringify(a) === JSON.stringify(b);
}

/**
 * TipTap 3 WYSIWYG editor (StarterKit + Link + Placeholder) with Sutra prose styling, a bubble
 * toolbar on selection and/or a fixed `RichTextToolbar`, controlled HTML or JSON value.
 *
 * The extension setup (`extensions`, `starterKit`, `history`, `placeholder`) is read when the editor is
 * created, as in TipTap; remount with a new `key` to change it. For Yjs: `history={false}` plus
 * `extensions={[Collaboration.configure({ document: ydoc })]}`, and leave `value`/`defaultValue` unset.
 */
export const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  (
    {
      value,
      defaultValue,
      format = "html",
      onValueChange,
      onChange,
      readOnly = false,
      placeholder = "Start writing…",
      toolbar = "bubble",
      extensions,
      history = true,
      starterKit,
      editorRef,
      size = "md",
      contentClassName,
      autoFocus,
      label = "Rich text editor",
      className,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);
    const onChangeRef = React.useRef(onValueChange ?? onChange);
    onChangeRef.current = onValueChange ?? onChange;
    const formatRef = React.useRef(format);
    formatRef.current = format;
    const [linkMode, setLinkMode] = React.useState(false);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ link: false, ...starterKit, ...(history ? null : { undoRedo: false }) }),
        Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
        Placeholder.configure({ placeholder }),
        ...(extensions ?? []),
      ],
      content: value ?? defaultValue ?? "",
      editable: !readOnly,
      autofocus: autoFocus ? "end" : false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          "aria-label": label,
          "aria-multiline": "true",
          role: "textbox",
          class: cn("min-h-32 outline-none", contentClassName),
        },
      },
      onUpdate: ({ editor: e }) => onChangeRef.current?.(serialize(e, formatRef.current), e),
    });

    React.useImperativeHandle(editorRef, () => editor, [editor]);

    React.useEffect(() => {
      if (editor && !editor.isDestroyed) editor.setEditable(!readOnly);
    }, [editor, readOnly]);

    React.useEffect(() => {
      if (!editor || editor.isDestroyed || value === undefined) return;
      if (sameValue(serialize(editor, format), value)) return;
      editor.commands.setContent(value, { emitUpdate: false });
    }, [editor, value, format]);

    const showBubble = toolbar === "bubble" || toolbar === "both";
    const showFixed = toolbar === "fixed" || toolbar === "both";

    return (
      <div
        ref={containerRef}
        data-slot="rich-text-editor"
        data-readonly={readOnly || undefined}
        className={cn("relative flex min-h-0 flex-col", className)}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (!e.defaultPrevented && showBubble && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && editor && !editor.state.selection.empty) {
            e.preventDefault();
            setLinkMode(true);
          }
        }}
        {...props}
      >
        {showFixed && editor && <RichTextToolbar editor={editor} className="sticky top-0 z-10" />}
        <BlogContent
          fullWidth
          size={size}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto scrollbar-thin px-1 py-2",
            "[&_.ProseMirror]:min-h-32 [&_.ProseMirror]:outline-none [&_.ProseMirror]:whitespace-pre-wrap",
            "[&_.ProseMirror_.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_.is-editor-empty:first-child]:before:text-muted-foreground [&_.ProseMirror_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
            "[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-ring/50"
          )}
        >
          <EditorContent editor={editor} />
        </BlogContent>
        {showBubble && editor && <RichTextBubble editor={editor} container={containerRef} linkMode={linkMode} setLinkMode={setLinkMode} />}
      </div>
    );
  }
);
RichTextEditor.displayName = "RichTextEditor";
