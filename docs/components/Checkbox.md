# Checkbox

> Checkbox with checked, indeterminate and invalid states. Consumes `Field` context.

- Import: `import { Checkbox } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/checkbox` (primitives)
- `data-slot`: `checkbox`, `checkbox-indicator`
- Parts: [`CheckboxCard`](CheckboxCard.md), [`CheckboxField`](CheckboxField.md), [`CheckboxGroup`](CheckboxGroup.md), [`CheckboxGroupItem`](CheckboxGroupItem.md), [`CheckboxGroupSelectAll`](CheckboxGroupSelectAll.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, CheckboxProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` |  | Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `size` | `"sm" \| "md"` | `"md"` | Box size: `sm` 14px or `md` 16px. |

## Variants

- `size`: `sm`, `md` (default "md")

## Part props

### CheckboxCard

Bordered, selectable card that toggles a checkbox. Highlighted when checked.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `React.ReactNode` |  | Primary text of the card (the whole card is the label and click target). |
| `checkboxClassName` | `string` |  | Class for the checkbox control (`className` styles the card). |
| `description` | `React.ReactNode` |  | Supporting text under the label. |
| `icon` | `React.ReactNode` |  | Optional leading icon or media. |
| `indicatorPosition` | `"start" \| "end"` | `"end"` | Where the checkbox sits in the card. |
| `invalid` | `boolean` |  | Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `size` | `"sm" \| "md"` | `"md"` | Box size: `sm` 14px or `md` 16px. |

### CheckboxField

Checkbox with a label and optional description.

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary text under the label, announced as the checkbox description. |
| `invalid` | `boolean` |  | Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `label` | `React.ReactNode` |  | Label shown beside the box and wired to it (`htmlFor`), so clicking it toggles the checkbox. |
| `labelClassName` | `string` |  | Classes for the `<label>` element. |
| `size` | `"sm" \| "md"` | `"md"` | Box size: `sm` 14px or `md` 16px. |
| `wrapperClassName` | `string` |  | Class for the outer row. |

### CheckboxGroup

A set of checkboxes sharing a `string[]` value.

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultValue` | `string[]` | `[]` | Initially checked item values when uncontrolled. |
| `description` | `React.ReactNode` |  | Help text under the group label. |
| `disabled` | `boolean` |  | Disables every item in the group. |
| `invalid` | `boolean` |  | Marks the group invalid: error styling on the items and `aria-invalid`. |
| `label` | `React.ReactNode` |  | Group label shown above the items; it is the accessible name of the group. |
| `name` | `string` |  | Form field name submitted for every checked item. |
| `onValueChange` | `(value: string[]) => void` |  | Called with the full list of checked values after every toggle. |
| `options` | `CheckboxGroupOption[]` |  | Render items from data instead of children. |
| `orientation` | `"vertical" \| "horizontal"` | `"vertical"` | Stacks the items in a column or lays them out in a row. |
| `size` | `"sm" \| "md"` | `"md"` | Checkbox size for every item in the group. |
| `value` | `string[]` |  | Controlled list of checked item values. Use with `onValueChange`. |

### CheckboxGroupItem

A checkbox bound to its parent `CheckboxGroup`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` (required) | `string` |  | Value added to or removed from the group's value when this item is toggled. |
| `description` | `React.ReactNode` |  | Secondary text under the label, announced as the checkbox description. |
| `invalid` | `boolean` |  | Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `label` | `React.ReactNode` |  | Label shown beside the box and wired to it (`htmlFor`), so clicking it toggles the checkbox. |
| `labelClassName` | `string` |  | Classes for the `<label>` element. |
| `size` | `"sm" \| "md"` | `"md"` | Box size: `sm` 14px or `md` 16px. |
| `wrapperClassName` | `string` |  | Class for the outer row. |

### CheckboxGroupSelectAll

Toggles every enabled item in the parent `CheckboxGroup`; indeterminate when partially selected.

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary text under the label, announced as the checkbox description. |
| `invalid` | `boolean` |  | Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `label` | `React.ReactNode` | `"Select all"` | Label shown beside the box and wired to it (`htmlFor`), so clicking it toggles the checkbox. |
| `labelClassName` | `string` |  | Classes for the `<label>` element. |
| `size` | `"sm" \| "md"` | `"md"` | Box size: `sm` 14px or `md` 16px. |
| `wrapperClassName` | `string` |  | Class for the outer row. |

## Notes

**When to use:** A yes or no box with an indeterminate state. `CheckboxField` adds a label and description, `CheckboxCard` makes a whole bordered card the target, and `CheckboxGroup` binds several boxes to one `string[]` value with an optional select-all.

**Use instead when:**
- `Switch`: a setting that applies at once
- `RadioGroup`: exactly one choice
- `ToggleGroup`: loose on/off buttons
- `Combobox`: a long list of choices
- `TableCheckbox`: row selection in a table

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves between boxes; every box is its own tab stop, a group has no roving focus. A disabled box is skipped |
| Space | Toggles the focused box (an indeterminate box becomes checked) |

Enter does nothing: Radix cancels it, as the checkbox pattern has no Enter key. Clicking the label or, for `CheckboxCard`, anywhere on the card toggles it. No arrow keys, so RTL changes nothing.

### Screen readers

- A `<button role="checkbox">` with `aria-checked` set to `true`, `false` or `mixed` (for `checked="indeterminate"`). `required` becomes `aria-required` and `invalid` becomes `aria-invalid`; both are inherited from a surrounding `Field` when you do not pass them.
- `CheckboxField` and `CheckboxCard` name the box through a `<label htmlFor>`; the description is added to `aria-describedby`. A bare `Checkbox`, and a `CheckboxField` with neither `label` nor `description`, has no name: pass `aria-label`.
- `CheckboxGroup` is `role="group"` named by its `label` (or `aria-label` or `aria-labelledby`), described by `description` and the surrounding `Field`, and sets `aria-invalid` when `invalid`.
- The check and dash icons are `aria-hidden`.

### Reduced motion

The tick pops in with `animate-in zoom-in-50`, and the box scales on press (`active:scale-90`) and fades its colours. Under reduced motion the net removes the zoom and ends the transitions in 1 ms; the tick still appears.

### Server rendering

Server render: part of it fills in after mount. A single `Checkbox` renders the same on both sides, including `checked` and `defaultChecked`. In a `CheckboxGroup` the items register themselves in an effect, so on the server `CheckboxGroupSelectAll` is disabled and unchecked and takes its real state (checked, mixed, enabled) after mount. A surrounding `Field` also adds the `aria-describedby` for its description and error after mount.

### Slots

- `checkbox`: the box, a `button role="checkbox"`
- `checkbox-indicator`: the span holding the check and dash icons, mounted only while checked or indeterminate
- `checkbox-field`: the row of box, label and description
- `checkbox-card`: the whole card label
- `checkbox-group`: the group element

### Gotchas

- `CheckboxGroup` value is the list of checked item values, and `onValueChange` receives the whole new list; items you toggle are appended in click order. Use `name` on the group to post one entry per checked item (with each item's `value`) in a form.
- `CheckboxGroupSelectAll` acts only on enabled items, is mixed while some are checked, and is disabled when no item is enabled or registered.
- `CheckboxGroupItem` takes `value` (the group item key) and not `checked` or `onCheckedChange`; the group owns them. `disabled` on the group disables every item, and a group `invalid` is passed to each item.
- `size` is `sm` (14px) or `md` (16px); the click target stays at least 24px square through the hit area.

## Example

```tsx
import * as React from "react";
import { CheckboxField, CheckboxGroup } from "@cleanprompt/sutra-ui";

export function Example() {
  const [accepted, setAccepted] = React.useState(false);
  const [channels, setChannels] = React.useState<string[]>(["email"]);
  return (
    <div className="grid max-w-sm gap-6">
      <CheckboxField
        label="I accept the terms"
        description="You can read them on the legal page."
        checked={accepted}
        onCheckedChange={(checked) => setAccepted(checked === true)}
      />
      <CheckboxGroup
        label="Notify me by"
        name="channels"
        value={channels}
        onValueChange={setChannels}
        options={[
          { value: "email", label: "Email" },
          { value: "sms", label: "Text message" },
          { value: "push", label: "Push notification" },
        ]}
      />
    </div>
  );
}
```
