---
component: SplitButton
module: primitives/split-button
use: A primary action fused with a chevron button that opens a menu of secondary actions, such as Save with Save as draft or Publish with Schedule. Takes Button's `variant` and `size`, an `actions` array and optional custom `menuContent`.
instead: Button = one action with no alternatives; DropdownMenu = a menu with its own trigger and no default action; ButtonGroup = several equal, always visible buttons; Select = choosing a value rather than running an action
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Moves to the main button, then to the chevron button; a disabled or `loading` half is skipped |
| Enter, Space | On the main button: run the primary action |
| Enter, Space, ArrowDown | On the chevron button: open the menu |
| ArrowDown, ArrowUp | In the menu: move the highlighted action |
| Home, End | Highlight the first or last action |
| Enter, Space | Run the highlighted action and close the menu |
| Escape | Close the menu and return focus to the chevron |

Menu rows are vertical, so no arrow keys swap in RTL. The two halves use logical corners, so in an RTL page the chevron sits on the left of the main button.

## Screen readers
The pair is wrapped in a `role="group"` with no name; pass `aria-label` to name the main button (extra props go to it, not to the group). The chevron is a `<button>` named "More options" (`menuLabel`, also used as its `title`) with `aria-haspopup="menu"`, `aria-expanded` and `aria-controls` while open, and its arrow icon is `aria-hidden`. The menu is the `DropdownMenu`: `role="menu"` with `menuitem` rows, the optional `menuHeading` as a label, and `aria-disabled` rows.

## Reduced motion
The press scale is switched off on both halves (`active:scale-100`) so they stay visually joined. Colour fades end in 1 ms under reduced motion and the menu loses its movement and keeps its fade. The `loading` spinner on the main button keeps turning.

## Server rendering
Plain markup with no browser API at render. The menu is closed, so only the two buttons render on the server; the menu is portalled after mount.

## Gotchas
- The chevron and the menu only exist when there are `actions` or `menuContent`; with neither, the component is a plain `Button` in a group.
- `disabled` and `loading` disable both halves (the chevron is disabled while `loading`), and `loading` shows the spinner on the main button only. `onClick` and other button props belong to the main button.
- Each action needs `id`, `label` and `onSelect`; the menu closes after `onSelect` runs. An action's `variant: "destructive"` colours the row red, and `shortcut` is a display-only hint that binds nothing.
- `menuContent` renders after `actions` and should be `DropdownMenuItem` or other menu parts; `align` defaults to `end`, so the menu lines up with the chevron end of the button. `size` follows Button's scale (`xs` to `xl`) and `variant` any Button variant, with a matching divider between the halves.

## Example
```tsx
import * as React from "react";
import { SplitButton } from "@cleanprompt/sutra-ui";
import { RiCalendarLine, RiDraftLine } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  const [status, setStatus] = React.useState("Draft");
  return (
    <div className="flex items-center gap-3">
      <SplitButton
        onClick={() => setStatus("Published")}
        menuLabel="More publish options"
        actions={[
          { id: "schedule", label: "Schedule for later", icon: <RiCalendarLine aria-hidden />, onSelect: () => setStatus("Scheduled") },
          { id: "draft", label: "Save as draft", icon: <RiDraftLine aria-hidden />, onSelect: () => setStatus("Draft") },
        ]}
      >
        Publish
      </SplitButton>
      <span className="text-sm text-muted-foreground">Status: {status}</span>
    </div>
  );
}
```
