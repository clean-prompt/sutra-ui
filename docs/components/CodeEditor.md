# CodeEditor

> CodeMirror 6 editor themed with Sutra tokens: markdown highlighting, line numbers, wrapping, search, Mod-B / Mod-I emphasis, controlled or uncontrolled value and an imperative API.

- Import: `import { CodeEditor } from "@sutra/ui/editor"`
- Source: `packages/ui/src/kits/editor/code-editor` (kit `editor`)
- `data-slot`: `code-editor`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `autoFocus` | `boolean` |  | Focuses the editor on mount. |
| `defaultValue` | `string` | `""` | Initial text when `value` is not controlled. |
| `extensions` | `Extension[]` |  | Extra CodeMirror extensions (languages, autocompletion, linting, collaboration…). Re-applied when an element changes, so memoize them (an inline `[lang()]` builds new ones every render). For Yjs, pass `yCollab(text, awareness, { undoManager })` here with `history={false}` and `keyBindings={yUndoManagerKeymap}`. |
| `fontSize` | `number` |  | Font size in px. |
| `history` | `boolean` | `true` | Built-in undo history (`history()` and its Mod-Z / Mod-Shift-Z / Mod-Y / Mod-U keymap). Default true. Set false when something else owns undo, e.g. a Yjs `UndoManager` (add its keymap through `keyBindings`). Toggling it after mount reconfigures the editor and drops the undo stack. |
| `keyBindings` | `KeyBinding[]` |  | Extra key bindings (take precedence over defaults). Re-applied when an element changes; memoize them. |
| `label` | `string` | `"Editor"` | Accessible name of the text area. Default "Editor". |
| `language` | `"markdown" \| "plain"` | `"markdown"` | "markdown" (built in) or "plain"; pass other languages through `extensions`. Default "markdown". |
| `lineNumbers` | `boolean` | `true` | Shows the line number gutter. Default true. |
| `onChange` | `(value: string, update: ViewUpdate) => void` |  | **Deprecated.** Use `onValueChange`. Called with the new text and the CodeMirror `ViewUpdate` when the user edits the document. |
| `onFocusChange` | `(focused: boolean) => void` |  | Called with true when the editor gains focus and false when it loses it. |
| `onSave` | `() => void` |  | Called on Mod-S. |
| `onScroll` | `(info: CodeEditorScrollInfo) => void` |  | Scroll position, for preview sync. |
| `onSelectionChange` | `(selection: CodeEditorSelection) => void` |  | Called with the selection range and text when the cursor or selection moves. |
| `onValueChange` | `(value: string, update: ViewUpdate) => void` |  | Called with the new text and the CodeMirror `ViewUpdate` when the user edits the document. |
| `placeholder` | `string` |  | Text shown while the document is empty. |
| `readOnly` | `boolean` | `false` | Makes the document read-only. Default false. |
| `search` | `boolean` | `true` | Search panel and Mod-F keymap. Default true. |
| `spellCheck` | `boolean` | `true` | Turns on the browser spell checker for the text area. Default true. |
| `value` | `string` |  | Controlled document text. |
| `wrap` | `boolean` | `true` | Soft-wrap long lines. Default true. |

## Example (live: `#/components/editor/code-editor` in the playground)

```tsx
import * as React from "react";
import { CodeEditor } from "@sutra/ui/editor";
import { SegmentedControl } from "@sutra/ui/forms";

function CodeEditorDemo() {
  const [lineNumbers, setLineNumbers] = React.useState("on");
  const [value, setValue] = React.useState("function greet(name) {\n  return `Hello, ${name}!`;\n}\n");
  return (
    <div className="w-full space-y-2">
      <SegmentedControl
        size="sm"
        className="max-w-full overflow-x-auto scrollbar-none"
        aria-label="Line numbers"
        value={lineNumbers}
        onValueChange={(v) => v && setLineNumbers(v)}
        options={[
          { value: "on", label: "Line numbers" },
          { value: "off", label: "No gutter" },
          { value: "ro", label: "Read only" },
        ]}
      />
      <div className="h-48 overflow-hidden rounded-box border border-border">
        <CodeEditor
          language="plain"
          value={value}
          onValueChange={setValue}
          lineNumbers={lineNumbers !== "off"}
          readOnly={lineNumbers === "ro"}
          label="Code"
        />
      </div>
    </div>
  );
}
```
