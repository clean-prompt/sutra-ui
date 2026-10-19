# UptimeBar

> Status-page uptime strip: N buckets colored up / degraded / down / no-data, with uptime %.

- Import: `import { UptimeBar } from "@sutra/ui"` (or from `@sutra/ui/ops`)
- Source: `packages/ui/src/patterns/timeline-bar` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `buckets` (required) | `(UptimeBucket \| UptimeStatus)[]` |  | Time slices from oldest to newest: each is a status (`up`, `degraded`, `down`, `no-data`) or a `{ status, label, detail }` object. |
| `endLabel` | `React.ReactNode` |  | Text under the right end of the bar (e.g. "Today"). |
| `formatPercent` | `(percent: number) => string` | `(p) => `${p >= 99.995 ? 100 : Number(p.toFixed(2))}%`` | Formats the uptime percentage. Default is e.g. "99.95%". |
| `height` | `number` | `32` | Bar height in px. Default 32. |
| `label` | `React.ReactNode` |  | Service name shown above the bar. |
| `percent` | `number` |  | Override the computed uptime. |
| `showPercent` | `boolean` | `true` | Shows the uptime percentage next to the label. |
| `startLabel` | `React.ReactNode` |  | Text under the left end of the bar (e.g. "90 days ago"). |

## Example (live: `#/components/monitoring/uptime-bar` in the playground)

```tsx
import { UptimeBar } from "@sutra/ui/ops";

function UptimeDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      <UptimeBar label="Model gateway" buckets={uptimeBuckets(1)} startLabel="90 days ago" endLabel="Today" />
      <UptimeBar label="dilab-01 SSH" buckets={uptimeBuckets(2)} startLabel="90 days ago" endLabel="Today" height={24} />
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): uptimeBuckets.
