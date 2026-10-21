# SubagentStatusGlyph

> Small status glyph (a StatusDot preset): spinner (running), check (done), cross (failed), clock (waiting), forbid (canceled).

- Import: `import { SubagentStatusGlyph } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/subagents` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` (required) | `SubagentStatusInput` |  | Subagent status (running, completed, failed and so on); picks the glyph and its tone. |
