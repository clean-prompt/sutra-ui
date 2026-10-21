# SettingsDialog

> `SettingsShell` inside a modal dialog. Escape closes only the topmost layer.

- Import: `import { SettingsDialog } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/patterns/settings` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sections` (required) | `SettingsShellSection[]` |  | Sections of the settings area, in order; each has an `id`, a `label` and optional icon. |
| `breakpoint` | `number` | `640` | Container width in px below which `layout="auto"` switches to the drill-in list. |
| `children` | `React.ReactNode \| ((section: string) => React.ReactNode)` |  | Section body: a node, or a render function receiving the open section id. |
| `contentClassName` | `string` |  | Classes for the dialog panel. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `defaultSection` | `string \| null` |  | Initially open section id when uncontrolled; `null` shows the section list in the stacked layout. |
| `layout` | `SettingsShellLayout` |  | `auto` switches to the drill-in list when the container is narrower than `breakpoint`. |
| `navFooter` | `React.ReactNode` |  | Content pinned to the bottom of the desktop nav. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onSectionChange` | `(section: string \| null) => void` |  | Called with the section id the user opened, or `null` when they go back to the list. |
| `open` | `boolean` |  | Controlled open state of the dialog. Use with `onOpenChange`. |
| `section` | `string \| null` |  | Open section id. In the stacked layout `null` shows the section list. |
| `title` | `React.ReactNode` | `"Settings"` | Heading shown above the section list (and as the stacked header). |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (wrapped with `asChild`). |
