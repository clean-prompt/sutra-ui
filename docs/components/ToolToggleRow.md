# ToolToggleRow

> One tool row: name, hint tags, lock state, switch and an expandable detail.

- Import: `import { ToolToggleRow } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/tool-toggles` (kit `agent-admin`)
- `data-slot`: `tool-toggle-row`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tool` (required) | `ToolToggleItem` |  | The tool to show (name, description, hints, enabled state). |
| `checked` | `boolean` |  | Controlled switch state. |
| `defaultChecked` | `boolean` |  | Initial switch state when uncontrolled. Defaults to `tool.enabled`. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when `expanded` is not controlled. |
| `dirty` | `boolean` |  | Marks the row as changed from the saved state with an "Unsaved" dot. |
| `expanded` | `boolean` |  | Controlled expanded state of the row's details. |
| `onCheckedChange` | `(checked: boolean) => void` |  | Called with the new state when the user flips the switch. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the row. |
