# FrameHeader

> The top of a frame: title and description on the left, an action on the right; wraps when narrow.

- Import: `import { FrameHeader } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/frame` (primitives)
- `data-slot`: `frame-header`
- Part of [`Frame`](Frame.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Notes

See the notes in [`Frame`](Frame.md#notes).

## Example

```tsx
import {
  Button, Frame, FrameAction, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle,
  Item, ItemContent, ItemTitle,
} from "@sutra/ui";

const members = ["Maya Chen", "Omar Haddad", "Priya Nair"];

export function Example() {
  return (
    <Frame className="max-w-md">
      <FrameHeader>
        <FrameTitle>Members</FrameTitle>
        <FrameAction>
          <Button size="xs">Invite</Button>
        </FrameAction>
        <FrameDescription>People with access to this workspace.</FrameDescription>
      </FrameHeader>
      <FramePanel aria-label="Members">
        {members.map((name) => (
          <Item key={name}>
            <ItemContent>
              <ItemTitle>{name}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </FramePanel>
      <FrameFooter>3 members</FrameFooter>
    </Frame>
  );
}
```
