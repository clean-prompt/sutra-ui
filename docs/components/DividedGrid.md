# DividedGrid

> One bordered, rounded box whose cells are separated by hairlines instead of being separate cards: a tool grid, a feature list, a set of options. Works for any number of cells: the box clips the last column's and row's lines, so a short last row leaves no stray divider.

- Import: `import { DividedGrid } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/divided-grid` (patterns)
- `data-slot`: `divided-grid`, `divided-grid-skeleton`, `divided-grid-empty`
- Parts: [`DividedGridItem`](DividedGridItem.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | `DividedGridItem`s. Anything else is wrapped in a cell as it is. |
| `columns` | `DividedGridColumns` | `3` | Columns at the widest size: 1 → 2 → `columns` as the space grows. Default 3. |
| `emptyState` | `React.ReactNode` |  | Shown instead of the cells when there are none (and nothing is loading). |
| `items` | `DividedGridItemData[]` |  | Data-driven alternative to `children`; both can be mixed (items first). |
| `label` | `string` |  | Accessible name of the list. |
| `loading` | `boolean` |  | Data is on its way: with no cells, placeholder cells stand in; with cells, the root is marked busy. |
| `loadingCells` | `number` |  | Placeholder cells shown while loading with no cells. Default: two rows. |
| `numbered` | `boolean` | `false` | Show "01", "02" … in each cell. |
| `query` | `"viewport" \| "container"` | `"viewport"` | What `columns` measures: the viewport (default) or the grid's own width (CSS container queries, cells stay at least about 200px wide), for grids beside a sidebar. |
| `renderLink` | `(props: DividedGridLinkProps) => React.ReactElement` |  | Router link renderer for cells with an `href`. |

## Part props

### DividedGridItem

One cell of a `DividedGrid`: icon tile, title, description, badge and meta. A link, a button or static, depending on `href` and `onSelect`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Cell heading. |
| `badge` | `React.ReactNode` |  | A short label next to the title ("New", "Beta"). Text is shown in a `Badge`; pass a node to style it yourself. |
| `description` | `React.ReactNode` |  | Up to three lines; longer text is clamped. |
| `disabled` | `boolean` |  | Disables the cell: dimmed and not interactive. |
| `href` | `string` |  | Makes the cell a link. Unsafe URLs (`javascript:`) are ignored and the cell stays static. |
| `icon` | `React.ReactNode` |  | Icon shown in a small tile above the title (decorative: the title names the cell). |
| `meta` | `React.ReactNode` |  | Small muted line at the bottom of the cell ("12 MB limit"). |
| `onSelect` | `(event: React.MouseEvent<HTMLElement>) => void` |  | Called when the cell is clicked (after `onClick`, unless that prevented the default). Alone it makes the cell a button; with `href` it runs before the link opens. |
| `rel` | `string` |  | Link `rel` when `href` is set. |
| `target` | `string` |  | Link `target` when `href` is set. |

## Example (live: `#/components/layout-patterns/grid-empty` in the playground)

```tsx
import { DividedGrid } from "@sutra/ui/navigation";

function GridEmptyDemo() {
  return (
    <>
      <DividedGrid label="File tools" columns={3} query="container" emptyState="No tools match your filter" />
    </>
  );
}
```
