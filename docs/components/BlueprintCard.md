# BlueprintCard

> Automation template card: icon, title, description, schedule and tags; expands into a slot form that creates a job.

- Import: `import { BlueprintCard } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-blueprints` (kit `agent-admin`)
- `data-slot`: `blueprint-cli`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `blueprint` (required) | `Blueprint` |  | The template to show (title, description, icon and the slots it asks for). |
| `channels` | `SelectOption[]` |  | Options for `channel` slots. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when `expanded` is not controlled. |
| `expanded` | `boolean` |  | Controlled expanded state of the slot form. |
| `onCreate` | `(blueprint: Blueprint, values: BlueprintValues) => void \| Promise<void>` |  | Called with the blueprint and the filled slot values when the user creates the job (`create` variant). |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the card. |
| `onOpen` | `(blueprint: Blueprint) => void` |  | Called with the blueprint when the user opens its app (`open` variant). |
| `variant` | `"create" \| "open"` | `"create"` | `create` expands into the slot form; `open` links to the app instead. |
