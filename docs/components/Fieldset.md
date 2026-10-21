# Fieldset

> Native fieldset for grouping related fields under a legend.

- Import: `import { Fieldset } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/field` (primitives)
- `data-slot`: `fieldset`
- Part of [`Field`](Field.md)
- Also accepts the props of HTMLAttributes, FieldsetHTMLAttributes

## Props

No props of its own.

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
