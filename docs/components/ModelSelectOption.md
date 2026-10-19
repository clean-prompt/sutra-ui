# ModelSelectOption

> Content of one model row (glyph or icon, name, provider, badges, hint). Used inside menu items, options and buttons.

- Import: `import { ModelSelectOption } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/model-select` (kit `ai`)
- `data-slot`: `model-option`
- Part of [`ModelSelect`](ModelSelect.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `model` (required) | `PickerModel` |  | The model to show (name, provider, state, description and so on). |
| `hint` | `React.ReactNode` |  | Second line. Defaults to the blocked reason, then the wait hint (with `state`), then the description. |
| `hintId` | `string` |  | Id for the second line, for `aria-describedby`. |
| `wrapHint` | `boolean` |  | Let the second line wrap instead of truncating. |
