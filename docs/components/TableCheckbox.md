# TableCheckbox

> Row-selection checkbox sized for table cells (controlled or uncontrolled, with an indeterminate state).

- Import: `import { TableCheckbox } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/table` (primitives)
- Part of [`Table`](Table.md)
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` |  | Controlled checked state. |
| `defaultChecked` | `boolean` | `false` | Initial checked state when uncontrolled. |
| `indeterminate` | `boolean` |  | Shows the mixed state (some rows selected); takes precedence over `checked` visually. |
| `onCheckedChange` | `(checked: boolean) => void` |  | Called with the new checked state when the user toggles the box. |

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
