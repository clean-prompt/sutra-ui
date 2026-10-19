# DocsSidebar

> Documentation navigation with filterable collapsible sections (or a TreeView).

- Import: `import { DocsSidebar } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/sidebar-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `string` |  | **Deprecated.** Use `value`. Legacy name of `value`. |
| `defaultActive` | `string` |  | **Deprecated.** Use `defaultValue`. Legacy name of `defaultValue`. |
| `defaultValue` | `string` |  | Initially active link id when uncontrolled. Default "installation". |
| `mode` | `"sections" \| "tree"` | `"sections"` | `sections`: collapsible groups of links. `tree`: a keyboard-navigable TreeView. |
| `onNavigate` | `(id: string) => void` |  | **Deprecated.** Use `onValueChange`. Legacy name of `onValueChange`. |
| `onValueChange` | `(id: string) => void` |  | Called with the id of the link the user navigates to. |
| `searchable` | `boolean` | `true` | Show a filter field at the top. |
| `sections` | `DocsNavSection[]` | `defaultDocsSections` | Documentation sections; each has an `id`, a `label` and `links`. |
| `value` | `string` |  | Currently active link id. |
