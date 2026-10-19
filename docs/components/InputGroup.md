# InputGroup

> A container that looks like a single input and hosts addons around a control.

- Import: `import { InputGroup } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/input-group` (primitives)
- `data-slot`: `input-group`
- Parts: [`InputGroupAddon`](InputGroupAddon.md), [`InputGroupButton`](InputGroupButton.md), [`InputGroupInput`](InputGroupInput.md), [`InputGroupText`](InputGroupText.md), [`InputGroupTextarea`](InputGroupTextarea.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Group height and text size. |
| `variant` | `"outline" \| "filled"` | `"outline"` | `outline` (default) is the bordered box; `filled` is a tinted surface with a hidden border (the surface returns to normal on focus). |

## Variants

- `size`: `sm`, `md`, `lg` (default "md")
- `variant`: `outline`, `filled` (default "outline")

## Part props

### InputGroupAddon

Text, icon or button placed at an edge of an `InputGroup`. Clicking it focuses the control.

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"inline-start" \| "inline-end" \| "block-start" \| "block-end"` | `"inline-start"` | Where the addon sits: at the start or end of the line, or in a row above (`block-start`) or below (`block-end`) the input. |

### InputGroupButton

Compact button sized to sit inside an `InputGroup`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render as the child element (e.g. a link) while keeping button styles. |
| `fullWidth` | `boolean \| null` |  | Stretches the button to the width of its container. |
| `leadingIcon` | `React.ReactNode` |  | Icon before the label. |
| `loading` | `boolean` |  | Shows a spinner and disables the button. |
| `size` | `"xs" \| "sm" \| "icon-xs" \| "icon-sm"` | `"xs"` | Button size: `xs` or `sm` with text, `icon-xs` or `icon-sm` for square icon buttons. |
| `spinnerProps` | `Partial<SpinnerProps>` |  | Overrides for the loading spinner (variant, size, `label`, colour via `className`); it inherits the button text colour by default. |
| `trailingIcon` | `React.ReactNode` |  | Icon after the label. |
| `variant` | `"link" \| "ghost" \| "primary" \| "destructive" \| "soft" \| "outline" \| "inverse" \| "secondary" \| "tertiary" \| "destructive-soft" \| null` | `"primary"` | Visual style: `primary` (filled), `secondary` (bordered), `tertiary` (muted fill), `soft`, `ghost`, `outline`, `destructive`, `destructive-soft`, `inverse` or `link`. |

### InputGroupInput

The input inside an `InputGroup`. Consumes `Field` context.

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` |  | Marks the group invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `size` | `Size` |  | Input height and text size. |

### InputGroupTextarea

The textarea inside an `InputGroup`. Consumes `Field` context.

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` |  | Marks the textarea invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |

## Notes

**When to use:** One input-like box that hosts a control with addons around it: text, icons, buttons or keys at the start or end, or in a row above or below. `InputGroupInput` or `InputGroupTextarea` is the control; the box takes its focus, invalid and disabled styling from it.

**Use instead when:**
- `Input`: a field whose addons are only an icon, a text prefix or suffix, or a clear button
- `Textarea`: several lines with no addons
- `ButtonGroup`: attached buttons with no text field
- `SearchInput`: a ready-made search field

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Follows DOM order through the control and any addon buttons, links or inputs |
| Enter, Space | Activates a focused `InputGroupButton` (native button) |

The group adds no key handling. Clicking padding or an `InputGroupText` addon focuses the control (a click on a button, link or other control inside an addon is left alone). Visual order comes from `align` through CSS `order`, but tab and reading order come from where you put the parts in the markup, so write them in the order users should reach them. RTL only mirrors the layout: `inline-start` and `inline-end` follow the reading direction.

### Screen readers

- The group and every addon are `role="group"` without a name. Give the `InputGroup` an `aria-label` when its parts need announcing as a unit; the control still needs its own name from a `<label>`, `aria-label` or a surrounding `FieldLabel`.
- `InputGroupInput` and `InputGroupTextarea` are native controls that read `id`, `disabled`, `required`, `aria-describedby` and `invalid` (as `aria-invalid`) from a surrounding `Field`. Put `invalid`, `disabled` and `required` on the control, not on `InputGroup`; the box restyles through `has-[...]` on the control.
- An icon-only `InputGroupButton` needs `aria-label`. Text that sits in an addon (`https://`, `USD`) is read as plain text before or after the field, so repeat it in the control's label if it matters.

### Reduced motion

Static apart from the border and ring fade on focus, which the reduced-motion net ends in 1 ms.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API or mount state, so server and client output match.

### Slots

- `input-group`: the box
- `input-group-addon`: an addon; `data-align` is `inline-start`, `inline-end`, `block-start` or `block-end`
- `input-group-text`: muted inline text inside an addon
- `input-group-button`: a compact button
- `input-group-control`: the input or textarea that drives the box styling

### Gotchas

- `InputGroup` `size` (`sm`, `md`, `lg`) sets the height and `variant` the look; it does not size the control. Pass `size` to `InputGroupInput` too when you change the padding.
- `block-start` and `block-end` addons stack above or below the control and make the box auto-height; with a textarea the box also becomes auto-height.
- `InputGroupButton` is a `Button`: `variant` defaults to `ghost`, `size` to `xs` (`xs`, `sm`, `icon-xs`, `icon-sm`), and `type` to `button`.
- Only the control gets focus styling; a focused addon button does not light the box.

## Example

```tsx
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@sutra/ui";
import { RiFileCopyLine } from "@sutra/ui/icons";

export function Example() {
  const link = "sutra.dev/share/q3-report";
  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Share link" value={link} readOnly />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label="Copy link"
          onClick={() => navigator.clipboard.writeText(`https://${link}`)}
        >
          <RiFileCopyLine aria-hidden />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
```
