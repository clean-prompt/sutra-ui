# ShortcutsDialog

> Cheat sheet auto-populated from the shortcut registry, with search. Opens with shift+? by default.

- Import: `import { ShortcutsDialog } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/patterns/shortcuts` (patterns)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the sheet content. |
| `defaultOpen` | `boolean` | `false` | Initial open state when uncontrolled. |
| `description` | `string` | `"Every shortcut available on this screen."` | Text under the heading. |
| `extraGroups` | `ShortcutRegistryGroup[]` |  | Extra static groups appended to the registry listing. |
| `includeRegistry` | `boolean` | `true` | List the live shortcut registry. Default true; `false` shows only `extraGroups` (a static cheat sheet). |
| `keys` | `string \| null` | `"shift+?"` | Shortcut that toggles the sheet. Default "shift+?"; `null` disables. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the sheet opens or closes. |
| `open` | `boolean` |  | Controlled open state of the sheet. Use with `onOpenChange`. |
| `platform` | `ShortcutPlatform` |  | Platform for the key glyphs. Defaults to the provider's (or the detected) platform. |
| `title` | `React.ReactNode` | `"Keyboard shortcuts"` | Sheet heading. |
| `trigger` | `React.ReactNode` |  | Element that opens the sheet (rendered with `asChild`); focus returns to it on close. |
