# Sidebar

> App sidebar. Collapses to icons on desktop and becomes a sheet on mobile.

- Import: `import { Sidebar } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/sidebar-navigation` (patterns)
- Parts: [`SidebarContent`](SidebarContent.md), [`SidebarFooter`](SidebarFooter.md), [`SidebarGroup`](SidebarGroup.md), [`SidebarGroupLabel`](SidebarGroupLabel.md), [`SidebarHeader`](SidebarHeader.md), [`SidebarInset`](SidebarInset.md), [`SidebarMenu`](SidebarMenu.md), [`SidebarMenuButton`](SidebarMenuButton.md), [`SidebarMenuItem`](SidebarMenuItem.md), [`SidebarMenuSub`](SidebarMenuSub.md), [`SidebarMenuSubButton`](SidebarMenuSubButton.md), [`SidebarProvider`](SidebarProvider.md), [`SidebarSeparator`](SidebarSeparator.md), [`SidebarTrigger`](SidebarTrigger.md), [`SidebarUserCard`](SidebarUserCard.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `collapsible` | `"icon" \| "offcanvas" \| "none"` | `"icon"` | icon: shrink to an icon rail · offcanvas: slide fully away · none: never collapse. |
| `mobileTitle` | `string` | `"Navigation"` | Accessible title for the mobile sheet. |
| `side` | `"left" \| "right"` | `"left"` | Edge of the layout the sidebar sits on. |
| `variant` | `"default" \| "inset" \| "floating"` | `"default"` | Look: `default` (flush panel), `inset` (content area sits in a card beside it) or `floating` (detached rounded panel). |

## Part props

### SidebarGroupLabel

Group heading; fades out in icon mode.

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  |  |

### SidebarInset

Main content area next to the sidebar. Raised card when the sidebar is `inset`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `React.ElementType` | `"main"` | Element to render. Default `"main"`; use `"div"` when the page already has a `<main>`. |
| `asChild` | `boolean` |  | Merge props onto the single child element instead of rendering a wrapper. |

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

### SidebarProvider

Holds collapsed / mobile state, registers ⌘B, and lays out sidebar + inset.

| Prop | Type | Default | Description |
|---|---|---|---|
| `collapsed` | `boolean` |  | Controlled collapsed state of the sidebar (icon rail or hidden, per `collapsible`). Use with `onCollapsedChange`. |
| `contained` | `boolean` | `false` | Fill the parent element instead of the viewport (for previews, panels and nested layouts). The parent needs a definite height. |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state when uncontrolled. |
| `iconWidth` | `string` | `"3rem"` | CSS width in icon mode. Default "3rem". |
| `onCollapsedChange` | `(collapsed: boolean) => void` |  | Called when the sidebar collapses or expands (trigger button or keyboard shortcut). |
| `shortcut` | `string \| null` | `"b"` | Key used with ⌘/Ctrl to toggle. Default "b". Pass `null` to disable. |
| `width` | `string` | `"16rem"` | CSS width of the expanded sidebar. Default "16rem". |

### SidebarTrigger

Button that toggles the sidebar (⌘B).

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

### SidebarUserCard

Account row with an `Avatar` (solid seed colour), name, email and chevron. Use as a dropdown trigger.

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Display name shown in the card (and used for the initials). |
| `avatarColor` | `string` |  | Background of the initials circle. Defaults to a color derived from the name. |
| `avatarSrc` | `string` |  | Image URL; falls back to initials. |
| `email` | `string` |  | Email shown under the name. |
| `hideChevron` | `boolean` |  | Hide the trailing chevron. |
