# Item

> One row: `ItemMedia`, `ItemContent` (`ItemTitle` and `ItemDescription`) and `ItemActions`. Static, or a link or button.

- Import: `import { Item } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/item` (primitives)
- `data-slot`: `item`
- Parts: [`ItemActions`](ItemActions.md), [`ItemContent`](ItemContent.md), [`ItemDescription`](ItemDescription.md), [`ItemGroup`](ItemGroup.md), [`ItemMedia`](ItemMedia.md), [`ItemSeparator`](ItemSeparator.md), [`ItemTitle`](ItemTitle.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render the child element as the row (a router link, say) instead of a `div`. |
| `chevron` | `boolean` |  | Show a trailing chevron on a link, button or `asChild` row (added after the child's own content). |
| `disabled` | `boolean` |  | A link or button row that cannot be used (`aria-disabled`, dimmed). |
| `href` | `string` |  | Make the row one link. Put no buttons inside it (a link cannot hold interactive content). |
| `onClick` | `React.MouseEventHandler<HTMLElement>` |  | Make the row one button. Put no buttons inside it. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Lays the media, content and actions out in a row or stacks them. |
| `rel` | `string` |  | Link `rel` when `href` is set. Defaults to `noreferrer noopener` for `target="_blank"`. |
| `size` | `"md" \| "sm" \| "xs" \| "default"` | `"md"` | Row padding and gap: `md`, `sm` or `xs`. `"default"` is a deprecated alias of `"md"` (same classes); use `"md"`. |
| `target` | `string` |  | Link `target` when `href` is set. |
| `variant` | `"plain" \| "outline" \| "muted"` | `"plain"` | Surface of the row: plain, outlined card or muted panel. |

## Variants

- `variant`: `plain`, `outline`, `muted` (default "plain")
- `size`: `md`, `sm`, `xs` (default "md")
- `orientation`: `horizontal`, `vertical` (default "horizontal")

## Part props

### ItemDescription

The row's secondary text.

| Prop | Type | Default | Description |
|---|---|---|---|
| `lines` | `1 \| 2 \| "none"` | `1` | Lines before truncating: 1 (default), 2, or `"none"` to wrap freely. |

### ItemGroup

A list of `Item` rows: plain, an outlined box or a muted tray, with hairlines between rows when `divided`.

| Prop | Type | Default | Description |
|---|---|---|---|
| `divided` | `boolean` | `false` | Draws a divider between rows. |
| `emptyState` | `React.ReactNode` |  | Shown when there are no children (and not loading). |
| `loading` | `boolean` | `false` | Show placeholder rows in the real row layout while the rows are not known yet. |
| `loadingRows` | `number` | `3` | Number of placeholder rows. Default 3. |
| `variant` | `"plain" \| "outline" \| "muted"` | `"plain"` | Surface of the group: plain, an outlined card, or a muted tinted panel. |

### ItemMedia

The leading visual of a row: a bare icon or glyph, an icon tile, an image or an avatar.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"plain" \| "icon" \| "image" \| "avatar"` | `"plain"` | Shape of the media slot: plain, a tinted icon tile, a rounded image or a round avatar. |

## Notes

**When to use:** One list row: media, a title with a description, and trailing actions. Static, or one link or button for the whole row. `ItemGroup` lists rows with placeholders for loading and empty states.

**Use instead when:**
- `Frame`: a titled tray with a header and footer around a panel of rows
- `Table`: rows with several comparable columns
- `KeyValue`: name and value facts
- `Card`: a free-form container
- `DropdownMenu`: commands in a popup

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to a row that is a link or a button, and to controls inside a static row's `ItemActions` |
| Enter | Follows the link, or runs the button's `onClick` |
| Space | Runs the button's `onClick` (not for a link row) |

A static row is not focusable. With `asChild` the child keeps its own keyboard behaviour. No key depends on direction, but the `chevron` mirrors in RTL.

### Screen readers

- `ItemGroup` is a `role="list"` (it cannot be changed) and needs an `aria-label`. A static `Item` inside it has `role="listitem"`; a link or button row keeps its own role and is wrapped in a `listitem` box. Outside a group, a static `Item` is a plain `div`.
- A `disabled` link loses its `href` and gets `aria-disabled`; a disabled button row is natively disabled. The `chevron` is `aria-hidden`.
- `loading` renders `aria-busy` with sr-only "Loading…"; the placeholder rows are `aria-hidden`.
- `ItemTitle` and `ItemDescription` set a `title` tooltip from their text when it is a plain string, because they truncate.
- `ItemSeparator` is `role="presentation"`.

### Reduced motion

Static; the hover background and the chevron nudge are transitions, which the reduced-motion net in `sutra.css` ends within 1 ms.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API, so server and client output match.

### Slots

- `item-group`: the list, with `data-variant`
- `item-media`: the leading visual, with `data-variant` (`plain`, `icon`, `image`, `avatar`)
- `item-content`: the text column
- `item-title`: the single truncated line
- `item-description`: the secondary text
- `item-actions`: the trailing controls
- `item-separator`: a hairline for a group that is not `divided`

### Gotchas

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
