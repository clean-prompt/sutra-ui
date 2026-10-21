# FramePanel

> The raised surface that holds the rows. Rows are its direct children; a list of `Item`s works as is.

- Import: `import { FramePanel } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/frame` (primitives)
- `data-slot`: `frame-panel`
- Part of [`Frame`](Frame.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `divided` | `boolean` | `true` | Draw hairlines between the rows. Default true. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no children (and not loading). |
| `loading` | `boolean` | `false` | Show placeholder rows while the rows are not known yet. |
| `loadingRows` | `number` | `3` | Number of placeholder rows. Default 3. |

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
