# RadioGroupItem

> A radio button with a springy dot indicator.

- Import: `import { RadioGroupItem } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/radio` (primitives)
- `data-slot`: `radio-group-item`, `radio-dot`
- Part of [`RadioGroup`](RadioGroup.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, RadioProps$1, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `"sm" \| "md"` | `"md"` | Radio size: `sm` 14px or `md` 16px. |

## Variants

- `size`: `sm`, `md` (default "md")

## Notes

See the notes in [`RadioGroup`](RadioGroup.md#notes).

## Example

```tsx
import * as React from "react";
import { RadioField, RadioGroup } from "@sutra/ui";

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
