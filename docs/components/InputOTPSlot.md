# InputOTPSlot

> A single character cell with a blinking fake caret.

- Import: `import { InputOTPSlot } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/input-otp` (primitives)
- `data-slot`: `input-otp-slot`
- Part of [`InputOTP`](InputOTP.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `index` (required) | `number` |  | Zero-based position of the character this slot shows. |

## Notes

See the notes in [`InputOTP`](InputOTP.md#notes).

## Example

```tsx
import * as React from "react";
import { Field, FieldDescription, FieldLabel, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@cleanprompt/sutra-ui";

export function Example() {
  const [code, setCode] = React.useState("");
  return (
    <Field>
      <FieldLabel>Verification code</FieldLabel>
      <InputOTP maxLength={6} inputMode="numeric" pattern="^\d+$" value={code} onChange={setCode}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription>Enter the 6 digits we texted you.</FieldDescription>
    </Field>
  );
}
```
