# AvatarContext

> Context used by `AvatarGroup` to pass size, shape and ring to its avatars.

- Import: `import { AvatarContext } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/avatar` (primitives)
- Part of [`Avatar`](Avatar.md)
- Also accepts the props of ProviderProps

## Props

No props of its own.

## Notes

See the notes in [`Avatar`](Avatar.md#notes).

## Example

```tsx
import { Avatar, AvatarLabelGroup } from "@cleanprompt/sutra-ui";

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
