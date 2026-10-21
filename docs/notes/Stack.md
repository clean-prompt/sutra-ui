---
component: Stack
module: primitives/layout
covers: HStack
use: A flex layout on the spacing scale: a column by default, with gap, alignment, justify and wrap props. `HStack` is the same in a row, centred on the cross axis.
instead: Grid = a responsive 12-column layout; Container = centre content and cap its width; ButtonGroup = attached buttons; ItemGroup = a list of rows
server: ssr-safe
---

## Keyboard
Not focusable: no keyboard interaction.

## Screen readers
A plain `div` with no role, so it is invisible to assistive technology and the DOM order is the reading order. `direction="row"` and `justify` change only the layout, not the order, so keep the source order meaningful. With `asChild` the child element (a `ul`, `nav`, `section`) keeps its own semantics.

## Reduced motion
Static: no animation.

## Server rendering
Plain markup with no browser API, so server and client output match.

## Gotchas
- `gap` takes the steps 0, 1, 2, 3, 4, 5, 6, 8, 10 and 12 (4 is 1rem) and defaults to 4: other numbers have no class. `direction` defaults to `column`.
- `HStack` is `direction="row"` with `align="center"` as default; pass `align` to change that. It takes every other `Stack` prop except `direction`.
- Row direction and `justify` follow the writing direction, so a row flips in RTL without changes.
- `wrap` is only the flex-wrap flag. Children of a column that should not stretch need `align="start"`, because the cross-axis default is the browser's stretch.

## Example
```tsx
import { Button, HStack, Stack, Text } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <Stack gap={3} align="start" className="max-w-sm">
      <Text weight="semibold">Delete project</Text>
      <Text size="sm" tone="neutral">
        This removes the project and every file in it. It cannot be undone.
      </Text>
      <HStack gap={2}>
        <Button variant="destructive">Delete</Button>
        <Button variant="ghost">Cancel</Button>
      </HStack>
    </Stack>
  );
}
```
