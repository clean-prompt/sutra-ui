# MutedAppsList

> Apps an alert ignores, each with an Unmute button.

- Import: `import { MutedAppsList } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/alert-rules-muted` (kit `system`)
- `data-slot`: `muted-apps-list`, `muted-apps-empty`, `muted-app`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` | `"red"` | Categorical colour. Default "red". |
| `appIcons` | `Record<string, React.ReactNode>` |  | App icons by name. Default: a `Monogram` of the name. |
| `defaultValue` | `string[]` |  | Initially muted app names when `value` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Default "No muted apps". |
| `label` | `string` | `"Muted apps"` | Accessible name of the list. Default "Muted apps". |
| `onUnmute` | `(app: string) => void` |  | Called with the app that was unmuted (in addition to `onValueChange`). |
| `onValueChange` | `(apps: string[]) => void` |  | Called with the remaining muted apps when the user unmutes one. |
| `value` | `string[]` |  | Muted app names. |
