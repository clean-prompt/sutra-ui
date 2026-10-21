# AppSidebar

> Full Sutra suite sidebar: workspace switcher, search, primary nav, apps, favorites, storage and account.

- Import: `import { AppSidebar } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/blocks`)
- Source: `packages/ui/src/blocks/sidebar-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `string` |  | **Deprecated.** Use `value`. Legacy name of `value`. |
| `apps` | `SutraApp[]` | `[...sutraApps]` | Sutra apps listed in the Apps section; defaults to all of them. |
| `collapsible` | `"icon" \| "offcanvas" \| "none"` | `"icon"` | icon: shrink to an icon rail · offcanvas: slide fully away · none: never collapse. |
| `defaultActive` | `string` |  | **Deprecated.** Use `defaultValue`. Legacy name of `defaultValue`. |
| `defaultValue` | `string` |  | Initially active item id when uncontrolled. Default "home". |
| `favorites` | `AppSidebarFavorite[]` | `defaultFavorites` | Favourite entries listed under Favorites; each has an `id`, a `label`, an `app` and optional child links. The default is demo data. |
| `mobileTitle` | `string` |  | Accessible title for the mobile sheet. |
| `onNavigate` | `(id: string) => void` |  | **Deprecated.** Use `onValueChange`. Legacy name of `onValueChange`. |
| `onSearch` | `() => void` |  | Called when the search row is clicked. |
| `onSignOut` | `() => void` |  | Called when "Sign out" is chosen in the account menu. |
| `onUpgrade` | `() => void` |  | Called when the upgrade button in the storage card is clicked. |
| `onValueChange` | `(id: string) => void` |  | Called with the id of the item the user navigates to. |
| `primaryItems` | `AppSidebarNavItem[]` | `defaultPrimary` | Top-level navigation rows (each with an `id`, a `label` and an icon); the default is a standard set. |
| `side` | `"left" \| "right"` | `"left"` | Edge of the layout the sidebar sits on. |
| `storage` | `{ used: number; total: number } \| null` | `{ used: 6.8, total: 10 }` | Storage usage in GB. Pass `null` to hide the card. |
| `user` | `UserAccountMenuUser` | `{ ...demoUser, plan: "Pro" }` | The signed-in user for the account card at the bottom. The default is demo data. |
| `value` | `string` |  | Currently active item id (nav item, app or favorite). |
| `variant` | `"default" \| "inset" \| "floating"` | `"default"` | Look: `default` (flush panel), `inset` (content area sits in a card beside it) or `floating` (detached rounded panel). |
| `workspaces` | `Workspace[]` |  | Workspaces offered in the switcher at the top. The default is demo data. |
