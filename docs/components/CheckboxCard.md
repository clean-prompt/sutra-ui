# CheckboxCard

> Bordered, selectable card that toggles a checkbox. Highlighted when checked.

- Import: `import { CheckboxCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/checkbox` (primitives)
- `data-slot`: `checkbox-card`
- Part of [`Checkbox`](Checkbox.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, CheckboxProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `React.ReactNode` |  | Primary text of the card (the whole card is the label and click target). |
| `checkboxClassName` | `string` |  | Class for the checkbox control (`className` styles the card). |
| `description` | `React.ReactNode` |  | Supporting text under the label. |
| `icon` | `React.ReactNode` |  | Optional leading icon or media. |
| `indicatorPosition` | `"start" \| "end"` | `"end"` | Where the checkbox sits in the card. |
| `invalid` | `boolean` |  | Marks the checkbox invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `size` | `"sm" \| "md"` | `"md"` | Box size: `sm` 14px or `md` 16px. |

## Variants

- `size`: `sm`, `md` (default "md")

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
