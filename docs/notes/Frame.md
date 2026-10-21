---
component: Frame
module: primitives/frame
covers: FrameHeader, FrameTitle, FrameDescription, FrameAction, FramePanel, FrameFooter
use: A titled tray around a panel of rows: a header with title, description and action, a panel that holds the rows, and a footer. Four looks, with loading and empty states in the panel.
instead: Item = the row itself (put `Item`s in the panel); Card = a free-form content container; Accordion = rows that open and close; Table = comparable columns
server: ssr-safe
---

## Keyboard
Not focusable itself: no keyboard interaction. The action in `FrameAction` and the rows in the panel are ordinary tab stops.

## Screen readers
- `FrameTitle` renders an `h3` by default; `as` picks `h2` to `h6`, `p` or `div`, so set it to fit your heading outline.
- `FramePanel` is a `role="list"` and needs an `aria-label`. `Item` rows inside it become list items by themselves. Any other row must carry `role="listitem"` itself, or the list has no valid children.
- `loading` shows `aria-busy` with sr-only "Loading…" and `aria-hidden` placeholder rows (an icon box and two lines). `emptyState` is wrapped in a `listitem`.
- `Frame`, `FrameHeader` and `FrameFooter` add no roles, so the header is not linked to the panel: label the panel yourself.

## Reduced motion
Static: no animation of its own. The loading placeholders are `Skeleton`s and follow the net in `sutra.css`.

## Server rendering
Plain markup with no browser API, so server and client output match. The variant styles come from CSS (`group-data-[variant=...]`), so they apply on the first paint.

## Slots
- `frame`: the root, with `data-variant`
- `frame-header`: title, description and action; wraps on narrow widths
- `frame-title`: the heading
- `frame-description`: a line under or beside the title
- `frame-action`: a control at the end of the header
- `frame-panel`: the raised surface that holds the rows
- `frame-footer`: a count, hint or action

## Gotchas
- `variant` is `default` (a tray with a raised panel, corners kept concentric), `band` (one card with tinted header and footer bands), `inset` (a soft tray with a roomy, borderless panel) or `plain` (no tray). The header, footer and panel read the variant from the root, so they must sit inside `Frame`.
- `FramePanel` draws hairlines between rows by default; pass `divided={false}` for none.
- `emptyState` shows only when the panel has no children and `loading` is off. `loadingRows` defaults to 3.
- `FrameDescription` is full width, so inside a wrapping header it falls onto its own line under the title and action.

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
