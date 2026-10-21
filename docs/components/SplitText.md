# SplitText

> Text that reveals itself character by character or word by word (`animate-fade-up` plus the `stagger` delay on `--i`). Accessible by construction: the real text sits once in a visually hidden span, and the pieces are `aria-hidden`, so a screen reader never hears letters, and copying and find-in-page still see words (a word stays unbroken at line ends). Under `prefers-reduced-motion`, or with `animate={false}`, it renders the plain text.

- Import: `import { SplitText } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/split-text` (patterns)
- `data-slot`: `split-text`, `split-text-piece`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` (required) | `string` |  | The text. Screen readers get it whole. |
| `animate` | `boolean` | `true` | Set false to show the text as it is, with no reveal (changing it replays the reveal when true). Default true. |
| `as` | `"span" \| "p" \| "div" \| "h1" \| "h2" \| "h3" \| "h4"` | `"span"` | The element to render. Default `span`. |
| `by` | `"char" \| "word"` | `"char"` | Reveal by character or by word. Default "char". |
| `effect` | `"fade-up" \| "fade-in" \| "pop-in"` | `"fade-up"` | The entrance of each piece. Default "fade-up". |
| `step` | `number` |  | Milliseconds between pieces. Default 24 for characters, 70 for words. The whole reveal is capped at about 1.2 s. |
