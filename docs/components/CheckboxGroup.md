# CheckboxGroup

> A set of checkboxes sharing a `string[]` value.

- Import: `import { CheckboxGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/checkbox` (primitives)
- `data-slot`: `checkbox-group`
- Part of [`Checkbox`](Checkbox.md)
- Parts: [`CheckboxGroupItem`](CheckboxGroupItem.md), [`CheckboxGroupSelectAll`](CheckboxGroupSelectAll.md)
- Also accepts the props of HTMLAttributes

## Props

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

## Variants

- `size`: `sm`, `md` (default "md")

## Part props

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

See the notes in [`Checkbox`](Checkbox.md#notes).

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
