# FrameTitle

> The frame's heading.

- Import: `import { FrameTitle } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/frame` (primitives)
- `data-slot`: `frame-title`
- Part of [`Frame`](Frame.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `as` | `"h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "p" \| "div"` | `"h3"` | The heading element. Default `h3`. |

## Notes

See the notes in [`Frame`](Frame.md#notes).

## Example

```tsx
import {
  Button, Frame, FrameAction, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle,
  Item, ItemContent, ItemTitle,
} from "@cleanprompt/sutra-ui";

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
