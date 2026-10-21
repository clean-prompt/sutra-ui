# ScrollStage

> A sticky stage over a scroll runway: the stage stays in view while you scroll through the runway, and `--sutra-progress` (0 at the start, 1 at the end) is set on the stage root so its children can follow it in CSS (`opacity-(--p)` with `--p: clamp(0, (var(--sutra-progress, 1) - .3) / .4, 1)`). Scrolling stays native: no hijacking, no snapping, keyboard and touch work as usual, and the content can be focused and read at any progress. Without script, or under reduced motion, the variable is unset (children read it with a default of 1, their end state) and the stage is an ordinary block with no runway.

- Import: `import { ScrollStage } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/scroll-stage` (patterns)
- `data-slot`: `scroll-stage`, `scroll-stage-viewport`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onScrollProgress` | `(progress: number) => void` |  | Called with the progress (0..1) in a frame while it changes. |
| `runway` | `number \| string` | `3` | Length of the scroll runway: a CSS length, or a number of viewport heights. Default 3 (`300vh`). |
| `scroller` | `React.RefObject<HTMLElement \| null>` |  | The scrolling element. Default: the nearest scrolling ancestor, else the page. |
| `stageHeight` | `string` | `"100dvh"` | Height of the sticky stage: a CSS length. Default `100dvh`; use a fixed length inside a scroll area. |
