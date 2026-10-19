# FloatingActionButton

> Floating primary action, optionally expanding into a speed-dial menu.

- Import: `import { FloatingActionButton } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/fab` (primitives)
- `data-slot`: `fab`
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` (required) | `string` |  | Accessible name; also the visible text when `extended`. |
| `actions` | `FabAction[]` |  | Speed-dial actions that fan out on click. |
| `containerClassName` | `string` |  | Classes for the positioned wrapper (`className` styles the button). |
| `defaultOpen` | `boolean` | `false` | Initial open state of the speed dial when uncontrolled. |
| `extended` | `boolean` | `false` | Show the label next to the icon. |
| `icon` | `React.ReactNode` |  | Icon inside the button; the only content unless `extended`. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the speed dial opens or closes. |
| `open` | `boolean` |  | Controlled open state of the speed dial. Use with `onOpenChange`. |
| `position` | `FabPosition` | `"bottom-right"` | Corner or edge of the container the button sits in. |
| `shape` | `"circle" \| "rounded"` | `"circle"` | Outline: fully round, or rounded square. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Button size: 48, 56 or 64 px (`sm`, `md`, `lg`). |
| `strategy` | `"fixed" \| "absolute" \| "static"` | `"fixed"` | `fixed` to the viewport (default), `absolute` within a relative parent, or `static` inline. |
| `variant` | `"primary" \| "secondary" \| "inverse"` | `"primary"` | Fill style: `primary`, `secondary` (outlined) or `inverse`. |

## Variants

- `variant`: `primary`, `secondary`, `inverse` (default "primary")
- `size`: `sm`, `md`, `lg` (default "md")
- `shape`: `circle`, `rounded` (default "circle")
- `extended`: `true`, `false` (default false)

## Notes

**When to use:** One pinned primary action for a screen, round or rounded-square, icon-only or extended with a label. Pass `actions` and it becomes a speed dial that fans a menu of small actions out of the button.

**Use instead when:**
- `Button`: an ordinary action in the page flow
- `DropdownMenu`: a menu of actions from an ordinary trigger
- `FanMenu`: a radial menu of icons
- `Dialog`: the action needs a form or a decision

### Keyboard

| Key | Action |
|---|---|
| Enter, Space | On the button: runs `onClick`, and toggles the dial when it has `actions` |
| ArrowUp | With `actions`, on a bottom position: opens the dial and focuses the action nearest the button (already open: focuses it) |
| ArrowDown | The same for a `top-*` position |
| ArrowUp, ArrowDown | In the open dial: the key that points away from the button moves to the next action, the other moves back; both wrap and skip disabled actions |
| Home, End | Focus the first (nearest) or last action |
| Enter, Space | On an action: runs its `onClick`, then closes the dial. A link action (`href`) follows on Enter only |
| Escape | While the dial is open: closes it and returns focus to the button, wherever focus is |
| Tab | Moves through the open actions one by one (they are not roving) and does not close the dial |

The dial is vertical, so no arrow key swaps in RTL. The `position` names are physical (`bottom-right` stays at the right edge in RTL).

### Screen readers

- Without `actions` it is a plain `<button type="button">` named by `label` (`aria-label`); with `extended`, the visible `label` is the name and `aria-label` is dropped. The icon is `aria-hidden`.
- With `actions` the button gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`; the list is a `role="menu"` named by `label`, with `menuitem` buttons (links when an action has `href`) wrapped in `role="none"` items.
- A closed dial is `inert`, so its actions are neither focusable nor in the accessibility tree. A disabled action is `disabled` (a link gets `aria-disabled`, no `href` and `tabindex="-1"`).
- On `*-center` positions the action labels are visually hidden but still read; elsewhere each label shows beside its round icon.

### Reduced motion

The fan-out (each item fades, scales and slides with a 30 ms stagger), the 45 degree turn of the default plus icon, the hover lift and the press scale are all transitions. The reduced-motion net ends them in 1 ms and removes the delays, so the dial opens at once and the lift and press are instant.

### Server rendering

Server render: same markup as the client. No browser API at render: the document listeners attach in an effect and `useId` names the menu. A `defaultOpen` or `open` dial is already open in the server HTML.

### Slots

- `fab`: the positioned wrapper that holds the dial and the button (`containerClassName` styles it; `className` styles the button)

### Gotchas

- `strategy` defaults to `fixed`, pinned to the viewport corner with `z-50`. In a card, a demo or any container use `absolute` (inside a `relative` parent) or `static`, which ignores `position` offsets.
- `label` is required and is not shown unless `extended`; there is no tooltip. Default icon is a plus; it turns only when you pass `actions` and no `icon`.
- Your `onClick` runs first, and `preventDefault()` in it stops the toggle. `open` and the actions do nothing without a non-empty `actions` array.
- Running an action closes the dial and, when focus is still on the action (its handler did not move it), puts focus back on the button, as Escape does; clicking elsewhere closes it and leaves focus where you clicked.

## Example

```tsx
import { FloatingActionButton } from "@sutra/ui";
import { RiEditLine, RiFileTextLine, RiImageAddLine } from "@sutra/ui/icons";

export function Example({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="relative h-64 rounded-lg border bg-muted">
      <FloatingActionButton
        label="Create"
        strategy="absolute"
        position="bottom-right"
        actions={[
          { label: "New note", icon: <RiFileTextLine aria-hidden />, href: "/notes/new" },
          { label: "Upload photo", icon: <RiImageAddLine aria-hidden />, onClick: onUpload },
        ]}
      />
      <FloatingActionButton
        label="Compose"
        extended
        icon={<RiEditLine aria-hidden />}
        strategy="absolute"
        position="bottom-left"
        variant="secondary"
      />
    </div>
  );
}
```
