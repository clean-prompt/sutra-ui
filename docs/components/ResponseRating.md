# ResponseRating

> Good / Bad rating with optional follow-up reason chips and a thank-you state.

- Import: `import { ResponseRating } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/agent-transcript` (kit `agent`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `badReasons` | `string[]` | `defaultBadReasons` | Reason chips after a bad rating. Empty to submit immediately. |
| `goodReasons` | `string[]` | `[]` | Reason chips after a good rating. Empty (default) to submit immediately. |
| `onRate` | `(rating: ResponseRatingValue) => void` |  | Called with `good` or `bad` as soon as the user picks a thumb. |
| `onSubmit` | `(feedback: ResponseRatingSubmit) => void` |  | Called with the rating and chosen reasons once the user finishes (immediately when there are no reasons for that rating). |
| `prompt` | `React.ReactNode` | `"How did this go?"` | Prompt beside the thumbs. Default "How did this go?". |
| `thanksText` | `React.ReactNode` | `"Thanks for the feedback"` | Text shown after submitting. Default "Thanks for the feedback". |

## Example (live: `#/components/agent-sessions/response-rating` in the playground)

```tsx
import * as React from "react";
import { ResponseRating } from "@sutra/ui/agent";

function ResponseRatingDemo() {
  const [last, setLast] = React.useState("");
  return (
    <>
      <div className="space-y-2">
        <ResponseRating onSubmit={(f) => setLast(`${f.rating}${f.reasons.length ? `: ${f.reasons.join(", ")}` : ""}`)} />
        {last && <p className="text-xs text-muted-foreground">Submitted {last}</p>}
      </div>
    </>
  );
}
```
