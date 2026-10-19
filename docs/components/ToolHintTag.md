# ToolHintTag

> Small tag describing a tool's side effects.

- Import: `import { ToolHintTag } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/tool-toggles` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `hint` (required) | `ToolHint` |  | Tool hint to label: `read-only`, `destructive`, `network`, `filesystem` or `costly`; sets the tag text and tone. |
