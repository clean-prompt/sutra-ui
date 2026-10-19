# InputGroupTextarea

> The textarea inside an `InputGroup`. Consumes `Field` context.

- Import: `import { InputGroupTextarea } from "@sutra/ui"` (or from `@sutra/ui/forms`)
- Source: `packages/ui/src/primitives/input-group` (primitives)
- `data-slot`: `input-group-control`
- Part of [`InputGroupText`](InputGroupText.md)
- Also accepts the props of HTMLAttributes, TextareaHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `invalid` | `boolean` |  | Marks the textarea invalid: error border and `aria-invalid`. Inherited from a surrounding `Field` when omitted. |

## Notes

See the notes in [`InputGroupText`](InputGroupText.md#notes).

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
