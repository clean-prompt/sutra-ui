---
component: InfoTooltip
module: primitives/info-tooltip
use: A small (i) or (?) icon button that reveals a bold title and a description in a tooltip, placed next to a label or field to explain it.
instead: Tooltip = a label on an existing control; Popover = longer help with links or interactive content; HoverCard = a rich preview of a linked thing; FieldDescription = help text that should always be visible
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Focusing the button opens the tooltip after the delay; moving focus away closes it |
| Escape | Close the tooltip |
| Enter, Space | Activate the button (native `<button type="button">`), which closes the tooltip |

There are no arrow keys, so RTL changes nothing; the bubble text uses `text-start`.

## Screen readers
The trigger is a `<button>` named by `label`, else by `title` when it is a string, else `"Help"` (icon `help`) or `"More information"`. While open, the tooltip (`role="tooltip"`) is linked to the button by `aria-describedby`, so a `title` that is also the name is read twice. The icon is `aria-hidden`. `children` are rendered inside the bubble after the description.

## Reduced motion
The bubble fades and zooms in from the button and slides slightly from its side; the reduced-motion net removes the slide and the scale and keeps only the fade. The icon colour change is a transition and ends in 1 ms.

## Server rendering
Only the button renders on the server; the bubble is portalled after mount and only opens from hover or focus. Nothing differs between server and client.

## Gotchas
- Touch does not open it (Radix tooltips ignore touch pointers and a tap closes them): do not put the only copy of important help in an `InfoTooltip`.
- It uses `Tooltip`, so it follows the nearest `TooltipProvider`'s delay (200 ms by default); there is no `delayDuration` prop, so set the delay on the provider.
- Extra props and `className` go to the button, `contentClassName` to the bubble; `side`, `align` and `variant` position and style the bubble.
- `size` (`sm`, `md`, `lg`) changes the icon and the button box; the pointer target is enlarged to at least 24 px by `hitArea`.

## Example
```tsx
import { Field, FieldLabel, InfoTooltip, Input } from "@sutra/ui";

export function Example() {
  return (
    <Field className="max-w-sm">
      <div className="flex items-center gap-1.5">
        <FieldLabel>Webhook secret</FieldLabel>
        <InfoTooltip
          icon="help"
          size="sm"
          label="About the webhook secret"
          title="Webhook secret"
          description="We sign every request with this value so you can verify it came from us."
        />
      </div>
      <Input defaultValue="whsec_3f9a1c" />
    </Field>
  );
}
```
