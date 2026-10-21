# PromptInputButton

> Ghost toolbar button (attach, web search toggle, …).

- Import: `import { PromptInputButton } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-toolbar` (kit `ai`)
- `data-slot`: `prompt-input-button`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `label` | `string` |  | Accessible name / native tooltip (required for icon-only buttons). |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `pressed` | `boolean` |  | Toggle state for switches like "Web search". |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |
