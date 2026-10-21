# BranchPill

> Branch name chip: icon, head-truncated name, optional status dot and copy button.

- Import: `import { BranchPill } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/git-review-changes` (kit `agent`)
- `data-slot`: `branch-pill`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Branch name, shown in mono and copied by the copy button. |
| `copyable` | `boolean` | `true` | Copy button. Default true. |
| `maxLength` | `number` | `28` | Max visible characters; longer names lose their head. Default 28. |
| `size` | `"sm" \| "md"` | `"md"` | Pill size. |
| `status` | `BranchStatus` |  | Working-tree state of the branch (`clean`, `dirty` or `conflict`); adds a status dot. |

## Example (live: `#/components/browser-review/branch-pill` in the playground)

```tsx
import { BranchPill } from "@sutra/ui/agent";

<BranchPill name="main" status="clean" />
<BranchPill name="feature/agent-browser-artifacts-and-git-review" status="dirty" />
<BranchPill name="fix/merge-conflict-in-pricing" status="conflict" maxLength={16} />
<BranchPill name="release/2.4" size="sm" copyable={false} />
```
