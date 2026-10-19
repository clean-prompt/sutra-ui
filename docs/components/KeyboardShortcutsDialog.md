# KeyboardShortcutsDialog

> Searchable reference of keyboard shortcuts, grouped, rendered with Kbd keys. A preset over `ShortcutsDialog`: it lists the live shortcut registry, or the static `groups` (keys written with mac glyphs keep rendering as glyphs).

- Import: `import { KeyboardShortcutsDialog } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/modal-dialog-blocks-shortcuts` (blocks)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the dialog panel. |
| `defaultOpen` | `boolean` |  | Initial open state when uncontrolled. |
| `groups` | `ShortcutGroup[]` |  | Static groups. When omitted inside a `ShortcutProvider`, the dialog lists the live shortcut registry instead (falling back to a default Sutra reference when the registry is empty). |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state. Use with `onOpenChange`. |
| `title` | `React.ReactNode` | `"Keyboard shortcuts"` | Dialog heading. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (rendered with `asChild`). |
