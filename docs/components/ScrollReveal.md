# ScrollReveal

> Fades and moves its content in as it scrolls into view, scrubbed by the scroll position (it reverses when you scroll back). It is the `scroll-reveal` utility plus the script fallback: browsers with `animation-timeline` run it as a CSS animation with no JavaScript; others get `--sutra-progress` from `useScrollProgress`, and with neither the content is simply there. Reduced motion shows the end state at once. Not for dense tables, live data or anything above the fold that must be readable on load. It replaces the element's own `translate` and `scale`, so wrap, do not stack. Keep it out of `overflow-hidden` wrappers (a native timeline binds to the nearest clipping ancestor, which never scrolls): use `overflow-clip` there.

- Import: `import { ScrollReveal } from "@sutra/ui"` (or from `@sutra/ui/motion`)
- Source: `packages/ui/src/patterns/scroll-reveal` (patterns)
- `data-slot`: `scroll-reveal`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `"div" \| "section" \| "article" \| "aside" \| "header" \| "footer" \| "figure" \| "li" \| "p" \| "span"` |  | Element to render. Default `div`. |
| `distance` | `number` | `24` | Travel in px for the sliding directions. Default 24. |
| `forceFallback` | `boolean` | `false` | Run the script fallback even where the browser has native scroll timelines (to try the Firefox path). Default false. |
| `from` | `"up" \| "down" \| "start" \| "end" \| "fade" \| "scale"` | `"up"` | Where it comes from as it enters: slides up (default), down, from the inline start or end, or only fades or scales in. |
| `scroller` | `React.RefObject<HTMLElement \| null>` |  | The scrolling element for the script fallback. Default: the nearest scrolling ancestor, else the page. |
