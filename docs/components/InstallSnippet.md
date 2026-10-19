# InstallSnippet

> Tabbed install commands per platform or package manager, each copyable.

- Import: `import { InstallSnippet } from "@sutra/ui"` (or from `@sutra/ui/blocks`)
- Source: `packages/ui/src/blocks/marketing-blocks` (blocks)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` (required) | `InstallSnippetTab[]` |  | Install methods as tabs; each has an `id`, a `label` and a `command` (or several). |
| `defaultValue` | `string` |  | Initially selected tab id when uncontrolled. |
| `label` | `string` | `"Install method"` | Accessible name of the tab list. |
| `onValueChange` | `(id: string) => void` |  | Called with the id of the tab the user picked. |
| `value` | `string` |  | Controlled selected tab id. Use with `onValueChange`. |

## Example (live: `#/components/billing-marketing/install-snippet` in the playground)

```tsx
import { InstallSnippet } from "@sutra/ui/blocks";

<InstallSnippet tabs={installTabs} className="max-w-xl" />
```
