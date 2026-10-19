# QuickCreateMenu

> "+ New" button opening a menu to create items in any Sutra app.

- Import: `import { QuickCreateMenu } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/dropdown-menu-blocks` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `Align` | `"end"` | Alignment of the menu against the trigger. |
| `className` | `string` |  | Classes for the trigger. |
| `items` | `QuickCreateItem[]` | `defaultQuickCreate` | Apps offered for creation; each has an `app`, a `label` and optional description and shortcut hint. Defaults to the standard Sutra apps. |
| `label` | `React.ReactNode` | `"New"` | Text of the trigger button. |
| `onCreate` | `(app: SutraApp) => void` |  | Called with the app the user chose. |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Trigger button height and text size. |
| `variant` | `"primary" \| "secondary"` | `"primary"` | Trigger button style. |
