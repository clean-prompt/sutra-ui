# PaginationItem

> A single page number button.

- Import: `import { PaginationItem } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/pagination` (primitives)
- Part of [`Pagination`](Pagination.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (`aria-current="page"`). |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `page` | `number` |  | Page number this item represents and selects when clicked (1-based). |
| `size` | `Size` | `"md"` | Item height and text size; match the other pagination controls. |

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
