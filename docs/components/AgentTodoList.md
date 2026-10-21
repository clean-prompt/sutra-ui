# AgentTodoList

> Read-only agent task list with progress header, status glyphs and a shimmering active item.

- Import: `import { AgentTodoList } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-tasks` (kit `agent`)
- `data-slot`: `todo-progress-text`, `todo-spinner`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `AgentTodoItem[]` |  | Todo items in order, each with a label and status (pending, in progress, completed). |
| `collapsible` | `boolean` | `true` | Header toggles the list. Default true. |
| `defaultOpen` | `boolean` | `true` | Initial expanded state when `open` is not controlled. |
| `density` | `Density` |  | `compact` drops the card chrome for use inline in a transcript. Default "normal". |
| `onOpenChange` | `(open: boolean) => void` |  | Called with the new state when the user expands or collapses the list. |
| `open` | `boolean` |  | Controlled expanded state of the list when `collapsible`. |
| `showProgress` | `boolean` | `true` | Thin progress bar under the header. Default true. |
| `title` | `React.ReactNode` | `"Tasks"` | Header title. Default "Tasks". |
| `variant` | `"default" \| "compact"` |  | **Deprecated.** Use `density` (`"compact"`). `compact` drops the card chrome for use inline in a transcript. |

## Example (live: `#/components/agent-sessions/agent-todo-list` in the playground)

```tsx
import * as React from "react";
import { AgentTodoList } from "@cleanprompt/sutra-ui/agent";

function TodoListDemo() {
  const [step, setStep] = React.useState(1);
  React.useEffect(() => {
    const id = setInterval(() => setStep((s) => (s > todoPlan.length ? 0 : s + 1)), 2200);
    return () => clearInterval(id);
  }, []);
  const items: AgentTodoItem[] = todoPlan.map((t, i) => ({
    ...t,
    status: i < step - 1 ? "succeeded" : i === step - 1 ? "running" : "pending",
  }));
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AgentTodoList items={items} />
        <div className="space-y-1">
          {/* Compact */}
          <AgentTodoList items={items} density="compact" title="Update Todos" />
        </div>
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): todoPlan.
