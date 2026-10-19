---
component: Heading
module: primitives/typography
use: A heading on the display type scale. The element level (`as`) is independent of the look (`size`), so the outline and the design can differ.
instead: Text = body copy; Eyebrow = a small caps label above a heading; CardTitle = the title inside a Card; SectionHeader = a section heading with eyebrow, description and actions
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
- Renders the element named by `as` (`h1` to `h6`), and the default is `h2`, not `h1`. Pass `as="h1"` once per page; pick levels by document outline, never by size.
- `asChild` renders your child element with the heading styles instead; the child then decides the semantics (a `div` child is not a heading unless it has `role="heading"` and `aria-level`).
- The text is balanced (`text-balance`) for wrapping only, which has no effect on what is read.

## Reduced motion
Static: no animation.

## Server rendering
Plain markup with no browser API, so server and client output match. The size steps change at CSS breakpoints, not in script.

## Gotchas
- `size` runs from `display-3xl` down to `display-xs` and then `xl`, `lg`, `md`, `sm`; the default is `display-sm`. The large display steps shrink on small screens (`display-3xl` is `display-lg` on mobile).
- `as` only takes `h1` to `h6`; use `asChild` for anything else, including a link inside the heading.
- The weight is always semibold and the colour foreground; override with `className` (merged last).

## Example
```tsx
import { Heading, Text } from "@sutra/ui";

export function Example() {
  return (
    <article className="flex max-w-prose flex-col gap-3">
      <Heading as="h1" size="display-md">
        Shipping a design system
      </Heading>
      <Text tone="neutral">Lessons from two years of tokens, components and docs.</Text>
      <Heading as="h2" size="lg">
        Start with the tokens
      </Heading>
    </article>
  );
}
```
