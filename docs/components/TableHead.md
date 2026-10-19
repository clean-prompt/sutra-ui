# TableHead

> Header cell, optionally sortable.

- Import: `import { TableHead } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/table` (primitives)
- Part of [`Table`](Table.md)
- Parts: [`TableHeader`](TableHeader.md)
- Also accepts the props of HTMLAttributes, ThHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `TableAlign` | `"left"` | Horizontal alignment of the header cell text. |
| `onSort` | `() => void` |  | Called when the sort button is clicked; setting it (or `sortDirection`) makes the header sortable. |
| `sortDirection` | `TableSortDirection` |  | Current sort of this column. `false` = sortable but unsorted. |

## Notes

See the notes in [`Table`](Table.md#notes).

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
