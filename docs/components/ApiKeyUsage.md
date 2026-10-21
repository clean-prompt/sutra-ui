# ApiKeyUsage

> Compact per-endpoint usage table with inline bars and error rate.

- Import: `import { ApiKeyUsage } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/security`)
- Source: `packages/ui/src/kits/identity/api-keys` (kit `identity`)
- `data-slot`: `api-key-usage`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` (required) | `ApiKeyUsageRow[]` |  | Usage rows, one per endpoint or key, each with a label and request counts. |
| `labelHeader` | `React.ReactNode` | `"Endpoint"` | Header of the label column. Default "Endpoint". |
| `now` | `number` |  | Reference time for relative labels; set it in tests and SSR for stable output. |
| `showTotal` | `boolean` | `true` | Show a totals row. Default true. |
