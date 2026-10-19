---
component: Pagination
module: primitives/pagination
covers: PaginationItem, PaginationPrev, PaginationNext, PaginationEllipsis, PaginationStatus
use: Page navigation for a list or table. Four layouts (`numbered`, `simple`, `dots`, `load-more`), an optional rows-per-page select, an opt-in `pageJump` field in the ellipsis and `PaginationStatus` for the "1–10 of 245" line.
instead: Steps = a fixed sequence of steps with progress; Carousel = paging through slides; Breadcrumbs = showing where the user is in a hierarchy
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves through previous, the page buttons, next and the rows-per-page select; disabled buttons are skipped |
| Enter, Space | Activate the focused button: go to that page, or previous or next |
| Enter | In the jump field (`pageJump`): go to the typed page |
| Escape | In the jump field: cancel and return focus to the ellipsis; leaving the field cancels too |

There are no arrow-key shortcuts, so keys do not swap in RTL; the row flows in reading order and the previous and next arrows are mirrored. After a jump, focus moves to the button of the page it landed on. A disabled previous or next button is a real `disabled` button, so it leaves the tab order.

## Screen readers
The root is a `<nav>` labelled "Pagination" (override with `aria-label`). Page buttons are named "Page 3" and the current one has `aria-current="page"`; previous and next are named "Previous page" and "Next page" whatever their visible text (pass your own `aria-label` if you change `children`). A plain ellipsis is `aria-hidden`; with `onJump` it is a button named "Jump to a page" (`jumpLabel`), and the field it opens is named "Go to page, 1 to N". In narrow containers the page list is replaced by "Page x of y" in an `aria-live="polite"` region. `PaginationStatus` is a polite live region too (`aria-busy` while `loading`, with an sr-only "Loading…" placeholder), so it announces the new row window after a page change.

## Reduced motion
Mostly static. The `dots` indicator grows with a width transition and the button states fade; both end in 1 ms under reduced motion. The `loading` spinner on the load-more button keeps turning.

## Server rendering
The pager renders plain markup on the server. Whether the page list or the "Page x of y" label shows depends on a container query (`@lg`) in CSS, not on JavaScript. `PaginationStatus` formats numbers with `Intl.NumberFormat`: without `locale` the server and the browser may use different default locales and print "1,245" and "1.245", so pass `locale` when rendering on a server.

## Slots
- `pagination-ellipsis`: the span wrapping a clickable ellipsis (only with `onJump` or `pageJump`)
- `pagination-jump`: the page field that replaces the ellipsis
- `pagination-status`: the row window line of `PaginationStatus`

## Gotchas
- `totalPages` is a page count, not a row count; `page` is 1-based and is clamped to `1..totalPages`, and `onPageChange` is not called for the current page. Controlled use needs `page` and `onPageChange` together; otherwise it starts at `defaultPage`.
- The page list is hidden below the `@lg` container width (32rem) and replaced by the "Page x of y" label, so narrow cards do not show page buttons. The `simple` variant always shows the label.
- The rows-per-page select appears only with `pageSize` and a non-empty `pageSizeOptions`; `onPageSizeChange` just reports the choice, so update `pageSize` and usually reset `page` yourself.
- `PaginationItem isActive` is a deprecated alias of `active`. In `load-more`, `page` is the number of pages loaded: the button advances `page` by one and is disabled on the last page.

## Example
```tsx
import * as React from "react";
import { Pagination, PaginationStatus } from "@sutra/ui";

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
