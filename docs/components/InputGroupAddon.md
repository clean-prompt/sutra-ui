# InputGroupAddon

> Text, icon or button placed at an edge of an `InputGroup`. Clicking it focuses the control.

- Import: `import { InputGroupAddon } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/input-group` (primitives)
- `data-slot`: `input-group-addon`
- Part of [`InputGroup`](InputGroup.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `align` | `"inline-start" \| "inline-end" \| "block-start" \| "block-end"` | `"inline-start"` | Where the addon sits: at the start or end of the line, or in a row above (`block-start`) or below (`block-end`) the input. |

## Variants

- `align`: `inline-start`, `inline-end`, `block-start`, `block-end` (default "inline-start")

## Notes

See the notes in [`InputGroup`](InputGroup.md#notes).

## Example

```tsx
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@sutra/ui";
import { RiFileCopyLine } from "@sutra/ui/icons";

export function Example() {
  const link = "sutra.dev/share/q3-report";
  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Share link" value={link} readOnly />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label="Copy link"
          onClick={() => navigator.clipboard.writeText(`https://${link}`)}
        >
          <RiFileCopyLine aria-hidden />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
```
