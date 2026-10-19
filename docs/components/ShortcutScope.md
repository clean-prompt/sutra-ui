# ShortcutScope

> Activates a scope while mounted; `useShortcut` calls inside default to this scope.

- Import: `import { ShortcutScope } from "@sutra/ui"` (or from `@sutra/ui/suite`)
- Source: `packages/ui/src/patterns/shortcuts` (patterns)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Scope name; shortcuts registered inside it are listed under this group. |
| `children` | `React.ReactNode` |  | The subtree the scope applies to. |
| `enabled` | `boolean` |  | Turns the scope's shortcuts on or off without unmounting. |
| `exclusive` | `boolean` |  | Block every lower scope, including global (modal behaviour). |
