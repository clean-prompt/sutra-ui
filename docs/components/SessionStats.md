# SessionStats

> Cost, API vs wall duration and code changes, as a key/value summary.

- Import: `import { SessionStats } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/ai/agent-usage` (kit `ai`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiDurationMs` | `number` |  | Time spent waiting on the API, in ms; the row is hidden when unset. |
| `cost` | `number` |  | Total cost in `currency`. |
| `currency` | `string` | `"USD"` | ISO 4217 code used to format `cost`. Default "USD". |
| `extra` | `SessionStatsItem[]` | `[]` | Extra rows appended at the end. |
| `linesAdded` | `number` |  | Lines added; shown as "+N" with `linesRemoved`. |
| `linesRemoved` | `number` |  | Lines removed; shown as "−N" with `linesAdded`. |
| `locale` | `string` | `"en-US"` | BCP 47 locale used to format `cost`. Default "en-US". |
| `wallDurationMs` | `number` |  | Elapsed wall-clock time of the session, in ms; the row is hidden when unset. |

## Example (live: `#/components/agent-sessions/session-stats` in the playground)

```tsx
import { SessionStats } from "@sutra/ui/agent";

function SessionStatsDemo() {
  return (
    <>
      <div className="max-w-sm">
        <SessionStats
          cost={1.8734}
          apiDurationMs={4 * minute + 12_000}
          wallDurationMs={18 * minute + 3_000}
          linesAdded={214}
          linesRemoved={37}
          extra={[{ label: "Tool calls", value: "58" }]}
        />
      </div>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): minute.
