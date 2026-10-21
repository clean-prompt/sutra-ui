# CodeBlock

> Syntax-highlighted code with filename, copy, line numbers and highlights.

- Import: `import { CodeBlock } from "@sutra/ui"`
- Source: `packages/ui/src/patterns/code-block` (patterns)
- `data-slot`: `code-block`
- Parts: [`CodeBlockTabs`](CodeBlockTabs.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Extra header actions, placed before the copy button. |
| `children` | `string` |  | Source as a string, when `code` is not set. |
| `code` | `string` |  | Source to display. `children` (a string) works too. |
| `copyable` | `boolean` | `true` | Shows the copy button. |
| `defaultWrap` | `boolean` | `false` | Initial wrapping when uncontrolled. |
| `filename` | `string` |  | File name shown in the header instead of the language. |
| `hideHeader` | `boolean` |  | Hides the header (language or file name, actions). |
| `highlightLines` | `number[]` |  | 1-based line numbers to highlight. |
| `language` | `string` |  | Language name for syntax highlighting (e.g. "ts", "bash", "json") and the header label; unknown languages render as plain text. |
| `maxHeight` | `number \| string` |  | Maximum height of the code area (px number or CSS length); longer code scrolls. |
| `onWrapChange` | `(wrap: boolean) => void` |  | Called when the wrap toggle changes. |
| `showLineNumbers` | `boolean` |  | Shows a line-number gutter. |
| `showWrapToggle` | `boolean` |  | Show a soft-wrap toggle in the header. |
| `startLine` | `number` | `1` | Number of the first line. |
| `theme` | `CodeBlockTheme` | `"dark"` | dark: always-dark editor surface · light: follows the app theme |
| `wrap` | `boolean` |  | Controlled soft wrapping of long lines. Use with `onWrapChange`. |

## Part props

### CodeBlockTabs

Code block with tabs, e.g. npm / pnpm / yarn or several files.

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` (required) | `CodeBlockTab[]` |  | Tabs to show; each has a `label`, a `code` and optional language, filename and highlighted lines. |
| `copyable` | `boolean` | `true` | Shows the copy button. |
| `defaultValue` | `string` |  | Initially active tab value when uncontrolled. |
| `maxHeight` | `number \| string` |  | Maximum height of the code area (px number or CSS length); longer code scrolls. |
| `onValueChange` | `(value: string) => void` |  | Called with the tab value the user picked. |
| `showLineNumbers` | `boolean` |  | Shows a line-number gutter. |
| `theme` | `CodeBlockTheme` | `"dark"` | `dark` keeps the editor surface dark; `light` follows the app theme. |
| `value` | `string` |  | Controlled active tab value. Use with `onValueChange`. |
| `wrap` | `boolean` |  | Soft-wraps long lines. |

## Notes

**When to use:** Syntax-highlighted code with an optional header (file name or language, wrap toggle, copy button), line numbers and highlighted lines. `CodeBlockTabs` switches between snippets (npm, pnpm, yarn, or several files); `InlineCopy` is a one-line command with a copy button.

**Use instead when:**
- `CopyField`: any single value with a copy button that is not a command
- `Markdown`: prose that contains code fences
- `InlineCode`: a short code span inside a sentence
- `CodeEditor`: code the user edits
- `DiffViewer`: changes between two versions

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | The wrap toggle and copy button in the header, then the code area, which is a tab stop because it scrolls |
| Arrows, PageUp, PageDown, Home, End | Scroll the focused code area (native) |
| Enter, Space | On the copy button: copy. On the wrap toggle: switch wrapping |
| ArrowLeft, ArrowRight, Home, End | `CodeBlockTabs`: move between tabs and show that snippet at once; wraps from the last to the first |

The whole block is a `dir="ltr"` island, so the tab arrows do not swap in RTL.

### Screen readers

- The code is a `<pre tabindex="0"><code>` (focusable so it can scroll) with no role or label. Line numbers are `aria-hidden` and not selectable, so neither screen readers nor copy-paste see them.
- `highlightLines` is a colour and a bar only; it is not announced. The language and file name are plain header text.
- The copy button is named "Copy code" (`InlineCopy`: "Copy command") and a polite live region announces "Copied to clipboard"; the wrap toggle is "Toggle line wrap" with `aria-pressed`. The `$` prompt of `InlineCopy` is hidden from assistive technology and is not copied.
- `CodeBlockTabs` is a Radix `tablist` of `tab`s and a `tabpanel` per snippet.

### Reduced motion

The copy icon swaps with a 200 ms transition, the tab underline slides in over 200 ms and the header buttons fade, all transitions that the global net ends within 1 ms. Nothing else moves.

### Server rendering

Server render: same markup as the client. Highlighting is a pure function of `code` and `language`, so the server renders the full tokenized markup with no browser API. The clipboard is touched only on click.

### Gotchas

- Highlighting is a small built-in tokenizer for `ts`/`js`/`tsx`/`jsx`, `json`, `css`/`scss`, `html`/`xml`/`svg`, and `bash`/`sh`/`shell`. Other languages (python, go, rust) render as plain text, so use another highlighter inside your own `pre` for them.
- `theme="dark"` (default) is an always-dark surface from the `--code-*` tokens, also in a light app; `"light"` follows the app theme. `InlineCopy` defaults to `"light"`.
- With no header (no `filename`, `language`, `actions` or `showWrapToggle`, or `hideHeader`), the copy button floats in the corner and is visible only on hover or keyboard focus, so touch users never see it: give the block a `language` or `filename`.
- `code` wins over `children`; a trailing newline is removed. `wrap` is controllable only on `CodeBlock` (`wrap`, `defaultWrap`, `onWrapChange`, toggle with `showWrapToggle`); `CodeBlockTabs` takes a plain `wrap` and `highlightLines` per tab.

## Example

```tsx
import { CodeBlock } from "@sutra/ui";

const code = `import { Button } from "@sutra/ui";

export function Save() {
  return <Button type="submit">Save changes</Button>;
}`;

export function Example() {
  return <CodeBlock code={code} language="tsx" filename="save.tsx" showLineNumbers highlightLines={[4]} />;
}
```
