# PromptSuggestion

> Clickable prompt suggestion: a chip in a wrap row, a row in a list, or an autocomplete match.

- Import: `import { PromptSuggestion } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/prompt-suggestion` (kit `ai`)
- `data-slot`: `prompt-suggestion`
- Parts: [`PromptSuggestionGroup`](PromptSuggestionGroup.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `highlight` | `string` |  | Autocomplete mode: bolds the matching part of string children and renders as a full-width row. |
| `icon` | `React.ReactNode` |  | Icon rendered before the text. |

## Part props

### PromptSuggestionGroup

Container for PromptSuggestion items.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `PromptSuggestionLayout` | `"wrap"` | wrap: centered row of chips · list: stacked rows with arrow icons |
