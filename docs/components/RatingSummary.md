# RatingSummary

> Review summary: average score, stars, count and a 5→1 distribution chart.

- Import: `import { RatingSummary } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/rating` (primitives)
- Part of [`Rating`](Rating.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `average` (required) | `number` |  | Average score, e.g. 4.3. |
| `count` | `number` |  | Total number of ratings. Defaults to the sum of `distribution`. |
| `countLabel` | `(count: number) => React.ReactNode` | `(n) => pluralize(n, "rating")` | Text after the count. |
| `distribution` | `Partial<Record<number, number>>` |  | Ratings per star, keyed by star value: `{ 5: 120, 4: 40, … }`. |
| `locale` | `string` |  | BCP 47 locale used to format the average and the counts. |
| `max` | `number` | `5` | Number of stars the average is out of. |

## Notes

See the notes in [`Rating`](Rating.md#notes).

## Example

```tsx
import * as React from "react";
import { Rating } from "@sutra/ui";

export function Example() {
  const [stars, setStars] = React.useState(4);
  return (
    <div className="flex items-center gap-3">
      <Rating aria-label="Your rating" value={stars} onValueChange={setStars} allowHalf />
      <span className="text-sm text-muted-foreground">{stars} of 5</span>
    </div>
  );
}
```
