---
component: TabDropdown
module: primitives/tab-dropdown
use: A tab bar that measures its width and moves the tabs that do not fit into a "More" dropdown. It renders only the tab strip: you render the panel for the selected `value`.
instead: Tabs = the tabs fit and each has a panel; TabMenu = navigation between pages; DropdownMenu = a menu of actions, not a selection that stays visible
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | The selected visible tab is the only tab stop (the first enabled one when the selected tab is in the overflow or disabled); then the More button |
| ArrowRight, ArrowLeft | Focus and select the next or previous enabled tab, wrapping around |
| Home, End | Focus and select the first or last enabled tab |
| Enter, Space | Select the focused tab (native button) |
| Enter, Space, ArrowDown | On the More button: open the overflow menu; ArrowUp and ArrowDown then move through it, Escape closes it |

The arrow keys follow the reading direction: in RTL ArrowLeft goes to the next tab and ArrowRight to the previous one (the nearest `dir`, else `<html dir>`). Arrow keys select as they move, there is no manual activation mode.

## Screen readers
The strip is `role="tablist"` with `aria-orientation="horizontal"` and an accessible name from `label` (default "Tabs"); each tab is a button with `role="tab"` and `aria-selected`. There is no `tabpanel` and no `aria-controls`: give your own panel `role="tabpanel"` and `aria-labelledby` if you want that relationship. The overflow button is named "More tabs" (`moreLabel` plus " tabs"), or "More tabs, current: Billing" when the selected tab is in the overflow, and its menu is a group of `menuitemradio` rows. A hidden measuring copy of all tabs is `aria-hidden` and not focusable.

## Reduced motion
Static layout: the only motion is colour fades on the tabs, which end in 1 ms under reduced motion. There is no sliding indicator.

## Server rendering
The server renders every tab (`visibleCount` starts at the item count and no More button), and the widths are measured after mount with a layout effect and a `ResizeObserver`. A bar that overflows the container therefore collapses into More at hydration, and it re-measures when the container resizes or `items` changes.

## Slots
- `tab-dropdown-measure`: the invisible, `aria-hidden` copy of every tab and the More button used to measure widths

## Gotchas
- It does not render panels or own your content: read `value` (or `onValueChange`) and show the matching panel yourself.
- Overflow rows show text only. A `label` that is not a string needs `textValue`, otherwise the menu and the More button fall back to the item `value`. Icons and badges appear only in the visible tabs.
- Tabs collapse from the end: the items that fit stay in order, the rest go to More, and a selected overflow tab is shown on the More button instead of among the tabs.
- Uncontrolled it starts on `defaultValue`, else the first item. The root needs a width of its own (it is `min-w-0` and measures `offsetWidth`), so put it in a container that can shrink.

## Example
```tsx
import * as React from "react";
import { TabDropdown } from "@sutra/ui";

const sections = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity", badge: 3 },
  { value: "files", label: "Files" },
  { value: "billing", label: "Billing" },
  { value: "integrations", label: "Integrations" },
  { value: "audit", label: "Audit log" },
];

export function Example() {
  const [section, setSection] = React.useState("overview");
  return (
    <div className="w-full max-w-md">
      <TabDropdown label="Workspace sections" items={sections} value={section} onValueChange={setSection} />
      <p className="pt-4 text-sm text-muted-foreground">Showing {section}.</p>
    </div>
  );
}
```
