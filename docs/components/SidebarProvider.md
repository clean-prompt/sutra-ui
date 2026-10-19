# SidebarProvider

> Holds collapsed / mobile state, registers ⌘B, and lays out sidebar + inset.

- Import: `import { SidebarProvider } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- Part of [`Sidebar`](Sidebar.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `collapsed` | `boolean` |  | Controlled collapsed state of the sidebar (icon rail or hidden, per `collapsible`). Use with `onCollapsedChange`. |
| `contained` | `boolean` | `false` | Fill the parent element instead of the viewport (for previews, panels and nested layouts). The parent needs a definite height. |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state when uncontrolled. |
| `iconWidth` | `string` | `"3rem"` | CSS width in icon mode. Default "3rem". |
| `onCollapsedChange` | `(collapsed: boolean) => void` |  | Called when the sidebar collapses or expands (trigger button or keyboard shortcut). |
| `shortcut` | `string \| null` | `"b"` | Key used with ⌘/Ctrl to toggle. Default "b". Pass `null` to disable. |
| `width` | `string` | `"16rem"` | CSS width of the expanded sidebar. Default "16rem". |
