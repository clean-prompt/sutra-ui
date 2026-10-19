# ProviderRow

> One provider: monogram logo, auth method, status, token expiry, model count, quota and actions.

- Import: `import { ProviderRow } from "@sutra/ui"` (or from `@sutra/ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/llm-providers` (kit `agent-admin`)
- `data-slot`: `provider-row`, `provider-auth`, `provider-expiry`, `provider-model-count`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `provider` (required) | `ProviderEntry` |  | The provider to show (name, status, auth method, quotas). |
| `now` | `number` |  | Reference time for relative quota labels; set it in tests and SSR for stable output. |
| `onConnect` | `(provider: ProviderEntry) => void` |  | Called with the provider when the user presses Connect on an unconfigured provider. |
| `onDisconnect` | `(provider: ProviderEntry) => void` |  | Called with the provider when the user disconnects a connected provider. |
| `onManage` | `(provider: ProviderEntry) => void` |  | Called with the provider when the user presses Manage on a connected provider. |
