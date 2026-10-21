# EnsembleBuilder

> Mixture-of-agents preset: reference models, an aggregator and rounds, with a recursion guard.

- Import: `import { EnsembleBuilder } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing-ensemble` (kit `agent-admin`)
- `data-slot`: `ensemble-builder`, `ensemble-error`, `ensemble-summary`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `RoutingProvider[]` |  | Providers whose models can join the ensemble. |
| `defaultValue` | `EnsembleConfig` | `{ references: [], aggregator: null, rounds: 1 }` | Initial configuration when `value` is not controlled. |
| `isEnsemble` | `(ref: ModelRef) => boolean` |  | Extra check for models that resolve to an ensemble (models with `ensemble: true` are always rejected). |
| `maxReferences` | `number` | `6` | Maximum number of reference models that can be added. |
| `maxRounds` | `number` | `5` | Upper bound of the rounds stepper. |
| `onValueChange` | `(value: EnsembleConfig) => void` |  | Called with the new configuration when the user changes any part of it. |
| `value` | `EnsembleConfig` |  | Controlled configuration: `references`, `aggregator` and `rounds`. |

## Example (live: `#/components/providers/ensemble-builder` in the playground)

```tsx
import * as React from "react";
import { EnsembleBuilder } from "@sutra/ui/agent-admin";

function EnsembleDemo() {
  const [value, setValue] = React.useState<EnsembleConfig>({
    references: [
      { providerId: "nimbus", modelId: "opal-4" },
      { providerId: "corvid", modelId: "c5" },
    ],
    aggregator: null,
    rounds: 2,
  });
  return (
    <div className="w-full max-w-xl space-y-2">
      <EnsembleBuilder providers={routing} value={value} onValueChange={setValue} />
      {/* Try adding “Council Ensemble” to see the recursion guard. */}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): routing.
