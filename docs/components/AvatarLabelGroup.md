# AvatarLabelGroup

> Avatar with a name and a line of supporting text.

- Import: `import { AvatarLabelGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/avatar` (primitives)
- Part of [`Avatar`](Avatar.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` (required) | `React.ReactNode` |  | Primary line, also used for the avatar initials when a string. |
| `avatar` | `React.ReactNode` |  | Pass a custom avatar element instead of the generated one. |
| `avatarProps` | `Omit<AvatarProps, "size">` |  | Extra props for the generated avatar (`variant`, `colorful`, `initialsOptions`, ...); `size` follows the group. |
| `shape` | `AvatarShape` | `"circle"` | Avatar outline: round or rounded-square. |
| `size` | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Avatar size; the name and supporting text scale with it. |
| `src` | `string` |  | Image URL for the avatar. |
| `status` | `AvatarStatus` |  | Presence dot in the avatar corner: online, offline, busy or away. |
| `supportingText` | `React.ReactNode` |  | Secondary line under the name (email, role). |
| `verified` | `boolean` |  | Shows a verified check badge on the avatar. |

## Variants

- `size`: `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (default "md")
- `shape`: `circle`, `square` (default "circle")

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
