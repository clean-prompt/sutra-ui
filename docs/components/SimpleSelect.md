# SimpleSelect

> Data-driven select: pass `options` and get a styled trigger + list.

- Import: `import { SimpleSelect } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/select` (primitives)
- Also accepts the props of SelectSharedProps, SelectProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` (required) | `SelectOption[]` |  | Options to render, in order; each has a `value`, a `label` and optional description, icon and disabled flag. |
| `aria-describedby` | `string` |  | Id(s) of the element(s) that describe the trigger (hint, error text). |
| `aria-invalid` | `boolean` |  | Overrides the invalid state announced to assistive technology; normally set `invalid` instead. |
| `aria-label` | `string` |  | Accessible name of the trigger when there is no visible label. |
| `aria-labelledby` | `string` |  | Id(s) of the element(s) that label the trigger. |
| `className` | `string` |  | Classes for the trigger. |
| `contentClassName` | `string` |  | Classes for the popover list. |
| `disabled` | `boolean` |  | Disables the select. Inherited from a surrounding `Field` when omitted. |
| `id` | `string` |  | `id` of the trigger, so a `<label htmlFor>` or `Field` can point at it. |
| `invalid` | `boolean` |  | Marks the select invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `leadingIcon` | `React.ReactNode` |  | Icon shown at the start of the trigger. |
| `placeholder` | `React.ReactNode` | `"Select…"` | Trigger text while nothing is selected. |
| `required` | `boolean` |  | Marks the select required. Inherited from a surrounding `Field` when omitted. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Trigger height and text size. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")

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
import { Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SimpleSelect } from "@sutra/ui";

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
