# Chip

> Interactive pill: toggleable filter, removable tag or selectable option.

- Import: `import { Chip } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/chip` (primitives)
- Parts: [`ChipGroup`](ChipGroup.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `avatar` | `React.ReactNode` |  | Small avatar or image at the start (sized automatically). |
| `color` | `ChipColor` | `"neutral"` | **Deprecated.** Use `tone` (`brand` is `primary`). Legacy name of `tone`. |
| `defaultSelected` | `boolean` |  | Initial toggle state when uncontrolled. |
| `leadingIcon` | `React.ReactNode` |  | Icon at the start of the chip; takes the place of the selection check mark. |
| `onRemove` | `() => void` |  | Shows a remove button; Backspace/Delete also trigger it. |
| `onSelectedChange` | `(selected: boolean) => void` |  | Called with the new state when the chip is toggled; also makes the chip a toggle button. |
| `removeLabel` | `string` | `"Remove"` | Accessible name of the remove button. |
| `selected` | `boolean` |  | Controlled toggle state (renders `aria-pressed`). |
| `showCheck` | `boolean` | `true` | Show a check mark when selected and no leading icon is set. Default true. |
| `size` | `ChipSize` | `"md"` | Chip height and text size. |
| `tone` | `ToneInput` |  | Semantic colour. Default `neutral` (`primary` inside a `ChipGroup`). |
| `value` | `string` |  | Identifies the chip inside a `ChipGroup`. |
| `variant` | `ChipVariant` | `"outline"` | Visual style: `outline` (border only), `soft` (tinted fill) or `solid` (filled). |
| `wrapperClassName` | `string` |  | Classes for the outer pill. `className` also targets the pill. |

## Variants

- `variant`: `outline`, `soft`, `solid` (default "outline")
- `color`: `neutral`, `brand`, `success`, `warning`, `destructive`, `info` (default "neutral")
- `size`: `sm`, `md`, `lg` (default "md")

## Part props

### ChipGroup

Group of chips with single or multiple selection.

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowDeselect` | `boolean` |  | Allow clicking the selected chip to clear the selection. Default true. |
| `color` | `ChipColor` | `"neutral"` | **Deprecated.** Use `tone` (`brand` is `primary`). Legacy name of `tone`. |
| `defaultValue` | `string \| null \| string[]` |  | Initially selected chip value when uncontrolled. Initially selected chip values when uncontrolled. |
| `disabled` | `boolean` |  | Disables every chip in the group. |
| `onValueChange` | `((value: string \| null) => void) \| ((value: string[]) => void)` |  | Called with the selected value, or `null` when the selection is cleared. Called with the full list of selected values after every toggle. |
| `size` | `ChipSize` | `"md"` | Chip size for every chip in the group. |
| `tone` | `ToneInput` |  | Semantic colour for every chip in the group. Default `primary`. |
| `type` | `"single" \| "multiple"` | `"single"` | Selection mode: at most one chip selected (the default); use `"multiple"` for a list. Selection mode: any number of chips can be selected. |
| `value` | `string \| null \| string[]` |  | Controlled selected chip value (`null` for none). Use with `onValueChange`. Controlled list of selected chip values. Use with `onValueChange`. |
| `variant` | `ChipVariant` | `"outline"` | Visual style for every chip in the group (a chip's own `variant` wins). |

## Notes

**When to use:** An interactive pill: a toggleable filter, a removable tag or a selectable option. `ChipGroup` makes single or multiple selection out of several chips.

**Use instead when:**
- `Badge`: a static label that is not clicked
- `ToggleGroup`: a bar of on/off buttons in one control
- `SegmentedControl`: two to four options that switch a view
- `Combobox`: pick many tags from a long list

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between chips. The remove button is `tabIndex={-1}`, so it is skipped |
| Enter, Space | Toggles a selectable chip, or runs `onClick` (native `<button>`) |
| Backspace, Delete | With `onRemove`, removes the focused chip instead of the browser default |

There is no arrow-key roving inside a `ChipGroup`: every chip is its own tab stop. No key depends on direction, so RTL changes nothing.

### Screen readers

- The chip is a `<button>` named by its text. A chip counts as selectable when it has `selected`, `defaultSelected`, `onSelectedChange`, or a `value` inside a `ChipGroup`; then it carries `aria-pressed`. A plain chip has no `aria-pressed`.
- `ChipGroup` is a `role="group"` with no name: pass `aria-label`. Single selection is still a set of toggle buttons (`aria-pressed`), not radios.
- The remove button is labelled "Remove" unless `removeLabel` says more ("Remove React"). The check mark is `aria-hidden`.
- Icon-only content needs an `aria-label` on the chip itself (extra props go to the inner button).

### Reduced motion

Colour changes, the press scale and the check mark sliding open are transitions, which the reduced-motion net in `sutra.css` ends within 1 ms.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so server and client output match, including selected state from `defaultSelected` or `defaultValue`.

### Gotchas

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
