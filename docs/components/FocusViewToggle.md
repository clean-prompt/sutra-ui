# FocusViewToggle

> Toggle that hides tool calls and keeps only user/assistant rows (reads `FocusViewProvider`).

- Import: `import { FocusViewToggle } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-tasks` (kit `agent`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultPressed` | `boolean` | `false` | Initial state when used outside a `FocusViewProvider` and `pressed` is not controlled. |
| `iconOnly` | `boolean` |  | Hides the visible label; `label` stays as the accessible name. |
| `label` | `React.ReactNode` | `"Focus"` | Visible label. Default "Focus". Set `iconOnly` to hide it. |
| `onPressedChange` | `(pressed: boolean) => void` |  | Called with the new state when the toggle is pressed. |
| `pressed` | `boolean` |  | Used only outside a `FocusViewProvider`. |
