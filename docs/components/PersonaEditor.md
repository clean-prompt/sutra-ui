# PersonaEditor

> Persona / SOUL.md editor: a markdown textarea with a rendered preview tab.

- Import: `import { PersonaEditor } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-persona` (kit `agent-admin`)
- `data-slot`: `persona-editor`, `persona-preview`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` | `""` | Initial text when `value` is not controlled. |
| `hint` | `React.ReactNode` | `"Markdown. Sets the agent's voice, values and boundaries (SOUL.md)."` | Helper text under the text area; pass `null` to hide it. |
| `label` | `React.ReactNode` | `"Persona"` | Label of the text area. Default "Persona". |
| `maxLength` | `number` |  | Maximum number of characters; also shows a character counter. |
| `onValueChange` | `(value: string) => void` |  | Called with the new text on every edit. |
| `placeholder` | `string` | `"# Who you are\nYou are a careful research assistant…"` | Placeholder shown while the text area is empty. |
| `rows` | `number` | `8` | Textarea rows. Default 8. |
| `value` | `string` |  | Controlled persona text (Markdown). |

## Example (live: `#/components/channels/persona-editor` in the playground)

```tsx
import { PersonaEditor } from "@sutra/ui/agent-admin";

<PersonaEditor
  className="w-full max-w-xl"
  defaultValue={"# Ada\nYou are a calm, precise **planner**.\n\n- Break work into small steps\n- Ask before spending money\n- Cite sources"}
/>
```
