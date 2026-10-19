# CreateAgentDialog

> Dialog for creating an agent: name, avatar, role, description, persona and model / toolset slots.

- Import: `import { CreateAgentDialog } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-persona` (kit `agent-admin`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `defaultValues` | `Partial<CreateAgentValues>` |  | Initial values of the form fields (name, description and so on). |
| `existingNames` | `string[]` | `[]` | Names already taken (case-insensitive). |
| `modelSlot` | `React.ReactNode` |  | Default model picker (e.g. a `SimpleSelect`). |
| `onCreate` | `(values: CreateAgentValues) => void \| Promise<void>` |  | May return a promise; throw to keep the dialog open. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `submitLabel` | `React.ReactNode` | `"Create agent"` | Label of the submit button. Default "Create agent". |
| `title` | `React.ReactNode` | `"Create agent"` | Dialog heading. Default "Create agent". |
| `toolsetsSlot` | `React.ReactNode` |  | Toolset picker. |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog (wrapped with `asChild`). |

## Example (live: `#/components/channels/create-agent` in the playground)

```tsx
import * as React from "react";
import { AgentAvatar, CreateAgentDialog, randomAvatarSpec } from "@sutra/ui/agent-admin";
import { Button } from "@sutra/ui/core";
import { SimpleSelect } from "@sutra/ui/forms";
import { RiAddLine } from "@sutra/ui/icons";

function CreateAgentDemo() {
  const [agents, setAgents] = React.useState<{ name: string; avatar: AgentAvatarSpec; role: string }[]>([
    { name: "Ada", avatar: randomAvatarSpec("ada"), role: "Planner" },
  ]);
  return (
    <div className="flex flex-col items-center gap-4">
      <CreateAgentDialog
        existingNames={agents.map((a) => a.name)}
        onCreate={async (v) => {
          await new Promise((r) => setTimeout(r, 400));
          setAgents((a) => [...a, { name: v.name, avatar: v.avatar, role: v.role }]);
        }}
        modelSlot={
          <SimpleSelect
            aria-label="Default model"
            defaultValue="sonnet"
            options={[
              { value: "sonnet", label: "Balanced" },
              { value: "opus", label: "Most capable" },
              { value: "haiku", label: "Fastest" },
            ]}
          />
        }
        toolsetsSlot={<p className="text-xs text-muted-foreground">Toolset picker goes here (web, files, terminal…).</p>}
        trigger={<Button leadingIcon={<RiAddLine />}>New agent</Button>}
      />
      <ul className="flex flex-wrap justify-center gap-3">
        {agents.map((a) => (
          <li key={a.name} className="flex items-center gap-2 rounded-box border border-border px-3 py-2">
            <AgentAvatar spec={a.avatar} size={28} label="" />
            <span className="text-sm font-medium">{a.name}</span>
            {a.role && <span className="text-xs text-muted-foreground">{a.role}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
