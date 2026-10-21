# TimelineBar

> Time-window bar with spans per lane (session uptime, GPU job occupancy), live spans and a tick axis.

- Import: `import { TimelineBar } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/patterns/timeline-bar` (patterns)
- `data-slot`: `timeline-bar`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `from` (required) | `TimeInput` |  | Window start. |
| `to` (required) | `TimeInput` |  | Window end. |
| `formatDuration` | `(ms: number) => string` | `formatTimelineDuration` | Formats the duration shown in the span tooltip. Default is a short "1h 20m". |
| `formatTime` | `(time: Date) => string` |  | Formats the time shown in the span tooltip. |
| `label` | `string` | `"Timeline"` | Accessible name. |
| `labelWidth` | `number` | `112` | Width of the lane label column in px. Default 112. |
| `laneHeight` | `number` | `24` | Lane height in px. Default 24. |
| `lanes` | `TimelineLane[]` |  | Multiple labelled lanes. |
| `locale` | `string` |  | BCP 47 locale for the default time formatting. |
| `now` | `TimeInput` |  | Reference "now" for live spans. Default Date.now(). |
| `onSpanClick` | `(span: TimelineSpan, lane?: TimelineLane) => void` |  | Called with the span (and its lane) when a span is clicked; spans then become buttons. |
| `showAxis` | `boolean` | `true` | Shows the time axis under the lanes. |
| `showNow` | `boolean` | `true` | Show the "now" marker when inside the window. Default true. |
| `spans` | `TimelineSpan[]` |  | Single unlabelled lane (shorthand). |
| `tickFormatter` | `(time: Date) => string` |  | Formats the axis tick labels. Default depends on the window: time of day, or date and time across days. |
| `ticks` | `number` | `6` | Number of tick intervals. Default 6; fewer are drawn when the axis is too narrow for their labels. |

## Example (live: `#/components/monitoring/timeline-bar` in the playground)

```tsx
import * as React from "react";
import { TimelineBar } from "@sutra/ui/ops";

function TimelineDemo() {
  const [now, setNow] = React.useState(() => Date.now());
  useInterval(() => setNow(Date.now()), 5000);
  const from = now - 6 * 3600_000;
  const h = (n: number) => now - n * 3600_000;
  return (
    <div className="flex w-full flex-col gap-8">
      <TimelineBar
        label="SSH sessions, last 6 hours"
        from={from}
        to={now + 15 * 60_000}
        now={now}
        lanes={[
          {
            id: "alice",
            label: "alice@dilab-01",
            spans: [
              { id: "1", start: h(5.8), end: h(4.2), label: "ssh", tone: "info" },
              { id: "2", start: h(3), label: "tmux main", tone: "success", live: true, detail: "from 192.168.1.20" },
            ],
          },
          { id: "bob", label: "bob@dilab-02", spans: [{ id: "3", start: h(4.5), end: h(1.1), label: "jupyter", tone: "primary" }] },
          {
            id: "carol",
            label: "carol@dilab-01",
            spans: [
              { id: "4", start: h(7), end: h(5), label: "vscode", tone: "neutral" },
              { id: "5", start: h(0.6), label: "ssh", tone: "warning", live: true },
            ],
          },
        ]}
      />
      <TimelineBar
        label="GPU occupancy"
        from={from}
        to={now}
        now={now}
        laneHeight={18}
        ticks={6}
        lanes={[0, 1, 2, 3].map((g) => ({
          id: `gpu${g}`,
          label: `GPU ${g}`,
          spans:
            g === 3
              ? []
              : [
                  { id: `${g}a`, start: h(5.5 - g), end: h(3.5 - g * 0.5), label: g === 0 ? "train exp41" : "vllm qwen3", tone: g === 0 ? "primary" : "info" },
                  { id: `${g}b`, start: h(2 - g * 0.3), live: true, label: "train exp42", tone: "success" },
                ],
        }))}
      />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): useInterval.
