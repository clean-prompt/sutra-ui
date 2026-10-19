# ToggleGroup

> Row of toggle buttons, `type="single"` or `"multiple"`, with roving focus (one tab stop, arrow keys move). Each item is a button with `aria-pressed`; give the group an `aria-label`. For an exclusive choice that reads as a tab-like switch, `SegmentedControl` is the better fit.

- Import: `import { ToggleGroup } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/toggle-group` (primitives)
- `data-slot`: `toggle-group`
- Parts: [`ToggleGroupItem`](ToggleGroupItem.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string \| string[]` |  | Initially pressed item value when uncontrolled. |
| `dir` | `"ltr" \| "rtl"` |  | Reading direction for arrow-key navigation; inherits the surrounding direction by default. |
| `disabled` | `boolean` |  | Disables every item. |
| `loop` | `boolean` |  | Wrap focus from the last item to the first (default true). |
| `onValueChange` | `((value: string) => void) \| ((value: string[]) => void)` |  | Called with the pressed item value, or an empty string when it is toggled off. |
| `orientation` | `"horizontal" \| "vertical"` |  | Restricts the arrow keys to this axis. Unset (the default), all four arrow keys move focus, and the group keeps its row layout either way. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Item height and padding. |
| `type` | `"single" \| "multiple"` |  | At most one item pressed; pressing it again clears the value to `""`. Any number of items pressed. |
| `value` | `string \| string[]` |  | Controlled pressed item value (empty string for none). Use with `onValueChange`. |
| `variant` | `"default" \| "outline" \| "soft"` | `"default"` | Look of the items: `default` (ghost), `outline` or `soft` (tinted when on). |

## Variants

- `variant`: `default`, `outline`, `soft` (default "default")
- `size`: `sm`, `md`, `lg` (default "md")

## Part props

### ToggleGroupItem

One toggle in a `ToggleGroup`; `value` identifies it.

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Item height and padding. |
| `variant` | `"default" \| "outline" \| "soft"` | `"default"` | Look of the items: `default` (ghost), `outline` or `soft` (tinted when on). |

## Notes

**When to use:** A row of toggle buttons that stay pressed, in `type="single"` (at most one) or `type="multiple"` mode, with roving focus. `ToggleButton` is one standalone pressable button (bold, mute, pin).

**Use instead when:**
- `SegmentedControl`: an exclusive choice that must always have one selected
- `ButtonGroup`: attached action buttons or an attached radio-role choice
- `Checkbox`: a yes or no answer in a form
- `Switch`: a setting that applies at once
- `Tabs`: the choice swaps panels

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | One tab stop for the whole group: the first pressed item, else the first item. A standalone `ToggleButton` is its own stop |
| ArrowRight, ArrowLeft | Move focus to the next or previous enabled item, wrapping at the ends (turn off with `loop={false}`) |
| Home, End | Focus the first or last item |
| Enter, Space | Press or unpress the focused item (native button) |

Arrow keys move focus only; they never change the value. Disabled items are skipped. In RTL the horizontal arrows swap: the group reads the direction from its parent (a `DirectionProvider`, a `dir` container or `<html dir>`), and its `dir` prop overrides it. With no `orientation` set the Up and Down arrows also move focus; set `orientation` to restrict the axis.

### Screen readers

- The group is `role="group"` (not Radix's radiogroup or toolbar) and has no name of its own: pass `aria-label` or `aria-labelledby`. Every item is a plain `<button>` with `aria-pressed` in both modes, not a radio.
- An icon-only item or `ToggleButton` needs `aria-label`. Icons are not hidden for you: pass `aria-hidden` icons next to text.
- Pressed state is announced as "pressed" or "not pressed"; the visual tint comes from `data-state="on"`.

### Reduced motion

Only colour, background and border transitions, which the reduced-motion net ends in 1 ms. Nothing slides; for a sliding thumb use `SegmentedControl`.

### Server rendering

Server render: same markup as the client. Plain markup: pressed state comes from `value`, `defaultValue` or `defaultPressed`, so server and client output match. The group writes a `dir` attribute that is `ltr` in the server HTML and settles after hydration, which only shows on an RTL page.

### Slots

- `toggle-group-item`: an item in the group
- `toggle-button`: a standalone `ToggleButton`

### Gotchas

- In `single` mode, pressing the pressed item clears the value: `onValueChange` receives `""`. If one item must always stay on, use `SegmentedControl`. `multiple` mode gives and takes a `string[]`.
- `variant` (`default`, `outline` or `soft`) and `size` set on the group flow to the items through context; an item's own `variant` or `size` wins.
- `ToggleGroupItem` needs `value`; a `ToggleButton` is controlled with `pressed` and `onPressedChange`, or uncontrolled with `defaultPressed`.
- The group wraps onto several lines (`flex-wrap`) instead of overflowing a narrow container.

## Example

```tsx
import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@sutra/ui";
import { RiBold, RiItalic, RiUnderline } from "@sutra/ui/icons";

export function Example() {
  const [marks, setMarks] = React.useState<string[]>(["bold"]);
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      aria-label="Text formatting"
      value={marks}
      onValueChange={setMarks}
    >
      <ToggleGroupItem value="bold" aria-label="Bold">
        <RiBold aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <RiItalic aria-hidden />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <RiUnderline aria-hidden />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
```
