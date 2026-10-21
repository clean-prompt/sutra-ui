# PromptInputAttachButton

> Paperclip button that opens the file picker and forwards files to `onFilesAdded`.

- Import: `import { PromptInputAttachButton } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-toolbar` (kit `ai`)
- `data-slot`: `prompt-input-attach-button`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accept` | `string` |  | File input `accept` filter, e.g. "image/*,.pdf". |
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `label` | `string` | `"Attach files"` | Accessible name / native tooltip (required for icon-only buttons). |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `multiple` | `boolean` | `true` | Lets the file picker select several files. Default true. |
| `pressed` | `boolean` |  | Toggle state for switches like "Web search". |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |
