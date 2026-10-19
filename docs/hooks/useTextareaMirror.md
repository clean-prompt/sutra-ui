# useTextareaMirror

> Keeps a mirror element laid out exactly like a textarea (font, padding, borders, wrapping, scrollbar gutter, size and scroll offset) so text rendered in the mirror lines up with the textarea's glyphs. Attach `mirrorRef` to an absolutely positioned element behind the textarea and `onScroll` to the textarea.

- Import: `import { useTextareaMirror } from "@sutra/ui/ai"`
- Source: `packages/ui/src/hooks/use-textarea-mirror`

## Signature

```ts
useTextareaMirror(textareaRef: RefObject<HTMLTextAreaElement | null>, value: string, { enabled }?: UseTextareaMirrorOptions): { mirrorRef: RefObject<HTMLDivElement | null>; sync: () => void; onScroll: () => void; }
```
