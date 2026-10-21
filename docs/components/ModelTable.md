# ModelTable

> Model registry table: family groups, filters, sorting, state-dependent actions and smoke-test rows.

- Import: `import { ModelTable } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/ops`)
- Source: `packages/ui/src/kits/ops/model-row` (kit `ops`)
- `data-slot`: `model-table`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `models` (required) | `ModelInfo[]` |  | Models to list, grouped by family unless `grouped` is false. |
| `defaultFilter` | `ModelFilter` | `"all"` | Initial filter when `filter` is not controlled. |
| `defaultSort` | `{ key: ModelSortKey; direction: "asc" \| "desc" } \| null` | `null` | Initial sort column and direction; unsorted when `null` or unset. |
| `emptyState` | `React.ReactNode` | `"No models match this filter"` | Shown when no model matches the filter. |
| `filter` | `ModelFilter` |  | Controlled filter state (search, download status, state). |
| `groupBy` | `(model: ModelInfo) => string` | `(m) => m.family ?? modelFamily(m.name)` | Custom grouping: returns the group name of a model. Defaults to its family. |
| `grouped` | `boolean` | `true` | Group rows by family. Default true. |
| `hideFilters` | `boolean` |  | Hide the filter bar. |
| `onAction` | `(model: ModelInfo, action: ModelAction) => void` |  | Called with the model and the action when the user picks one on a row. |
| `onDismissTest` | `(name: string) => void` |  | Called with the model name when the user dismisses its test result. |
| `onFilterChange` | `(filter: ModelFilter) => void` |  | Called with the filter when the user changes it. |
| `pendingActions` | `Record<string, ModelAction \| null \| undefined>` |  | name → action in flight. |
| `testResults` | `Record<string, ModelTestResult \| null \| undefined>` |  | name → smoke-test result. |

## Example (live: `#/components/monitoring/model-table` in the playground)

```tsx
import * as React from "react";
import { ModelTable } from "@cleanprompt/sutra-ui/ops";

function ModelTableDemo() {
  const [models, setModels] = React.useState(initialModels);
  const [pending, setPending] = React.useState<Record<string, ModelAction | null>>({});
  const [tests, setTests] = React.useState<Record<string, ModelTestResult | null>>({});

  useInterval(() => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.state !== "downloading" || !m.download) return m;
        const progress = (m.download.progress ?? 0) + 4;
        return progress >= 100
          ? { ...m, state: "stopped", download: { ...m.download, status: "cached", progress: 100 } }
          : { ...m, download: { ...m.download, progress } };
      })
    );
  }, 800);

  const patch = (name: string, p: Partial<ModelInfo>) => setModels((s) => s.map((m) => (m.name === name ? { ...m, ...p } : m)));

  const onAction = async (m: ModelInfo, a: ModelAction) => {
    if (a === "pin" || a === "unpin") return patch(m.name, { pinned: a === "pin" });
    if (a === "test") {
      setTests((t) => ({ ...t, [m.name]: { ok: true, running: true } }));
      await new Promise((r) => setTimeout(r, 900));
      setTests((t) => ({ ...t, [m.name]: { ok: true, latencyMs: 640 + Math.random() * 300, tokensPerSecond: 40 + Math.random() * 30, reply: "Hello! How can I help you today?" } }));
      return;
    }
    if (a === "download") return patch(m.name, { state: "downloading", download: { ...m.download, status: "downloading", progress: 0 } });
    if (a === "cancel") return patch(m.name, { state: "stopped", download: { ...m.download, status: "partial" } });
    setPending((p) => ({ ...p, [m.name]: a }));
    if (a === "start") patch(m.name, { state: "starting" });
    await new Promise((r) => setTimeout(r, 1200));
    setPending((p) => ({ ...p, [m.name]: null }));
    const next: Partial<Record<ModelAction, ModelInfo["state"]>> = { start: "ready", wake: "ready", sleep: "sleeping", stop: "stopped" };
    patch(m.name, { state: next[a] ?? m.state, idleSeconds: 0, error: undefined });
  };

  return (
    <ModelTable
      className="w-full"
      models={models}
      onAction={onAction}
      pendingActions={pending}
      testResults={tests}
      onDismissTest={(n) => setTests((t) => ({ ...t, [n]: null }))}
    />
  );
}
```

Playground helpers in this snippet (not part of the library): initialModels, useInterval.
