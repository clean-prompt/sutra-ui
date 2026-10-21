# ModelInfoCard

> Model details: provider, effective context (override vs auto), capabilities, pricing, cutoff, notes.

- Import: `import { ModelInfoCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing` (kit `agent-admin`)
- `data-slot`: `model-info-card`, `effective-context`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `model` (required) | `RoutingModel` |  | The model to describe (name, context length, pricing, capabilities). |
| `contextOverride` | `number \| null` |  | Context length override in tokens; `null`/undefined uses the model's own value. |
| `onContextOverrideChange` | `(tokens: number \| null) => void` |  | Called with a new context length in tokens, or `null` to reset to the model value; the Edit and Reset buttons show only when set. |
| `provider` | `Pick<RoutingProvider, "name" \| "monogram" \| "color">` |  | Provider name, monogram and colour shown beside the model; omit for a provider-less card. |

## Example (live: `#/components/providers/model-info-card` in the playground)

```tsx
import * as React from "react";
import { ModelInfoCard } from "@cleanprompt/sutra-ui/agent-admin";

function ModelInfoDemo() {
  const [override, setOverride] = React.useState<number | null>(null);
  const provider = routing[0]!;
  return (
    <div className="grid grid-cols-1 w-full gap-4 lg:grid-cols-2">
      <ModelInfoCard model={provider.models[0]!} provider={provider} contextOverride={override} onContextOverrideChange={setOverride} />
      <ModelInfoCard model={routing[2]!.models[0]!} provider={routing[2]} />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): routing.
