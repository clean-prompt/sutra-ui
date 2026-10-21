# PromptInputModelSelect

> Model picker dropdown for the composer toolbar.

- Import: `import { PromptInputModelSelect } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-model` (kit `ai`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `models` (required) | `PromptInputModel[]` |  | Models to choose from, each with an id, name and optional description. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the menu against the pill. |
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `defaultValue` | `string` |  | Initially selected model id when `value` is not controlled. |
| `effort` | `React.ReactNode` |  | Reasoning-effort display next to the model name. |
| `fast` | `PromptInputFastMode` |  | Fast-mode indicator: on, off or cooling down. |
| `fastCooldown` | `number` |  | Seconds left while `fast="cooldown"`. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `menuFooter` | `React.ReactNode` |  | Extra menu content below the model list (e.g. effort or fast-mode toggles). |
| `menuLabel` | `string` | `"Model"` | Heading inside the menu. |
| `onFastCooldownEnd` | `() => void` |  | Called when the fast-mode cooldown countdown reaches zero. |
| `onValueChange` | `(id: string) => void` |  | Called with the model id when the user picks a model. |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `value` | `string` |  | Controlled id of the selected model. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |
