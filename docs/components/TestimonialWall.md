# TestimonialWall

> Masonry wall of quotes with source badges and a category filter.

- Import: `import { TestimonialWall } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks` (blocks)
- `data-slot`: `source-badge`, `pill-count`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `testimonials` (required) | `Testimonial[]` |  | Quotes to show; each has a `quote`, a `name`, a `source` and optional handle, avatar and categories. |
| `defaultCategory` | `string` | `"all"` | Initially selected category tab when uncontrolled. |
| `description` | `React.ReactNode` |  | Supporting text under the heading. |
| `title` | `React.ReactNode` | `"Loved by people who ship"` | Section heading. |

## Example (live: `#/components/billing-marketing/testimonial-wall` in the playground)

```tsx
import { TestimonialWall } from "@sutra/ui/blocks";

<TestimonialWall testimonials={testimonials} description="What builders say about Sutra." />
```
