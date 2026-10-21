# AvatarGroup

> Overlapping stack of avatars with overflow count and optional add button.

- Import: `import { AvatarGroup } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/avatar-group` (primitives)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `addLabel` | `string` | `"Add member"` | Accessible name of the add button. |
| `max` | `number` |  | Maximum avatars to show before collapsing the rest into a "+N" bubble. |
| `onAdd` | `() => void` |  | Renders a dashed "add" button at the end. |
| `shape` | `AvatarShape` | `"circle"` | Avatar shape for every avatar in the group. |
| `size` | `AvatarSize` | `"md"` | Avatar size for every avatar in the group. |
| `spacing` | `"tight" \| "normal"` | `"normal"` | How much the avatars overlap: `tight` overlaps more than `normal`. |
| `total` | `number` |  | Override the overflow count (e.g. when only a page of users is loaded). |

## Notes

**When to use:** An overlapping row of avatars that collapses extra people into a "+N" bubble and can end with a dashed add button.

**Use instead when:**
- `Avatar`: a single person
- `Item`: a list row for each person
- `Popover`: show the full list of the hidden people on click

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves focus to and from the add button (only rendered with `onAdd`) |
| Enter, Space | Activates the add button (native `<button>`) |

The avatars and the +N bubble are not focusable. The row is a flex row, so it mirrors in RTL; no key changes.

### Screen readers

- The root is `role="group"`. It has no name of its own, so pass `aria-label` ("Team") when the group means something.
- The overflow bubble is a `role="img"` labelled "N more" (its text reads "+N", or "99+" above 99). The add button is labelled "Add member"; change it with `addLabel`.
- Each avatar keeps the rules of `Avatar`: labelled by `name` or `alt`, silent without either.

### Reduced motion

Each avatar lifts 2px on hover with a 200 ms transform transition, which the reduced-motion net in `sutra.css` ends within 1 ms.

### Server rendering

Server render: part of it fills in after mount. The group is plain markup (no browser API), so it matches on server and client. Avatars with `src` follow `Avatar`: the server HTML holds an empty frame and the picture or fallback appears after mount.

### Gotchas

- `max` slices the children; `total` only changes the count, it does not add avatars. The bubble shows `total - visible` (or `children - visible`), so with `max={2} total={250}` and two children it reads "99+" and is labelled "248 more".
- Only React elements count as avatars: strings and `null` are dropped, and a fragment is one child.
- The group gives its avatars `size`, `shape` and a background `ring`; an avatar with its own `size` or `shape` prop keeps it, which breaks the even overlap.
- The overflow bubble is not interactive. For "click +N to see everyone" put the group in a trigger yourself.

## Example

```tsx
import { Avatar, AvatarGroup } from "@cleanprompt/sutra-ui";

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
