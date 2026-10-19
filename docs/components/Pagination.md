# Pagination

> Page navigation: numbered, simple, dots or load-more, with an optional page-size selector.

- Import: `import { Pagination } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/primitives/pagination` (primitives)
- Parts: [`PaginationEllipsis`](PaginationEllipsis.md), [`PaginationItem`](PaginationItem.md), [`PaginationNext`](PaginationNext.md), [`PaginationPrev`](PaginationPrev.md), [`PaginationStatus`](PaginationStatus.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `totalPages` (required) | `number` |  | Total number of pages (not rows); drives which page buttons are shown. |
| `boundaryCount` | `number` | `1` | Pages always shown at the start and end of the range. |
| `defaultPage` | `number` | `1` | Initial page (1-based) when uncontrolled. |
| `disabled` | `boolean` |  | Disables every control. |
| `loading` | `boolean` |  | load-more: spinner on the button. |
| `loadMoreLabel` | `React.ReactNode` | `"Load more"` | Text of the load-more button. |
| `onPageChange` | `(page: number) => void` |  | Called with the new 1-based page when the user changes page. |
| `onPageSizeChange` | `(pageSize: number) => void` |  | Called with the chosen rows-per-page count; update `pageSize` and usually reset the page. |
| `page` | `number` |  | Current page (1-based). |
| `pageJump` | `boolean` | `false` | numbered: activating an ellipsis turns it into a page field (Enter jumps to that page, Escape cancels), so a long range can be crossed in one step. Opt-in; the page list is shown from the `@lg` container width up. |
| `pageSize` | `number` |  | Rows per page; enables the page size selector together with `pageSizeOptions`. |
| `pageSizeLabel` | `React.ReactNode` | `"Rows per page"` | Label of the page size selector. |
| `pageSizeOptions` | `number[]` |  | Choices for the page size selector (needs `pageSize`); each is a rows-per-page count. |
| `siblingCount` | `number` | `1` | Pages shown on each side of the current page before collapsing into an ellipsis. |
| `size` | `Size` | `"md"` | Control height and text size. |
| `variant` | `"numbered" \| "simple" \| "dots" \| "load-more"` | `"numbered"` | Layout: numbered page buttons, prev/next only, a dot indicator, or a "load more" button. |

## Part props

### PaginationEllipsis

Gap marker between page ranges. With `onJump` it is a button that offers a jump to a page; without it, a decorative marker.

| Prop | Type | Default | Description |
|---|---|---|---|
| `direction` | `"start" \| "end"` | `"end"` | Which gap this marks (before or after the current range); handed to `onJump`. Default `"end"`. |
| `jumpLabel` | `string` | `"Jump to a page"` | Accessible name of the jump button. Default "Jump to a page". |
| `onJump` | `(direction: "start" \| "end") => void` |  | Makes the ellipsis a button that reports the gap it marks, so the app can offer a way to jump to a page (see `Pagination pageJump`). |
| `size` | `Size` | `"md"` | Size of the ellipsis, matching the neighbouring items. |

### PaginationItem

A single page number button.

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (`aria-current="page"`). |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `page` | `number` |  | Page number this item represents and selects when clicked (1-based). |
| `size` | `Size` | `"md"` | Item height and text size; match the other pagination controls. |

### PaginationNext

Next page button.

| Prop | Type | Default | Description |
|---|---|---|---|
| `iconOnly` | `boolean` |  | Hide the text label and render only the arrow. |
| `size` | `Size` | `"md"` | Button height and text size; match the other pagination controls. |

### PaginationPrev

Previous page button.

| Prop | Type | Default | Description |
|---|---|---|---|
| `iconOnly` | `boolean` |  | Hide the text label and render only the arrow. |
| `size` | `Size` | `"md"` | Button height and text size; match the other pagination controls. |

### PaginationStatus

"1–10 of 245": which rows the current page shows. Announced politely when the page changes.

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

**When to use:** Page navigation for a list or table. Four layouts (`numbered`, `simple`, `dots`, `load-more`), an optional rows-per-page select, an opt-in `pageJump` field in the ellipsis and `PaginationStatus` for the "1–10 of 245" line.

**Use instead when:**
- `Steps`: a fixed sequence of steps with progress
- `Carousel`: paging through slides
- `Breadcrumbs`: showing where the user is in a hierarchy

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves through previous, the page buttons, next and the rows-per-page select; disabled buttons are skipped |
| Enter, Space | Activate the focused button: go to that page, or previous or next |
| Enter | In the jump field (`pageJump`): go to the typed page |
| Escape | In the jump field: cancel and return focus to the ellipsis; leaving the field cancels too |

There are no arrow-key shortcuts, so keys do not swap in RTL; the row flows in reading order and the previous and next arrows are mirrored. After a jump, focus moves to the button of the page it landed on. A disabled previous or next button is a real `disabled` button, so it leaves the tab order.

### Screen readers

The root is a `<nav>` labelled "Pagination" (override with `aria-label`). Page buttons are named "Page 3" and the current one has `aria-current="page"`; previous and next are named "Previous page" and "Next page" whatever their visible text (pass your own `aria-label` if you change `children`). A plain ellipsis is `aria-hidden`; with `onJump` it is a button named "Jump to a page" (`jumpLabel`), and the field it opens is named "Go to page, 1 to N". In narrow containers the page list is replaced by "Page x of y" in an `aria-live="polite"` region. `PaginationStatus` is a polite live region too (`aria-busy` while `loading`, with an sr-only "Loading…" placeholder), so it announces the new row window after a page change.

### Reduced motion

Mostly static. The `dots` indicator grows with a width transition and the button states fade; both end in 1 ms under reduced motion. The `loading` spinner on the load-more button keeps turning.

### Server rendering

Server render: part of it fills in after mount. The pager renders plain markup on the server. Whether the page list or the "Page x of y" label shows depends on a container query (`@lg`) in CSS, not on JavaScript. `PaginationStatus` formats numbers with `Intl.NumberFormat`: without `locale` the server and the browser may use different default locales and print "1,245" and "1.245", so pass `locale` when rendering on a server.

### Slots

- `pagination-ellipsis`: the span wrapping a clickable ellipsis (only with `onJump` or `pageJump`)
- `pagination-jump`: the page field that replaces the ellipsis
- `pagination-status`: the row window line of `PaginationStatus`

### Gotchas

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
