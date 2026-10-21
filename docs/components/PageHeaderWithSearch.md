# PageHeaderWithSearch

> Index page header: title with count, search field, filter selects and a list/grid toggle.

- Import: `import { PageHeaderWithSearch } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/section-header-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `count` | `number` | `248` | Item count shown as a badge next to the title. |
| `defaultView` | `"list" \| "grid"` | `"list"` | Initial view when uncontrolled. |
| `description` | `React.ReactNode` |  | Supporting text under the title. |
| `filters` | `PageHeaderFilter[]` | `defaultFilters` | Filter selects next to the search; each has an `id`, a `label` and `options`. |
| `onFilterChange` | `(id: string, value: string) => void` |  | Called with the filter id and the chosen value when a filter changes. |
| `onSearchChange` | `(value: string) => void` |  | Called with the search text as it changes. |
| `onViewChange` | `(view: "list" \| "grid") => void` |  | Called with the view the user picked; setting it shows the toggle. |
| `primaryAction` | `HeaderAction \| null` | `{ label: "New task", icon: <RiAddLine aria-hidden /> }` | Main action button (`label`, optional `icon`, and `onClick` or `href`); `null` hides it. |
| `search` | `string` |  | Controlled search text. Use with `onSearchChange`. |
| `searchPlaceholder` | `string` | `"Search tasks…"` | Placeholder of the search field. |
| `title` | `React.ReactNode` | `"All tasks"` | Page title; the default is sample text, so always set it. |
| `view` | `"list" \| "grid"` |  | Controlled list or grid view of the view toggle. Use with `onViewChange`. |
