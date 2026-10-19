# Stack

> Flex stack on the 4px spacing grid.

- Import: `import { Stack } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/layout` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"start" \| "center" \| "end" \| "stretch" \| "baseline"` |  | Cross-axis alignment of the children (`align-items`). |
| `asChild` | `boolean` |  | Render as the child element instead of a `<div>`, keeping the stack styles. |
| `direction` | `"row" \| "column"` | `"column"` | Main axis of the flex layout: `column` stacks, `row` lines up. |
| `gap` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 8 \| 10 \| 12` | `4` | Space between children, in Tailwind spacing steps (4 = 1rem). |
| `justify` | `"start" \| "center" \| "end" \| "between"` |  | Main-axis distribution of the children (`justify-content`). |
| `wrap` | `boolean` |  | Lets children wrap onto new lines when they overflow. |

## Variants

- `direction`: `row`, `column` (default "column")
- `gap`: `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12` (default 4)
- `align`: `start`, `center`, `end`, `stretch`, `baseline`
- `justify`: `start`, `center`, `end`, `between`
- `wrap`: `true`

## Notes

**When to use:** A flex layout on the spacing scale: a column by default, with gap, alignment, justify and wrap props. `HStack` is the same in a row, centred on the cross axis.

**Use instead when:**
- `Grid`: a responsive 12-column layout
- `Container`: centre content and cap its width
- `ButtonGroup`: attached buttons
- `ItemGroup`: a list of rows

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

A plain `div` with no role, so it is invisible to assistive technology and the DOM order is the reading order. `direction="row"` and `justify` change only the layout, not the order, so keep the source order meaningful. With `asChild` the child element (a `ul`, `nav`, `section`) keeps its own semantics.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so server and client output match.

### Gotchas

- `gap` takes the steps 0, 1, 2, 3, 4, 5, 6, 8, 10 and 12 (4 is 1rem) and defaults to 4: other numbers have no class. `direction` defaults to `column`.
- `HStack` is `direction="row"` with `align="center"` as default; pass `align` to change that. It takes every other `Stack` prop except `direction`.
- Row direction and `justify` follow the writing direction, so a row flips in RTL without changes.
- `wrap` is only the flex-wrap flag. Children of a column that should not stretch need `align="start"`, because the cross-axis default is the browser's stretch.

## Example

```tsx
import { Button, HStack, Stack, Text } from "@sutra/ui";

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
