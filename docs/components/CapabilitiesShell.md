# CapabilitiesShell

> Tabbed Skills / Toolsets / Connectors / Plugins hub with counts, search + sort and a responsive detail pane.

- Import: `import { CapabilitiesShell } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/capabilities` (kit `agent-admin`)
- `data-slot`: `capabilities-shell`, `capabilities-detail`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` (required) | `CapabilitiesShellTab[]` |  | Tabs (skills, tools, plugins and so on), each with an id, label and content. |
| `actions` | `React.ReactNode` |  | Header actions (e.g. "Add"). |
| `defaultSearch` | `string` | `""` | Initial search text when `search` is not controlled. |
| `defaultValue` | `string` |  | Initially active tab id when `value` is not controlled; defaults to the first tab. |
| `description` | `React.ReactNode` |  | Helper text under the heading. |
| `detail` | `React.ReactNode` |  | Detail pane content. When set, the shell becomes master/detail. |
| `hideToolbar` | `boolean` |  | Hide the search toolbar. |
| `onDetailClose` | `() => void` |  | Called by the mobile back button. |
| `onSearchChange` | `(q: string) => void` |  | Called with the search text on every change. |
| `onValueChange` | `(value: string) => void` |  | Called with the tab id when the user switches tabs. |
| `scope` | `React.ReactNode` |  | Scope selector slot in the header. |
| `search` | `string` |  | Controlled search text. |
| `searchPlaceholder` | `string` |  | Placeholder of the search field. |
| `sortSlot` | `React.ReactNode` |  | Sort control (e.g. a select) next to the search. |
| `title` | `React.ReactNode` | `"Capabilities"` | Page heading of the shell. |
| `value` | `string` |  | Controlled id of the active tab. |
