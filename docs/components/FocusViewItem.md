# FocusViewItem

> Renders its children unless focus view hides this kind of row.

- Import: `import { FocusViewItem } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-tasks` (kit `agent`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` (required) | `FocusViewKind` |  | Kind of transcript item (`user`, `assistant`, `tool` or `system`); the item is hidden when its kind is in `hiddenKinds`. |
| `children` | `React.ReactNode` |  | Content to hide while the focus view hides this kind. |
