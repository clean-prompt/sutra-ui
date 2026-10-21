# RequestLogTable

> Filterable, paginated request log with rows that expand into a RequestInspector.

- Import: `import { RequestLogTable } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/kits/ops/request-inspector` (kit `ops`)
- `data-slot`: `request-log-table`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `records` (required) | `RequestLogRecord[]` |  | Request log records, one row each, newest first. |
| `defaultFilters` | `Partial<RequestLogFilters>` |  | Initial filters when `filters` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Shown when no record matches the filters. |
| `expandedId` | `string \| null` |  | Controlled expanded record id. |
| `filters` | `RequestLogFilters` |  | Controlled filters (status, model, time range, search). |
| `locale` | `string` |  | BCP 47 locale used to format numbers and times. |
| `onExpandedChange` | `(id: string \| null) => void` |  | Called with the record id (or `null`) when the user expands or collapses a row. |
| `onFiltersChange` | `(filters: RequestLogFilters) => void` |  | Called with the filters when the user changes any of them. |
| `pageSize` | `number` | `20` | Rows per page. Default 20. |
| `showIdentity` | `boolean` | `true` | Shows the Identity (user or key) column. Default true. |
| `toolbar` | `React.ReactNode` |  | Extra toolbar content (refresh button, date picker…). |

## Example (live: `#/components/monitoring/request-log-table` in the playground)

```tsx
import { RequestLogTable } from "@sutra/ui/ops";

<RequestLogTable records={fakeRecords} pageSize={10} className="w-full" />
```

Playground helpers in this snippet (not part of the library): fakeRecords.
