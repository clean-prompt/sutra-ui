# ReasoningPill

> Composer pill summarizing thinking / fast / effort, with a popover of toggles and an EffortSlider.

- Import: `import { ReasoningPill } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing` (kit `agent-admin`)
- `data-slot`: `reasoning-pill`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `ReasoningSettings` | `{ thinking: true, fast: false, effort: "medium" }` | Initial settings when `value` is not controlled. |
| `levels` | `EffortLevel[]` | `defaultEffortLevels` | Effort levels offered in the slider, lowest to highest. |
| `onValueChange` | `(value: ReasoningSettings) => void` |  | Called with the new settings when the user changes any control in the popover. |
| `supportsEffort` | `boolean` | `true` | Show the effort slider; set false when the current model has fixed effort. |
| `supportsFast` | `boolean` | `true` | Show the Fast mode switch; set false when the current model has no fast mode. |
| `supportsThinking` | `boolean` | `true` | Hide controls the current model doesn't support. |
| `value` | `ReasoningSettings` |  | Controlled reasoning settings (thinking on/off, effort level, fast mode). |

## Example (live: `#/components/providers/reasoning-pill` in the playground)

```tsx
import * as React from "react";
import { ProviderModelPickerPopover, ReasoningPill } from "@cleanprompt/sutra-ui/agent-admin";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiAttachment2, RiSendPlaneFill } from "@cleanprompt/sutra-ui/icons";

function ComposerDemo() {
  const [reasoning, setReasoning] = React.useState<ReasoningSettings>({ thinking: true, fast: false, effort: "high" });
  const [model, setModel] = React.useState<ModelRef>({ providerId: "nimbus", modelId: "opal-4" });
  return (
    <div className="w-full max-w-2xl rounded-box border border-border bg-card p-3 shadow-sm">
      <div className="min-h-16 px-1 text-sm text-muted-foreground">Ask anything…</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Attach file">
          <RiAttachment2 />
        </Button>
        <ProviderModelPickerPopover providers={routing} value={model} onValueChange={setModel} triggerClassName="h-7 text-xs" />
        <ReasoningPill value={reasoning} onValueChange={setReasoning} />
        <ReasoningPill defaultValue={{ thinking: false, fast: true, effort: "low" }} supportsEffort={false} />
        <Button size="icon-sm" className="ml-auto" aria-label="Send">
          <RiSendPlaneFill />
        </Button>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): routing.
