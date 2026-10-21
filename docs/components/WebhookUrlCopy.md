# WebhookUrlCopy

> Read-only monospace value with a copy button (endpoint URLs).

- Import: `import { WebhookUrlCopy } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/webhooks` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `url` (required) | `string` |  | Webhook endpoint URL, shown in mono with a copy button. |
| `copyLabel` | `string` | `"Copy URL"` | Accessible label of the copy button. Default "Copy URL". |
