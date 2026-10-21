# SpotlightCard

> A `Card` with a soft glow that follows the mouse (the `spotlight` utility on `usePointerVars`). It also glows at the centre while something inside has keyboard focus. Touch, reduced motion and no hover leave it plain. Decoration only.

- Import: `import { SpotlightCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/pointer-fx` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `CardElement` |  | Element to render, so a card can sit in the page outline as an `article`, `section` or list item. |
| `glowSize` | `number` |  | Radius of the glow in px. Default 240 (the `--sutra-spotlight-size` token). |
| `padded` | `boolean` |  | Adds 24px (16px at `size="sm"`) of padding on the card itself; the parts carry their own padding instead. |
| `size` | `"sm" \| "md"` |  | `sm` tightens the padding of the card and its parts. |
