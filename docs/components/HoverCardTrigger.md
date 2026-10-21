# HoverCardTrigger

> Element that opens the hover card.

- Import: `import { HoverCardTrigger } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/popover` (primitives)
- Part of [`HoverCard`](HoverCard.md)
- Also accepts the props of HTMLAttributes, AnchorHTMLAttributes, PrimitivePropsWithRef

## Props

No props of its own.

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
