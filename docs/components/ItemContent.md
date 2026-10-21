# ItemContent

> The text column of a row: stacks `ItemTitle` and `ItemDescription` and takes the free width.

- Import: `import { ItemContent } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/item` (primitives)
- `data-slot`: `item-content`
- Part of [`Item`](Item.md)
- Also accepts the props of HTMLAttributes

## Props

No props of its own.

## Notes

See the notes in [`Item`](Item.md#notes).

## Example

```tsx
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@cleanprompt/sutra-ui";
import { RiMailLine, RiSettings3Line } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  return (
    <ItemGroup aria-label="Account" variant="outline" divided className="max-w-md">
      <Item href="/inbox" chevron>
        <ItemMedia variant="icon">
          <RiMailLine aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Inbox</ItemTitle>
          <ItemDescription>12 unread messages</ItemDescription>
        </ItemContent>
      </Item>
      <Item href="/settings" chevron>
        <ItemMedia variant="icon">
          <RiSettings3Line aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Settings</ItemTitle>
          <ItemDescription>Profile, notifications and billing</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  );
}
```
