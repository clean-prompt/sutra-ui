# ProviderQuotaChip

> Compact remaining-quota bar with threshold colors and a reset-time tooltip.

- Import: `import { ProviderQuotaChip } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/llm-providers-logo` (kit `agent-admin`)
- `data-slot`: `provider-quota-chip`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `used` (required) | `number` |  | Percent of the quota already used, 0–100. |
| `label` | `string` | `"Quota"` | Name of the quota window, e.g. "Weekly". |
| `now` | `number` |  | Reference time for the reset text; set it in tests and SSR for stable output. |
| `resetLabel` | `string` |  | Overrides the computed "Resets in 3h" text. |
| `resetsAt` | `TimeValue` |  | When the quota window resets (timestamp or date); drives the "Resets in 3h" text. |
| `thresholds` | `MeterThresholds` | `{ warn: 75, danger: 90 }` | Used-percent thresholds for warning / danger. Default 75 / 90. |

## Example (live: `#/components/providers/provider-quota-chip` in the playground)

```tsx
import { ProviderQuotaChip } from "@sutra/ui/agent-admin";

<ProviderQuotaChip used={20} resetsAt={NOW + 3 * HOUR} label="Session" />
<ProviderQuotaChip used={80} resetsAt={NOW + 26 * HOUR} label="Weekly" />
<ProviderQuotaChip used={96} resetsAt={NOW + 40 * 60_000} label="Daily" />
<ProviderQuotaChip used={55} label="Custom thresholds" thresholds={{ warn: 50, danger: 70 }} />
```

Playground helpers in this snippet (not part of the library): HOUR, NOW.
