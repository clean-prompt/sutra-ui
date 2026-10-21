# FieldLabel

> Label bound to the field's control.

- Import: `import { FieldLabel } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/field` (primitives)
- Part of [`Field`](Field.md)
- Also accepts the props of HTMLAttributes, LabelHTMLAttributes, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `hint` | `React.ReactNode` |  | Muted helper shown after the label text, e.g. "(optional)". |
| `required` | `boolean` |  | Appends a red asterisk (hidden from assistive technology); set `required` on the control itself for validation. |

## Notes

See the notes in [`Field`](Field.md#notes).

## Example

```tsx
import * as React from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@cleanprompt/sutra-ui";

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
