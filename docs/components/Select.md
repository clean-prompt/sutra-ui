# Select

> Root of a select: Radix `Select.Root` with the reading direction filled in.

- Import: `import { Select } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/select` (primitives)
- Parts: [`SelectContent`](SelectContent.md), [`SelectGroup`](SelectGroup.md), [`SelectItem`](SelectItem.md), [`SelectLabel`](SelectLabel.md), [`SelectScrollDownButton`](SelectScrollDownButton.md), [`SelectScrollUpButton`](SelectScrollUpButton.md), [`SelectSeparator`](SelectSeparator.md), [`SelectTrigger`](SelectTrigger.md), [`SelectValue`](SelectValue.md)
- Also accepts the props of SelectSharedProps, SelectProps

## Props

No props of its own.

## Part props

### SelectItem

A selectable option with a check indicator.

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary line under the label. Not shown in the trigger. |
| `icon` | `React.ReactNode` |  | Leading icon; also shown in the trigger when selected. |

### SelectTrigger

Input-like button that opens the select.

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` |  | Marks the trigger invalid (same as `aria-invalid`). |
| `leadingIcon` | `React.ReactNode` |  | Icon rendered before the value. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Trigger height and text size: `sm`, `md` or `lg`. |
| `variant` | `"outline" \| "filled"` | `"outline"` | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |

## Notes

**When to use:** A single choice from a short list, shown as an input-like trigger and a floating listbox. `SimpleSelect` takes an `options` array, the compound parts give full control.

**Use instead when:**
- `Combobox`: the list is long, searchable or loaded from a server
- `RadioGroup`: every option should stay visible
- `SegmentedControl`: two to four options that switch a view
- `WheelPicker`: a touch-first scrolling picker

### Keyboard

| Key | Action |
|---|---|
| Enter, Space, ArrowDown, ArrowUp | On the trigger: open the list |
| A letter or digit | On the closed trigger, selects the next matching option; in the open list, moves to it |
| ArrowDown, ArrowUp | Move the highlighted option |
| Home, End | Highlight the first or last option |
| Enter, Space | Pick the highlighted option and close |
| Escape | Close without changing the value |
| Tab | Does nothing while the list is open (Radix blocks it), so close first |

The list is vertical, so the arrow keys do not swap in RTL. The `dir` of the root follows the document or the nearest `DirectionProvider`, so the popover opens on the correct side.

### Screen readers

The trigger is a `combobox` with `aria-expanded`; the list is a `listbox` of `option`s with the selected one marked. `SelectGroup` plus `SelectLabel` announce the group name. `SimpleSelect` forwards `aria-label`, `aria-labelledby` and `aria-describedby` to the trigger and reads `invalid`, `disabled`, `required` and `id` from a surrounding `Field`, which also sets `aria-invalid` and `aria-required`. A select with no visible label needs an `aria-label`.

### Reduced motion

The popover fades and zooms in from the trigger with the `animate-in` utilities and the chevron turns with `chevron-turn`; under reduced motion the net removes the zoom and slide (the fade stays) and the chevron turn ends in 1 ms.

### Server rendering

Server render: part of it fills in after mount. The trigger renders on the server, but the option list lives in a fragment created after mount, so a select that starts with a `value` or `defaultValue` shows an empty trigger (or the placeholder) in the server HTML and the selected label appears after hydration. Reserve the trigger width with `className` to avoid a jump.

### Gotchas

- Radix Select needs a non-empty string for every item `value`; an empty string is reserved for clearing back to the placeholder.
- `SelectContent` uses `position="popper"`, `sideOffset` 6 and the trigger width by default; pass `position="item-aligned"` for the native-style overlap, which then ignores `sideOffset`.
- `SelectItem description` shows only in the list: the trigger shows the item's own text (and `icon`).
- Inside a `<form>`, give the root a `name` so Radix renders its hidden native `<select>`; `required` and `disabled` go on the root or on `Field`.

## Example

```tsx
import * as React from "react";
import { Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SimpleSelect } from "@cleanprompt/sutra-ui";

const roles = [
  { value: "viewer", label: "Viewer", description: "Can read" },
  { value: "editor", label: "Editor", description: "Can edit" },
  { value: "admin", label: "Admin", description: "Can manage members" },
];

export function Example() {
  const [role, setRole] = React.useState("viewer");
  return (
    <div className="grid max-w-xs gap-4">
      <Field>
        <FieldLabel>Role</FieldLabel>
        <SimpleSelect options={roles} value={role} onValueChange={setRole} />
      </Field>
      <Select defaultValue="eu-west">
        <SelectTrigger aria-label="Region">
          <SelectValue placeholder="Choose a region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="eu-west">Ireland</SelectItem>
          <SelectItem value="eu-central">Frankfurt</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```
