# HardwareFitHint

> Badge + explanation of how a model fits the given hardware.

- Import: `import { HardwareFitHint } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/local-models` (kit `agent-admin`)
- `data-slot`: `hardware-fit-hint`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `hardware` (required) | `HardwareProfile` |  | Memory and GPU of the machine to estimate fit on. |
| `model` (required) | `ModelFootprint` |  | Memory footprint of the model (parameters, quantisation, size) to check against the hardware. |
| `density` | `Density` |  | `compact` renders only the badge, with the explanation in a tooltip. Default `normal`. |
| `variant` | `"default" \| "compact"` |  | **Deprecated.** Use `density` (`"compact"` → `density="compact"`). `compact` renders only the badge, with the explanation in a tooltip. |

## Example (live: `#/components/providers/hardware-fit` in the playground)

```tsx
import { HardwareFitHint } from "@cleanprompt/sutra-ui/agent-admin";

<div className="grid grid-cols-1 w-full gap-5 lg:grid-cols-2">
  <HardwareFitHint model={{ paramsB: 8, quant: "Q4_K_M" }} hardware={hardware} />
  <HardwareFitHint model={{ sizeGB: 19.8 }} hardware={hardware} />
  <HardwareFitHint model={{ sizeGB: 14 }} hardware={{ ramGB: 32 }} />
  <HardwareFitHint model={{ paramsB: 70, quant: "F16" }} hardware={hardware} />
</div>
```

Playground helpers in this snippet (not part of the library): hardware.
