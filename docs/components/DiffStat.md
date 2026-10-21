# DiffStat

> "+12 −3" change summary with a tiny proportional bar.

- Import: `import { DiffStat } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/editor`)
- Source: `packages/ui/src/patterns/diff-viewer-card` (patterns)
- `data-slot`: `diff-stat`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `additions` (required) | `number` |  | Number of added lines. |
| `deletions` (required) | `number` |  | Number of removed lines. |
| `blocks` | `number` | `5` | Number of blocks in the bar. Default 5. |
| `showBar` | `boolean` | `true` | Proportional block bar. Default true. |

## Example (live: `#/components/agent-timeline/diff-stat` in the playground)

```tsx
import { DiffStat } from "@cleanprompt/sutra-ui/editor";

function DiffStatDemo() {
  return (
    <>
      <DiffStat additions={12} deletions={3} />
      <DiffStat additions={1} deletions={48} />
      <DiffStat additions={120} deletions={0} />
      <DiffStat additions={7} deletions={7} />
      <DiffStat additions={0} deletions={0} />
      <DiffStat additions={5} deletions={2} showBar={false} />
    </>
  );
}
```
