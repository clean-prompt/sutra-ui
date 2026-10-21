# ButtonGroup

> Attached row (or column) of buttons. Pass `type="single" | "multiple"` to turn it into a toggle group whose `ButtonGroupItem`s can be pressed.

- Import: `import { ButtonGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/button-group` (primitives)
- `data-slot`: `button-group`
- Parts: [`ButtonGroupItem`](ButtonGroupItem.md), [`ButtonGroupSeparator`](ButtonGroupSeparator.md)
- Also accepts the props of HTMLAttributes, ToggleGroupImplProps, ToggleGroupImplSingleProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `attached` | `boolean` | `true` | Merge borders and radii into one segmented control. Default true. |
| `className` | `string \| string` |  | Classes for the group container. |
| `orientation` | `ButtonGroupOrientation` | `"horizontal"` | Lays the buttons out in a row or a column. |
| `size` | `Size` | `"md"` | Size applied to every `ButtonGroupItem`. |
| `type` | `undefined \| "single" \| "multiple"` |  | Leave it out for a plain attached row of buttons; `"single"` or `"multiple"` turns the group into toggle buttons. Toggle mode: at most one item is pressed (radio roles); `ButtonGroupItem` then needs a `value`. Toggle mode: any number of items can be pressed (`aria-pressed`); `ButtonGroupItem` then needs a `value`. |

## Variants

- `orientation`: `horizontal`, `vertical` (default "horizontal")
- `attached`: `true`, `false` (default true)

## Part props

### ButtonGroupItem

Segment of a `ButtonGroup`; becomes a toggle item when the group has a `type`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping the item styles. |
| `iconOnly` | `boolean` |  | Makes the item square for an icon-only button; set it together with an `aria-label`. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `size` | `Size` | `"md"` | Overrides the size from the group. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `value` | `string` |  | Required when the parent `ButtonGroup` has a `type` (toggle mode). |

## Notes

**When to use:** Buttons joined into one segmented row or column. Without `type` it is a set of plain actions; with `type="single"` or `type="multiple"` the items become pressable toggles.

**Use instead when:**
- `Button`: one action
- `SplitButton`: a main action plus a menu
- `ToggleGroup`: loose, spaced on/off buttons
- `SegmentedControl`: a view switch where one option must always be selected

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Plain group: each item is a tab stop. Toggle group: one tab stop for the whole group, on the active item |
| Enter, Space | Activates a plain item, or toggles a pressable one |
| ArrowRight, ArrowLeft | Toggle group, horizontal: move focus between items and wrap around |
| ArrowDown, ArrowUp | Toggle group, `orientation="vertical"`: move focus between items and wrap around |

In RTL the horizontal arrows follow the reading order: the group passes the document direction to Radix, so ArrowLeft moves to the next item. A plain group has no arrow-key handling.

### Screen readers

- Without `type` the container is `role="group"` of native buttons; name it with `aria-label`. `aria-orientation` is not used on a group, the orientation is `data-orientation`.
- `type="single"`: the container is a radio group and each item is `role="radio"` with `aria-checked`. `type="multiple"`: items are buttons with `aria-pressed`.
- `ButtonGroupSeparator` is `role="separator"` with the opposite orientation of the group.
- An icon-only item (`iconOnly`) has no text, so pass `aria-label`.

### Reduced motion

Only colour and shadow transitions (150 ms), which the reduced-motion net ends within 1 ms. Nothing moves.

### Server rendering

Server render: same markup as the client. Plain markup. In toggle mode the root `dir` is written by `useRootDirection`, so the server HTML says `ltr` and an RTL document settles after hydration; the layout itself is logical and does not change.

### Slots

- `button-group`: the container
- `button-group-item`: each item
- `button-group-separator`: the divider

### Gotchas

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
