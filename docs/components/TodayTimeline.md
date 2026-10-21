# TodayTimeline

> Merged chronological agenda across apps: untimed section, hourly rail, now line and overlap layout.

- Import: `import { TodayTimeline } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/suite`)
- Source: `packages/ui/src/kits/workspace/today-timeline` (kit `workspace`)
- `data-slot`: `today-timeline`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `TimelineItem[]` |  | Events, tasks and habits for the day, each with a time, title and kind. |
| `density` | `Density \| "comfortable"` |  | Rail spacing. `compact` tightens the hour rail; `normal` (default) and `relaxed` use the roomy rail. The legacy `"comfortable"` is accepted as an alias of `relaxed`. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no items. |
| `endHour` | `number` |  | Last hour on the rail; defaults to fit the items within 8 to 20. |
| `now` | `Date` |  | Fixed current time (otherwise the clock updates every minute). |
| `onSelect` | `(item: TimelineItem) => void` |  | Called with the item when the user opens it. |
| `onToggle` | `(item: TimelineItem, done: boolean) => void` |  | Toggle a task or habit. |
| `startHour` | `number` |  | First / last hour on the rail. Defaults fit the items within 8–20. |
| `title` | `React.ReactNode` |  | Heading above the timeline. |

## Example (live: `#/components/suite/today-timeline` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { TodayTimeline } from "@cleanprompt/sutra-ui/suite";

function TimelineDemo() {
  const [items, setItems] = React.useState<TimelineItem[]>(() => [
    { id: "h1", app: "habits", title: "Meditate", streak: 12, done: true },
    { id: "t0", app: "tasks", title: "Inbox zero" },
    { id: "c0", app: "calendar", title: "Mom's birthday", allDay: true },
    { id: "c1", app: "calendar", title: "Standup", start: todayAt(9), end: todayAt(9, 30), meta: "Zoom" },
    { id: "c2", app: "calendar", title: "Design review", start: todayAt(9, 15), end: todayAt(10, 15), meta: "Room 4" },
    { id: "c3", app: "calendar", title: "1:1 with Ben", start: todayAt(9, 45), end: todayAt(10, 30) },
    { id: "t1", app: "tasks", title: "Send invoice", start: todayAt(11) },
    { id: "m1", app: "mail", title: "Reply to Ana", start: todayAt(13, 30) },
    { id: "c4", app: "calendar", title: "Focus block", start: todayAt(14), end: todayAt(16) },
    { id: "h2", app: "habits", title: "Run 5k", start: todayAt(18), end: todayAt(18, 45), streak: 4 },
    { id: "f1", app: "finance", title: "Pay rent", start: todayAt(17), meta: "$1,850" },
  ]);
  const [dense, setDense] = React.useState(false);
  const toggle = (item: TimelineItem, done: boolean) =>
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, done } : i)));
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-6 @2xl:grid-cols-[1fr_16rem]">
        <TodayTimeline
          items={items}
          onToggle={toggle}
          density={dense ? "compact" : "comfortable"}
          title={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        />
        <div className="space-y-3">
          <Button variant="secondary" size="sm" onClick={() => setDense((d) => !d)}>
            {dense ? "Comfortable" : "Compact"} density
          </Button>
          {/* Empty state */}
          <TodayTimeline items={[]} />
        </div>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): todayAt.
