# ToolsetCard

> Toolset summary card: icon, description, tool count, enabled switch, health pill and Configure.

- Import: `import { ToolsetCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/tool-toggles` (kit `agent-admin`)
- `data-slot`: `toolset-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Toolset name, shown as the card title. |
| `defaultEnabled` | `boolean` | `false` | Initial on/off state when `enabled` is not controlled. |
| `description` | `React.ReactNode` |  | Short summary of what the toolset provides. |
| `disabled` | `boolean` |  | Disables the switch and the Configure button. |
| `enabled` | `boolean` |  | Controlled on/off state of the toolset switch. |
| `health` | `ToolsetHealth` |  | Toolset health (`configured`, `needs-keys`, `error`); shows a health pill, and `error` colours `healthMessage` red. |
| `healthMessage` | `React.ReactNode` |  | Error or hint shown under the description. |
| `icon` | `React.ReactNode` |  | Toolset icon, shown beside the name. |
| `onConfigure` | `() => void` |  | Called when the user presses Configure; the button is hidden when unset. |
| `onEnabledChange` | `(enabled: boolean) => void` |  | Called with the new state when the user flips the switch. |
| `toolCount` | `number` |  | Number of tools in the toolset, shown as a count. |

## Example (live: `#/components/capabilities/toolset-cards` in the playground)

```tsx
import { ToolsetCard } from "@cleanprompt/sutra-ui/agent-admin";

{TOOLSETS.map((t) => (
  <ToolsetCard key={t.id} name={t.name} icon={t.icon} description={t.description} toolCount={t.toolCount} defaultEnabled={t.enabled} health={t.health} healthMessage={t.healthMessage} onConfigure={() => {}} />
))}
```

Playground helpers in this snippet (not part of the library): TOOLSETS.
