# InputGroupInput

> The input inside an `InputGroup`. Consumes `Field` context.

- Import: `import { InputGroupInput } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/forms`)
- Source: `packages/ui/src/primitives/input-group` (primitives)
- `data-slot`: `input-group-control`
- Part of [`InputGroup`](InputGroup.md)
- Also accepts the props of HTMLAttributes, InputHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` |  | Marks the group invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |
| `size` | `Size` |  | Input height and text size. |

## Notes

See the notes in [`InputGroup`](InputGroup.md#notes).

## Example

```tsx
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@cleanprompt/sutra-ui";
import { RiFileCopyLine } from "@cleanprompt/sutra-ui/icons";

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
