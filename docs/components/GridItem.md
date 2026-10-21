# GridItem

> A cell of `Grid`: `span` columns on mobile, with `md` and `lg` spans for larger screens. Extra props are spread to the root.

- Import: `import { GridItem } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/layout` (primitives)
- Part of [`Grid`](Grid.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `lg` | `Span` |  | Columns on desktop (of 12). |
| `md` | `TabletSpan` |  | Columns on tablet (of 8: 1 to 8 or `"full"`). |
| `span` | `Span` | `"full"` | Columns on mobile (of 4). Default: full. |

## Notes

See the notes in [`Grid`](Grid.md#notes).

## Example

```tsx
import { Card, CardContent, CardHeader, CardTitle, Grid, GridItem } from "@cleanprompt/sutra-ui";

const stats = [
  { label: "Active users", value: "1,284" },
  { label: "Revenue", value: "$18,420" },
  { label: "Open tickets", value: "37" },
];

export function Example() {
  return (
    <Grid gap="md">
      {stats.map((stat) => (
        <GridItem key={stat.label} span={4} md={4} lg={4}>
          <Card>
            <CardHeader>
              <CardTitle>{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>{stat.value}</CardContent>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}
```
