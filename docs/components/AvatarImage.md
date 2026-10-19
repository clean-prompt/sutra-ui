# AvatarImage

> Avatar image; hidden until loaded.

- Import: `import { AvatarImage } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/avatar` (primitives)
- Part of [`Avatar`](Avatar.md)
- Also accepts the props of HTMLAttributes, ImgHTMLAttributes, AvatarImageProps, PrimitivePropsWithRef

## Props

No props of its own.

## Notes

See the notes in [`Avatar`](Avatar.md#notes).

## Example

```tsx
import { Avatar, AvatarLabelGroup } from "@sutra/ui";

export function Example() {
  return (
    <div className="flex items-center gap-4">
      <Avatar name="Maya Chen" src="/avatars/maya.jpg" size="lg" status="online" />
      <Avatar name="Omar Haddad" size="lg" verified />
      <AvatarLabelGroup name="Priya Nair" supportingText="Design lead" status="away" />
    </div>
  );
}
```
