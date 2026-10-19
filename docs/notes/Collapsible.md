---
component: Collapsible
module: primitives/collapsible
covers: CollapsibleTrigger, CollapsibleContent
use: A single show and hide section with its own trigger button and an animated height. Controlled or uncontrolled, with `default`, `surface` and `ghost` looks.
instead: Accordion = several related sections with arrow-key navigation and one-open-at-a-time; Collapse = you already have a trigger and state and only need the height animation; Popover = a small floating panel instead of pushing content down
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the trigger; a disabled trigger is skipped |
| Enter, Space | Toggles the section (native `<button>`) |

The trigger is the only stop; there are no arrow keys, so RTL changes nothing. Closed content is `inert`, so Tab never lands inside it.

## Screen readers
`CollapsibleTrigger` is a `<button type="button">` with `aria-expanded` and `aria-controls` pointing at the content wrapper. The panel has no `region` role or label of its own (unlike `AccordionContent`). The turning chevron is `aria-hidden`. Closed content is `inert`. With `asChild` the child gets the same attributes plus a click handler, so pass a real button or give your element its own role and keyboard handling.

## Reduced motion
The height and opacity transition is the one from `Collapse`, and the chevron turns with `chevron-turn`; the reduced-motion net ends both in 1 ms.

## Server rendering
Renders the same markup on server and client with no browser API. A closed section (the default) renders no content; `defaultOpen` or `open` renders it. With `keepMounted` the closed content is in the HTML, collapsed and `inert`.

## Slots
- `collapsible`: the root, with `data-state` and `data-disabled`
- `collapsible-content`: the animated panel (this replaces `Collapse`'s own `collapse` slot name; the inner `collapse-content` wrapper remains)

## Gotchas
- This is not the Radix Collapsible: it is built on `Collapse` and is not a drop-in for `@radix-ui` props. `open`, `defaultOpen` and `onOpenChange` work as usual, and a controlled `open` stays put until you change it.
- `CollapsibleTrigger` and `CollapsibleContent` throw outside a `Collapsible`.
- Closed content is removed after the close animation by default; `keepMounted` on the root, or on one `CollapsibleContent` (which overrides the root), keeps it mounted and `inert`.
- `className` on `CollapsibleContent` goes to the inner padded box; other props (`id`, `style`) go to the outer `Collapse`, and overriding `id` breaks the trigger's `aria-controls`.

## Example
```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@sutra/ui";

export function Example() {
  return (
    <Collapsible variant="surface" className="max-w-md">
      <CollapsibleTrigger>Show release notes</CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="list-disc ps-5 text-sm text-muted-foreground">
          <li>Faster project search</li>
          <li>New keyboard shortcuts in the editor</li>
          <li>Fixed a crash when exporting large files</li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
```
