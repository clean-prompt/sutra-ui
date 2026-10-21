# TaskModelAssignment

> Matrix of auxiliary tasks → model, with Auto default, reset-to-auto confirmation and "Use for all".

- Import: `import { TaskModelAssignment } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/model-routing-chains` (kit `agent-admin`)
- `data-slot`: `task-model-assignment`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `providers` (required) | `RoutingProvider[]` |  | Providers whose models can be assigned to a task. |
| `autoLabel` | `string` | `"Auto (main model)"` | Caption for the Auto option. |
| `defaultValue` | `TaskModelMap` | `{}` | Initial map when `value` is not controlled. |
| `onValueChange` | `(value: TaskModelMap) => void` |  | Called with the updated map when the user assigns or clears a task's model. |
| `tasks` | `AuxiliaryTask[]` | `defaultAuxiliaryTasks` | Auxiliary tasks (title generation, summaries and so on) to assign a model to; defaults to the built-in list. |
| `value` | `TaskModelMap` |  | Controlled map of task id to model reference; a task without an entry uses the main model (Auto). |

## Example (live: `#/components/providers/task-model-assignment` in the playground)

```tsx
import * as React from "react";
import { TaskModelAssignment } from "@sutra/ui/agent-admin";

function TaskDemo() {
  const [value, setValue] = React.useState<TaskModelMap>({
    vision: { providerId: "corvid", modelId: "c-vision" },
    title: { providerId: "nimbus", modelId: "quartz-mini" },
    embeddings: { providerId: "hearth", modelId: "nomic-embed" },
  });
  return <TaskModelAssignment className="max-w-3xl" providers={routing} value={value} onValueChange={setValue} />;
}
```

Playground helpers in this snippet (not part of the library): routing.
