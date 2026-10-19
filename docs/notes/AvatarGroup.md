---
component: AvatarGroup
module: primitives/avatar-group
use: An overlapping row of avatars that collapses extra people into a "+N" bubble and can end with a dashed add button.
instead: Avatar = a single person; Item = a list row for each person; Popover = show the full list of the hidden people on click
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the add button (only rendered with `onAdd`) |
| Enter, Space | Activates the add button (native `<button>`) |

The avatars and the +N bubble are not focusable. The row is a flex row, so it mirrors in RTL; no key changes.

## Screen readers
- The root is `role="group"`. It has no name of its own, so pass `aria-label` ("Team") when the group means something.
- The overflow bubble is a `role="img"` labelled "N more" (its text reads "+N", or "99+" above 99). The add button is labelled "Add member"; change it with `addLabel`.
- Each avatar keeps the rules of `Avatar`: labelled by `name` or `alt`, silent without either.

## Reduced motion
Each avatar lifts 2px on hover with a 200 ms transform transition, which the reduced-motion net in `sutra.css` ends within 1 ms.

## Server rendering
The group is plain markup (no browser API), so it matches on server and client. Avatars with `src` follow `Avatar`: the server HTML holds an empty frame and the picture or fallback appears after mount.

## Gotchas
- `max` slices the children; `total` only changes the count, it does not add avatars. The bubble shows `total - visible` (or `children - visible`), so with `max={2} total={250}` and two children it reads "99+" and is labelled "248 more".
- Only React elements count as avatars: strings and `null` are dropped, and a fragment is one child.
- The group gives its avatars `size`, `shape` and a background `ring`; an avatar with its own `size` or `shape` prop keeps it, which breaks the even overlap.
- The overflow bubble is not interactive. For "click +N to see everyone" put the group in a trigger yourself.

## Example
```tsx
import { Avatar, AvatarGroup } from "@sutra/ui";

const team = ["Maya Chen", "Omar Haddad", "Priya Nair", "Tomas Silva", "Aiko Tanaka"];

export function Example() {
  return (
    <AvatarGroup aria-label="Project team" max={3} size="md">
      {team.map((name) => (
        <Avatar key={name} name={name} />
      ))}
    </AvatarGroup>
  );
}
```
