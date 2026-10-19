# ReviewScopeTabs

> Uncommitted / Branch vs base / Last turn scope switch with file counts.

- Import: `import { ReviewScopeTabs } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/git-review` (kit `agent`)
- `data-slot`: `scope-count`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `baseBranch` | `string` |  | Base branch for the "Branch vs base" label. |
| `counts` | `Partial<Record<ReviewScope, number>>` | `{}` | File counts per scope. |
| `defaultValue` | `ReviewScope` | `"uncommitted"` | Initial scope when `value` is not controlled. |
| `onValueChange` | `(scope: ReviewScope) => void` |  | Called with the scope when the user switches tabs. |
| `scopes` | `ReviewScope[]` | `["uncommitted", "branch", "turn"]` | Hide scopes, e.g. "turn" outside a session. |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Tab size. |
| `value` | `ReviewScope` |  | Controlled review scope: `uncommitted`, `branch` or `turn`. |
