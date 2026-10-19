# QuotaRing

> Provider quota ring: a RingMeter with the percentage inside, the provider icon and name, the window label and a pace or reset line coloured by tone ("On pace · 10% to spare", "Runs out in 4d at this rate", "Resets in 3h 12m").

- Import: `import { QuotaRing } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/usage-quota` (kit `ai`)
- `data-slot`: `quota-ring`, `quota-ring-value`, `quota-ring-status`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | The window: "This week", "5-hour session", "Premium requests". Same field as `UsageLimitWindow.label`. |
| `provider` (required) | `string` |  | "Claude", "Codex", "GitHub Copilot". |
| `accent` | `Accent` |  | Categorical colour of the ring or bar. Defaults to a per-provider colour (see `usageQuotaAccent`). |
| `icon` | `React.ReactNode` |  | Provider mark, shown before the name (decorative). Falls back to a monogram in `QuotaBars`. |
| `limit` | `number` |  | Size of the quota. Default 100 (so `used` is a percentage). |
| `loading` | `boolean` |  | Waiting for the first reading: with no `used`/`percent` the ring is an empty track and the status line a placeholder. |
| `mode` | `UsageQuotaMode` | `"left"` | What the ring and the number show. Default "left". |
| `now` | `number` |  | Reference time for the pace and reset text. Default `Date.now()` at render. |
| `pace` | `boolean` |  | Set false to show the reset time instead of the pace. Default true. |
| `percent` | `number` |  | Percent of the limit used, 0–100 (the `UsageLimitWindow` field); read when `used` is not set. |
| `resetLabel` | `React.ReactNode` |  | Overrides the computed reset caption shown when there is no pace. |
| `resetsAt` | `TimeInput` |  | When the window resets; drives the pace line and the reset caption. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Ring diameter: sm 44, md 56 (default), lg 72. |
| `startsAt` | `TimeInput` |  | Window start; enables the pace line ("On pace · 10% to spare"). |
| `tolerance` | `number` |  | "On pace" band in percentage points. Default 5. |
| `used` | `number` |  | Usage so far in units of `limit`. Wins over `percent`. |
