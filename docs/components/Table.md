# Table

> Data table inside a bordered, scrollable box. The box takes focus while it overflows (so the arrow keys scroll it) and becomes a named `region` when the table has an `aria-label` or `aria-labelledby`.

- Import: `import { Table } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/table` (primitives)
- Parts: [`TableBody`](TableBody.md), [`TableCaption`](TableCaption.md), [`TableCell`](TableCell.md), [`TableCheckbox`](TableCheckbox.md), [`TableFooter`](TableFooter.md), [`TableHead`](TableHead.md), [`TableHeader`](TableHeader.md), [`TableRow`](TableRow.md)
- Also accepts the props of HTMLAttributes, TableHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `bare` | `boolean` |  | Remove the bordered box around the table. |
| `containerClassName` | `string` |  | Classes for the scroll container that wraps the `<table>` (`className` styles the table itself). |
| `density` | `TableDensity` |  | Row density. Default `normal`; `"comfortable"` is accepted as a legacy alias of `relaxed`. |
| `maxHeight` | `number \| string` |  | Maximum height of the scroll container (px number or CSS length); the body scrolls past it. Pair with `stickyHeader`. |
| `stickyHeader` | `boolean` | `false` | Keeps the header visible while the container scrolls. Pair with `maxHeight`. |
| `striped` | `boolean` | `false` | Zebra-stripe the body rows. |

## Part props

### TableCell

Body cell.

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `TableAlign` | `"left"` | Horizontal alignment of the cell text; match the column's header. |

### TableCheckbox

Row-selection checkbox sized for table cells (controlled or uncontrolled, with an indeterminate state).

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` |  | Controlled checked state. |
| `defaultChecked` | `boolean` | `false` | Initial checked state when uncontrolled. |
| `indeterminate` | `boolean` |  | Shows the mixed state (some rows selected); takes precedence over `checked` visually. |
| `onCheckedChange` | `(checked: boolean) => void` |  | Called with the new checked state when the user toggles the box. |

### TableHead

Header cell, optionally sortable.

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `TableAlign` | `"left"` | Horizontal alignment of the header cell text. |
| `onSort` | `() => void` |  | Called when the sort button is clicked; setting it (or `sortDirection`) makes the header sortable. |
| `sortDirection` | `TableSortDirection` |  | Current sort of this column. `false` = sortable but unsorted. |

## Notes

**When to use:** A native HTML table in a bordered, scrollable box with density, striping and a sticky header, for composing tables by hand. `TableHead` can be a sort button, `TableCheckbox` a selection box.

**Use instead when:**
- `DataTable`: columns and rows from data, with sorting, selection, loading and empty states built in
- `ItemGroup`: a list of rows with media and actions
- `KeyValue`: two-column facts
- `Card`: free-form content

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to sort buttons in headers, checkboxes and any control in a cell |
| Enter, Space | On a sortable header, calls its `onSort` (native `<button>`) |
| Space | On a `TableCheckbox`, toggles it (native checkbox) |

There is no arrow-key navigation between cells and rows are not focusable; this is a plain table (only the scroll box around it takes focus, and only while the table is wider or taller than it). No key depends on direction, but `align` is logical: `left` and `right` mean start and end, so they flip in RTL.

### Screen readers

- Real `table`, `thead`, `tbody`, `tfoot`, `tr`, `th` and `td` elements, so row and column navigation comes from the browser. `TableHead` sets `scope="col"` unless you pass another `scope`. `TableCaption` is a real `<caption>` that names the table, even though it is drawn under it.
- A header is sortable when it has `onSort` or `sortDirection`: it then holds a button named by the header text, and `aria-sort` is `ascending`, `descending` or `none` (`sortDirection={false}`). Without either it has no `aria-sort`. The arrow icon is `aria-hidden`.
- `TableCheckbox` is a native checkbox with the `checkbox` role and no label of its own: pass `aria-label` ("Select row Ada"). `indeterminate` sets the DOM mixed state.
- The scroll container around the table has `tabIndex="0"` and a focus ring while the content overflows it (measured after mount and on resize; not on the server), so a keyboard user can scroll it; a table that fits adds no tab stop. It becomes a `role="region"` named like the table when the `Table` has an `aria-label` or `aria-labelledby`; otherwise it has no role. `DataTable` takes the same two props.

### Reduced motion

Row hover, the sort button and the checkbox tick are transitions, which the reduced-motion net in `sutra.css` ends within 1 ms.

### Server rendering

Server render: same markup as the client. Plain table markup with no browser API, so server and client output match. The `indeterminate` state of a `TableCheckbox` is a DOM property set after mount.

### Gotchas

- `TableHead` is stateless about sorting: you pass `sortDirection` and flip it in `onSort`. For a sort that manages itself, use `DataTable`.
- `className` styles the `<table>`; `containerClassName` styles the scroll box around it, and `bare` removes that box's border and shadow. `stickyHeader` needs a height limit (`maxHeight`) to have anything to stick against.
- `density` is `compact`, `normal` or `relaxed` (`comfortable` is a legacy alias of `relaxed`). A row shows as selected with `data-state="selected"`.
- `TableCheckbox` stops click propagation, so it does not trigger a click handler on its row, and `checked` and `defaultChecked` follow the controlled and uncontrolled rules (`onCheckedChange` receives a boolean).

## Example

```tsx
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@sutra/ui";

const invoices = [
  { id: "INV-1042", customer: "Acme Corp", amount: "$1,280.00" },
  { id: "INV-1043", customer: "Globex", amount: "$640.00" },
];

export function Example() {
  return (
    <Table>
      <TableCaption>Recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead align="right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell>{inv.id}</TableCell>
            <TableCell>{inv.customer}</TableCell>
            <TableCell align="right">{inv.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```
