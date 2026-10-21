# ToolsetHealthPill

> Configured / Needs keys / Error pill.

- Import: `import { ToolsetHealthPill } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/tool-toggles` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `health` (required) | `ToolsetHealth` |  | Health to show: `configured`, `needs-keys` or `error`; sets the pill text, icon and tone. |
