# SortFilterMenu

> View options menu with sort radio items, direction and checkbox filters.

- Import: `import { SortFilterMenu } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/dropdown-menu-blocks` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `Align` | `"end"` | Alignment of the menu against the trigger. |
| `className` | `string` |  | Classes for the trigger. |
| `defaultDirection` | `"asc" \| "desc"` | `"asc"` | Initial sort direction when uncontrolled. |
| `defaultFilters` | `string[]` | `["subtasks", "assigned"]` | Initially active filter values when uncontrolled. |
| `defaultSort` | `string` |  | Initial sort value when uncontrolled. |
| `direction` | `"asc" \| "desc"` |  | Controlled sort direction. Use with `onDirectionChange`. |
| `filterOptions` | `SortFilterOption[]` | `defaultFilterOptions` | Filter choices (checkable); each has a `value` and a `label`. |
| `filters` | `string[]` |  | Controlled list of active filter values. Use with `onFiltersChange`. |
| `label` | `React.ReactNode` | `"View"` | Text of the trigger button. |
| `onDirectionChange` | `(value: "asc" \| "desc") => void` |  | Called with the direction the user picked. |
| `onFiltersChange` | `(value: string[]) => void` |  | Called with the full list of active filter values after a change. |
| `onSortChange` | `(value: string) => void` |  | Called with the sort value the user picked. |
| `sort` | `string` |  | Controlled sort value. Use with `onSortChange`. |
| `sortOptions` | `SortFilterOption[]` | `defaultSortOptions` | Sort choices; each has a `value` and a `label`. |
