# FieldError

> Validation message, announced to assistive tech. Renders nothing when empty.

- Import: `import { FieldError } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/field` (primitives)
- `data-slot`: `field-error`
- Part of [`Field`](Field.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `errors` | `FieldErrorEntry[]` |  | Error objects or strings (e.g. from a form library). Used when no children are given. |
| `hideIcon` | `boolean` |  | Hide the leading icon. |

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
