# PlatformConnectorCard

> One messaging channel: state, error, ingress URL, enable switch, test and configure.

- Import: `import { PlatformConnectorCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/agent-admin`)
- Source: `packages/ui/src/kits/agent-admin/channels` (kit `agent-admin`)
- `data-slot`: `platform-connector-card`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `connector` (required) | `PlatformConnector` |  | The connector to show (platform, status, enabled state, summary). |
| `configFields` | `PlatformConfigField[]` |  | Override the form fields. |
| `onEnabledChange` | `(enabled: boolean) => void` |  | Called with the new state when the user flips the enable switch. |
| `onSaveConfig` | `(values: PlatformConfigValues) => void \| Promise<void>` |  | Saves the config form. Shows a Configure button when set. Close happens after it resolves. |
| `onTest` | `() => ConnectorTestResult \| Promise<ConnectorTestResult>` |  | Runs a connectivity test. Shows a Test button when set. |
