# Grid

> 12-column responsive grid (4 → 8 → 12 columns). Use `GridItem span` to size children.

- Import: `import { Grid } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/layout` (primitives)
- Parts: [`GridItem`](GridItem.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `gap` | `"sm" \| "md" \| "lg"` | `"md"` | Space between the cells: `sm` 12px, `md` 16px (24px from the tablet width up) or `lg` 24px (32px from the tablet width up). |

## Part props

### GridItem

A cell of `Grid`: `span` columns on mobile, with `md` and `lg` spans for larger screens. Extra props are spread to the root.

| Prop | Type | Default | Description |
|---|---|---|---|
| `lg` | `Span` |  | Columns on desktop (of 12). |
| `md` | `TabletSpan` |  | Columns on tablet (of 8: 1 to 8 or `"full"`). |
| `span` | `Span` | `"full"` | Columns on mobile (of 4). Default: full. |

## Notes

**When to use:** A responsive 12-column page grid that is 4 columns on mobile, 8 on tablet and 12 on desktop. `GridItem` sets how many columns a child spans at each size.

**Use instead when:**
- `Stack`: a one-dimensional flex layout
- `Container`: centre content and cap its width
- `Card`: a bordered surface to place in a cell

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

Plain `div`s with no role. The reading order is the DOM order, whatever the spans do visually, so keep the source order meaningful.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. Plain markup; the column counts come from CSS breakpoints (`md`, `lg`), so there is no script and no mismatch.

### Gotchas

- `GridItem span` counts columns of the 4-column mobile grid and defaults to `"full"`: an item with only `lg={4}` is full width on mobile and tablet too. Give `md` when the tablet layout should differ.
- `span` above 4 on mobile makes implicit columns; use `md` (of 8) and `lg` (of 12) for larger spans.
- `md` is typed 1 to 8 or `"full"` because the tablet grid has 8 columns (a larger value used to compile and do nothing); `span` and `lg` accept 1 to 12 and `"full"`.
- `gap` is `sm`, `md` (default, wider from `md` up) or `lg`.

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
