---
component: Switch
module: primitives/switch
covers: SwitchField, SwitchGroup
use: An on or off setting that takes effect at once, drawn as a sliding switch. `SwitchField` adds a label and description for forms, and `SwitchGroup` stacks switch rows in a fieldset with a `value` map.
instead: Checkbox = a yes or no answer submitted with a form, or a choice in a list; SettingsRow = a settings page row (whole-row target, icon, `disabledReason`); ToggleButton = a button that stays pressed; RadioGroup = exactly one of several options
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between switches; every switch is its own tab stop. A disabled switch is skipped |
| Space, Enter | Toggle the focused switch (native button behaviour) |

No arrow keys, so RTL changes nothing except that the thumb slides the other way. Clicking the label of a `SwitchField` toggles the switch.

## Screen readers
- A `<button role="switch">` with `aria-checked` and `aria-required` from `required`. `invalid` sets `aria-invalid`, and a surrounding `Field` supplies `id`, `aria-describedby`, `disabled`, `required` and `invalid` when you do not pass them.
- `SwitchField` names the switch through `<label htmlFor>` and adds the description to `aria-describedby`; `label` is required. A bare `Switch` has no name: pass `aria-label`, or put it under a `FieldLabel`.
- `SwitchGroup` is a native `<fieldset>` named by its `legend`, described by `description`. Disabling the group disables every switch natively.
- `checkedIcon` and `uncheckedIcon` are shown in the thumb exactly as you pass them, so pass `aria-hidden` icons.

## Reduced motion
The thumb slides with a 300 ms spring transform, and the track colour and thumb icons fade; the reduced-motion net ends all of them in 1 ms, so the thumb jumps.

## Server rendering
Plain markup: the state comes from `checked` or `defaultChecked`, and the ids come from `useId`, so server and client output match.

## Slots
- `switch`: the button; `switch-thumb`: the sliding knob
- `switch-field`: the row of switch, label and description
- `switch-group`: the fieldset

## Gotchas
- `labelPosition="left"` moves the switch to the end visually with CSS `order`; the markup order, and so the tab and reading order, stays switch then label.
- `SwitchGroup` keeps a `Record<string, boolean>` keyed by option `value`, and `onValueChange` receives the whole map. Each generated switch gets `name` equal to its option value, so a form posts the checked ones under their own names.
- Use `checked` with `onCheckedChange` (a boolean) to control a switch; the Radix `value` prop is the string a form posts when it is on.
- `size` is `sm`, `md` or `lg` (28, 36 and 44 px wide); the hit area is padded to at least 24 px.

## Example
```tsx
import * as React from "react";
import { SwitchField } from "@cleanprompt/sutra-ui";

export function Example() {
  const [digest, setDigest] = React.useState(true);
  return (
    <SwitchField
      label="Weekly digest"
      description="A summary of activity, every Monday."
      checked={digest}
      onCheckedChange={setDigest}
    />
  );
}
```
