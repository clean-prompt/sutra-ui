# StatusCycle

> Status pill that advances on click (Shift+click or ← goes back) with a menu to pick a status directly.

- Import: `import { StatusCycle } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/patterns/status-cycle` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `statuses` (required) | `StatusCycleOption[]` |  | Ordered statuses, e.g. unread → reading → read. |
| `defaultValue` | `string` |  | Initial status id when uncontrolled. |
| `disabled` | `boolean` |  | Disables cycling and the menu. |
| `label` | `string` | `"Status"` | Prefix for the accessible label, e.g. "Reading status". Default "Status". |
| `loop` | `boolean` | `true` | Wrap from the last status back to the first. Default true. |
| `onValueChange` | `(value: string) => void` |  | Called with the status id the user cycled or picked. |
| `showMenu` | `boolean` | `true` | Show a chevron menu to pick a status directly. Default true. |
| `size` | `"sm" \| "md"` | `"md"` | Button height and text size. |
| `value` | `string` |  | Controlled status id. Use with `onValueChange`. |

## Example (live: `#/components/social/status-cycle` in the playground)

```tsx
import * as React from "react";
import { StatusCycle } from "@cleanprompt/sutra-ui/social";

function StatusDemo() {
  const [paper, setPaper] = React.useState("unread");
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <StatusCycle statuses={paperStatuses} value={paper} onValueChange={setPaper} label="Reading status" />
        <StatusCycle statuses={taskStatuses} defaultValue="doing" size="sm" label="Task status" />
        <StatusCycle statuses={paperStatuses} defaultValue="read" showMenu={false} loop={false} />
      </div>
      <p className="text-xs text-muted-foreground">Click to advance · Shift+click or ← to go back · chevron to pick directly. Current: {paper}</p>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): paperStatuses, taskStatuses.
