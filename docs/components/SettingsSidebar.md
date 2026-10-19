# SettingsSidebar

> Grouped settings navigation; collapses into a select on small screens.

- Import: `import { SettingsSidebar } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/sidebar-navigation-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` |  | Initially active item id when uncontrolled. |
| `groups` | `SettingsNavGroup[]` | `defaultSettingsGroups` | Navigation groups; each has a `label` and `items`. |
| `onValueChange` | `(value: string) => void` |  | Called with the id of the item the user picked. |
| `value` | `string` |  | Controlled id of the active item. Use with `onValueChange`. |
