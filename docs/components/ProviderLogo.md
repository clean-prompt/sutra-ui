# ProviderLogo

> Local monogram tile for a provider (never fetches a remote logo). A `Monogram` preset (solid seed colour).

- Import: `import { ProviderLogo } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/llm-providers-logo` (kit `agent-admin`)
- `data-slot`: `provider-logo`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `string` |  | Provider name; used for the accessible name and, without `monogram`, to derive the letter. |
| `color` | `string` |  | Tile color; defaults to a stable color derived from the name. |
| `monogram` | `string` |  | Override the generated monogram (1–2 characters). |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Tile size: `sm`, `md` or `lg`. |
