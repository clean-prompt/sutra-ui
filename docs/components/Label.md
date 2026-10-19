# Label

> Form label with an optional required asterisk and `hint`; use it with `htmlFor` or let `Field` wire it. Extra props are spread to the `<label>`.

- Import: `import { Label } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/label` (primitives)
- Also accepts the props of HTMLAttributes, LabelHTMLAttributes, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `hint` | `React.ReactNode` |  | Muted helper shown after the label text, e.g. "(optional)". |
| `required` | `boolean` |  | Appends a red asterisk (hidden from assistive technology); set `required` on the control itself for validation. |

## Notes

**When to use:** A form label for any control: a Radix label with an optional required asterisk and a muted `hint`. Point it at a control with `htmlFor`, or let `FieldLabel` do it inside a `Field`.

**Use instead when:**
- `FieldLabel`: a label inside a `Field` that wires itself to the control
- `FieldLegend`: the title of a `Fieldset` of related controls
- `Badge`: a categorical tag, not a form label

### Keyboard

Not focusable: no keyboard interaction. Clicking the label forwards focus (and a click, for a checkbox or switch) to the control it names.

### Screen readers

- It renders a native `<label>`, so `htmlFor` (or wrapping the control) gives the control its accessible name. The `hint` text is inside the label, so it is part of the name (for example "Email (work)").
- The required asterisk is `aria-hidden`: `required` on `Label` is only the visual mark. Set `required` on the control (or on `Field`) to expose `required` to assistive technology and to validation.
- A label does not name custom widgets that are not labelable elements (a `div role="combobox"`); those take `aria-labelledby` pointing at the label id, which `FieldLabel` and `Combobox` do for you.

### Reduced motion

Static: no animation or transition.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API or mount state, so server and client output match.

### Gotchas

- Radix cancels text selection on a double click on the label (so a quick double click on a checkbox label does not highlight it), except when the target is a button, input, select or textarea inside it.
- The disabled look comes from `peer-disabled:` (the control must be a preceding sibling with the `peer` class, as `Checkbox` is) or from a `group` ancestor with `data-disabled="true"`; otherwise pass your own classes. `FieldLabel` dims itself from the surrounding `Field`.
- Extra props go to the `<label>`; `className` merges after the defaults.

## Example

```tsx
import { Input, Label } from "@sutra/ui";

export function Example() {
  return (
    <div className="grid max-w-sm gap-1.5">
      <Label htmlFor="project-name" required hint="(shown on invoices)">
        Project name
      </Label>
      <Input id="project-name" required placeholder="Quarterly report" />
    </div>
  );
}
```
