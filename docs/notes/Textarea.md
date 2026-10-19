---
component: Textarea
module: primitives/textarea
use: The multi-line text field. A native `<textarea>` with the shared input look, optional auto-resize between `minRows` and `maxRows`, and a character counter that uses `maxLength` as its limit.
instead: Input = a single line; InputGroupTextarea = a textarea that needs addons around it inside an `InputGroup`; RichTextEditor = formatted text; TagInput = several short tags
server: mixed
---

## Keyboard
Native textarea behaviour: Enter inserts a new line, Tab moves focus on, and the text keys and selection shortcuts work as in any text field. The component adds no key handlers and nothing is direction dependent, so RTL changes nothing.

## Screen readers
- A native `<textarea>` named by a `<label>`, `aria-label` or a surrounding `FieldLabel`; a textarea with no visible label needs `aria-label`. `invalid` sets `aria-invalid`, and `Field` supplies `id`, `aria-describedby`, `disabled` and `required` unless you pass them.
- The `showCount` counter is plain text ("12/280" with a hidden " characters used", or "12" with " characters" when there is no `maxLength`). It is not a live region and is not added to `aria-describedby`, so a screen reader finds it by reading the page but is not told as the count changes. Native `maxLength` stops typing at the limit.

## Reduced motion
Static apart from the border, ring and counter colour transitions, which the reduced-motion net ends in 1 ms. The auto-resize height change is applied directly, with no transition.

## Server rendering
The textarea renders on the server with `rows` set to `minRows` and the value or `defaultValue`. With `autoResize` the height is measured in a layout effect after mount, so a long value is `minRows` tall in the server HTML and grows when the page hydrates. Without `autoResize` nothing is measured and the output matches.

## Slots
- `textarea`: the `<textarea>`
- `textarea-wrapper`: the outer `div`, rendered only with `showCount`

## Gotchas
- `minRows` defaults to 3 and is both the initial height and, with `autoResize`, the smallest height; `maxRows` defaults to unlimited, and taller content scrolls inside once it is set. A `rows` prop sets the attribute but `autoResize` still sizes from `minRows`.
- `autoResize` turns the manual resize handle off (`resize-none`); otherwise the textarea is `resize-y`. It re-measures when the value changes and when the width changes.
- `className` is always on the `<textarea>`; `wrapperClassName` applies only when `showCount` adds the wrapper.
- The counter turns red when the length reaches `maxLength`, not only when it passes it, and with `showCount` the textarea gets extra bottom padding for it.

## Example
```tsx
import * as React from "react";
import { Field, FieldDescription, FieldLabel, Textarea } from "@sutra/ui";

export function Example() {
  const [notes, setNotes] = React.useState("");
  return (
    <Field>
      <FieldLabel>Release notes</FieldLabel>
      <Textarea
        autoResize
        minRows={3}
        maxRows={8}
        maxLength={280}
        showCount
        placeholder="What changed in this version?"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <FieldDescription>Shown on the changelog page.</FieldDescription>
    </Field>
  );
}
```
