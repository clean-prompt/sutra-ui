# Popover

> Popover root.

- Import: `import { Popover } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/popover` (primitives)
- Parts: [`PopoverAnchor`](PopoverAnchor.md), [`PopoverBody`](PopoverBody.md), [`PopoverClose`](PopoverClose.md), [`PopoverContent`](PopoverContent.md), [`PopoverDescription`](PopoverDescription.md), [`PopoverFooter`](PopoverFooter.md), [`PopoverHeader`](PopoverHeader.md), [`PopoverTitle`](PopoverTitle.md), [`PopoverTrigger`](PopoverTrigger.md)
- Also accepts the props of PopoverProps

## Props

No props of its own.

## Part props

### PopoverContent

Floating panel. Sizes sm/md/lg set the width; set `padded={false}` when composing Header/Body/Footer.

| Prop | Type | Default | Description |
|---|---|---|---|
| `arrow` | `boolean` |  | Render the pointing arrow. |
| `disablePortal` | `boolean` |  | Skip the portal (e.g. inside a dialog with its own stacking). |
| `padded` | `boolean` | `true` | Adds inner padding; turn it off for content that supplies its own (lists, menus). |
| `side` | `FloatingSide` | `"bottom"` | Side of the trigger the panel opens on. `start` and `end` follow the reading direction (left and right in LTR, swapped in RTL, read from `DirectionProvider` or `<html dir>`); `left` and `right` stay physical. It flips when there is no room. |
| `size` | `"sm" \| "md" \| "lg" \| "auto"` | `"md"` | Panel width: `sm` 14rem, `md` 18rem, `lg` 24rem or `auto` (content width). |

## Notes

**When to use:** A small floating panel anchored to a trigger, for filters, quick forms, pickers and rich details. It does not block the page. `PopoverContent` takes `size`, `padded` and `arrow`.

**Use instead when:**
- `DropdownMenu`: a list of actions
- `Tooltip`: a short non-interactive label
- `HoverCard`: a preview on hover or focus
- `Dialog`: the user must finish a task before going on
- `Select`: a single choice for a form field

### Keyboard

| Key | Action |
|---|---|
| Enter, Space | On the trigger (a native button): toggle the popover |
| Tab / Shift+Tab | Move through the panel; focus is not trapped, and moving it outside the panel closes it |
| Escape | Close and return focus to the trigger |

Focus moves into the panel when it opens and goes back to the trigger on close (not after a click outside). There are no arrow-key or direction-dependent keys, so RTL changes nothing. In RTL, `side="start"` and `side="end"` swap left and right (read through `useDirection()`: a `DirectionProvider` with a `dir`, else `<html dir>`; a plain `dir` attribute on a container is not seen); the default is `bottom`, `left` and `right` stay physical, and Radix still flips the panel on a collision.

### Screen readers

The trigger gets `aria-haspopup="dialog"`, `aria-expanded` and, while open, `aria-controls`. The panel is `role="dialog"`. `PopoverTitle` and `PopoverDescription` (an `h3` and a `p`) name and describe the dialog: inside `PopoverContent` they get ids and the content sets `aria-labelledby` / `aria-describedby` while they are mounted. An `aria-label`, `aria-labelledby` or `aria-describedby` you pass to `PopoverContent` wins, and a popover without a title stays unnamed, so give it an `aria-label`. The arrow is decoration. An icon-only trigger needs `aria-label`.

### Reduced motion

The panel fades and zooms in from its trigger and slides slightly from its side; the reduced-motion net removes the slide and the scale and keeps only the fade.

### Server rendering

Server render: same markup as the client. A closed popover renders only its trigger on server and client. The panel is portalled into `<body>` after mount, so a popover that is `open` or `defaultOpen` on first render appears after hydration. The portalled panel is outside a subtree `dir` or `data-style`: set them on `<html>`, or pass `disablePortal` to keep it inside the subtree.

### Gotchas

- It is non-modal by default (`modal` on `Popover` is false): the page stays interactive, outside clicks close it, and there is no focus trap. Pass `modal` for a trapped, `aria-hidden`-backed panel, but then consider a `Dialog`.
- `size` defaults to `md` (18rem), `padded` to true (`p-4`). `PopoverHeader`, `PopoverBody` and `PopoverFooter` bring their own padding, so set `padded={false}` when you compose them.
- Use `PopoverAnchor` to position against another element than the trigger; `PopoverClose asChild` closes from inside the panel.
- `PopoverContent disablePortal` renders in place, which suits a popover inside a `Dialog` or `Sheet` with its own stacking; the default portal puts it in `<body>` at `z-50`.

## Example

```tsx
import { Button, Field, FieldLabel, Input, Popover, PopoverBody, PopoverClose, PopoverContent } from "@sutra/ui";
import { PopoverDescription, PopoverFooter, PopoverHeader, PopoverTitle, PopoverTrigger } from "@sutra/ui";

export function Example() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Invite teammate</Button>
      </PopoverTrigger>
      <PopoverContent padded={false} align="start">
        <PopoverHeader>
          <PopoverTitle>Invite a teammate</PopoverTitle>
          <PopoverDescription>They get an email with a link to join.</PopoverDescription>
        </PopoverHeader>
        <PopoverBody>
          <Field>
            <FieldLabel>Email address</FieldLabel>
            <Input type="email" placeholder="name@company.com" />
          </Field>
        </PopoverBody>
        <PopoverFooter>
          <PopoverClose asChild>
            <Button size="sm">Send invite</Button>
          </PopoverClose>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
}
```
