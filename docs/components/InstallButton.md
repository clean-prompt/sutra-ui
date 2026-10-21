# InstallButton

> Install-the-app button. Hidden when not installable or already installed; shows Add to Home Screen steps on iOS.

- Import: `import { InstallButton } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/kits/workspace/install-prompt` (kit `workspace`)
- `data-slot`: `install-button`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `appName` | `string` | `"app"` | App name used in the label and the iOS instructions. |
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `onOutcome` | `(outcome: InstallOutcome) => void` |  | Called with `accepted`, `dismissed` or `unavailable` after the user responds to the install prompt. |
| `platform` | `"auto" \| "ios"` | `"auto"` | Force a platform: `ios` always shows the Add to Home Screen instructions (useful for previews). |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

## Example (live: `#/components/social/install-button` in the playground)

```tsx
import { InstallButton } from "@cleanprompt/sutra-ui/social";

<div className="flex flex-col items-center gap-1">
  {/* Auto (hidden unless installable) */}
  <div className="flex min-h-9 items-center">
    <InstallButton appName="Sutra" />
  </div>
</div>
<div className="flex flex-col items-center gap-1">
  {/* Forced iOS instructions */}
  <InstallButton appName="Sutra" platform="ios" />
</div>
```
