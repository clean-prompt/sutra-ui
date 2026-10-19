# StorageMap

> Disk usage map: a used/free header, a treemap of folders grouped by category (macOS, App data, Yours, Other) and a legend.

- Import: `import { StorageMap } from "@sutra/ui"` (or from `@sutra/ui/dataviz`)
- Source: `packages/ui/src/patterns/treemap` (patterns)
- `data-slot`: `storage-map`, `storage-map-header`, `storage-map-used-skeleton`, `storage-map-used`, `storage-map-free`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `StorageMapItem[]` |  | Top-level entries to size; each has a `name`, a `size` and optional category and children. |
| `breadcrumb` | `boolean` |  | Show the drill breadcrumb. Defaults to true when some top-level node has children. |
| `capacity` | `number` |  | Disk capacity in bytes. |
| `categories` | `Partial<Record<StorageCategory, { label?: string; color?: string }>>` |  | Override category labels or colours (an accent name or any CSS colour). |
| `defaultPath` | `string[]` |  | Initial drill path when uncontrolled (child ids from the root). |
| `defaultWidth` | `number` |  | Width used before the container is measured (and in jsdom). Default 600. |
| `depth` | `number` | `2` | Levels drawn below the current view. Deeper levels appear inside framed parents with a header. Default 1. |
| `emptyState` | `React.ReactNode` |  | Shown when nothing has a size. Default "No data". |
| `formatBytes` | `(bytes: number) => string` | `formatMemory` | Formats byte counts. Default decimal units ("412.5 GB"), like the system kit. |
| `free` | `number` |  | Free bytes. Defaults to `capacity - used`. |
| `gap` | `number` |  | Gap between tiles in px. Default 2. |
| `height` | `number` |  | Map height in px. Default 320. |
| `label` | `string` | `"Storage"` | Accessible name of the map and its root crumb. Default "Storage". |
| `legend` | `boolean` | `true` | Show a category legend (`BreakdownList`) under the map. Default false. |
| `loading` | `boolean` |  | Data is on its way: with no items, placeholders stand in for the used and free values, the map and the legend. |
| `minLabelSize` | `{ width: number; height: number }` |  | Tiles narrower or shorter than this (px) hide their label. Default `{ width: 44, height: 22 }`. |
| `onPathChange` | `(path: string[]) => void` |  | Called with the new path when the user drills in or out. |
| `onSelect` | `(node: TreemapNode, path: string[]) => void` |  | Called when a tile is clicked or activated with Enter/Space (before drilling into it). |
| `path` | `string[]` |  | Drill path: child ids from the root down to the node shown. |
| `tooltip` | `boolean` |  | Show a tooltip for the hovered or focused tile. Default true. |
| `used` | `number` |  | Used bytes. Defaults to the sum of `items`. |

## Notes

**When to use:** Tiles sized by value to compare many parts of a hierarchy at a glance (disk usage, bundle size, spend), with drill-down into groups, a tooltip and a screen-reader table. `StorageMap` wraps it for disks, with a used and free header and macOS, App data, Yours and Other categories.

**Use instead when:**
- `DonutChart`: a handful of parts of one whole
- `BarChart`: compare values on a common axis
- `BarList`: a ranked list with bars
- `BreakdownList`: a legend with values and shares
- `TreeView`: browse a hierarchy by name rather than by size

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | One tile holds the tab stop (the last active one); Tab then leaves the map |
| ArrowLeft, ArrowRight, ArrowUp, ArrowDown | Move to the nearest tile in that direction on screen |
| Home, End | First or last tile |
| Enter, Space, click | Open a tile that has items inside; on a leaf it only fires `onSelect` |
| Backspace, Escape | Go up one level (only while drilled in); focus lands on the tile you came from |

The root is a forced `dir="ltr"` island and the arrows are spatial, so nothing swaps in RTL; the breadcrumb sits inside the island too.

### Screen readers

- The map is a `group` with `aria-roledescription="treemap"`, named by `label` (default "Treemap") and described by a hidden hint on the arrow, Enter and Backspace keys.
- Each tile is a `button` named "Documents, 30, 30%, 3 items" (name, formatted value, share, child count); the visible text is `aria-hidden`, so tiles too small for a label are still named.
- A hidden table lists the tiles on screen (Name, `valueLabel`, Share) with the path as row header. The breadcrumb is a `navigation` named "<label> location" and a polite live region says "Showing Applications" after drilling. The tooltip is `aria-hidden`.
- With `loading` the root has `aria-busy` and one hidden "Loading <label>…".

### Reduced motion

Only tile hover and dim use a 150 ms opacity and background transition, which the global net ends in 1 ms. Drilling swaps the tiles with no animation.

### Server rendering

Server render: part of it fills in after mount. The layout needs the width: the server and the first client render lay the tiles out at `defaultWidth` (600 px), then the real width is measured after mount and the tiles are recomputed, so tile positions move on hydration. Values are formatted with `Intl` in the runtime locale unless you pass `valueFormatter`.

### Slots

- `treemap`: the root; `treemap-map`: the tile area
- `treemap-tile`: one tile button (`data-id`, `data-depth`, `data-expanded`, `data-label` = `full`, `name` or `hidden`)
- `treemap-breadcrumb`, `treemap-tooltip`, `treemap-table`, `treemap-legend`: the other parts
- `treemap-skeleton`, `treemap-empty`: the loading and empty states
- `storage-map`: the `StorageMap` card; `storage-map-header`, `storage-map-used`, `storage-map-free`

### Gotchas

- Size comes from `value`, or the sum of the children; zero, negative and non-finite values are not drawn, and when nothing has a size `emptyState` (default "No data") shows.
- `path` is the list of child ids from the root (the root's own id is not in it) and is controlled with `onPathChange`. `onSelect` runs on every tile activation, leaves included, before drilling.
- Backspace and Escape that go up also stop propagation, so Escape inside a Dialog first climbs a level, and closes the dialog only at the top. `depth` above 1 draws framed parents with a header (`StorageMap` uses 2).
- Colour is `colorFor`, then the node's `color`, then its top-level group's colour from `palette`; a prop `dir` on the root replaces the LTR island, as props are spread after it.

## Example

```tsx
import { Treemap, type TreemapNode } from "@sutra/ui";

const disk: TreemapNode = {
  id: "disk",
  name: "Disk",
  children: [
    {
      id: "apps",
      name: "Applications",
      children: [
        { id: "xcode", name: "Xcode", value: 14 },
        { id: "chrome", name: "Chrome", value: 2 },
      ],
    },
    { id: "docs", name: "Documents", value: 9 },
    { id: "photos", name: "Photos", value: 21 },
  ],
};

export function Example() {
  return <Treemap data={disk} label="Disk usage" valueLabel="Size" valueFormatter={(gb) => `${gb} GB`} legend />;
}
```
