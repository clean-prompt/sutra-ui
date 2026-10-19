# ModelSelect

> Flat model list in a popover: state glyphs, wait hints, badges, search, grouping, untagged disclosure and per-model warm-up.

- Import: `import { ModelSelect } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/model-select` (kit `ai`)
- Parts: [`ModelSelectOption`](ModelSelectOption.md)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `models` (required) | `PickerModel[]` |  | Models to choose from, each with an id, name, provider and optional state, rank and blocked reason. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Alignment of the popover against the trigger. |
| `aria-label` | `string` | `"Model"` | Accessible name of the trigger. Default "Model". |
| `className` | `string` |  | Extra classes for the default trigger. |
| `contentClassName` | `string` |  | Extra classes for the popover content. |
| `defaultValue` | `string` |  | Initially selected model id when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables the trigger. |
| `emptyState` | `React.ReactNode` |  | Shown when nothing matches the search. Default `No models match “query”`. |
| `onValueChange` | `(id: string) => void` |  | Called with the model id when the user picks a model. |
| `onWarmUp` | `(id: string) => void` |  | Shows a "Warm up" button on models that have a `state` and aren't ready. |
| `placeholder` | `string` | `"Choose a model"` | Trigger text shown while no model is selected. Default "Choose a model". |
| `ranked` | `boolean` | `true` | Sort by lifecycle, rank and name. Default true; false keeps the given order. |
| `searchable` | `boolean` | `true` | Show the search field. Default true. |
| `searchPlaceholder` | `string` | `"Search models…"` | Placeholder of the search field. Default "Search models…". |
| `side` | `"top" \| "bottom"` | `"bottom"` | Popover side. Default "bottom". |
| `trigger` | `React.ReactElement \| ((state: ModelSelectTriggerState) => React.ReactElement)` |  | Custom trigger element (or a function of the selection). It must forward its ref and props to a button. |
| `value` | `string` |  | Controlled id of the selected model. |
| `warmingIds` | `string[]` | `[]` | Ids currently warming (button shows a spinner). |

## Part props

### ModelSelectOption

Content of one model row (glyph or icon, name, provider, badges, hint). Used inside menu items, options and buttons.

| Prop | Type | Default | Description |
|---|---|---|---|
| `model` (required) | `PickerModel` |  | The model to show (name, provider, state, description and so on). |
| `hint` | `React.ReactNode` |  | Second line. Defaults to the blocked reason, then the wait hint (with `state`), then the description. |
| `hintId` | `string` |  | Id for the second line, for `aria-describedby`. |
| `wrapHint` | `boolean` |  | Let the second line wrap instead of truncating. |
