# ScrollProgressBar

> A thin bar that fills as the scroller scrolls (the `scroll-progress-bar` utility plus the script fallback). Decorative (`aria-hidden`); place it `sticky top-0` inside a scroll area or `fixed inset-x-0 top-0` for the page. Empty where no timeline or script can drive it, and under reduced motion.

- Import: `import { ScrollProgressBar } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/motion`)
- Source: `packages/ui/src/patterns/scroll-reveal` (patterns)
- `data-slot`: `scroll-progress-bar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `forceFallback` | `boolean` | `false` | Run the script fallback even where the browser has native scroll timelines. Default false. |
| `scroller` | `React.RefObject<HTMLElement \| null>` |  | The scrolling element to follow. Default: the nearest scrolling ancestor, else the page. |
