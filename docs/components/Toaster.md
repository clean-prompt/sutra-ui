# Toaster

> Sonner toaster styled with Sutra tokens. Follows the `.dark` class on <html> unless `theme` is set.

- Import: `import { Toaster } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/toast` (primitives)
- Also accepts the props of ToasterProps

## Props

No props of its own.

## Notes

**When to use:** Transient notifications through sonner. Mount `Toaster` once, then call `toast()` or `toast.success`, `toast.error`, `toast.promise` from anywhere. `snackbar()` shows the compact dark `Snackbar`; `Snackbar` also works as a plain inline bar.

**Use instead when:**
- `InlineAlert`: a message that stays next to the content it concerns
- `AlertBanner`: a page-level notice that persists
- `ConfirmDialog`: something the user must answer
- `DialogProvider`: ask from code and wait for the answer

### Keyboard

| Key | Action |
|---|---|
| Alt+T | Anywhere on the page: expand the stack and move focus to the notifications region (sonner's default `hotkey`, changeable with `hotkey`) |
| Tab / Shift+Tab | Moves through the focusable toasts and their action, cancel and close buttons once the region is focused |
| Enter, Space | Activate the focused button |
| Escape | While focus is inside the region: collapse the stack (it does not dismiss a toast) |

The region is not in the normal tab order (`tabindex="-1"`), so keyboard users reach it only through the hotkey. Toasts can also be swiped away with a pointer. The hotkey has no arrow keys. Sonner reads the document direction (`dir="auto"`) and mirrors its buttons and icons, but `position` is physical: `bottom-right` stays on the right in RTL.

### Screen readers

The Toaster renders a `<section aria-label="Notifications alt+T" aria-live="polite" aria-relevant="additions text" aria-atomic="false">` on first render, so new toasts are announced politely without moving focus (`containerAriaLabel` and `customAriaLabel` rename it). Toasts are focusable list items with no role of their own; the close button is named "Close toast" (`closeButtonAriaLabel`). The success, info, warning and error icons are `aria-hidden`. `Snackbar` is `role="status"` with `aria-live="polite"` (pass `role="alert"` for errors), its dismiss button is named "Dismiss" (`closeLabel`), and its `icon` sits in an `aria-hidden` span. A snackbar shown through `snackbar()` sits inside the Toaster's live region and carries its own `status`.

### Reduced motion

Sonner's own stylesheet turns off the toast transitions and animations under `prefers-reduced-motion`, so toasts appear and leave without sliding or stacking motion. The loading icon is Sutra's `Spinner`. Auto-dismiss timers are not affected.

### Server rendering

Server render: same markup as the client. The server renders the empty live-region `<section>` only: toasts exist only after `toast()` is called on the client. The colour theme is read from `<html>` in an effect (light first), which cannot show before a toast appears.

### Gotchas

- `toast()` is sonner's own function (re-exported from this module), callable outside React, and shows nothing until a `Toaster` is mounted. Mount exactly one near the root.
- Toasts last 4 seconds, pause while hovered, focused or expanded, and have no close button unless you pass `closeButton` to `Toaster`. Without it a keyboard user can only wait or press the hotkey; give actionable toasts `duration: Infinity` and a close button.
- `Toaster` follows `.dark` or `data-theme="dark"` on `<html>` unless you set `theme`; it defaults to `position="bottom-right"` and `gap={10}`, shows `visibleToasts` (3) at once, and applies Sutra classes with `unstyled` on. `toastOptions.classNames` are merged with the Sutra ones.
- `snackbar(message, options)` returns the toast id and closes after its action runs; `closable` (default true) shows a dismiss button whose `onClose` fires only for that button, so use sonner's `onDismiss` to catch timeouts and swipes. `Snackbar onClose` is a deprecated alias of `onDismiss`.

## Example

```tsx
import { Button, Toaster, snackbar, toast } from "@sutra/ui";

export function Example() {
  return (
    <>
      <Toaster closeButton />
      <div className="flex gap-2">
        <Button
          onClick={() =>
            toast.success("Changes saved", { description: "Your project is up to date." })
          }
        >
          Save
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            snackbar("Message archived", { action: { label: "Undo", onClick: () => toast("Restored") } })
          }
        >
          Archive
        </Button>
      </div>
    </>
  );
}
```
