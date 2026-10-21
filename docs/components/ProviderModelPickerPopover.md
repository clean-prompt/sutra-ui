# ProviderModelPickerPopover

> Trigger button showing the current model; opens the picker in a popover.

- Import: `import { ProviderModelPickerPopover } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing-picker` (kit `agent-admin`)
- Part of [`ProviderModelPicker`](ProviderModelPicker.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `RoutingProvider[]` |  | Providers with their models; unconfigured providers show a "Set up" call to action instead of models. |
| `defaultValue` | `ModelRef \| null` | `null` | Initial model when uncontrolled (no `value`). |
| `disabledReason` | `string` |  | Tooltip text for models that `isModelDisabled` greys out. |
| `emptyActions` | `React.ReactNode` |  | Actions for the "no providers" empty state (e.g. buttons to keys / OAuth). |
| `isModelDisabled` | `(ref: ModelRef, model: RoutingModel) => boolean` |  | Return true to disable a model (shown greyed with `disabledReason`). |
| `onSetupProvider` | `(providerId: string) => void` |  | Called from an unconfigured provider's "Set up" CTA. |
| `onValueChange` | `(ref: ModelRef, model: RoutingModel) => void` |  | Called with the chosen model reference and the model record when the user picks a model. |
| `placeholder` | `string` | `"Choose a model"` | Trigger text shown while no model is selected. |
| `triggerClassName` | `string` |  | Extra classes for the trigger button; `className` goes to the picker inside the popover. |
| `value` | `ModelRef \| null` |  | The current model ("current" tag). |

## Example (live: `#/components/providers/provider-model-picker` in the playground)

```tsx
import * as React from "react";
import { ProviderModelPicker, ProviderModelPickerPopover } from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiKey2Line, RiShieldKeyholeLine } from "@cleanprompt/sutra-ui/icons";

function PickerDemo() {
  const [value, setValue] = React.useState<ModelRef>({ providerId: "nimbus", modelId: "opal-4" });
  const [setup, setSetup] = React.useState<string | null>(null);
  return (
    <div className="grid w-full max-w-2xl gap-3">
      <ProviderModelPicker providers={routing} value={value} onSelect={setValue} onSetupProvider={setSetup} />
      {/* Selected: {value.providerId}/{value.modelId} {setup && ` · Set up requested for ${setup}`} */}
      <div className="flex items-center gap-2">
        {/* As a popover: */}
        <ProviderModelPickerPopover providers={routing} value={value} onValueChange={setValue} onSetupProvider={setSetup} />
      </div>
      {/* Empty state (nothing configured): */}
      <ProviderModelPicker
        providers={routing.map((p) => ({ ...p, configured: false }))}
        emptyActions={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" leadingIcon={<RiKey2Line />}>
              Add API key
            </Button>
            <Button size="sm" leadingIcon={<RiShieldKeyholeLine />}>
              Sign in with OAuth
            </Button>
          </div>
        }
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): routing.
