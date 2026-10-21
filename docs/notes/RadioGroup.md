---
component: RadioGroup
module: primitives/radio
covers: RadioGroupItem, RadioField, RadioCard, RadioGroupField
use: Exactly one choice from a few options that should all stay visible. Compose `RadioGroupItem`, `RadioField` (with label and description) and `RadioCard` (a selectable card) inside `RadioGroup`, or pass `options` to `RadioGroupField`.
instead: Select = the list is long or space is tight; SegmentedControl = two to four options that switch a view; CheckboxGroup = several choices at once; ToggleGroup = loose on/off buttons; Combobox = a long searchable list
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Enters the group on the checked radio (the first one when none is checked) and leaves it; the other radios are skipped |
| ArrowDown, ArrowUp | `orientation="vertical"` (the default): move to the next or previous radio, loop at the ends, and select it |
| ArrowRight, ArrowLeft | `orientation="horizontal"`: the same; the other axis does nothing |
| Home, PageUp, End, PageDown | First or last radio |
| Space | Select the focused radio |

Enter does nothing (Radix cancels it). Disabled radios are skipped. In RTL with `orientation="horizontal"`, ArrowLeft goes to the next radio and ArrowRight to the previous; vertical groups do not change. The group reads the direction from its parent, so a `DirectionProvider`, a `dir` container or `<html dir>` all work.

## Screen readers
- The group is `role="radiogroup"` with `aria-orientation` and `aria-required` from `required`; each item is a `<button role="radio">` with `aria-checked`. `invalid` sets `aria-invalid` on the group, and a surrounding `Field` supplies `id`, `aria-describedby`, `disabled` and `required`.
- The group has no name of its own. `RadioGroupField` names it from `label` through `aria-labelledby` and links `description` with `aria-describedby`; for a bare `RadioGroup` pass `aria-label` or `aria-labelledby`.
- `RadioField` and `RadioCard` name each radio through `<label htmlFor>` and announce the description through `aria-describedby`. A bare `RadioGroupItem` needs `aria-label`.

## Reduced motion
The dot scales in with a spring transition (`ease-spring`) and the item scales on press; the reduced-motion net ends both in 1 ms, so the dot appears at once.

## Server rendering
Items and the group render on the server, including `value` and `defaultValue`. The group writes a `dir` attribute that is `ltr` in the server HTML and settles to the page direction after hydration, which only shows on an RTL page.

## Slots
- `radio-group`: the group; `radio-group-field`: the wrapper around label, description and group
- `radio-group-item`: the radio button; `radio-dot`: its dot
- `radio-field`: the row of radio, label and description
- `radio-card`: the whole card label

## Gotchas
- Arrow keys select as well as move focus; there is no "focus without selecting". Use `value` and `onValueChange` (a string) to control it, and `name` on the group so a native form posts it.
- `RadioGroupField` renders `variant="card"` with auto-fit columns when horizontal; the default variant is a plain list. Both take `size` (`sm` or `md`) for every option.
- Each `RadioGroupItem` needs a `value`; an item with no label has no name unless you pass `aria-label`.
- `RadioCard` moves the focus ring from the dot to the whole card. `disabled` on the group disables every item.

## Example
```tsx
import * as React from "react";
import { RadioField, RadioGroup } from "@cleanprompt/sutra-ui";

export function Example() {
  const [plan, setPlan] = React.useState("team");
  return (
    <RadioGroup aria-label="Plan" name="plan" value={plan} onValueChange={setPlan}>
      <RadioField value="free" label="Free" description="One project, community support." />
      <RadioField value="team" label="Team" description="Unlimited projects and shared workspaces." />
      <RadioField value="enterprise" label="Enterprise" description="Single sign-on and audit logs." />
    </RadioGroup>
  );
}
```
