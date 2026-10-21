# ClarifySettled

> Collapsed summary of an answered clarifying-question card, expandable to the Q → A list.

- Import: `import { ClarifySettled } from "@sutra/ui"`
- Source: `packages/ui/src/kits/ai/clarify-settled` (kit `ai`)
- `data-slot`: `clarify-settled`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `ClarifySettledItem[]` |  | Answered questions to summarise, each with the question and the answer given. |
| `defaultOpen` | `boolean` | `false` | Initial expanded state when `open` is not controlled. |
| `onEdit` | `(id: string) => void` |  | Shows an "Edit" button per answer. |
| `onOpenChange` | `(open: boolean) => void` |  | Called with the new state when the user expands or collapses the list. |
| `open` | `boolean` |  | Controlled expanded state of the answers list. |
| `title` | `React.ReactNode` |  | Summary line. Default "Answered n questions". |

## Example (live: `#/components/chat-extras/clarify-settled` in the playground)

```tsx
import * as React from "react";
import { ClarifySettled, UndeliveredNotice } from "@sutra/ui";

function ClarifySettledDemo() {
  const [retrying, setRetrying] = React.useState(false);
  const [delivered, setDelivered] = React.useState(false);
  return (
    <>
      <ClarifySettled
        items={[
          { id: "db", question: "Which database should I target?", answer: "Postgres 16" },
          { id: "tests", question: "Should I add integration tests?", answer: "Yes, for the auth flow" },
          { id: "ci", question: "Update the CI config?", answer: "", skipped: true },
        ]}
      />
      {delivered ? (
        {/* Delivered ✓ */}
      ) : (
        <UndeliveredNotice
          description="The agent session ended before your answer arrived."
          retrying={retrying}
          onRetry={() => {
            setRetrying(true);
            setTimeout(() => {
              setRetrying(false);
              setDelivered(true);
            }, 900);
          }}
        />
      )}
    </>
  );
}
```
