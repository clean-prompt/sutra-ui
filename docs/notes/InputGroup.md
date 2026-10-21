---
component: InputGroup
module: primitives/input-group
covers: InputGroupAddon, InputGroupText, InputGroupButton, InputGroupInput, InputGroupTextarea
use: One input-like box that hosts a control with addons around it: text, icons, buttons or keys at the start or end, or in a row above or below. `InputGroupInput` or `InputGroupTextarea` is the control; the box takes its focus, invalid and disabled styling from it.
instead: Input = a field whose addons are only an icon, a text prefix or suffix, or a clear button; Textarea = several lines with no addons; ButtonGroup = attached buttons with no text field; SearchInput = a ready-made search field
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Follows DOM order through the control and any addon buttons, links or inputs |
| Enter, Space | Activates a focused `InputGroupButton` (native button) |

The group adds no key handling. Clicking padding or an `InputGroupText` addon focuses the control (a click on a button, link or other control inside an addon is left alone). Visual order comes from `align` through CSS `order`, but tab and reading order come from where you put the parts in the markup, so write them in the order users should reach them. RTL only mirrors the layout: `inline-start` and `inline-end` follow the reading direction.

## Screen readers
- The group and every addon are `role="group"` without a name. Give the `InputGroup` an `aria-label` when its parts need announcing as a unit; the control still needs its own name from a `<label>`, `aria-label` or a surrounding `FieldLabel`.
- `InputGroupInput` and `InputGroupTextarea` are native controls that read `id`, `disabled`, `required`, `aria-describedby` and `invalid` (as `aria-invalid`) from a surrounding `Field`. Put `invalid`, `disabled` and `required` on the control, not on `InputGroup`; the box restyles through `has-[...]` on the control.
- An icon-only `InputGroupButton` needs `aria-label`. Text that sits in an addon (`https://`, `USD`) is read as plain text before or after the field, so repeat it in the control's label if it matters.

## Reduced motion
Static apart from the border and ring fade on focus, which the reduced-motion net ends in 1 ms.

## Server rendering
Plain markup with no browser API or mount state, so server and client output match.

## Slots
- `input-group`: the box
- `input-group-addon`: an addon; `data-align` is `inline-start`, `inline-end`, `block-start` or `block-end`
- `input-group-text`: muted inline text inside an addon
- `input-group-button`: a compact button
- `input-group-control`: the input or textarea that drives the box styling

## Gotchas
- `InputGroup` `size` (`sm`, `md`, `lg`) sets the height and `variant` the look; it does not size the control. Pass `size` to `InputGroupInput` too when you change the padding.
- `block-start` and `block-end` addons stack above or below the control and make the box auto-height; with a textarea the box also becomes auto-height.
- `InputGroupButton` is a `Button`: `variant` defaults to `ghost`, `size` to `xs` (`xs`, `sm`, `icon-xs`, `icon-sm`), and `type` to `button`.
- Only the control gets focus styling; a focused addon button does not light the box.

## Example
```tsx
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@cleanprompt/sutra-ui";
import { RiFileCopyLine } from "@cleanprompt/sutra-ui/icons";

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
