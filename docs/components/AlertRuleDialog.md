# AlertRuleDialog

> `AlertRuleEditor` in a dialog; the draft resets every time it opens (the content unmounts when closed).

- Import: `import { AlertRuleDialog } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/alert-rules` (kit `system`)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` | `"red"` | Categorical colour. Default "red". |
| `apps` | `string[]` |  | Apps to pick for a one-app rule and to mute. |
| `className` | `string` |  | Extra classes for the dialog content. |
| `defaultMetric` | `AlertMetric` | `"cpu"` | Metric of a new rule. Default "cpu". |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `description` | `React.ReactNode` | `"Sutra notifies you when the condition is met."` | Helper text under the dialog heading. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the dialog opens or closes. |
| `onSubmit` | `(rule: AlertRule) => void` |  | Called with the saved rule; the dialog then closes. |
| `open` | `boolean` |  | Controlled open state of the dialog. |
| `rule` | `AlertRule` |  | The rule to edit. Omit to create one (starting from `defaultMetric`). |
| `submitLabel` | `React.ReactNode` |  | Default "Add alert" or "Save". |
| `temperatureUnit` | `AlertTemperatureUnit` |  | Unit for temperature thresholds. Default "celsius". |
| `title` | `React.ReactNode` |  | Default "New alert" or "Edit alert". |
| `trigger` | `React.ReactNode` |  | Element that opens the dialog. |
