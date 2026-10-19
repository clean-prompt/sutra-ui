# ScopeIcon

> Icon for a scope as a ready-to-render node.

- Import: `import { ScopeIcon } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/consent` (kit `identity`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `scope` (required) | `ScopeInput` |  | Scope id or object whose definition picks the icon. |
| `className` | `string` |  | Extra classes for the icon. |
| `definitions` | `Record<string, ScopeDefinition>` |  | Extra or overriding scope definitions, merged over the built-in set. |
