/* @cleanprompt/sutra-ui/editor: the editor chrome that needs no engine: toolbar, outline, status bar, diff, version history and comments. Needs no optional peer, so it imports in an app that installs neither CodeMirror nor TipTap. The engines have their own entries: `@cleanprompt/sutra-ui/code-editor` (CodeEditor, optional @codemirror/* peers) and `@cleanprompt/sutra-ui/rich-text-editor` (RichTextEditor, optional @tiptap/* peers). */
export * from "../kits/editor/editor-toolbar";
export * from "../kits/editor/document-outline";
export * from "../kits/editor/editor-status";
export * from "../patterns/diff-viewer";
export * from "../kits/editor/version-history";
export * from "../patterns/comments";
