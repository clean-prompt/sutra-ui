# SidebarMenuSubButton

> Nested link row inside `SidebarMenuSub`. Wrapped in its own list item.

- Import: `import { SidebarMenuSubButton } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- `data-slot`: `sidebar-menu-sub-button`
- Part of [`SidebarMenuSub`](SidebarMenuSub.md)
- Also accepts the props of HTMLAttributes, AnchorHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (sets `aria-current="page"`). |
| `asChild` | `boolean` |  | Render as the child element (e.g. a router `Link`) while keeping the link styles. |
| `icon` | `React.ReactNode` |  | Icon at the start of the sub item. |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `size` | `"sm" \| "md"` | `"md"` | Sub item height and text size. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
