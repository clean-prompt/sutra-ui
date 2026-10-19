# SutraWordmark

> The lowercase "sutra" wordmark. Without `children` it is the drawn brand word (monoline, scales with the font size, real text for screen readers); with `children` it sets your text in the brand sans.

- Import: `import { SutraWordmark } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/brand` (assets)
- `data-slot`: `sutra-wordmark`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `gradient` | `boolean` | `false` | Show the brand name in a gradient instead of `currentColor`. |
| `size` | `SutraLogoSize` | `"md"` | Wordmark text size. |
