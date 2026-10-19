# DataTable

> Data-driven table with sorting, selection, loading and empty states.

- Import: `import { DataTable } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/table` (primitives)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` (required) | `DataTableColumn<T>[]` |  | Column definitions in display order. |
| `data` (required) | `T[]` |  | Row objects to render; each row is passed to `cell`, `sortValue` and `onRowClick`. |
| `caption` | `React.ReactNode` |  | Caption rendered under the table (`<caption>`), e.g. a source note or the table title. |
| `className` | `string` |  | Classes for the outer wrapper. |
| `defaultSelectedRowIds` | `string[]` | `[]` | Initially selected row ids when uncontrolled. |
| `defaultSort` | `DataTableSort \| null` | `null` | Initial sort when uncontrolled. |
| `density` | `TableDensity` |  | Row density. Default `normal`; `"comfortable"` is accepted as a legacy alias of `relaxed`. |
| `emptyState` | `React.ReactNode` |  | Content shown in place of the body when `data` is empty. |
| `getRowId` | `(row: T, index: number) => string` | `defaultRowId` | Stable row id. Defaults to `row.id` or the index. |
| `loading` | `boolean` |  | Shows skeleton rows instead of the data. |
| `loadingRows` | `number` | `5` | Number of skeleton rows shown while `loading`. |
| `manualSorting` | `boolean` |  | Disable built-in sorting (e.g. when sorting on the server). |
| `maxHeight` | `number \| string` |  | Maximum height of the scroll area (px number or CSS length); the body scrolls past it. |
| `onRowClick` | `(row: T, index: number) => void` |  | Called with the row and its index when a row is clicked; rows get a pointer cursor. |
| `onSelectionChange` | `(ids: string[]) => void` |  | Called with the full list of selected row ids after every selection change. |
| `onSortChange` | `(sort: DataTableSort \| null) => void` |  | Called with the next sort (or `null` when sorting is cleared) when a sortable header is activated. |
| `ref` | `React.Ref<HTMLTableElement>` |  | Ref to the `<table>` element. DataTable is generic, so it takes `ref` as a plain prop (React 19) instead of going through `forwardRef`, which would erase the row type. |
| `selectable` | `boolean` |  | Adds a leading checkbox column (with select-all in the header) for row selection. |
| `selectedRowIds` | `string[]` |  | Controlled selected row ids (see `getRowId`). Use with `onSelectionChange`. |
| `sort` | `DataTableSort \| null` |  | Controlled sort (`{ key, direction }`), or `null` for unsorted. Use with `onSortChange`. |
| `stickyHeader` | `boolean` |  | Keeps the header visible while the table scrolls. Pair with `maxHeight`. |
| `striped` | `boolean` |  | Zebra-stripe the body rows. |
| `tableClassName` | `string` |  | Classes for the `<table>` element. |

## Notes

**When to use:** A table built from `columns` and `data`, with click-to-sort headers, optional row selection with select-all, skeleton loading rows and an empty state. A generic component: it is typed by your row type.

**Use instead when:**
- `Table`: compose the markup yourself or when the layout is custom
- `ItemGroup`: a list of rows with media and actions
- `KeyValue`: two-column facts about one thing

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves through the sort buttons, the checkboxes and controls inside cells |
| Enter, Space | On a sortable header, cycles that column: ascending, descending, unsorted |
| Space | On a checkbox, selects or clears the row (or all rows, in the header) |

Rows are not focusable and have no key handler: `onRowClick` works with a mouse or touch only, so give keyboard users a real link or button in a cell. There is no arrow-key movement. `align` is logical (`left` is the start side), so columns flip in RTL.

### Screen readers

- A native `table`; headers are `th scope="col"`. A sortable column (`sortable: true`) holds a button and carries `aria-sort` (`ascending`, `descending`, `none`); a column that is not sortable has neither.
- With `selectable`, the header checkbox is labelled "Select all rows" and every row checkbox is labelled just "Select row", so rows are not told apart by name. When that matters, compose the table with `Table` and a `TableCheckbox` with its own `aria-label`. The select-all box shows the mixed state when some rows are selected.
- `loading` puts `aria-busy="true"` on the table and fills the body with `aria-hidden` skeleton rows. No "Loading" text is announced, so add your own status message.
- Empty `data` shows one full-width cell with "No results", or your `emptyState`. `caption` renders a `<caption>` under the table.

### Reduced motion

Row hover and checkbox ticks are transitions that the reduced-motion net ends within 1 ms. The loading skeletons use a shimmer with `motion-reduce:animate-none`.

### Server rendering

Server render: part of it fills in after mount. The table renders fully on the server, including sorted and selected rows from `defaultSort` and `defaultSelectedRowIds`. Two small things settle after mount: the mixed (indeterminate) state of the select-all box is a DOM property set in an effect, and string sorting uses the runtime's default locale, so a server and a browser with different locales can order special characters differently.

### Gotchas

- Sorting happens in the browser and cycles asc, desc, then none (`onSortChange(null)`). Set `manualSorting` when the server sorts: the data order stays yours and the headers still report the sort. Empty values sort last ascending but first descending, text compares case-insensitively with numeric order ("item2" before "item10"), and ties keep the original order. `sortValue` gives a column its own sort key.
- Selection is stored by row id: `getRowId` defaults to `row.id` (string or number), else the row's index in `data`, so supply `getRowId` when data is filtered or reordered. Select-all picks every row in `data`, not only the visible page; from a partial selection it clears the rows instead.
- `onRowClick` is on the `<tr>`: clicks from buttons or links you put in a cell bubble to it unless you `stopPropagation` (the selection checkboxes already do).
- `columns[].key` must be unique and reads `row[key]` unless `cell` is given. The `ref` is a plain prop (React 19) that reaches the `<table>`; `className` styles the outer box and `tableClassName` the table.

## Example

```tsx
import { Badge, DataTable } from "@sutra/ui";

const invoices = [
  { id: "INV-1042", customer: "Acme Corp", paid: true, amount: 1280 },
  { id: "INV-1043", customer: "Globex", paid: false, amount: 640 },
  { id: "INV-1044", customer: "Initech", paid: true, amount: 2150 },
];

export function Example() {
  return (
    <DataTable
      caption="Recent invoices"
      data={invoices}
      defaultSort={{ key: "amount", direction: "desc" }}
      columns={[
        { key: "id", header: "Invoice" },
        { key: "customer", header: "Customer", sortable: true },
        {
          key: "paid",
          header: "Status",
          cell: (row) => <Badge tone={row.paid ? "success" : "warning"}>{row.paid ? "Paid" : "Due"}</Badge>,
        },
        { key: "amount", header: "Amount", align: "right", sortable: true, cell: (row) => `$${row.amount}` },
      ]}
    />
  );
}
```
