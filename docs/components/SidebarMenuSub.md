# SidebarMenuSub

> Collapsible nested menu under a menu item. Hidden in icon mode.

- Import: `import { SidebarMenuSub } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- `data-slot`: `sidebar-menu-sub`
- Part of [`SidebarMenu`](SidebarMenu.md)
- Parts: [`SidebarMenuSubButton`](SidebarMenuSubButton.md)
- Also accepts the props of HTMLAttributes, CollapsibleProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (sets `aria-current="page"`). |
| `badge` | `React.ReactNode` |  | Badge or count at the end of the row. |
| `children` | `React.ReactNode` |  | Sub-menu items, shown when the row is expanded. |
| `icon` | `React.ReactNode` |  | Icon at the start of the row; it stays visible in the icon rail. |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `label` | `React.ReactNode` |  | Or let the sub menu render its own trigger button. |
| `trigger` | `React.ReactElement` |  | Custom trigger element (wrapped with Collapsible.Trigger asChild). |

## Part props

### SidebarMenuSubButton

Nested link row inside `SidebarMenuSub`. Wrapped in its own list item.

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (sets `aria-current="page"`). |
| `asChild` | `boolean` |  | Render as the child element (e.g. a router `Link`) while keeping the link styles. |
| `icon` | `React.ReactNode` |  | Icon at the start of the sub item. |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `size` | `"sm" \| "md"` | `"md"` | Sub item height and text size. |
