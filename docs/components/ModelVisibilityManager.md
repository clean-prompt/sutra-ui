# ModelVisibilityManager

> Per-provider show/hide switches for models, custom model ids and reset.

- Import: `import { ModelVisibilityManager } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing-visibility` (kit `agent-admin`)
- `data-slot`: `model-visibility-manager`, `visibility-count`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `Pick<RoutingProvider, "id" \| "name" \| "monogram" \| "color" \| "models">[]` |  | Providers (id, name, monogram, colour and models) whose models can be shown or hidden. |
| `defaultProviderId` | `string` |  | Provider selected on mount; defaults to the first provider. |
| `defaultValue` | `ModelVisibilityState` | `emptyVisibility` | Initial visibility map when `value` is not controlled. |
| `onValueChange` | `(value: ModelVisibilityState) => void` |  | Called with the updated visibility map when the user toggles a model or a provider. |
| `value` | `ModelVisibilityState` |  | Controlled visibility map: which models are hidden from pickers. |

## Example (live: `#/components/providers/model-visibility` in the playground)

```tsx
import { ModelVisibilityManager } from "@cleanprompt/sutra-ui/agent-admin";

<ModelVisibilityManager className="max-w-xl" providers={routing.filter((p) => p.models.length > 0)} defaultValue={{ hidden: ["corvid/c5-mini"], custom: [] }} />
```

Playground helpers in this snippet (not part of the library): routing.
