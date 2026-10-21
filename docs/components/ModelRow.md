# ModelRow

> One model table row (+ optional smoke-test result row). Use inside `ModelTable` or a `Table`.

- Import: `import { ModelRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ops/model-row` (kit `ops`)
- `data-slot`: `model-row`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `model` (required) | `ModelInfo` |  | The model to show (name, family, size, state, download status). |
| `colSpan` | `number` | `6` | Column count for the test-result row. Default 6. |
| `onAction` | `(model: ModelInfo, action: ModelAction) => void` |  | Called with the model and the action (`download`, `cancel`, `start`, `stop`, `sleep`, `wake`, `pin`, `unpin` or `test`) when the user picks one. |
| `onDismissTest` | `() => void` |  | Called when the user dismisses the test result. |
| `pendingAction` | `ModelAction \| null` |  | Action currently in flight for this model. |
| `testResult` | `ModelTestResult \| null` |  | Smoke-test result; shown in a row under the model until dismissed. |
