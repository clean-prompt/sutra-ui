# SettingsRow

> A settings row: static with a control slot, a toggle row (whole row clickable) or a nav row with value + chevron. Use `type="toggle"` inside a `SettingsGroup` (icon slot, `disabledReason`, full-row hover and click target); use `SwitchField` / `SwitchGroup` for switches inside ordinary forms.

- Import: `import { SettingsRow } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/identity`)
- Source: `packages/ui/src/patterns/settings` (patterns)
- `data-slot`: `settings-row`

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Primary text of the row. |
| `checked` | `boolean` |  | Controlled switch state. Use with `onCheckedChange`. |
| `children` | `React.ReactNode` |  | Control rendered on the right (select, button, badge…). |
| `className` | `string` |  | Classes for the row. |
| `defaultChecked` | `boolean` |  | Initial switch state when uncontrolled. |
| `description` | `React.ReactNode` |  | Secondary line under the title. |
| `disabled` | `boolean` |  | Disables the row without a reason; set `disabledReason` to explain why. |
| `disabledReason` | `React.ReactNode` |  | Why the setting can't be changed; disables the row and shows a muted note. |
| `href` | `string` |  | Makes the row a link to this URL. |
| `icon` | `React.ReactNode` |  | Icon at the start of the row. |
| `onCheckedChange` | `(checked: boolean) => void` |  | Called with the new state when the switch is toggled. |
| `onClick` | `(event: React.MouseEvent<HTMLElement>) => void` |  | Called when the row is clicked; makes the row a button. |
| `type` | `"toggle" \| "nav" \| "static"` |  | `"toggle"` renders a switch at the end of the row. `"nav"` renders a button or link row with the current value and a chevron. `"static"` (the default) renders a plain row with `children` as its control. |
| `value` | `React.ReactNode` |  | Current value shown before the chevron, e.g. "System" or "3". |
