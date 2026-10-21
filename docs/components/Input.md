# Input

> Text input with optional icons, text addons and a clear button. Consumes `Field` context.

- Import: `import { Input } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/input` (primitives)
- `data-slot`: `input`, `input-wrapper`
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` |  | Classes for the element that renders. Without addons that is the `<input>` itself (the root). With addons (`leadingIcon`, `trailingIcon`, `prefix`, `suffix`, `clearable`) it lands on the **inner** `<input>`, not the outer wrapper, so layout classes (`w-48`, `flex-1`, margins) have no visible effect there; use `wrapperClassName` for those. |
| `clearable` | `boolean` |  | Shows a clear button while the field has a value. |
| `clearLabel` | `string` | `"Clear"` | Accessible name of the clear button. |
| `invalid` | `boolean` |  | Marks the field invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `leadingIcon` | `React.ReactNode` |  | Icon rendered inside the field before the text. |
| `onClear` | `() => void` |  | Called after the clear button empties the field. |
| `prefix` | `React.ReactNode` |  | Text addon before the field, e.g. "https://". |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Field height and text size. |
| `suffix` | `React.ReactNode` |  | Text addon after the field, e.g. ".com". |
| `trailingIcon` | `React.ReactNode` |  | Icon or small action rendered inside the field after the text. |
| `variant` | `"outline" \| "filled" \| null` | `"outline"` | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border. |
| `wrapperClassName` | `string` |  | Classes for the outer wrapper `<div>`, which is only rendered when addons are present. Put layout/sizing classes here when the input has addons. |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
- `variant`: `outline`, `filled` (default "outline")

## Notes

**When to use:** The single-line text field. It takes every native `<input>` prop and adds `leadingIcon`, `trailingIcon`, `prefix`, `suffix` and `clearable`. `PasswordInput` adds a show and hide toggle, `SearchInput` a search icon, a clear button and an optional focus hotkey.

**Use instead when:**
- `Textarea`: several lines
- `NumberInput`: numbers with steppers and locale formatting
- `InputGroup`: addons that are real buttons, selects or other controls
- `InputOTP`: a one-time code split into slots
- `Combobox`: a choice from a list
- `TagInput`: several free-form tags

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to and from the field and the `PasswordInput` toggle. The `clearable` button is not a tab stop (`tabIndex` -1) |
| Enter, Space | On the `PasswordInput` toggle: show or hide the text |
| Escape | In a `SearchInput` that has text and `clearable`: empty it and call `onClear` |
| `hotkey` (for example `/` or `mod+k`) | Anywhere on the page: focus and select the `SearchInput`. A plain key typed into another field stays text; a chord with Ctrl or Meta still fires |

Typing is native. There are no arrow-key handlers, and the icons and addons use logical padding, so RTL only mirrors the layout.

### Screen readers

- A native `<input>` named by a `<label>`, `aria-label` or a surrounding `FieldLabel`; a field with no visible label needs `aria-label`. `invalid` sets `aria-invalid`, and `Field` adds `id`, `aria-describedby`, `disabled` and `required` unless you pass them.
- `SearchInput` is `type="search"` (role `searchbox`), sets `aria-keyshortcuts` from `hotkey`, and hides the key hint (`aria-hidden`).
- The clear button is named "Clear" (not translatable through a prop). The `PasswordInput` toggle is named "Show password" or "Hide password" and also carries `aria-pressed`. Icons are `aria-hidden`; `leadingIcon`, `trailingIcon`, `prefix` and `suffix` content that you pass is not hidden for you.

### Reduced motion

The clear button pops in with `animate-in fade-in-0 zoom-in-75`, and the border and ring fade with a short transition; the reduced-motion net removes the zoom and ends the transitions in 1 ms.

### Server rendering

Server render: part of it fills in after mount. `Input` and `PasswordInput` render the same markup on both sides, including the clear button when a `value` or `defaultValue` is set. `SearchInput` reads its key hint after mount (`hotkey` is turned into key labels in an effect), so the hint chips are not in the server HTML and appear on hydration.

### Slots

- `input`: the `<input>` element (the root when there are no addons)
- `input-wrapper`: the outer `div`, rendered only when an icon, addon or `clearable` is present

### Gotchas

- `className` lands on the inner `<input>` once any addon is present, so layout classes (`w-48`, `flex-1`) do nothing there; put them in `wrapperClassName`. Without addons `className` is the root.
- `PasswordInput` defaults to `autoComplete="current-password"` (pass `"new-password"` when setting one), turns off `spellCheck`, and does not accept `type` or `trailingIcon`.
- `clearable` fires a real `input` event, so `onChange` runs with an empty value, then `onClear`. `SearchInput` is `clearable` by default.
- Pass `prefix` and `suffix` as text addons; for interactive addons use `InputGroup`.

## Example

```tsx
import * as React from "react";
import { Field, FieldLabel, Input } from "@cleanprompt/sutra-ui";

export function Example() {
  const [site, setSite] = React.useState("");
  return (
    <Field>
      <FieldLabel>Website</FieldLabel>
      <Input
        type="url"
        prefix="https://"
        placeholder="example.com"
        clearable
        wrapperClassName="max-w-sm"
        value={site}
        onChange={(event) => setSite(event.target.value)}
      />
    </Field>
  );
}
```
