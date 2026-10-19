---
component: Grid
module: primitives/layout
covers: GridItem
use: A responsive 12-column page grid that is 4 columns on mobile, 8 on tablet and 12 on desktop. `GridItem` sets how many columns a child spans at each size.
instead: Stack = a one-dimensional flex layout; Container = centre content and cap its width; Card = a bordered surface to place in a cell
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
Plain `div`s with no role. The reading order is the DOM order, whatever the spans do visually, so keep the source order meaningful.

## Reduced motion
Static: no animation.

## Server rendering
Plain markup; the column counts come from CSS breakpoints (`md`, `lg`), so there is no script and no mismatch.

## Gotchas
- `GridItem span` counts columns of the 4-column mobile grid and defaults to `"full"`: an item with only `lg={4}` is full width on mobile and tablet too. Give `md` when the tablet layout should differ.
- `span` above 4 on mobile makes implicit columns; use `md` (of 8) and `lg` (of 12) for larger spans.
- `md` is typed 1 to 8 or `"full"` because the tablet grid has 8 columns (a larger value used to compile and do nothing); `span` and `lg` accept 1 to 12 and `"full"`.
- `gap` is `sm`, `md` (default, wider from `md` up) or `lg`.

## Example
```tsx
import { Card, CardContent, CardHeader, CardTitle, Grid, GridItem } from "@sutra/ui";

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
