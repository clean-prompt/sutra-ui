# ScopeChip

> Read-only "Applies to: All profiles / <profile>" chip.

- Import: `import { ScopeChip } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/capabilities` (kit `agent-admin`)
- `data-slot`: `scope-chip`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `prefix` | `React.ReactNode` | `"Applies to"` | Prefix label. Default "Applies to". |
| `profile` | `string \| null` |  | Profile name, or `null`/omitted for "All profiles". |
