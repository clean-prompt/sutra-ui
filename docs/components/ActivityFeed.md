# ActivityFeed

> Alias of `SecurityActivityFeed`.

**Deprecated:** Use `SecurityActivityFeed`.

- Import: `import { ActivityFeed } from "@sutra/ui"` (or from `@sutra/ui/security`)
- Source: `packages/ui/src/kits/identity/connected-apps` (kit `identity`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` (required) | `SecurityEvent[]` |  | Security events, newest first, each with a kind, time and optional details. |
| `compact` | `boolean` |  | **Deprecated.** Use `density="compact"`. Tighter row spacing, used inside drawers. |
| `density` | `Density` |  | Row spacing; `compact` is used inside drawers. |
| `empty` | `React.ReactNode` |  | **Deprecated.** Use `emptyState`. Content shown when there is nothing to list. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no events. Default "No activity yet". |
| `groupByDay` | `boolean` |  | Group under day headings. Default true. |
| `now` | `number` |  | Reference time for relative labels; set it in tests and SSR for stable output. |
| `onEventClick` | `(event: SecurityEvent) => void` |  | Click handler; without it, rows expand inline to show details. |

## Example (live: `#/components/security/activity-feed` in the playground)

```tsx
import { SecurityActivityFeed } from "@sutra/ui/security";

<SecurityActivityFeed events={events} className="max-w-xl" />
```

Playground helpers in this snippet (not part of the library): events.
