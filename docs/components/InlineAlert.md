# InlineAlert

> Contextual message placed inline with content (forms, panels, settings). `layout="strip"` turns it into an edge-to-edge bar with only a bottom border, for the top of a page or panel.

- Import: `import { InlineAlert } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/inline-alert` (primitives)
- `data-slot`: `inline-alert-icon`, `inline-alert-action`
- Parts: [`InlineAlertActions`](InlineAlertActions.md), [`InlineAlertDescription`](InlineAlertDescription.md), [`InlineAlertTitle`](InlineAlertTitle.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `action` | `React.ReactNode` |  | Trailing control(s) beside the message, before the close button (e.g. a CTA). Use `InlineAlertActions` for a row under the text. |
| `appearance` | `"soft" \| "outline" \| "accent"` | `"soft"` | Surface style: `soft` (tinted), `outline` (bordered) or `accent` (soft with a coloured start edge). |
| `dismissLabel` | `string` | `"Dismiss"` | Accessible name of the dismiss button. |
| `icon` | `React.ReactNode \| false` |  | Custom icon; pass `false` or `null` to hide the default per-variant icon. |
| `layout` | `"box" \| "strip"` | `"box"` | Shape: `box` is a rounded block, `strip` is a full-width bar with only a bottom border. |
| `onDismiss` | `() => void` |  | Shows a close button that calls this handler. |
| `tone` | `InlineAlertTone \| null` |  | Semantic colour. Default `info`. |
| `variant` | `InlineAlertVariant \| InlineAlertTone \| null` | `"info"` | **Deprecated.** Use `tone` (`brand` → `primary`). Legacy name of `tone`. |

## Variants

- `variant`: `info`, `success`, `warning`, `destructive`, `neutral`, `brand` (default "info")
- `appearance`: `soft`, `outline`, `accent` (default "soft")
- `layout`: `box`, `strip` (default "box")

## Notes

**When to use:** A contextual message that sits inside content (a form, a panel, a settings page), with an icon, a title and description, an optional action and an optional dismiss button. `layout="strip"` makes it an edge-to-edge bar.

**Use instead when:**
- `AlertBanner`: a page-level announcement at the top of the app
- `Toaster`: a transient message that goes away by itself
- `AlertDialog`: the user must answer before going on
- `StatusBadge`: a small state label

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Reaches the controls you put in `action`, in `InlineAlertActions` or in the text, then the dismiss button |
| Enter, Space | Presses the focused button (Enter follows a link) |

The alert itself is not focusable and has no arrow-key behaviour, so nothing changes in RTL. The dismiss button is on the end edge, and the `accent` appearance puts its coloured edge on the start side (`border-s`), so both flip with `dir`.

### Screen readers

- The root is `role="alert"` for `warning` and `destructive` (announced at once, interrupting) and `role="status"` for every other tone (a polite live region). Pass `role` to override: the strip layout in the tests uses `role="status"` on a warning.
- The icon is `aria-hidden`; the colour alone does not carry the meaning, so put the severity in the text.
- The dismiss button is named by `dismissLabel` (default "Dismiss"). Give it a more specific label when several alerts are on screen.
- `InlineAlertTitle` is a `<p>`, not a heading, so it adds nothing to the heading outline.

### Reduced motion

Static: nothing enters or animates. Only the close button's hover fade, which the reduced-motion net ends in 1 ms.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so the server and client output match.

### Slots

- `inline-alert-icon`: the wrapper around the icon (not rendered when `icon={false}`)
- `inline-alert-action`: the box that holds the `action` node, placed before the dismiss button

### Gotchas

- There is no open state. `onDismiss` only reports the click and the dismiss button appears only when you pass it: unmount the alert yourself (the tests do it with `useState`). `AlertBanner` is the one that hides itself.
- `action` sits beside the message, vertically centred; `InlineAlertActions` is the row of buttons under the description. Do not use both for the same buttons.
- `variant` is a deprecated alias of `tone` (`brand` is `primary`); `tone` wins when both are set. The default tone is `info`.
- `appearance` is `soft` (tinted), `outline` (bordered, on the page background) or `accent` (soft with a 3px coloured start edge); `layout="strip"` also drops the radius and all borders but the bottom one.

## Example

```tsx
import * as React from "react";
import { Button, InlineAlert, InlineAlertActions, InlineAlertDescription, InlineAlertTitle } from "@sutra/ui";

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
