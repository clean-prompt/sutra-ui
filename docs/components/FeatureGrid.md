# FeatureGrid

> Icon + title + description cards in a 2–4 column grid, with an optional section header.

- Import: `import { FeatureGrid } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks-features` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `features` (required) | `FeatureGridItem[]` |  | Features to list; each has a `title`, a `description` and an `icon`. |
| `columns` | `2 \| 3 \| 4` | `3` | Number of columns on large screens (fewer on small ones). |
| `description` | `React.ReactNode` |  | Supporting text under the heading. |
| `eyebrow` | `React.ReactNode` |  | Small label above the title. |
| `title` | `React.ReactNode` |  | Section heading. |

## Example (live: `#/components/billing-marketing/feature-grid` in the playground)

```tsx
import { FeatureGrid } from "@cleanprompt/sutra-ui/blocks";

<FeatureGrid eyebrow="Why Sutra" title="Everything you need, nothing you don't" description="A calm, local-first home for your agents." features={features} columns={4} />
```
