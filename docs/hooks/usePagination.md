# usePagination

> Memoized pagination range helper.

- Import: `import { usePagination } from "@cleanprompt/sutra-ui/navigation"`
- Source: `packages/ui/src/hooks/use-pagination`

## Signature

```ts
usePagination(options: PaginationOptions): PaginationRangeItem[]
```

## Options and result

| Prop | Type | Default | Description |
|---|---|---|---|
| `page` (required) | `number` |  | Current page (1-based). |
| `totalPages` (required) | `number` |  | Total number of pages. |
| `boundaryCount` | `number` |  | Pages always shown at the start and end. Default 1. |
| `siblingCount` | `number` |  | Pages shown on each side of the current page. Default 1. |
