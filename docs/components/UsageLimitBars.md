# UsageLimitBars

> Rolling usage-limit bars with threshold coloring, reset captions, a window toggle and per-model attribution.

- Import: `import { UsageLimitBars } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent`)
- Source: `packages/ui/src/kits/ai/agent-usage` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `windows` (required) | `UsageLimitWindow[]` |  | Usage windows (session, weekly and so on), each with a label, percent used and reset time; a window with a `view` shows only under that view. |
| `defaultView` | `string` |  | Initially active view when `view` is not controlled. |
| `models` | `UsageModelShare[]` |  | Per-model attribution ("Opus 62% of usage"). |
| `now` | `number` |  | Reference time for reset countdowns; set it in tests and SSR for stable output. |
| `onViewChange` | `(view: string) => void` |  | Called with the view value when the user switches views. |
| `thresholds` | `MeterThresholds` | `{ warn: 75, danger: 90 }` | Used-percent levels at which a bar turns warning and danger. |
| `title` | `React.ReactNode` |  | Heading of the card. |
| `view` | `string` |  | Controlled value of the active view from `views`. |
| `views` | `{ value: string; label: string }[]` |  | Toggle options for the window views, e.g. Session / Weekly. |

## Example (live: `#/components/agent-sessions/usage-limits` in the playground)

```tsx
import * as React from "react";
import { UsageLimitBars } from "@cleanprompt/sutra-ui/agent";

function UsageLimitsDemo() {
  const [now] = React.useState(() => Date.now());
  const nextMonday = React.useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  }, [now]);
  return (
    <>
      <div className="max-w-md">
        <UsageLimitBars
          title="Plan usage"
          now={now}
          views={[
            { value: "session", label: "Session" },
            { value: "weekly", label: "Weekly" },
          ]}
          windows={[
            { id: "session", label: "Current session", percent: 38, resetsAt: now + (2 * 60 + 14) * minute, view: "session" },
            { id: "weekly", label: "Weekly", percent: 78, resetsAt: nextMonday, view: "weekly" },
            { id: "weekly-model", label: "Weekly (Opus)", percent: 93, resetsAt: nextMonday, view: "weekly" },
          ]}
          models={[
            { name: "Opus", percent: 62 },
            { name: "Sonnet", percent: 31 },
            { name: "Haiku", percent: 7 },
          ]}
        />
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): minute.
