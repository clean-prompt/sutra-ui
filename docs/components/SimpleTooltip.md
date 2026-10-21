# SimpleTooltip

> One-line tooltip wrapper: `<SimpleTooltip content="Save" shortcut="⌘S"><Button/></SimpleTooltip>`.

- Import: `import { SimpleTooltip } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/tooltip` (primitives)
- Also accepts the props of TooltipProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` (required) | `React.ReactNode` |  | The element the tooltip describes; it must accept a ref and focus. |
| `content` (required) | `React.ReactNode` |  | Tooltip content. |
| `align` | `TooltipContentProps["align"]` |  | Alignment of the tooltip along that side. |
| `contentClassName` | `string` |  | Classes for the tooltip bubble. |
| `disabled` | `boolean` |  | Skip the tooltip entirely (renders children only). |
| `shortcut` | `string \| string[]` |  | Keyboard shortcut. A keys spec ("mod+k", "g t") renders platform-aware chips; a glyph string ("⌘K") or an array (["⌘", "K"]) renders one Kbd per entry. |
| `side` | `TooltipContentProps["side"]` | `"top"` | Side of the trigger the tooltip opens on; it flips when there is no room. |
| `variant` | `TooltipContentProps["variant"]` | `"inverse"` | Look of the bubble: `inverse` (dark) or `light` (bordered popover surface). |

## Variants

- `variant`: `inverse`, `light` (default "inverse")

## Notes

**When to use:** A short text label that appears when an element is hovered or focused, for icon buttons and truncated text. `SimpleTooltip` is the one-line form with an optional keyboard `shortcut` chip.

**Use instead when:**
- `Popover`: interactive or rich content the user can click into
- `HoverCard`: a rich preview on hover
- `InfoTooltip`: a help icon with a title and description
- `Dialog`: anything the user must read or act on

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Focusing the trigger opens the tooltip after the delay; moving focus away closes it |
| Escape | Close the tooltip while its trigger has focus |

The tooltip has no focusable content and the trigger keeps its own keyboard behaviour. There are no arrow keys, so RTL changes nothing. In RTL, `side="start"` and `side="end"` swap left and right (read through `useDirection()`: a `DirectionProvider` with a `dir`, else `<html dir>`; a plain `dir` attribute on a container is not seen); the default is `top`, `left` and `right` stay physical, and Radix still flips the bubble on a collision. Pressing the trigger (click, Enter or Space) also closes the tooltip.

### Screen readers

The content is `role="tooltip"` and, while open, the trigger gets `aria-describedby` pointing at it, so it is read as the trigger's description, not its name. Give icon-only triggers an `aria-label`: the tooltip alone does not name them. If you pass `aria-label` to `TooltipContent`, Radix hides the visual content from assistive technology and exposes that label in a visually hidden `role="tooltip"` copy. The arrow is decoration. Keep tooltip text short and plain; no links or buttons.

### Reduced motion

The bubble fades and zooms in from its trigger and slides slightly from its side; the reduced-motion net removes the slide and the scale and keeps only the fade. The open delay is a timer and stays.

### Server rendering

Server render: same markup as the client. Only the trigger renders on the server; the bubble is portalled after mount and only opens from pointer hover or focus. Nothing differs between server and client.

### Gotchas

- The default open delay is 200 ms (`TooltipProvider` and a provider-less `Tooltip` both fall back to 200, not Radix's 700), and `skipDelayDuration` is 300 ms. Mount one `TooltipProvider` near the root so moving between tooltips skips the delay; without one each `Tooltip` makes its own provider.
- Touch does not open it: Radix ignores touch pointers and a tap closes it, so never keep essential information only in a tooltip.
- `SimpleTooltip` wraps `children` in `TooltipTrigger asChild`, so the child must accept a ref and forward props to a focusable element. It renders just the children when `disabled`, or when `content` is `null`, `undefined` or `false`.
- `SimpleTooltip shortcut` is display only: a spec like `"mod+k"` renders platform-aware chips, a glyph string or an array renders one `Kbd` per entry. Nothing is bound to the keys.

## Example

```tsx
import { Button, SimpleTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@cleanprompt/sutra-ui";
import { RiDeleteBinLine, RiSave3Line } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <SimpleTooltip content="Save" shortcut="mod+s">
          <Button size="icon" variant="outline" aria-label="Save">
            <RiSave3Line aria-hidden />
          </Button>
        </SimpleTooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Delete">
              <RiDeleteBinLine aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete permanently</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```
