# SidebarMenu

> List of menu items.

- Import: `import { SidebarMenu } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- `data-slot`: `sidebar-menu`
- Part of [`Sidebar`](Sidebar.md)
- Parts: [`SidebarMenuButton`](SidebarMenuButton.md), [`SidebarMenuItem`](SidebarMenuItem.md), [`SidebarMenuSub`](SidebarMenuSub.md), [`SidebarMenuSubButton`](SidebarMenuSubButton.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Part props

### SidebarMenuButton

Menu row: icon, label, badge; shows a tooltip when the sidebar is collapsed to icons.

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (sets `aria-current="page"`). |
| `asChild` | `boolean` |  | Render as the child element (e.g. a router `Link`) while keeping the button styles. |
| `badge` | `React.ReactNode` |  | Count or status shown on the right; hidden in icon mode. |
| `icon` | `React.ReactNode` |  | Icon at the start of the row; it stays visible in the icon rail. |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Row height: `sm`, `md` or `lg` (taller, for a two-line row). |
| `tooltip` | `React.ReactNode` |  | Tooltip in icon mode. Defaults to `children` when it is a string. |

### SidebarMenuSub

Collapsible nested menu under a menu item. Hidden in icon mode.

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (sets `aria-current="page"`). |
| `badge` | `React.ReactNode` |  | Badge or count at the end of the row. |
| `children` | `React.ReactNode` |  | Sub-menu items, shown when the row is expanded. |
| `icon` | `React.ReactNode` |  | Icon at the start of the row; it stays visible in the icon rail. |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `label` | `React.ReactNode` |  | Or let the sub menu render its own trigger button. |
| `trigger` | `React.ReactElement` |  | Custom trigger element (wrapped with Collapsible.Trigger asChild). |

### SidebarMenuSubButton

Nested link row inside `SidebarMenuSub`. Wrapped in its own list item.

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (sets `aria-current="page"`). |
| `asChild` | `boolean` |  | Render as the child element (e.g. a router `Link`) while keeping the link styles. |
| `icon` | `React.ReactNode` |  | Icon at the start of the sub item. |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `size` | `"sm" \| "md"` | `"md"` | Sub item height and text size. |
