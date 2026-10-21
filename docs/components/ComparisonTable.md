# ComparisonTable

> Product-vs-alternatives matrix with check / cross / partial marks and numbered footnotes.

- Import: `import { ComparisonTable } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks-comparison` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `products` (required) | `ComparisonProduct[]` |  | Columns of the table; each has an `id`, a `name` and an optional `highlight` for your own product. |
| `rows` (required) | `ComparisonRow[]` |  | Feature rows; each has a `feature` and `values` keyed by product id (`yes`, `no`, `partial` or text). |
| `caption` | `string` | `"Product comparison"` | Visually hidden caption that names the table for assistive technology. |
| `footnotes` | `ComparisonFootnote[]` | `[]` | Footnotes listed under the table; rows reference them by id. |

## Example (live: `#/components/billing-marketing/comparison-table` in the playground)

```tsx
import { ComparisonTable } from "@sutra/ui/blocks";

<ComparisonTable {...comparison} />
```
