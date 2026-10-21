# ModelCapabilityChips

> Tools / vision / reasoning chips.

- Import: `import { ModelCapabilityChips } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing-model` (kit `agent-admin`)
- `data-slot`: `model-capabilities`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `capabilities` | `ModelCapability[]` | `[]` | Capabilities to show as chips (`tools`, `vision`, `reasoning`), in the order given; renders nothing when empty. |
| `size` | `"sm" \| "md"` | `"sm"` | Badge size of each chip. |
