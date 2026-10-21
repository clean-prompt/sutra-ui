# ScopeSelector

> Selector for which profile a capability change applies to. The ref goes to the trigger.

- Import: `import { ScopeSelector } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/capabilities` (kit `agent-admin`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `profiles` (required) | `string[]` |  | Available profile names. |
| `className` | `string` |  | Extra classes for the trigger. |
| `defaultValue` | `string \| null` | `null` | Initially selected profile when `value` is not controlled; `null` means all profiles. |
| `disabled` | `boolean` |  | Disables the selector. |
| `onValueChange` | `(profile: string \| null) => void` |  | Called with the profile name, or `null` for all profiles. |
| `prefix` | `React.ReactNode` | `"Applies to"` | Text before the selected profile in the trigger. |
| `size` | `"sm" \| "md"` | `"sm"` | Trigger size. |
| `value` | `string \| null` |  | Selected profile, or `null` for all profiles. |
