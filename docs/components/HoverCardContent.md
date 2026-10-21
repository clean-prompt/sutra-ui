# HoverCardContent

> Hover card panel.

- Import: `import { HoverCardContent } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/popover` (primitives)
- Part of [`HoverCard`](HoverCard.md)
- Also accepts the props of HTMLAttributes, PopperContentProps, HoverCardContentImplProps, HoverCardContentProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `arrow` | `boolean` |  | Renders the pointing arrow. |
| `padded` | `boolean` | `true` | Adds inner padding; turn it off for content that supplies its own (lists, menus). |
| `side` | `FloatingSide` | `"bottom"` | Side of the trigger the panel opens on. `start` and `end` follow the reading direction (left and right in LTR, swapped in RTL, read from `DirectionProvider` or `<html dir>`); `left` and `right` stay physical. It flips when there is no room. |
| `size` | `"sm" \| "md" \| "lg" \| "auto"` | `"md"` | Panel width: `sm` 14rem, `md` 18rem, `lg` 24rem or `auto` (content width). |

## Variants

- `size`: `sm`, `md`, `lg`, `auto` (default "md")
- `padded`: `true`, `false` (default true)

## Notes

See the notes in [`HoverCard`](HoverCard.md#notes).

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
