# AppHeader

> App top bar: sidebar trigger, breadcrumbs, ⌘K search palette, notifications and account menu.

- Import: `import { AppHeader } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/header-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `actions` | `React.ReactNode` |  | Extra actions before the notifications bell. |
| `breadcrumbs` | `BreadcrumbCrumb[]` | `defaultCrumbs` | Breadcrumb trail shown after the sidebar toggle; the last crumb is the current page. |
| `commandGroups` | `AppHeaderCommandGroup[]` | `defaultCommandGroups` | Groups of commands for the search palette; each has a `heading` and `items`. |
| `notifications` | `NotificationItem[]` |  | Notifications listed in the bell menu. |
| `onAccountSelect` | `(key: string) => void` |  | Called with the key of the row chosen in the account menu. |
| `onCommand` | `(value: string) => void` |  | Called with the value of the command the user ran from the palette. |
| `onSignOut` | `() => void` |  | Called when "Sign out" is chosen in the account menu. |
| `renderLink` | `BlockLinkRenderer` |  | Renders breadcrumb links in place of the default `<a>`, e.g. to use your router's Link. |
| `searchPlaceholder` | `string` | `"Search or jump to…"` | Placeholder of the palette search field. |
| `showSidebarTrigger` | `boolean` | `true` | Render the sidebar toggle. Requires a `SidebarProvider` ancestor (e.g. `AppShell`). |
| `user` | `UserAccountMenuUser` | `{ ...demoUser, plan: "Pro" }` | The signed-in user for the account menu. The default is demo data. |
