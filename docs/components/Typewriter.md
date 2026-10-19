# Typewriter

> Text that types itself (see `useTypewriter` for the timing options). Accessible: the current line is real text in a visually hidden span and the typed part and the caret are `aria-hidden`, so a screen reader reads the whole line once, never letter by letter, and the hidden text is there before the first character. Under `prefers-reduced-motion` it prints the finished text straight away.

- Import: `import { Typewriter } from "@sutra/ui"` (or from `@sutra/ui/motion`)
- Source: `packages/ui/src/patterns/typewriter` (patterns)
- `data-slot`: `typewriter`, `typewriter-caret`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` (required) | `string \| readonly string[]` |  | One line, or several typed in turn. |
| `as` | `"span" \| "p" \| "div" \| "h1" \| "h2" \| "h3" \| "h4"` | `"span"` | The element to render. Default `span`. |
| `cursor` | `"typing" \| "always" \| "none"` | `"typing"` | The caret. "typing" (default): a solid caret while the text is being typed, gone when it is done, so nothing blinks at rest. "always": a blinking caret that stays (it stops under reduced motion). "none". |
| `delay` | `number` |  | Milliseconds before the first character. Default 0. |
| `deleteSpeed` | `number` |  | Milliseconds per deleted character. Default 25. |
| `hold` | `number` |  | Milliseconds a finished line is held before it is deleted (several lines only). Default 1600. |
| `loop` | `boolean` |  | With several lines, start over after the last one (it is deleted first). Default false: the last line stays. |
| `onDone` | `() => void` |  | Called when the last line has been typed (never with `loop`). |
| `reserve` | `boolean` | `false` | Keep the space of the longest line from the start, so the text below does not jump while this one grows. |
| `speed` | `number` |  | Milliseconds per typed character. Default 45. |
