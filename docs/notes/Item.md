---
component: Item
module: primitives/item
covers: ItemGroup, ItemSeparator, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions
use: One list row: media, a title with a description, and trailing actions. Static, or one link or button for the whole row. `ItemGroup` lists rows with placeholders for loading and empty states.
instead: Frame = a titled tray with a header and footer around a panel of rows; Table = rows with several comparable columns; KeyValue = name and value facts; Card = a free-form container; DropdownMenu = commands in a popup
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to a row that is a link or a button, and to controls inside a static row's `ItemActions` |
| Enter | Follows the link, or runs the button's `onClick` |
| Space | Runs the button's `onClick` (not for a link row) |

A static row is not focusable. With `asChild` the child keeps its own keyboard behaviour. No key depends on direction, but the `chevron` mirrors in RTL.

## Screen readers
- `ItemGroup` is a `role="list"` (it cannot be changed) and needs an `aria-label`. A static `Item` inside it has `role="listitem"`; a link or button row keeps its own role and is wrapped in a `listitem` box. Outside a group, a static `Item` is a plain `div`.
- A `disabled` link loses its `href` and gets `aria-disabled`; a disabled button row is natively disabled. The `chevron` is `aria-hidden`.
- `loading` renders `aria-busy` with sr-only "Loading…"; the placeholder rows are `aria-hidden`.
- `ItemTitle` and `ItemDescription` set a `title` tooltip from their text when it is a plain string, because they truncate.
- `ItemSeparator` is `role="presentation"`.

## Reduced motion
Static; the hover background and the chevron nudge are transitions, which the reduced-motion net in `sutra.css` ends within 1 ms.

## Server rendering
Plain markup with no browser API, so server and client output match.

## Slots
- `item-group`: the list, with `data-variant`
- `item-media`: the leading visual, with `data-variant` (`plain`, `icon`, `image`, `avatar`)
- `item-content`: the text column
- `item-title`: the single truncated line
- `item-description`: the secondary text
- `item-actions`: the trailing controls
- `item-separator`: a hairline for a group that is not `divided`

## Gotchas
- The element follows the props: `href` gives an `<a>`, `onClick` (without `href`) a `<button type="button">`, `asChild` renders your child (a router link) as the row, and nothing gives a `div`. With `href` and `onClick`, the link still gets the `onClick`.
- A link or button row must hold no other buttons or links (nested interactive content). Put the actions in a static row instead.
- `chevron` only shows on an interactive row (link, button or `asChild`), never on a static one; with `asChild` it is appended after the child's own content.
- `ItemDescription` truncates to one line by default; pass `lines={2}` or `lines="none"`. `ItemGroup` `divided` draws hairlines, and `emptyState` shows only when there are no children and `loading` is off.

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
