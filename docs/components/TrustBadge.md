# TrustBadge

> Trust scale badge (verified → flagged) with a tooltip explaining what the level means.

- Import: `import { TrustBadge } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/capabilities` (kit `agent-admin`)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `level` (required) | `CapabilityTrustLevel` |  | Trust level (`verified`, `trusted`, `community`, `unverified` or `flagged`); sets the label, tone and scale fill. |
| `explanation` | `React.ReactNode` |  | Override the tooltip explanation. |
| `showScale` | `boolean` |  | Show a 5-step scale next to the label. |
| `size` | `"sm" \| "md"` | `"sm"` | Badge size. |
