---
component: Chip
module: primitives/chip
covers: ChipGroup
use: An interactive pill: a toggleable filter, a removable tag or a selectable option. `ChipGroup` makes single or multiple selection out of several chips.
instead: Badge = a static label that is not clicked; ToggleGroup = a bar of on/off buttons in one control; SegmentedControl = two to four options that switch a view; Combobox = pick many tags from a long list
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between chips. The remove button is `tabIndex={-1}`, so it is skipped |
| Enter, Space | Toggles a selectable chip, or runs `onClick` (native `<button>`) |
| Backspace, Delete | With `onRemove`, removes the focused chip instead of the browser default |

There is no arrow-key roving inside a `ChipGroup`: every chip is its own tab stop. No key depends on direction, so RTL changes nothing.

## Screen readers
- The chip is a `<button>` named by its text. A chip counts as selectable when it has `selected`, `defaultSelected`, `onSelectedChange`, or a `value` inside a `ChipGroup`; then it carries `aria-pressed`. A plain chip has no `aria-pressed`.
- `ChipGroup` is a `role="group"` with no name: pass `aria-label`. Single selection is still a set of toggle buttons (`aria-pressed`), not radios.
- The remove button is labelled "Remove" unless `removeLabel` says more ("Remove React"). The check mark is `aria-hidden`.
- Icon-only content needs an `aria-label` on the chip itself (extra props go to the inner button).

## Reduced motion
Colour changes, the press scale and the check mark sliding open are transitions, which the reduced-motion net in `sutra.css` ends within 1 ms.

## Server rendering
Plain markup with no browser API, so server and client output match, including selected state from `defaultSelected` or `defaultValue`.

## Gotchas
- `className` and `wrapperClassName` both style the outer pill (a span); every other prop, including `aria-*` and `onKeyDown`, goes to the inner `<button>`.
- A chip in a `ChipGroup` needs a `value`; without one it is a plain chip that ignores the group. In the group the default tone is `primary`, outside it `neutral`; a chip's own `tone` or `variant` wins over the group's.
- `type="single"` lets the selected chip be clicked off (`onValueChange(null)`); pass `allowDeselect={false}` to keep one selected. `type="multiple"` calls `onValueChange` with the whole list.
- `color` is deprecated: use `tone`. The remove button does not toggle the chip and stops the click; a disabled chip disables it too.

## Example
```tsx
import * as React from "react";
import { Chip, ChipGroup } from "@cleanprompt/sutra-ui";

const topics = ["Design", "Engineering", "Research", "Support"];

export function Example() {
  const [selected, setSelected] = React.useState<string[]>(["Design"]);
  return (
    <ChipGroup type="multiple" value={selected} onValueChange={setSelected} aria-label="Topics">
      {topics.map((topic) => (
        <Chip key={topic} value={topic}>
          {topic}
        </Chip>
      ))}
    </ChipGroup>
  );
}
```
