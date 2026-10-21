# PopoverClose

> Closes the popover when clicked.

- Import: `import { PopoverClose } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/overlays`)
- Source: `packages/ui/src/primitives/popover` (primitives)
- Part of [`Popover`](Popover.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes, PrimitivePropsWithRef

## Props

No props of its own.

## Notes

See the notes in [`Popover`](Popover.md#notes).

## Example

```tsx
import { Button, Field, FieldLabel, Input, Popover, PopoverBody, PopoverClose, PopoverContent } from "@cleanprompt/sutra-ui";
import { PopoverDescription, PopoverFooter, PopoverHeader, PopoverTitle, PopoverTrigger } from "@cleanprompt/sutra-ui";

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
