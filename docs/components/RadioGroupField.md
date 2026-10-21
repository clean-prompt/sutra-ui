# RadioGroupField

> Data-driven radio group with a label, description and an `options` array.

- Import: `import { RadioGroupField } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/radio` (primitives)
- `data-slot`: `radio-group-field`
- Part of [`RadioGroup`](RadioGroup.md)
- Also accepts the props of HTMLAttributes, RadioGroupProps, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` (required) | `RadioGroupOption[]` |  | Options to render, in order; each has a `value`, a `label` and optional description, icon and disabled flag. |
| `description` | `React.ReactNode` |  | Help text under the group label. |
| `invalid` | `boolean` |  | Marks the group invalid: error styling on the items and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `label` | `React.ReactNode` |  | Group label shown above the options; it is the accessible name of the group. |
| `size` | `"sm" \| "md"` | `"md"` | Radio size for every option. |
| `variant` | `"default" \| "card"` | `"default"` | `card` renders each option as a `RadioCard`. |
| `wrapperClassName` | `string` |  | Class for the outer wrapper. |

## Variants

- `size`: `sm`, `md` (default "md")

## Notes

See the notes in [`RadioGroup`](RadioGroup.md#notes).

## Example

```tsx
import * as React from "react";
import { RadioField, RadioGroup } from "@cleanprompt/sutra-ui";

export function Example() {
  const [plan, setPlan] = React.useState("team");
  return (
    <RadioGroup aria-label="Plan" name="plan" value={plan} onValueChange={setPlan}>
      <RadioField value="free" label="Free" description="One project, community support." />
      <RadioField value="team" label="Team" description="Unlimited projects and shared workspaces." />
      <RadioField value="enterprise" label="Enterprise" description="Single sign-on and audit logs." />
    </RadioGroup>
  );
}
```
