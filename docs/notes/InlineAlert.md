---
component: InlineAlert
module: primitives/inline-alert
covers: InlineAlertTitle, InlineAlertDescription, InlineAlertActions
use: A contextual message that sits inside content (a form, a panel, a settings page), with an icon, a title and description, an optional action and an optional dismiss button. `layout="strip"` makes it an edge-to-edge bar.
instead: AlertBanner = a page-level announcement at the top of the app; Toaster = a transient message that goes away by itself; AlertDialog = the user must answer before going on; StatusBadge = a small state label
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Reaches the controls you put in `action`, in `InlineAlertActions` or in the text, then the dismiss button |
| Enter, Space | Presses the focused button (Enter follows a link) |

The alert itself is not focusable and has no arrow-key behaviour, so nothing changes in RTL. The dismiss button is on the end edge, and the `accent` appearance puts its coloured edge on the start side (`border-s`), so both flip with `dir`.

## Screen readers
- The root is `role="alert"` for `warning` and `destructive` (announced at once, interrupting) and `role="status"` for every other tone (a polite live region). Pass `role` to override: the strip layout in the tests uses `role="status"` on a warning.
- The icon is `aria-hidden`; the colour alone does not carry the meaning, so put the severity in the text.
- The dismiss button is named by `dismissLabel` (default "Dismiss"). Give it a more specific label when several alerts are on screen.
- `InlineAlertTitle` is a `<p>`, not a heading, so it adds nothing to the heading outline.

## Reduced motion
Static: nothing enters or animates. Only the close button's hover fade, which the reduced-motion net ends in 1 ms.

## Server rendering
Plain markup with no browser API, so the server and client output match.

## Slots
- `inline-alert-icon`: the wrapper around the icon (not rendered when `icon={false}`)
- `inline-alert-action`: the box that holds the `action` node, placed before the dismiss button

## Gotchas
- There is no open state. `onDismiss` only reports the click and the dismiss button appears only when you pass it: unmount the alert yourself (the tests do it with `useState`). `AlertBanner` is the one that hides itself.
- `action` sits beside the message, vertically centred; `InlineAlertActions` is the row of buttons under the description. Do not use both for the same buttons.
- `variant` is a deprecated alias of `tone` (`brand` is `primary`); `tone` wins when both are set. The default tone is `info`.
- `appearance` is `soft` (tinted), `outline` (bordered, on the page background) or `accent` (soft with a 3px coloured start edge); `layout="strip"` also drops the radius and all borders but the bottom one.

## Example
```tsx
import * as React from "react";
import { Button, InlineAlert, InlineAlertActions, InlineAlertDescription, InlineAlertTitle } from "@cleanprompt/sutra-ui";

export function Example() {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;
  return (
    <InlineAlert tone="warning" onDismiss={() => setVisible(false)}>
      <InlineAlertTitle>Billing address is missing</InlineAlertTitle>
      <InlineAlertDescription>Invoices are paused until you add an address to your account.</InlineAlertDescription>
      <InlineAlertActions>
        <Button size="sm">Add address</Button>
        <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
          Remind me later
        </Button>
      </InlineAlertActions>
    </InlineAlert>
  );
}
```
