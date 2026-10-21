# ToolKeyValueBody

> Generic label / value grid for tool inputs and results.

- Import: `import { ToolKeyValueBody } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline-bodies` (kit `agent`)
- `data-slot`: `tool-key-value-body`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` (required) | `ToolKeyValueRow[]` |  | Label and value pairs shown as a definition list. |
| `valueHeight` | `number` | `72` | Height cap for each value before "Show more". Default 72. |
