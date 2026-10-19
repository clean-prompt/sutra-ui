# FocusViewProvider

> Shares the focus-view state between a `FocusViewToggle` and transcript rows.

- Import: `import { FocusViewProvider } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-tasks` (kit `agent`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` |  | Transcript subtree whose `FocusViewItem`s and `FocusViewToggle` share the state. |
| `defaultFocused` | `boolean` | `false` | Initial focus state when `focused` is not controlled. |
| `focused` | `boolean` |  | Controlled focus state: true hides the kinds in `hiddenKinds`. |
| `hiddenKinds` | `FocusViewKind[]` | `["tool"]` | Kinds hidden while focused. Default `["tool"]`. |
| `onFocusedChange` | `(focused: boolean) => void` |  | Called with the new state when the user toggles focus view. |
