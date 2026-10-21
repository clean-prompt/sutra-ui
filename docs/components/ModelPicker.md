# ModelPicker

> `ModelSelect` preset for composers: opens upward, lifecycle glyphs, wait hints, badges, search, grouping and per-model warm-up.

- Import: `import { ModelPicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ai`)
- Source: `packages/ui/src/kits/ai/model-picker` (kit `ai`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `models` (required) | `ModelPickerModel[]` |  | Models to choose from, each with an id, name, provider, lifecycle state and optional badges. |
| `align` | `"start" \| "center" \| "end"` |  | Alignment of the popover against the trigger. |
| `aria-label` | `string` |  | Accessible name of the trigger. Default "Model". |
| `className` | `string` |  | Extra classes for the default trigger. |
| `contentClassName` | `string` |  | Extra classes for the popover content. |
| `defaultValue` | `string` |  | Initially selected model id when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables the trigger. |
| `emptyState` | `React.ReactNode` |  | Shown when nothing matches the search. Default `No models match “query”`. |
| `onValueChange` | `(id: string) => void` |  | Called with the model id when the user picks a model. |
| `onWarmUp` | `(id: string) => void` |  | Shows a "Warm up" button on models that have a `state` and aren't ready. |
| `placeholder` | `string` |  | Trigger text shown while no model is selected. Default "Choose a model". |
| `ranked` | `boolean` |  | Sort by lifecycle, rank and name. Default true; false keeps the given order. |
| `searchable` | `boolean` |  | Show the search field. Default true. |
| `searchPlaceholder` | `string` |  | Placeholder of the search field. Default "Search models…". |
| `side` | `"top" \| "bottom"` | `"top"` | Popover side. Default "bottom". |
| `trigger` | `React.ReactElement \| ((state: ModelSelectTriggerState) => React.ReactElement)` |  | Custom trigger element (or a function of the selection). It must forward its ref and props to a button. |
| `value` | `string` |  | Controlled id of the selected model. |
| `warmingIds` | `string[]` |  | Ids currently warming (button shows a spinner). |

## Example (live: `#/components/ai-extras/model-picker` in the playground)

```tsx
import * as React from "react";
import { ModelPicker } from "@cleanprompt/sutra-ui/ai";

function ModelPickerDemo() {
  const [models, setModels] = React.useState(pickerModels);
  const [value, setValue] = React.useState("qwen3-8b");
  const [warming, setWarming] = React.useState<string[]>([]);
  const warm = (id: string) => {
    setWarming((w) => [...w, id]);
    setTimeout(() => {
      setWarming((w) => w.filter((x) => x !== id));
      setModels((ms) => ms.map((m) => (m.id === id ? { ...m, state: "ready" } : m)));
    }, 2000);
  };
  return (
    <>
      <ModelPicker models={models} value={value} onValueChange={setValue} onWarmUp={warm} warmingIds={warming} side="bottom" />
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): pickerModels.
