# QuotaStrip

> Row of provider quota rings: one column on phones, two on small screens, four on wide ones.

- Import: `import { QuotaStrip } from "@sutra/ui"` (or from `@sutra/ui/ai`)
- Source: `packages/ui/src/kits/ai/usage-quota` (kit `ai`)
- `data-slot`: `quota-strip`, `quota-strip-skeleton`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `quotas` (required) | `UsageQuota[]` |  | Quotas to show, one ring each. |
| `emptyState` | `React.ReactNode` | `"No quotas"` | Shown when `quotas` is empty. Default "No quotas". |
| `loading` | `boolean` |  | Waiting for the quotas: with none yet, `loadingRows` placeholder rings stand in (rings without a reading show placeholders too). |
| `loadingRows` | `number` | `4` | Placeholder rings while loading with no quotas. Default 4. |
| `mode` | `UsageQuotaMode` |  | What each ring and number show: `left` (remaining) or `used`. Default "left". |
| `now` | `number` |  | Reference time for pace and reset text. Default `Date.now()` at render. |
| `size` | `QuotaRingProps["size"]` |  | Ring size. |
| `tolerance` | `number` |  | "On pace" band in percentage points. Default 5. |
| `variant` | `"card" \| "plain"` | `"card"` | `card` (default): a padded card surface · `plain`: no surface. |
