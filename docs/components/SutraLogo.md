# SutraLogo

> Mark + wordmark lockup.

- Import: `import { SutraLogo } from "@sutra/ui"` (or from `@sutra/ui/assets`)
- Source: `packages/ui/src/assets/brand` (assets)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `layout` | `"horizontal" \| "stacked"` | `"horizontal"` | Mark beside the wordmark (`horizontal`) or above it (`stacked`). |
| `markOnly` | `boolean` | `false` | Hide the wordmark and show only the mark. |
| `markVariant` | `SutraMarkVariant` | `"glyph"` | Which `SutraMark` variant leads the lockup. Default `glyph` (ink on paper). |
| `product` | `React.ReactNode` |  | Optional product suffix shown after the wordmark, e.g. "notes". |
| `size` | `SutraLogoSize` | `"md"` | Logo size. |
