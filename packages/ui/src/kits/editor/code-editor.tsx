import * as React from "react";
import { Annotation, Compartment, EditorSelection, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers as lineNumbersExt,
  placeholder as placeholderExt,
  rectangularSelection,
  type KeyBinding,
  type ViewUpdate,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  HighlightStyle,
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
  type TagStyle,
} from "@codemirror/language";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/math";

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

/** Editor chrome from Sutra tokens; follows light/dark through the CSS variables. */
export const sutraEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--foreground)",
    backgroundColor: "var(--background)",
    fontSize: "var(--code-editor-font-size, 13.5px)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.7",
    overflow: "auto",
  },
  ".cm-content": { padding: "16px 0 30vh", caretColor: "var(--primary)" },
  ".cm-line": { padding: "0 16px 0 12px" },
  ".cm-gutters": {
    backgroundColor: "var(--background)",
    color: "color-mix(in srgb, var(--muted-foreground) 70%, transparent)",
    border: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 4px 0 12px", minWidth: "32px" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--muted) 55%, transparent)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--primary)", borderLeftWidth: "2px" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--primary) 22%, transparent) !important",
  },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in srgb, var(--warning) 25%, transparent)" },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--warning) 30%, transparent)",
    outline: "1px solid color-mix(in srgb, var(--warning) 60%, transparent)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "color-mix(in srgb, var(--primary) 30%, transparent)" },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
    outline: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
  },
  ".cm-placeholder": { color: "var(--muted-foreground)", fontStyle: "normal" },
  ".cm-panels": { backgroundColor: "var(--subtle)", color: "var(--foreground)", fontFamily: "var(--font-sans)" },
  ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--border)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--border)" },
  ".cm-panel.cm-search": { padding: "6px 8px", fontSize: "12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" },
  ".cm-panel.cm-search input, .cm-panel.cm-search button": { margin: "0" },
  ".cm-textfield": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid var(--input)",
    borderRadius: "var(--radius-control, 6px)",
    padding: "3px 8px",
    fontSize: "12px",
    outline: "none",
  },
  ".cm-textfield:focus": { borderColor: "var(--ring)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--ring) 30%, transparent)" },
  ".cm-button": {
    backgroundImage: "none",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid var(--input)",
    borderRadius: "var(--radius-control, 6px)",
    padding: "3px 10px",
    fontSize: "12px",
  },
  ".cm-button:hover": { backgroundColor: "var(--muted)" },
  ".cm-panel.cm-search label": { display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--muted-foreground)" },
  ".cm-panel.cm-search [name=close]": { color: "var(--muted-foreground)", fontSize: "16px", right: "8px" },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" },
  ".cm-foldPlaceholder": { backgroundColor: "var(--muted)", border: "none", color: "var(--muted-foreground)" },
});

/*
 * The highlight tags live in @lezer/highlight, which is not a direct dependency; reuse the
 * Tag objects from CodeMirror's default style and restyle them with Sutra tokens.
 */
function tagsWhere(pred: (s: TagStyle) => boolean) {
  return defaultHighlightStyle.specs.find(pred)?.tag;
}

function buildHighlight() {
  const specs: TagStyle[] = [];
  const add = (tag: TagStyle["tag"] | undefined, style: Omit<TagStyle, "tag">) => {
    if (tag) specs.push({ tag, ...style });
  };
  add(tagsWhere((s) => s.fontWeight === "bold" && s.textDecoration === "underline"), { fontWeight: "700", color: "var(--foreground)" });
  add(tagsWhere((s) => s.fontWeight === "bold" && !s.textDecoration), { fontWeight: "700" });
  add(tagsWhere((s) => s.fontStyle === "italic"), { fontStyle: "italic" });
  add(tagsWhere((s) => s.textDecoration === "line-through"), { textDecoration: "line-through" });
  add(tagsWhere((s) => s.textDecoration === "underline" && !s.fontWeight), { color: "var(--primary)" });
  add(tagsWhere((s) => s.color === "#404740"), { color: "var(--muted-foreground)" });
  add(tagsWhere((s) => s.color === "#708"), { color: "var(--primary)", fontWeight: "600" });
  add(tagsWhere((s) => s.color === "#219"), { color: "var(--muted-foreground)" });
  add(tagsWhere((s) => s.color === "#164"), { color: "var(--success)" });
  add(tagsWhere((s) => s.color === "#a11"), { color: "var(--info)" });
  add(tagsWhere((s) => s.color === "#e40"), { color: "var(--warning-soft-foreground)" });
  add(tagsWhere((s) => s.color === "#940"), { color: "var(--muted-foreground)", fontStyle: "italic" });
  add(tagsWhere((s) => s.color === "#085"), { color: "var(--primary)" });
  add(tagsWhere((s) => s.color === "#f00"), { color: "var(--destructive)" });
  return HighlightStyle.define(specs);
}

let highlightCache: HighlightStyle | null = null;
/** Syntax colors from Sutra tokens (three ink levels plus primary/success/info accents). */
export function sutraHighlightStyle() {
  return (highlightCache ??= buildHighlight());
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

/** Wrap each selection in `before`/`after` (toggling off when already wrapped). */
export function wrapSelectionCommand(view: EditorView, before: string, after: string = before) {
  if (view.state.readOnly) return false;
  view.dispatch(
    view.state.changeByRange((range) => {
      const doc = view.state.doc;
      const pre = doc.sliceString(Math.max(0, range.from - before.length), range.from);
      const post = doc.sliceString(range.to, Math.min(doc.length, range.to + after.length));
      if (pre === before && post === after) {
        return {
          changes: [
            { from: range.from - before.length, to: range.from },
            { from: range.to, to: range.to + after.length },
          ],
          range: EditorSelection.range(range.from - before.length, range.to - before.length),
        };
      }
      return {
        changes: [
          { from: range.from, insert: before },
          { from: range.to, insert: after },
        ],
        range: EditorSelection.range(range.from + before.length, range.to + before.length),
      };
    })
  );
  return true;
}

const External = Annotation.define<boolean>();

/* ------------------------------------------------------------------ */
/* CodeEditor                                                          */
/* ------------------------------------------------------------------ */

export interface CodeEditorSelection {
  from: number;
  to: number;
  text: string;
  /** 1-based line of the cursor (selection head). */
  line: number;
  /** 1-based column of the cursor. */
  column: number;
}

export interface CodeEditorScrollInfo {
  /** 0-based line at the top of the viewport, with a fraction for partially scrolled lines. */
  topLine: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  /** 0–1 scroll progress. */
  ratio: number;
}

export interface CodeEditorHandle {
  focus: () => void;
  /** Replace the selection with `text` (cursor lands at its end, minus `back` characters). */
  insert: (text: string, back?: number) => void;
  /** Wrap (or unwrap) the selection with markers. */
  wrapSelection: (before: string, after?: string) => void;
  /** Insert `text` as its own block, with blank lines around it. */
  insertBlock: (text: string) => void;
  getSelection: () => CodeEditorSelection;
  getValue: () => string;
  /** Replace a range; with `expected`, only if it still holds that text. Returns success. */
  replaceRange: (from: number, to: number, text: string, expected?: string) => boolean;
  /** Find `text`, select it and scroll to it (e.g. a comment's quote). */
  selectText: (text: string) => boolean;
  /** Move the cursor to the start of a 1-based line and center it. */
  scrollToLine: (line: number) => void;
  /** The CodeMirror view (null before mount / after unmount). */
  readonly view: EditorView | null;
}

export interface CodeEditorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "onScroll"> {
  value?: string;
  defaultValue?: string;
  /** Called with the new text and the CodeMirror `ViewUpdate` when the user edits the document. */
  onValueChange?: (value: string, update: ViewUpdate) => void;
  /** @deprecated Use `onValueChange`. */
  onChange?: (value: string, update: ViewUpdate) => void;
  /** "markdown" (built in) or "plain"; pass other languages through `extensions`. Default "markdown". */
  language?: "markdown" | "plain";
  /** Extra CodeMirror extensions (languages, autocompletion, linting, collaboration…). */
  extensions?: Extension[];
  lineNumbers?: boolean;
  /** Soft-wrap long lines. Default true. */
  wrap?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  /** Search panel and Mod-F keymap. Default true. */
  search?: boolean;
  /** Called on Mod-S. */
  onSave?: () => void;
  /** Extra key bindings (take precedence over defaults). */
  keyBindings?: KeyBinding[];
  onSelectionChange?: (selection: CodeEditorSelection) => void;
  /** Scroll position, for preview sync. */
  onScroll?: (info: CodeEditorScrollInfo) => void;
  onFocusChange?: (focused: boolean) => void;
  /** Font size in px. */
  fontSize?: number;
  spellCheck?: boolean;
  autoFocus?: boolean;
  /** Accessible name of the text area. Default "Editor". */
  label?: string;
}

/**
 * CodeMirror 6 editor themed with Sutra tokens: markdown highlighting, line numbers, wrapping,
 * search, Mod-B / Mod-I emphasis, controlled or uncontrolled value and an imperative API.
 */
export const CodeEditor = React.forwardRef<CodeEditorHandle, CodeEditorProps>(
  (
    {
      value,
      defaultValue = "",
      onValueChange,
      onChange,
      language = "markdown",
      extensions,
      lineNumbers = true,
      wrap = true,
      placeholder,
      readOnly = false,
      search: searchEnabled = true,
      onSave,
      keyBindings,
      onSelectionChange,
      onScroll,
      onFocusChange,
      fontSize,
      spellCheck = true,
      autoFocus,
      label = "Editor",
      className,
      style,
      ...props
    },
    ref
  ) => {
    const hostRef = React.useRef<HTMLDivElement>(null);
    const viewRef = React.useRef<EditorView | null>(null);
    const cb = React.useRef({ onValueChange, onChange, onSave, onSelectionChange, onScroll, onFocusChange });
    cb.current = { onValueChange, onChange, onSave, onSelectionChange, onScroll, onFocusChange };
    const compartments = React.useMemo(
      () => ({
        lang: new Compartment(),
        extra: new Compartment(),
        gutter: new Compartment(),
        wrap: new Compartment(),
        placeholder: new Compartment(),
        readOnly: new Compartment(),
        search: new Compartment(),
        keys: new Compartment(),
        attrs: new Compartment(),
      }),
      []
    );

    const langExt = (l: typeof language): Extension => (l === "markdown" ? markdown({ base: markdownLanguage }) : []);
    const gutterExt = (on: boolean): Extension => (on ? [lineNumbersExt(), highlightActiveLineGutter()] : []);
    const searchExt = (on: boolean): Extension =>
      on ? [search({ top: true }), highlightSelectionMatches(), keymap.of(searchKeymap)] : [];
    const keysExt = (l: typeof language, extra?: KeyBinding[]): Extension =>
      keymap.of([
        ...(extra ?? []),
        { key: "Mod-s", preventDefault: true, run: () => (cb.current.onSave ? (cb.current.onSave(), true) : false) },
        ...(l === "markdown"
          ? [
              { key: "Mod-b", run: (v: EditorView) => wrapSelectionCommand(v, "**") },
              { key: "Mod-i", run: (v: EditorView) => wrapSelectionCommand(v, "_") },
            ]
          : []),
      ]);
    const attrsExt = (spell: boolean, name: string): Extension =>
      EditorView.contentAttributes.of({ spellcheck: spell ? "true" : "false", "aria-label": name, "aria-multiline": "true" });

    React.useEffect(() => {
      const host = hostRef.current!;
      const view = new EditorView({
        parent: host,
        state: EditorState.create({
          doc: value ?? defaultValue,
          extensions: [
            compartments.gutter.of(gutterExt(lineNumbers)),
            highlightSpecialChars(),
            history(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            bracketMatching(),
            rectangularSelection(),
            highlightActiveLine(),
            syntaxHighlighting(sutraHighlightStyle()),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            compartments.keys.of(keysExt(language, keyBindings)),
            keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
            compartments.search.of(searchExt(searchEnabled)),
            compartments.lang.of(langExt(language)),
            compartments.wrap.of(wrap ? EditorView.lineWrapping : []),
            compartments.placeholder.of(placeholder ? placeholderExt(placeholder) : []),
            compartments.readOnly.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
            compartments.attrs.of(attrsExt(spellCheck, label)),
            compartments.extra.of(extensions ?? []),
            sutraEditorTheme,
            EditorView.updateListener.of((u) => {
              if (u.docChanged && !u.transactions.some((t) => t.annotation(External))) {
                const text = u.state.doc.toString();
                cb.current.onValueChange?.(text, u);
                cb.current.onChange?.(text, u);
              }
              if ((u.selectionSet || u.docChanged) && cb.current.onSelectionChange) {
                const { from, to, head } = u.state.selection.main;
                const line = u.state.doc.lineAt(head);
                cb.current.onSelectionChange({ from, to, text: u.state.sliceDoc(from, to), line: line.number, column: head - line.from + 1 });
              }
              if (u.focusChanged) cb.current.onFocusChange?.(u.view.hasFocus);
            }),
          ],
        }),
      });
      viewRef.current = view;
      if (autoFocus) view.focus();

      let frame = 0;
      const handleScroll = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (!cb.current.onScroll) return;
          const el = view.scrollDOM;
          let topLine = 0;
          try {
            const block = view.lineBlockAtHeight(el.scrollTop);
            const n = view.state.doc.lineAt(block.from).number - 1;
            const frac = block.height ? Math.min(1, Math.max(0, (el.scrollTop - block.top) / block.height)) : 0;
            topLine = el.scrollTop < 4 ? 0 : n + frac;
          } catch {
            topLine = 0;
          }
          const max = el.scrollHeight - el.clientHeight;
          cb.current.onScroll({
            topLine,
            scrollTop: el.scrollTop,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            ratio: max > 0 ? el.scrollTop / max : 0,
          });
        });
      };
      view.scrollDOM.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        cancelAnimationFrame(frame);
        view.scrollDOM.removeEventListener("scroll", handleScroll);
        view.destroy();
        viewRef.current = null;
      };
      // Mounted once; options are reconfigured through compartments below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const reconfigure = (c: Compartment, ext: Extension) => {
      viewRef.current?.dispatch({ effects: c.reconfigure(ext) });
    };
    const first = React.useRef(true);
    React.useEffect(() => {
      if (first.current) return;
      reconfigure(compartments.lang, langExt(language));
      reconfigure(compartments.keys, keysExt(language, keyBindings));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, keyBindings]);
    React.useEffect(() => {
      if (!first.current) reconfigure(compartments.extra, extensions ?? []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extensions]);
    React.useEffect(() => {
      if (!first.current) reconfigure(compartments.gutter, gutterExt(lineNumbers));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineNumbers]);
    React.useEffect(() => {
      if (!first.current) reconfigure(compartments.wrap, wrap ? EditorView.lineWrapping : []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wrap]);
    React.useEffect(() => {
      if (!first.current) reconfigure(compartments.placeholder, placeholder ? placeholderExt(placeholder) : []);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [placeholder]);
    React.useEffect(() => {
      if (!first.current)
        reconfigure(compartments.readOnly, [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readOnly]);
    React.useEffect(() => {
      if (!first.current) reconfigure(compartments.search, searchExt(searchEnabled));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchEnabled]);
    React.useEffect(() => {
      if (!first.current) reconfigure(compartments.attrs, attrsExt(spellCheck, label));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spellCheck, label]);
    React.useEffect(() => {
      first.current = false;
    }, []);

    // Controlled value: replace the document when the prop diverges (without echoing onChange).
    React.useEffect(() => {
      const view = viewRef.current;
      if (!view || value == null) return;
      const current = view.state.doc.toString();
      if (current === value) return;
      const head = Math.min(view.state.selection.main.head, value.length);
      view.dispatch({ changes: { from: 0, to: current.length, insert: value }, selection: { anchor: head }, annotations: External.of(true) });
    }, [value]);

    React.useImperativeHandle(
      ref,
      () => ({
        focus: () => viewRef.current?.focus(),
        insert(text, back = 0) {
          const view = viewRef.current;
          if (!view) return;
          const { from, to } = view.state.selection.main;
          view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length - back },
            scrollIntoView: true,
          });
          view.focus();
        },
        wrapSelection(before, after = before) {
          const view = viewRef.current;
          if (!view) return;
          wrapSelectionCommand(view, before, after);
          view.focus();
        },
        insertBlock(text) {
          const view = viewRef.current;
          if (!view) return;
          const { from } = view.state.selection.main;
          const line = view.state.doc.lineAt(from);
          const filled = line.text.trim().length > 0;
          const prevFilled = line.number > 1 && view.state.doc.line(line.number - 1).text.trim().length > 0;
          const before = filled ? "\n\n" : prevFilled ? "\n" : "";
          const at = filled ? line.to : line.from;
          view.dispatch({
            changes: { from: at, to: filled ? at : line.to, insert: `${before}${text}\n\n` },
            selection: { anchor: at + before.length + text.length },
            scrollIntoView: true,
          });
          view.focus();
        },
        getSelection() {
          const view = viewRef.current;
          if (!view) return { from: 0, to: 0, text: "", line: 1, column: 1 };
          const { from, to, head } = view.state.selection.main;
          const line = view.state.doc.lineAt(head);
          return { from, to, text: view.state.sliceDoc(from, to), line: line.number, column: head - line.from + 1 };
        },
        getValue: () => viewRef.current?.state.doc.toString() ?? "",
        replaceRange(from, to, text, expected) {
          const view = viewRef.current;
          if (!view) return false;
          if (expected !== undefined && view.state.sliceDoc(from, to) !== expected) return false;
          view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from, head: from + text.length }, scrollIntoView: true });
          return true;
        },
        selectText(text) {
          const view = viewRef.current;
          if (!view || !text) return false;
          const at = view.state.doc.toString().indexOf(text);
          if (at < 0) return false;
          view.dispatch({ selection: { anchor: at, head: at + text.length }, scrollIntoView: true });
          view.focus();
          return true;
        },
        scrollToLine(n) {
          const view = viewRef.current;
          if (!view) return;
          const ln = view.state.doc.line(clamp(Math.floor(n), 1, view.state.doc.lines));
          view.dispatch({ selection: { anchor: ln.from }, effects: EditorView.scrollIntoView(ln.from, { y: "start", yMargin: 24 }) });
          view.focus();
        },
        get view() {
          return viewRef.current;
        },
      }),
      []
    );

    return (
      <div
        ref={hostRef}
        data-slot="code-editor"
        data-readonly={readOnly || undefined}
        className={cn("relative h-full min-h-0 w-full overflow-hidden bg-background text-foreground", className)}
        style={{ ...(fontSize ? ({ "--code-editor-font-size": `${fontSize}px` } as React.CSSProperties) : null), ...style }}
        {...props}
      />
    );
  }
);
CodeEditor.displayName = "CodeEditor";
