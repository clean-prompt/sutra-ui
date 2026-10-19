# ItemDescription

> The row's secondary text.

- Import: `import { ItemDescription } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/item` (primitives)
- `data-slot`: `item-description`
- Part of [`Item`](Item.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `lines` | `1 \| 2 \| "none"` | `1` | Lines before truncating: 1 (default), 2, or `"none"` to wrap freely. |

## Notes

See the notes in [`Item`](Item.md#notes).

## Example

```tsx
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@sutra/ui";
import { RiMailLine, RiSettings3Line } from "@sutra/ui/icons";

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
