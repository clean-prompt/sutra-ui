# RuleScopePicker

> Inline destination link ("in this session ▾") that opens a menu of rule scopes.

- Import: `import { RuleScopePicker } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/ai/permission-prompt` (kit `ai`)
- `data-slot`: `rule-scope-picker`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string` |  | Initially selected scope value when `value` is not controlled; defaults to the first scope. |
| `disabled` | `boolean` |  | Disables the picker. |
| `onValueChange` | `(value: string) => void` |  | Called with the scope value when the user picks another scope. |
| `prefix` | `React.ReactNode` | `"in"` | Text before the link (visually). Default "in". |
| `scopes` | `PermissionScopeOption[]` | `defaultPermissionScopes` | Scopes a "don't ask again" rule can apply to; defaults to the built-in set. |
| `value` | `string` |  | Controlled value of the selected scope (for example this session, this project, always). |
