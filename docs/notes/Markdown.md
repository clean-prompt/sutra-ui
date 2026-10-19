---
component: Markdown
module: patterns/markdown
use: Renders a markdown string with GitHub-flavoured extras (tables, task lists, strikethrough) in the design tokens: headings, lists, quotes, links, images, inline and fenced code with a copy button, optional KaTeX math and citation pills. It is memoized per block, so streamed text only re-renders the tail.
instead: CodeBlock = one snippet with highlighting, a file name and line numbers; RichTextEditor = text the user edits; ChatMessageContent = a chat message that wraps this; Text = a few styled lines rather than a document; InlineCode = a code span inside your own text
server: ssr-safe
---

## Keyboard
There is no keyboard handling of its own. Links are normal tab stops, and so are each code block and each table wrapper while it overflows (scroll boxes, so the arrow keys scroll them), each code block's "Copy code" button and, with `onCite`, each citation pill (a button; Enter and Space activate it).

## Screen readers
- The output is plain semantic HTML: `h1` to `h6`, `p`, `ul`, `ol`, `blockquote`, `table` with `thead` and `th`, `img`. Heading levels are written as in the source and are not shifted. An image without alt text gets `alt=""`.
- A fenced block is a header with the language (or "text") and a button named "Copy code", which becomes "Copied" after a copy, then a `pre`. The code is not highlighted. The `pre` and the wrapper around a table are scroll boxes that get `tabindex="0"` while they overflow (arrow keys scroll them), and always have a name through `role="group"`: "ts code" (the language, or "Code") and "Table".
- Citation pills: a `button` named "Source 2: Title" with `onCite`, a link with a hover card when the source has `href`, else a plain `sup`.
- Task-list items are native checkboxes rendered by GFM.

## Reduced motion
Nothing moves except the copy-check icon, which zooms in with `animate-in` (the global net removes the movement) and link colour fades (ended in 1 ms).

## Server rendering
react-markdown and KaTeX produce their HTML synchronously, so the server renders the whole document. The block split and block keys derive from `useId`, which matches on both sides.

## Gotchas
- Raw HTML in the source is shown as text, not rendered (no `rehype-raw`), and link and image URLs go through react-markdown's default filter that drops schemes such as `javascript:`. Add `rehypePlugins` for HTML, and sanitize it yourself.
- Keep `components`, `remarkPlugins` and `rehypePlugins` stable (module scope or `useMemo`): each block is memoized on those references, so a new array on every render re-renders every block while streaming. `components` is merged over the defaults.
- `math` needs the KaTeX stylesheet loaded once by the app (`import "katex/dist/katex.min.css"`); without `math` dollar signs stay as text. Invalid TeX shows rather than throwing.
- `[1]` and `[2, 3]` in prose turn into citation pills only up to `citeCount` (default `sources.length`), and never inside code or links. External `http(s)` links get `target="_blank"` with `rel="noopener noreferrer"`. Fenced code does not use `CodeBlock`: override `pre` in `components` to get highlighting.

## Example
```tsx
import { Markdown } from "@sutra/ui";

const source = [
  "## Release notes",
  "",
  "- **Faster** charts",
  "- Fixed the `loading` prop",
  "",
  "| Plan | Seats |",
  "|---|---|",
  "| Team | 10 |",
].join("\n");

export function Example() {
  return <Markdown>{source}</Markdown>;
}
```
