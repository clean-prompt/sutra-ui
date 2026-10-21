# PromptInputModelPill

> Compact model button for agent composers: name, effort and a fast-mode indicator with cooldown countdown.

- Import: `import { PromptInputModelPill } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-model` (kit `ai`)
- `data-slot`: `model-pill-effort`, `model-pill-fast`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `chevron` | `boolean` | `true` | Show the dropdown chevron. Default true. |
| `effort` | `React.ReactNode` |  | Reasoning-effort display (e.g. "High" or a glyph), shown muted after the name. |
| `fast` | `PromptInputFastMode` |  | Fast-mode indicator state. Omit to hide the indicator. |
| `fastCooldown` | `number` |  | Seconds left while `fast="cooldown"`; counts down by itself. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `icon` | `React.ReactNode` |  | Replaces the default model icon. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `model` | `React.ReactNode` |  | Model name. |
| `onFastCooldownEnd` | `() => void` |  | Called when the cooldown countdown reaches zero. |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

## Example (live: `#/components/agent-composer/model-pill` in the playground)

```tsx
import * as React from "react";
import { PromptInputModelPill } from "@cleanprompt/sutra-ui/ai";
import { Button } from "@cleanprompt/sutra-ui/core";
import { RiBrainLine } from "@cleanprompt/sutra-ui/icons";

function ModelPillDemo() {
  const [cooldown, setCooldown] = React.useState(20);
  const [state, setState] = React.useState<PromptInputFastMode>("cooldown");
  return (
    <>
      <PromptInputModelPill model="Atlas" icon={<RiBrainLine />} effort="High" fast="on" />
      <PromptInputModelPill model="Swift" effort="Medium" fast="off" />
      <PromptInputModelPill
        model="Nano"
        effort="Low"
        fast={state}
        fastCooldown={cooldown}
        onFastCooldownEnd={() => setState("on")}
      />
      <Button size="sm" variant="outline" onClick={() => { setState("cooldown"); setCooldown((c) => (c === 20 ? 21 : 20)); }}>
        Restart cooldown
      </Button>
    </>
  );
}
```
