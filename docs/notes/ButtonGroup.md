---
component: ButtonGroup
module: primitives/button-group
covers: ButtonGroupItem, ButtonGroupSeparator
use: Buttons joined into one segmented row or column. Without `type` it is a set of plain actions; with `type="single"` or `type="multiple"` the items become pressable toggles.
instead: Button = one action; SplitButton = a main action plus a menu; ToggleGroup = loose, spaced on/off buttons; SegmentedControl = a view switch where one option must always be selected
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Plain group: each item is a tab stop. Toggle group: one tab stop for the whole group, on the active item |
| Enter, Space | Activates a plain item, or toggles a pressable one |
| ArrowRight, ArrowLeft | Toggle group, horizontal: move focus between items and wrap around |
| ArrowDown, ArrowUp | Toggle group, `orientation="vertical"`: move focus between items and wrap around |

In RTL the horizontal arrows follow the reading order: the group passes the document direction to Radix, so ArrowLeft moves to the next item. A plain group has no arrow-key handling.

## Screen readers
- Without `type` the container is `role="group"` of native buttons; name it with `aria-label`. `aria-orientation` is not used on a group, the orientation is `data-orientation`.
- `type="single"`: the container is a radio group and each item is `role="radio"` with `aria-checked`. `type="multiple"`: items are buttons with `aria-pressed`.
- `ButtonGroupSeparator` is `role="separator"` with the opposite orientation of the group.
- An icon-only item (`iconOnly`) has no text, so pass `aria-label`.

## Reduced motion
Only colour and shadow transitions (150 ms), which the reduced-motion net ends within 1 ms. Nothing moves.

## Server rendering
Plain markup. In toggle mode the root `dir` is written by `useRootDirection`, so the server HTML says `ltr` and an RTL document settles after hydration; the layout itself is logical and does not change.

## Slots
- `button-group`: the container
- `button-group-item`: each item
- `button-group-separator`: the divider

## Gotchas
- A toggle item needs `value`; without it the item falls back to the empty string, so two items without a value select together.
- `size` on the group is passed to every item, and an item's own `size` wins. Only `sm`, `md` and `lg` exist here; use `iconOnly` plus `aria-label` for a square icon item instead of Button's `icon-*` sizes.
- `attached` (default true) removes the item shadows and gives the group one shadow and joined radii; `attached={false}` spaces items with a gap and gives each its own shadow.
- `type="single"` is Radix's single toggle group: pressing the selected item again clears the value. Use `SegmentedControl` when one option must always stay selected.

## Example
```tsx
import * as React from "react";
import { ButtonGroup, ButtonGroupItem } from "@cleanprompt/sutra-ui";
import { RiAlignCenter, RiAlignLeft, RiAlignRight } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  const [align, setAlign] = React.useState("left");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonGroup aria-label="Change date">
        <ButtonGroupItem>Previous</ButtonGroupItem>
        <ButtonGroupItem>Today</ButtonGroupItem>
        <ButtonGroupItem>Next</ButtonGroupItem>
      </ButtonGroup>
      <ButtonGroup type="single" value={align} onValueChange={setAlign} aria-label="Text alignment">
        <ButtonGroupItem value="left" iconOnly aria-label="Align left">
          <RiAlignLeft aria-hidden />
        </ButtonGroupItem>
        <ButtonGroupItem value="center" iconOnly aria-label="Align center">
          <RiAlignCenter aria-hidden />
        </ButtonGroupItem>
        <ButtonGroupItem value="right" iconOnly aria-label="Align right">
          <RiAlignRight aria-hidden />
        </ButtonGroupItem>
      </ButtonGroup>
    </div>
  );
}
```
