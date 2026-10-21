# HoverCard

> Hover card root (preview on hover, e.g. user cards and link previews).

- Import: `import { HoverCard } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/popover` (primitives)
- Parts: [`HoverCardContent`](HoverCardContent.md), [`HoverCardTrigger`](HoverCardTrigger.md)
- Also accepts the props of HoverCardProps

## Props

No props of its own.

## Part props

### HoverCardContent

Hover card panel.

| Prop | Type | Default | Description |
|---|---|---|---|
| `arrow` | `boolean` |  | Renders the pointing arrow. |
| `padded` | `boolean` | `true` | Adds inner padding; turn it off for content that supplies its own (lists, menus). |
| `side` | `FloatingSide` | `"bottom"` | Side of the trigger the panel opens on. `start` and `end` follow the reading direction (left and right in LTR, swapped in RTL, read from `DirectionProvider` or `<html dir>`); `left` and `right` stay physical. It flips when there is no room. |
| `size` | `"sm" \| "md" \| "lg" \| "auto"` | `"md"` | Panel width: `sm` 14rem, `md` 18rem, `lg` 24rem or `auto` (content width). |

## Notes

**When to use:** A rich preview that appears when the pointer rests on a link or when it gains focus, for user cards and link previews. Opens after 300 ms and closes after 150 ms by default. The content is supplementary, not interactive.

**Use instead when:**
- `Tooltip`: a short plain-text label
- `Popover`: content the user must be able to click, type in or reach by keyboard
- `InfoTooltip`: a help icon with a short explanation

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Focusing the trigger opens the card after `openDelay`; moving focus away closes it after `closeDelay` |
| Escape | Close the card |

The trigger is an `<a>`, so it is a tab stop only when it has an `href` (or `tabIndex`). Radix sets `tabindex="-1"` on every focusable element inside the card, so keyboard users cannot reach links or buttons in it. There are no arrow keys, so RTL changes nothing for keys. In RTL, `side="start"` and `side="end"` swap left and right (read through `useDirection()`: a `DirectionProvider` with a `dir`, else `<html dir>`; a plain `dir` attribute on a container is not seen); the default is `bottom`, `left` and `right` stay physical, and Radix still flips the card on a collision.

### Screen readers

The card has no role, no label and no `aria-describedby` link to its trigger, and it is portalled to the end of `<body>`: a screen reader user may not find it, and it does not announce when it opens. Treat its content as a duplicate of something reachable elsewhere (the linked page, a profile), never as the only place for information or actions.

### Reduced motion

The card fades and zooms in from its trigger and slides slightly from its side; the reduced-motion net removes the slide and the scale and keeps only the fade. The open and close delays are timers and stay.

### Server rendering

Server render: same markup as the client. Only the trigger renders on the server; the card is portalled after mount and only opens from pointer hover or focus. A `defaultOpen` card appears after hydration.

### Gotchas

- Touch never opens it: Radix ignores touch pointers and prevents default on `touchstart`, so a touch user taps the link and navigates. Do not rely on it for mobile.
- `HoverCard` sets `openDelay` 300 and `closeDelay` 150, shorter than Radix's own 700 and 300; pass your own values to change them.
- Pressing the pointer on the card, or having text selected inside it, stops it from closing when the pointer leaves.
- `HoverCardContent` shares `size` (`md`, 18rem), `padded` and `arrow` with `PopoverContent` but has no `disablePortal`.

## Example

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <p className="text-sm">
      Released by{" "}
      <HoverCard>
        <HoverCardTrigger asChild>
          <a href="/people/ada" className="font-medium underline underline-offset-4">
            Ada Lovelace
          </a>
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="text-sm font-semibold">Ada Lovelace</p>
          <p className="text-sm text-muted-foreground">Maintainer of the compiler team. Joined in 2021.</p>
        </HoverCardContent>
      </HoverCard>{" "}
      last week.
    </p>
  );
}
```
