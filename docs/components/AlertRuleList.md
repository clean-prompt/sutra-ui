# AlertRuleList

> Alert rules with an on/off switch, the rule sentence, scope and muted apps, edit and delete; presets when empty.

- Import: `import { AlertRuleList } from "@sutra/ui"` (or from `@sutra/ui/system`)
- Source: `packages/ui/src/kits/system/alert-rules` (kit `system`)
- `data-slot`: `alert-rule-list`, `alert-rule-skeleton-row`, `alert-rule-empty`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `accent` | `Accent` | `"red"` | Categorical colour. Default "red". |
| `addLabel` | `React.ReactNode` | `"Add alert"` | Default "Add alert". |
| `apps` | `string[]` |  | Apps for the built-in editor. |
| `defaultRules` | `AlertRule[]` |  | Initial rules when `rules` is not controlled. |
| `emptyState` | `React.ReactNode` |  | Replaces the default empty state (with presets). |
| `firingIds` | `string[]` |  | Ids of rules that are firing now (shown with a "Firing" badge). |
| `loading` | `boolean` | `false` | Rules are on their way. With no rules yet placeholder rows replace the presets empty state; with rules the root is only marked busy. |
| `loadingRows` | `number` | `3` | Placeholder rows while loading. Default 3. |
| `onAdd` | `() => void` |  | Add a rule yourself. When omitted, "Add alert" opens the built-in dialog. |
| `onCreate` | `(rule: AlertRule) => void` |  | Called with a rule created from the dialog or a preset. |
| `onDelete` | `(id: string) => void \| Promise<void>` |  | Called after the delete is confirmed. |
| `onEdit` | `(rule: AlertRule) => void` |  | Edit a rule yourself. When omitted, the built-in `AlertRuleDialog` edits it and updates `rules`. |
| `onRulesChange` | `(rules: AlertRule[]) => void` |  | Called with the full list after the user adds, edits, toggles or deletes a rule. |
| `onToggle` | `(id: string, enabled: boolean) => void` |  | Called with the rule id and the new enabled state when the user flips a rule's switch. |
| `presets` | `readonly AlertRulePreset[]` | `ALERT_RULE_PRESETS` | Suggestions in the empty state. Default `ALERT_RULE_PRESETS`; `[]` hides them. |
| `rules` | `AlertRule[]` |  | Controlled list of alert rules. |
| `temperatureUnit` | `AlertTemperatureUnit` | `"celsius"` | Unit for temperature thresholds in the built-in editor. Default "celsius". |
| `title` | `React.ReactNode` | `"Alerts"` | Header title. Default "Alerts". |

## Example (live: `#/components/system/alerts` in the playground)

```tsx
import * as React from "react";
import { ALERT_RULE_PRESETS, AlertRuleList } from "@sutra/ui/system";

function AlertsDemo() {
  const [rules, setRules] = React.useState<AlertRule[]>(() =>
    ALERT_RULE_PRESETS.map((preset, i) => ({ ...preset.rule, id: `preset-${i}`, enabled: i !== 2 }))
  );
  return (
    <AlertRuleList
      className="w-full"
      rules={rules}
      onRulesChange={setRules}
      firingIds={["preset-0"]}
      apps={["Google Chrome", "Slack", "Zoom", "Music", "Docker"]}
    />
  );
}
```
