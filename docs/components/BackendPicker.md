# BackendPicker

> Execution backend radio cards with live health probes, re-check and configure actions.

- Import: `import { BackendPicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/backends` (kit `agent-admin`)
- `data-slot`: `backend-picker`, `backend-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `backends` (required) | `BackendOption[]` |  | Execution backends to choose from, each with its probe. |
| `autoProbe` | `boolean` | `true` | Run every probe on mount. Default true. |
| `defaultValue` | `string` |  | Initially selected backend id when `value` is not controlled. |
| `label` | `string` | `"Execution backend"` | Accessible name of the radio group. Default "Execution backend". |
| `onConfigure` | `(id: string) => void` |  | Called with the backend id when the user presses Configure on a backend; the button is hidden when unset. |
| `onValueChange` | `(id: string) => void` |  | Called with the backend id when the user selects one. |
| `value` | `string` |  | Controlled id of the selected backend. |

## Example (live: `#/components/providers/backend-picker` in the playground)

```tsx
import * as React from "react";
import { BackendPicker } from "@cleanprompt/sutra-ui/agent-admin";

function BackendDemo() {
  const [value, setValue] = React.useState("local");
  const [configured, setConfigured] = React.useState<string | null>(null);
  const backends: BackendOption[] = React.useMemo(
    () => [
      { id: "local", name: "Local", kind: "local", description: "Run commands directly on this machine.", probe: async () => (await sleep(300), { latencyMs: 3 }) },
      { id: "docker", name: "Docker", kind: "docker", description: "Isolated container per session.", probe: async () => { await sleep(900); throw new Error("Docker daemon isn't running"); } },
      { id: "ssh", name: "SSH", kind: "ssh", description: "A remote host you control.", probe: async () => (await sleep(1400), { latencyMs: 84, detail: "build-box.internal" }) },
      { id: "modal", name: "Modal", kind: "modal", description: "Serverless sandboxes in the cloud.", configured: false },
      { id: "daytona", name: "Daytona", kind: "daytona", description: "Managed dev environments.", probe: async () => (await sleep(1100), { latencyMs: 142 }) },
      { id: "custom", name: "Custom", kind: "custom", description: "Your own executor over HTTP.", probe: async () => { await sleep(700); if (Math.random() < 0.5) throw new Error("Timed out after 5s"); return { latencyMs: 230 }; } },
    ],
    []
  );
  return (
    <div className="w-full max-w-3xl space-y-2">
      <BackendPicker backends={backends} value={value} onValueChange={setValue} onConfigure={setConfigured} />
      {/* Selected: {value} {configured && ` · Configure ${configured}`}. “Custom” fails half the time; re-check it. */}
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): sleep.
