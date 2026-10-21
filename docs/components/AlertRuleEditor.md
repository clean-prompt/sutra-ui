# AlertRuleEditor

> Form to create or edit an alert rule: metric, comparator, threshold, window, scope, muted apps and a live preview.

- Import: `import { AlertRuleEditor } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/alert-rules-editor` (kit `system`)
- `data-slot`: `alert-rule-editor`, `alert-rule-preview`
- Also accepts the props of HTMLAttributes, FormHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` | `"red"` | Categorical colour. Default "red". |
| `apps` | `string[]` | `[]` | Apps to pick for a one-app rule and to mute. |
| `cancelLabel` | `React.ReactNode` | `"Cancel"` | Default "Cancel". |
| `defaultValue` | `AlertRule` |  | Initial draft. Default: a new CPU rule. |
| `onCancel` | `() => void` |  | Shows a Cancel button. |
| `onSubmit` | `(rule: AlertRule) => void` |  | Called with the cleaned-up rule when the form is valid and submitted. |
| `onValueChange` | `(rule: AlertRule) => void` |  | Called with the draft rule on every edit. |
| `submitLabel` | `React.ReactNode` | `"Save"` | Default "Save". |
| `temperatureUnit` | `AlertTemperatureUnit` | `"celsius"` | Unit for temperature thresholds. Default "celsius". |
| `value` | `AlertRule` |  | The draft rule (controlled). |
