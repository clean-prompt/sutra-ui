# OTPField

> Ready-made OTP input that renders its slots automatically. Digits only by default.

- Import: `import { OTPField } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/input-otp` (primitives)
- Also accepts the props of HTMLAttributes, InputHTMLAttributes, OTPInputBaseProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `groupSize` | `number` |  | Split slots into groups of this size with a separator between them. |
| `invalid` | `boolean` |  | Marks the field invalid: error ring on the slots and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `length` | `number` | `6` | Number of characters. |
| `separator` | `React.ReactNode` |  | Custom separator node. |
| `size` | `Size` |  | Slot size. |
| `slotClassName` | `string` |  | Classes for every slot. |

## Notes

**When to use:** A one-time code or PIN field drawn as separate character slots over one real input (the `input-otp` library). Compose `InputOTPGroup`, `InputOTPSlot` and `InputOTPSeparator` yourself, or use `OTPField` for a ready-made row of slots.

**Use instead when:**
- `Input`: free text of any length
- `NumberInput`: a number with steppers
- `PasswordInput`: a secret typed in full
- `TagInput`: several free-form tags

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the single underlying input (the slots are not tab stops) |
| Digits, or any character `pattern` allows | Fill the next slot; a character that fails `pattern` is rejected |
| Backspace, Delete | Remove characters, as in a normal text input |
| Arrow keys, Home, End | Move the native caret, which highlights the matching slot |
| Ctrl+V, Cmd+V | Paste a code; `pasteTransformer` can clean it first |

Everything is native text input behaviour: one `<input>` sits over the slots with transparent text. `onComplete` fires when the value reaches `maxLength` (`length` for `OTPField`). Slots are a flex row, so in an RTL document they run right to left; wrap the field in `dir="ltr"` if a code should read left to right.

### Screen readers

- The real input carries the whole value and is what assistive technology reads. Give it a name with `aria-label`, `aria-labelledby` or a surrounding `FieldLabel`; `invalid` sets `aria-invalid`, and `Field` supplies `id`, `aria-describedby`, `disabled` and `required`.
- The input defaults to `autoComplete="one-time-code"` (so the browser can offer an SMS code), `inputMode="numeric"` and `spellCheck` off. `OTPField` sets `inputMode` to `text` when you give it a non-digit `pattern`.
- Slots are plain `div`s with no role or `aria-hidden`, and the fake caret is `aria-hidden`. `InputOTPSeparator` is a `role="separator"`, so each one is announced when a reader walks the content.

### Reduced motion

A character pops in with `animate-in zoom-in-90`, which the reduced-motion net strips of its movement. The fake caret blinks with `animate-caret-blink`, which the net turns off, so it stays solid.

### Server rendering

Server render: same markup as the client. The input and the slots render on the server from `value` or `defaultValue`; the active slot, the fake caret and the library's autofill style rules appear only after mount, because they depend on focus and `document.head`.

### Slots

- `input-otp`: the underlying input
- `input-otp-group`: a run of slots
- `input-otp-slot`: one character cell; `data-active` while it holds the caret, `data-filled` when it has a character
- `input-otp-separator`: the divider between groups

### Gotchas

- `OTPField` is digits only by default (`pattern` is `REGEXP_ONLY_DIGITS`); pass `pattern` to allow letters, and `groupSize` and `separator` to split the slots (3 and 3 for a six digit code).
- `InputOTP` needs `maxLength` and one `InputOTPSlot index` per character; a missing index leaves a character with nothing to show it. `OTPField` takes `length` instead.
- `onChange` receives the string value, not an event. `defaultValue` works because the wrapper owns the uncontrolled state; pass `value` to control it.
- `size` is `sm`, `md` or `lg` and applies to every slot through context; `invalid` turns the slot borders red.

## Example

```tsx
import * as React from "react";
import { Field, FieldDescription, FieldLabel, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@sutra/ui";

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
