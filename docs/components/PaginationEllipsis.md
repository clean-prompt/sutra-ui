# PaginationEllipsis

> Gap marker between page ranges. With `onJump` it is a button that offers a jump to a page; without it, a decorative marker.

- Import: `import { PaginationEllipsis } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/primitives/pagination` (primitives)
- `data-slot`: `pagination-ellipsis`
- Part of [`Pagination`](Pagination.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `direction` | `"start" \| "end"` | `"end"` | Which gap this marks (before or after the current range); handed to `onJump`. Default `"end"`. |
| `jumpLabel` | `string` | `"Jump to a page"` | Accessible name of the jump button. Default "Jump to a page". |
| `onJump` | `(direction: "start" \| "end") => void` |  | Makes the ellipsis a button that reports the gap it marks, so the app can offer a way to jump to a page (see `Pagination pageJump`). |
| `size` | `Size` | `"md"` | Size of the ellipsis, matching the neighbouring items. |

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
