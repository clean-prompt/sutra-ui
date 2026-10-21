---
component: DirectionProvider
module: primitives/direction-provider
use: Tells Sutra and its Radix primitives which way text runs. Mount one at the app root to follow `<html dir>` live, or give it `dir` to force a subtree (a chart that stays `ltr` inside an RTL page). Read the value with `useDirection()`.
instead: useDirection = read the direction in your own component; useRootDirection = pass the direction into a wrapped Radix root
server: mixed
---

## Keyboard
Not focusable: no keyboard interaction of its own. It decides which way horizontal arrow keys go in what sits below it: Radix primitives (Tabs, sub-menus, radio groups, a horizontal Accordion) and Sutra components such as `TabDropdown` swap ArrowLeft and ArrowRight in RTL, while vertical lists do not.

## Screen readers
No role, name or state. With `dir` it renders one `<div dir="rtl">` (or `ltr`) with `display: contents`, so the text direction is exposed to the browser and assistive technology without adding a box. Extra HTML attributes pass through to that element, so set `lang` on it when the subtree is in another language. Without `dir` it renders nothing.

## Reduced motion
Static: it renders no motion.

## Server rendering
With `dir` the markup is the same on the server and the client: the `display: contents` element carries `dir`, and every `useDirection()` inside it reads that value. Without `dir`, `useDirection()` returns `ltr` on the server and the real `<html dir>` value after hydration, so in an RTL document the server HTML of wrappers that write a `dir` attribute (Tabs, Accordion, ScrollArea, RadioGroup) says `ltr` until hydration.

## Slots
- `direction-provider`: the `display: contents` element, only when `dir` is set

## Gotchas
- Without `dir` it renders no element (children only) and follows `<html dir>` live, so it does not set `<html dir>` or `lang` for you: do that on the document.
- With `dir` a `className` that needs a box (padding, background, border) has no effect, because the element is `display: contents`; put those on a child. A nested provider wins over an outer one, which is how a subtree forces `ltr` inside an RTL page.
- A forced `dir` reaches the subtree only. Dialogs, sheets, drawers, popovers, tooltips and hover cards are portalled into `<body>` outside that element, so their `rtl:` styles follow `<html dir>`; menus carry their own `dir` attribute from the provider.
- `dir` takes `"ltr"` or `"rtl"` only (no `"auto"`).

## Example
```tsx
import { DirectionProvider } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <DirectionProvider>
      <div className="max-w-sm space-y-2 rounded-box border p-4 text-sm">
        <p>Order reference</p>
        <DirectionProvider dir="ltr">
          <p className="font-mono text-muted-foreground">INV-2026-0042-EU</p>
        </DirectionProvider>
      </div>
    </DirectionProvider>
  );
}
```
