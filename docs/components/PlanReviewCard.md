# PlanReviewCard

> Agent plan in a card: select text to comment, then approve (choosing the next mode) or keep planning.

- Import: `import { PlanReviewCard } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/plan-review` (kit `agent`)
- `data-slot`: `plan-review`, `plan-content`, `plan-comment-trigger`, `plan-comments`, `plan-comment`, `plan-next-mode`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `plan` (required) | `string` |  | Plan body (Markdown). |
| `collapsedHeight` | `number` | `240` | Max height (px) of the collapsed plan. Default 240. |
| `comments` | `PlanComment[]` |  | Controlled comments, each quoting a passage of the plan. |
| `defaultComments` | `PlanComment[]` | `[]` | Initial comments when `comments` is not controlled. |
| `defaultExpanded` | `boolean` | `true` | Initial expanded state when `expanded` is not controlled. |
| `defaultNextMode` | `string` |  | Initially chosen mode when `nextMode` is not controlled. |
| `expanded` | `boolean` |  | Controlled expanded state of the plan body. |
| `nextMode` | `string` |  | Controlled id of the mode chosen for after approval. |
| `nextModes` | `PlanNextModeOption[]` | `defaultPlanNextModes` | Mode options offered after approval. `[]` hides the picker. |
| `onApprove` | `(approval: PlanApproval) => void` |  | Called with the approval (chosen next mode and comments) when the user approves the plan. |
| `onCommentsChange` | `(comments: PlanComment[]) => void` |  | Called with the comments when the user adds, edits or removes one. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the plan. |
| `onFeedback` | `(comments: PlanComment[], message: string) => void` |  | "Keep planning": sends the comments (and optional message) back as feedback. |
| `onNextModeChange` | `(mode: string) => void` |  | Called with the mode id when the user picks one. |
| `outcome` | `PlanReviewOutcome \| null` |  | Recorded outcome: renders read-only. |
| `quoteLength` | `number` | `80` | Max quote length shown in the composer and list. Default 80. |
| `readOnly` | `boolean` | `false` | Disables commenting and the approve and feedback actions; always true when `outcome` is set. |
| `title` | `React.ReactNode` | `"Plan"` | Card heading. Default "Plan". |

## Example (live: `#/components/agent-permissions/plan-review` in the playground)

```tsx
import * as React from "react";
import { PlanReviewCard } from "@sutra/ui/agent";
import { Button } from "@sutra/ui/core";
import { RiRefreshLine } from "@sutra/ui/icons";

function PlanReviewDemo() {
  const [key, setKey] = React.useState(0);
  const [log, setLog] = React.useState<string | null>(null);
  return (
    <>
      <PlanReviewCard
        key={key}
        plan={planMarkdown}
        title="Plan: dark mode"
        className="max-w-2xl"
        defaultComments={[{ id: "seed", quote: "Persist the choice to localStorage under app.theme", body: "Use the existing useLocalStorage hook." }]}
        onApprove={(a) => setLog(`onApprove(${JSON.stringify({ mode: a.mode, comments: a.comments.length })})`)}
        onFeedback={(c, m) => setLog(`onFeedback(${c.length} comments, ${JSON.stringify(m)})`)}
      />
      {log && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code className="rounded-xs bg-muted px-1.5 py-0.5 font-mono">{log}</code>
          <Button
            size="xs"
            variant="ghost"
            leadingIcon={<RiRefreshLine />}
            onClick={() => {
              setLog(null);
              setKey((k) => k + 1);
            }}
          >
            Reset
          </Button>
        </div>
      )}
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): planMarkdown.
