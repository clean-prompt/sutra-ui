# UserAccountMenu

> Avatar-triggered account menu: profile header, settings, theme submenu and sign out.

- Import: `import { UserAccountMenu } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/dropdown-menu-blocks` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `Align` | `"end"` | Alignment of the menu against the trigger. |
| `contentClassName` | `string` |  | Classes for the menu panel. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `defaultTheme` | `ThemePreference` | `"system"` | Initial theme preference when uncontrolled. |
| `items` | `UserAccountMenuItem[]` | `defaultAccountItems` | Menu rows above the sign-out row; each has a `key`, a `label` and optional icon and shortcut hint. Defaults to a standard account set. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the menu opens or closes. |
| `onSelect` | `(key: string) => void` |  | Called with the `key` of the chosen row. |
| `onSignOut` | `() => void` |  | Called when "Sign out" is chosen. |
| `onThemeChange` | `(theme: ThemePreference) => void` |  | Called with the preference the user picked in the theme submenu. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `showTheme` | `boolean` | `true` | Show the theme submenu. Default true. |
| `side` | `Side` | `"bottom"` | Side of the trigger the menu opens on. |
| `theme` | `ThemePreference` |  | Controlled theme preference (`light`, `dark` or `system`). Use with `onThemeChange`. |
| `trigger` | `React.ReactElement` |  | Custom trigger element (e.g. a `SidebarUserCard`). Defaults to an avatar button. |
| `user` | `UserAccountMenuUser` | `{ ...demoUser, plan: "Pro" }` | The signed-in user: `name`, optional `email`, `avatarSrc` and `plan`. Shown in the menu header and used by the default trigger. The default is demo data. |
