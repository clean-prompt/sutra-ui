---
component: Field
module: primitives/field
covers: FieldContent, FieldLabel, FieldDescription, FieldHint, FieldError, FieldGroup, Fieldset, FieldLegend, FieldContext
use: Wires one form control to its label, description, hint and error: shared id, `aria-describedby`, `aria-invalid`, `disabled` and `required`. Controls that call `useField` (Input, Textarea, Select, Checkbox, Switch, the pickers and others) pick it up with no props.
instead: Label = a standalone label with no shared state; Fieldset = group related fields under a legend; RadioGroup = a set of radios has its own group label; FieldGroup = only vertical spacing between fields
server: mixed
---

## Keyboard
Not focusable: `Field` renders layout and text only, so there is no keyboard interaction. Tab goes to the control inside it, and clicking the `FieldLabel` focuses that control.

## Screen readers
- `FieldLabel` is a `<label htmlFor>` pointing at the field `id` (generated, or the `id` you pass to `Field`), and carries a label id that widgets which are not labelable elements use as `aria-labelledby` (Combobox, TimePicker). Its asterisk follows `required` but is `aria-hidden`.
- The control gets `aria-describedby` listing the description, hint and error parts that are mounted, in that order, plus any ids you pass yourself; a part with a custom `id` is listed under that id. `invalid` becomes `aria-invalid` on the control.
- `FieldError` is `role="alert"`, so it is announced when it appears, and renders nothing when it has no content. Pass `errors` (strings or `{ message }` objects from a form library) instead of children: one message is plain text, several become a list.
- `Fieldset` is a native `<fieldset>` and `FieldLegend` a `<legend>`; a `disabled` fieldset disables the controls inside it natively.

## Reduced motion
`FieldError` fades and slides in with `animate-in slide-in-from-top-1`; the reduced-motion net removes the slide and ends the rest in 1 ms.

## Server rendering
The label, control and parts render on the server, but each description, hint and error registers itself in an effect, so the control's `aria-describedby` is missing from the server HTML and appears after hydration. The id comes from `useId`, so it matches on both sides.

## Slots
- `field`: the wrapper; carries `data-orientation`, `data-invalid` and `data-disabled`
- `field-content`: stacks label, description and error beside a control in a `horizontal` field
- `field-description`, `field-hint`, `field-error`: the text parts
- `field-group`: a vertical stack of fields
- `fieldset`, `field-legend`: the native group and its title (`data-variant` is `legend` or `label`)

## Gotchas
- Explicit props on the control win: `useField` takes the control's own `id`, `disabled`, `required` and `invalid` (a true `aria-invalid` also counts) before the field's, and joins `aria-describedby` instead of replacing it.
- Showing a `FieldError` does not mark the control invalid: set `invalid` on `Field` (or on the control) for `aria-invalid` and the red border.
- `Field` gives one `id` to one control. For a group of controls (radios, checkboxes) use `Fieldset` with `FieldLegend`, or the group's own `label`.
- Read the state yourself with `useFieldContext()` (it returns `null` outside a `Field`), or wire a custom control with `useField`.

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
