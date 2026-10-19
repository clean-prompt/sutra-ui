# CheckboxField

> Checkbox with a label and optional description.

- Import: `import { CheckboxField } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/checkbox` (primitives)
- `data-slot`: `checkbox-field`
- Part of [`Checkbox`](Checkbox.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, CheckboxProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `description` | `React.ReactNode` |  | Secondary text under the label, announced as the checkbox description. |
| `invalid` | `boolean` |  | Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `label` | `React.ReactNode` |  | Label shown beside the box and wired to it (`htmlFor`), so clicking it toggles the checkbox. |
| `labelClassName` | `string` |  | Classes for the `<label>` element. |
| `size` | `"sm" \| "md"` | `"md"` | Box size: `sm` 14px or `md` 16px. |
| `wrapperClassName` | `string` |  | Class for the outer row. |

## Variants

- `size`: `sm`, `md` (default "md")

## Notes

See the notes in [`Checkbox`](Checkbox.md#notes).

## Example

```tsx
import * as React from "react";
import { CheckboxField, CheckboxGroup } from "@sutra/ui";

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
