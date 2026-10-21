# PaginationStatus

> "1–10 of 245": which rows the current page shows. Announced politely when the page changes.

- Import: `import { PaginationStatus } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/pagination` (primitives)
- `data-slot`: `pagination-status`
- Part of [`Pagination`](Pagination.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `page` (required) | `number` |  | Current page (1-based). |
| `pageSize` (required) | `number` |  | Rows per page; with `page` and `total` it gives the "1–10 of 245" window. |
| `total` (required) | `number` |  | Total number of rows. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no rows. Default "No results". |
| `format` | `(window: PageWindow) => React.ReactNode` |  | Custom text from the row window, e.g. `({ from, to, total }) => \`Rows ${from} to ${to} of ${total}\``. |
| `loading` | `boolean` | `false` | Rows are being fetched: a placeholder while the total is 0, otherwise the numbers stay and the line is marked busy. |
| `locale` | `string \| string[]` |  | Locale for the numbers. |

## Notes

See the notes in [`Pagination`](Pagination.md#notes).

## Example

```tsx
import * as React from "react";
import { Pagination, PaginationStatus } from "@cleanprompt/sutra-ui";

const total = 245;

export function Example() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  return (
    <div className="flex flex-col gap-3">
      <PaginationStatus page={page} pageSize={pageSize} total={total} locale="en-US" />
      <Pagination
        page={page}
        onPageChange={setPage}
        totalPages={Math.ceil(total / pageSize)}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
```
