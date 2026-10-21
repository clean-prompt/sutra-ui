# ProviderModelPicker

> Two-column provider → model picker with search highlighting and arrow-key navigation between columns.

- Import: `import { ProviderModelPicker } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing-picker` (kit `agent-admin`)
- `data-slot`: `provider-model-picker`, `provider-setup-cta`
- Parts: [`ProviderModelPickerDialog`](ProviderModelPickerDialog.md), [`ProviderModelPickerPopover`](ProviderModelPickerPopover.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `RoutingProvider[]` |  | Providers with their models; unconfigured providers show a "Set up" call to action instead of models. |
| `autoFocus` | `boolean` |  | Focus the search field on mount. |
| `disabledReason` | `string` |  | Tooltip text for models that `isModelDisabled` greys out. |
| `emptyActions` | `React.ReactNode` |  | Actions for the "no providers" empty state (e.g. buttons to keys / OAuth). |
| `isModelDisabled` | `(ref: ModelRef, model: RoutingModel) => boolean` |  | Return true to disable a model (shown greyed with `disabledReason`). |
| `onSelect` | `(ref: ModelRef, model: RoutingModel) => void` |  | Called with the chosen model reference and the model record when the user picks a model. |
| `onSetupProvider` | `(providerId: string) => void` |  | Called from an unconfigured provider's "Set up" CTA. |
| `value` | `ModelRef \| null` |  | The current model ("current" tag). |

## Part props

### ProviderModelPickerDialog

`ProviderModelPicker` in a modal dialog; closes after a selection.

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `RoutingProvider[]` |  | Providers with their models; unconfigured providers show a "Set up" call to action instead of models. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `description` | `React.ReactNode` | `"Pick a provider, then a model."` | Helper text under the dialog heading. |
| `disabledReason` | `string` |  | Tooltip text for models that `isModelDisabled` greys out. |
| `emptyActions` | `React.ReactNode` |  | Actions for the "no providers" empty state (e.g. buttons to keys / OAuth). |
| `isModelDisabled` | `(ref: ModelRef, model: RoutingModel) => boolean` |  | Return true to disable a model (shown greyed with `disabledReason`). |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes (it closes after a model is picked). |
| `onSelect` | `(ref: ModelRef, model: RoutingModel) => void` |  | Called with the chosen model reference and the model record when the user picks a model. |
| `onSetupProvider` | `(providerId: string) => void` |  | Called from an unconfigured provider's "Set up" CTA. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `title` | `React.ReactNode` | `"Choose a model"` | Dialog heading; screen-reader label of the picker. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog. |
| `value` | `ModelRef \| null` |  | The current model ("current" tag). |

### ProviderModelPickerPopover

Trigger button showing the current model; opens the picker in a popover.

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
import { ProviderModelPicker, ProviderModelPickerPopover } from "@sutra/ui/agent-admin";
import { Button } from "@sutra/ui/core";
import { RiKey2Line, RiShieldKeyholeLine } from "@sutra/ui/icons";

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
