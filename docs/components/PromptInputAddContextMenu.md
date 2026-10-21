# PromptInputAddContextMenu

> "+" menu for adding context: attach file, mention a project file, upload, paste image, or custom items.

- Import: `import { PromptInputAddContextMenu } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-input-attachments` (kit `ai`)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accept` | `string` |  | File input `accept` for "Upload from computer". |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the menu against the button. |
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `items` | `PromptInputAddContextItem[] \| ((defaults: PromptInputAddContextItem[]) => PromptInputAddContextItem[])` |  | Replace or extend the item list: an array, or a function receiving the defaults. |
| `label` | `string` | `"Add context"` | Accessible name / native tooltip (required for icon-only buttons). |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `menuLabel` | `string` | `"Add context"` | Heading inside the menu. Default "Add context". |
| `onAttachFile` | `() => void` |  | "Attach file…" (e.g. an editor file picker). Hidden when unset. |
| `onMentionFile` | `() => void` |  | "Mention a file from this project…" (open a file search). Default: inserts "@" at the caret. |
| `onPasteImage` | `() => void` |  | "Paste image". Default: reads images from the clipboard into `onFilesAdded` (when supported). |
| `pressed` | `boolean` |  | Toggle state for switches like "Web search". |
| `size` | `"icon" \| "sm" \| "md" \| "lg" \| "xs" \| "xl" \| "icon-xs" \| "icon-sm" \| "icon-lg" \| "icon-xl" \| null` | `"md"` | Button height and padding; `icon-*` sizes are square. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |
