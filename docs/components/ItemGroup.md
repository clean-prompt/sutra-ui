# ItemGroup

> A list of `Item` rows: plain, an outlined box or a muted tray, with hairlines between rows when `divided`.

- Import: `import { ItemGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/item` (primitives)
- `data-slot`: `item-group`
- Part of [`Item`](Item.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `divided` | `boolean` | `false` | Draws a divider between rows. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no children (and not loading). |
| `loading` | `boolean` | `false` | Show placeholder rows in the real row layout while the rows are not known yet. |
| `loadingRows` | `number` | `3` | Number of placeholder rows. Default 3. |
| `variant` | `"plain" \| "outline" \| "muted"` | `"plain"` | Surface of the group: plain, an outlined card, or a muted tinted panel. |

## Variants

- `variant`: `plain`, `outline`, `muted` (default "plain")
- `divided`: `true`, `false` (default false)

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
