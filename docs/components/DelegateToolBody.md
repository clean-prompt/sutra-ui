# DelegateToolBody

> Body for a "delegate" tool call: one row per child task with status and an open button.

- Import: `import { DelegateToolBody } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/subagents` (kit `agent-admin`)
- `data-slot`: `delegate-tool-body`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tasks` (required) | `DelegateTask[]` |  | Delegated tasks (child agents) with their prompt, status and result. |
| `onOpen` | `(id: string) => void` |  | Opens the child's transcript. |

## Example (live: `#/components/channels/delegate-tool` in the playground)

```tsx
import { DelegateToolBody } from "@cleanprompt/sutra-ui/agent-admin";

<DelegateToolBody
  className="w-full max-w-xl"
  onOpen={() => {}}
  tasks={[
    { id: "1", title: "Find where requests are throttled", agent: "Scout", status: "done", summary: "3 call sites", elapsedMs: 41_000 },
    { id: "2", title: "Write the limiter and wire it in", agent: "Implementer", status: "running", summary: "edit src/server/limits.ts", elapsedMs: 52_000 },
    { id: "3", title: "Document the new headers", agent: "Doc writer", status: "waiting" },
  ]}
/>
```
