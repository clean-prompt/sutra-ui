# NameCheckboxPicker

> Searchable checkbox list of names (skills, toolsets, events) with select-all and a count.

- Import: `import { NameCheckboxPicker } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/agent-jobs-form` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | Legend, also used to name the search box. |
| `options` (required) | `(string \| NameCheckboxOption)[]` |  | Choices as plain names or objects with a name, label and description. |
| `defaultValue` | `string[]` | `[]` | Initially checked names when `value` is not controlled. |
| `disabled` | `boolean` |  | Disables every checkbox and the search box. |
| `emptyState` | `React.ReactNode` |  | Shown when the search matches nothing. Default "No matches". |
| `emptyText` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `listClassName` | `string` |  | Class for the scrolling list. |
| `onValueChange` | `(value: string[]) => void` |  | Called with the checked names when the user checks or unchecks an option. |
| `searchable` | `boolean` |  | Show the search box. Default: when there are more than 6 options. |
| `value` | `string[]` |  | Controlled names of the checked options. |
