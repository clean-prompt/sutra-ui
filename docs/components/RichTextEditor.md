# RichTextEditor

> TipTap 3 WYSIWYG editor (StarterKit + Link + Placeholder) with Sutra prose styling, a bubble toolbar on selection and/or a fixed `RichTextToolbar`, controlled HTML or JSON value.

- Import: `import { RichTextEditor } from "@sutra/ui/editor"`
- Source: `packages/ui/src/kits/editor/rich-text-editor` (kit `editor`)
- `data-slot`: `rich-text-editor`
- Also accepts the props of HTMLAttributes

The extension setup (`extensions`, `starterKit`, `history`, `placeholder`) is read when the editor is created, as in TipTap; remount with a new `key` to change it. For Yjs: `history={false}` plus `extensions={[Collaboration.configure({ document: ydoc })]}`, and leave `value`/`defaultValue` unset.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoFocus` | `boolean` |  | Focuses the editor on mount. |
| `contentClassName` | `string` |  | Classes for the editable content area. |
| `defaultValue` | `RichTextValue` |  | Initial content when `value` is not controlled. |
| `editorRef` | `React.Ref<Editor \| null>` |  | Receives the TipTap editor instance. |
| `extensions` | `Extensions` |  | Extra TipTap extensions (mentions, tables, Collaboration…), appended after the built-ins. Read once at mount: the TipTap editor is created once, so remount (change `key`) to apply a different set. |
| `format` | `RichTextFormat` | `"html"` | Default "html". |
| `history` | `boolean` | `true` | StarterKit's undo/redo history. Default true. Set false when something else owns undo, e.g. Yjs through TipTap's Collaboration extension (which brings its own undo/redo, so the toolbar buttons stay). Without a replacement the toolbar's undo/redo buttons are hidden. Read once at mount (remount with a new `key` to change it); wins over `starterKit.undoRedo`. |
| `label` | `string` | `"Rich text editor"` | Accessible name of the editable area. Default "Rich text editor". |
| `onChange` | `(value: RichTextValue, editor: Editor) => void` |  | **Deprecated.** Use `onValueChange`. Called on every edit with the serialized value and the TipTap editor. |
| `onValueChange` | `(value: RichTextValue, editor: Editor) => void` |  | Called on every edit with the serialized value and the TipTap editor. |
| `placeholder` | `string` | `"Start writing…"` | Text shown while the document is empty. Default "Start writing…". |
| `readOnly` | `boolean` | `false` | Makes the content non-editable. Default false. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Prose size. Default "md". |
| `starterKit` | `Partial<StarterKitOptions>` |  | StarterKit options merged over the defaults (`{ link: false }`; the editor adds its own Link). Set a key to `false` to drop that extension, e.g. `{ heading: { levels: [1, 2] }, codeBlock: false }`. Read once at mount. |
| `toolbar` | `"bubble" \| "fixed" \| "both" \| "none"` | `"bubble"` | "bubble" (on selection), "fixed" (above), "both" or "none". Default "bubble". |
| `value` | `RichTextValue` |  | HTML string (`format="html"`) or ProseMirror JSON (`format="json"`). |

## Example (live: `#/components/editor/rich-text-editor` in the playground)

```tsx
import * as React from "react";
import { RichTextEditor } from "@sutra/ui/editor";

function RichTextDemo() {
  const [html, setHtml] = React.useState(
    "<h2>Meeting notes</h2><p>Select some text to see the <strong>bubble toolbar</strong>, or use the toolbar above. Links like <a href=\"https://example.com\">example.com</a> work too.</p><ul><li>Ship the editor</li><li>Write docs</li></ul><blockquote><p>Simple things should be simple.</p></blockquote>"
  );
  return (
    <div className="w-full space-y-3">
      <div className="rounded-box border border-border">
        <RichTextEditor value={html} onValueChange={(v) => setHtml(v as string)} toolbar="both" className="max-h-96" contentClassName="px-4" />
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">HTML output</summary>
        <pre className="mt-2 whitespace-pre-wrap break-all rounded-box bg-subtle p-3 font-mono">{html}</pre>
      </details>
    </div>
  );
}
```
