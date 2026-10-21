# FallbackChainEditor

> Ordered primary + fallback models: reorder, add through the picker, remove.

- Import: `import { FallbackChainEditor } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing-chains` (kit `agent-admin`)
- `data-slot`: `fallback-chain-editor`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `RoutingProvider[]` |  | Providers whose models can be added to the chain. |
| `caption` | `React.ReactNode` | `"Tried in order when a model fails or is rate-limited."` | Helper text above the chain. |
| `defaultValue` | `ModelRef[]` | `[]` | Initial chain when `value` is not controlled. |
| `max` | `number` | `8` | Maximum chain length. |
| `onSetupProvider` | `(providerId: string) => void` |  | Called from an unconfigured provider's "Set up" call to action in the add-model picker. |
| `onValueChange` | `(value: ModelRef[]) => void` |  | Called with the new chain when the user adds, removes or reorders a model. |
| `value` | `ModelRef[]` |  | Controlled chain: model references in the order they are tried. |

## Example (live: `#/components/providers/fallback-chain` in the playground)

```tsx
import * as React from "react";
import { FallbackChainEditor } from "@sutra/ui/agent-admin";

function FallbackDemo() {
  const [chain, setChain] = React.useState<ModelRef[]>([
    { providerId: "nimbus", modelId: "opal-4" },
    { providerId: "corvid", modelId: "c5" },
    { providerId: "hearth", modelId: "wren-8b" },
  ]);
  return (
    <div className="w-full max-w-xl space-y-2">
      <FallbackChainEditor providers={routing} value={chain} onValueChange={setChain} />
      {/* {chain.map((c) => c.modelId).join(" → ") || "empty"} */}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): routing.
