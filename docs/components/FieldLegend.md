# FieldLegend

> Title of a `Fieldset`.

- Import: `import { FieldLegend } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/field` (primitives)
- `data-slot`: `field-legend`
- Part of [`Field`](Field.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"legend" \| "label"` | `"legend"` | `legend` renders a section title, `label` matches a field label. |

## Notes

See the notes in [`Field`](Field.md#notes).

## Example

```tsx
import * as React from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@sutra/ui";

export function Example() {
  const [email, setEmail] = React.useState("");
  const invalid = email !== "" && !email.includes("@");
  return (
    <Field required invalid={invalid}>
      <FieldLabel>Email</FieldLabel>
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <FieldDescription>We only use it to send receipts.</FieldDescription>
      {invalid && <FieldError>Enter a valid email address.</FieldError>}
    </Field>
  );
}
```
