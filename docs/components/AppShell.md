# AppShell

> Complete app layout: SidebarProvider + AppSidebar + SidebarInset with AppHeader and content.

- Import: `import { AppShell } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/sidebar-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | Page content. Defaults to a demo dashboard header. |
| `collapsed` | `boolean` |  | Controlled collapsed state of the sidebar (icon rail or hidden, per `collapsible`). Use with `onCollapsedChange`. |
| `contained` | `boolean` |  | Fill the parent element instead of the viewport (for previews, panels and nested layouts). The parent needs a definite height. |
| `contentClassName` | `string` |  | Classes for the scrolling content area. |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state when uncontrolled. |
| `headerProps` | `AppHeaderProps` |  | Props passed to the inner `AppHeader`. |
| `iconWidth` | `string` |  | CSS width in icon mode. Default "3rem". |
| `insetAs` | `React.ElementType` |  | Element for the content area. Default `"main"`; use `"div"` when nested inside another `<main>`. |
| `onCollapsedChange` | `(collapsed: boolean) => void` |  | Called when the sidebar collapses or expands (trigger button or keyboard shortcut). |
| `shortcut` | `string \| null` |  | Key used with ⌘/Ctrl to toggle. Default "b". Pass `null` to disable. |
| `sidebarProps` | `AppSidebarProps` |  | Props passed to the inner `AppSidebar`. |
| `width` | `string` |  | CSS width of the expanded sidebar. Default "16rem". |
