# SidebarMenuButton

> Menu row: icon, label, badge; shows a tooltip when the sidebar is collapsed to icons.

- Import: `import { SidebarMenuButton } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- `data-slot`: `sidebar-menu-badge`, `sidebar-menu-button`
- Part of [`SidebarMenu`](SidebarMenu.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` |  | Marks the current page (sets `aria-current="page"`). |
| `asChild` | `boolean` |  | Render as the child element (e.g. a router `Link`) while keeping the button styles. |
| `badge` | `React.ReactNode` |  | Count or status shown on the right; hidden in icon mode. |
| `icon` | `React.ReactNode` |  | Icon at the start of the row; it stays visible in the icon rail. |
| `isActive` | `boolean` |  | **Deprecated.** Use `active`. Legacy name of `active`. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Row height: `sm`, `md` or `lg` (taller, for a two-line row). |
| `tooltip` | `React.ReactNode` |  | Tooltip in icon mode. Defaults to `children` when it is a string. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
