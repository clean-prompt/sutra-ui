# PopoverContent

> Floating panel. Sizes sm/md/lg set the width; set `padded={false}` when composing Header/Body/Footer.

- Import: `import { PopoverContent } from "@sutra/ui"` (or from `@sutra/ui/overlays`)
- Source: `packages/ui/src/primitives/popover` (primitives)
- Part of [`Popover`](Popover.md)
- Also accepts the props of HTMLAttributes, PopperContentProps, DismissableLayerProps, PopoverContentImplProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `arrow` | `boolean` |  | Render the pointing arrow. |
| `disablePortal` | `boolean` |  | Skip the portal (e.g. inside a dialog with its own stacking). |
| `padded` | `boolean` | `true` | Adds inner padding; turn it off for content that supplies its own (lists, menus). |
| `size` | `"sm" \| "md" \| "lg" \| "auto"` | `"md"` | Panel width: `sm` 14rem, `md` 18rem, `lg` 24rem or `auto` (content width). |

## Variants

- `size`: `sm`, `md`, `lg`, `auto` (default "md")
- `padded`: `true`, `false` (default true)

## Notes

See the notes in [`Popover`](Popover.md#notes).

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
