# OrchestrationPanel

> Assign an orchestrator agent, toggle auto-decomposition into subtasks and list participating agents.

- Import: `import { OrchestrationPanel } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/workspace`)
- Source: `packages/ui/src/kits/workspace/orchestration-panel` (kit `workspace`)
- `data-slot`: `orchestration-panel`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `profiles` (required) | `KanbanAssignee[]` |  | Agent profiles that can orchestrate. |
| `autoDecompose` | `boolean` |  | Controlled state of "decompose automatically"; the orchestrator splits new tasks into subtasks. |
| `decomposing` | `boolean` |  | Shows a busy state on the decompose button while the split is running. |
| `defaultAutoDecompose` | `boolean` |  | Initial state when `autoDecompose` is not controlled. |
| `defaultOrchestratorId` | `string` |  | Initial orchestrator when `orchestratorId` is not controlled. |
| `onAutoDecomposeChange` | `(on: boolean) => void` |  | Called with the new state when the user flips the switch. |
| `onDecompose` | `() => void` |  | Split the task into subtasks now. Shows a button when set. |
| `onOrchestratorChange` | `(id: string \| undefined) => void` |  | Called with the profile id (or `undefined`) when the user picks an orchestrator. |
| `orchestratorId` | `string` |  | Controlled id of the profile that orchestrates the task; `undefined` means none. |
| `participants` | `OrchestrationParticipant[]` | `[]` | Agents working on the subtasks, listed with their roles and states. |
| `title` | `React.ReactNode` | `"Orchestration"` | Heading of the panel. |

## Example (live: `#/components/kanban-memory/orchestration-panel` in the playground)

```tsx
import * as React from "react";
import { OrchestrationPanel } from "@cleanprompt/sutra-ui/workspace";

function OrchestrationDemo() {
  const [auto, setAuto] = React.useState(true);
  const [decomposing, setDecomposing] = React.useState(false);
  const [log, setLog] = React.useState("");
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <OrchestrationPanel
        profiles={people.filter((p) => p.kind === "agent")}
        defaultOrchestratorId="conductor"
        autoDecompose={auto}
        onAutoDecomposeChange={setAuto}
        decomposing={decomposing}
        onDecompose={() => {
          setDecomposing(true);
          setTimeout(() => {
            setDecomposing(false);
            setLog("Split into 4 subtasks: plan, implement, test, document.");
          }, 900);
        }}
        participants={[
          { agent: people[3]!, role: "Implements the scrubber and playback", status: "running" },
          { agent: people[4]!, role: "Reviews the diff and runs the test suite", status: "pending" },
          { agent: people[5]!, status: "idle" },
        ]}
      />
      {log && <p className="text-xs text-muted-foreground" role="status">{log}</p>}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): people.
