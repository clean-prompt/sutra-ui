---
component: Tabs
module: primitives/tabs
covers: TabsList, TabsTrigger, TabsContent
use: Switches between panels of related content in place, with a sliding active indicator. Four looks (`pill`, `underline`, `solid`, `ghost`), three sizes, horizontal or vertical, optional `accent` colour, trigger `icon` and `badge`.
instead: TabDropdown = too many tabs for the width, the rest go into a More menu; TabMenu = navigation between pages (links with `aria-current`, no panels); SegmentedControl = a compact switch of a view or a setting; Accordion = stacked sections that can be open together
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Enters the tab list on the active tab (the only tab stop), then moves on to the panel |
| ArrowRight, ArrowLeft | Move to the next or previous tab and wrap around; with the default automatic activation the tab is also selected |
| ArrowDown, ArrowUp | The same for `orientation="vertical"`; ignored in a horizontal list |
| Home, End | First or last tab |
| Enter, Space | Select the focused tab (what matters with `activationMode="manual"`) |

In RTL the horizontal keys swap: ArrowLeft goes to the next tab and ArrowRight to the previous one (the direction comes from `<html dir>` or the nearest `DirectionProvider`). Vertical lists do not swap.

## Screen readers
`TabsList` is `role="tablist"` with `aria-orientation`; each trigger is `role="tab"` with `aria-selected` and `aria-controls`; each panel is `role="tabpanel"` labelled by its trigger and is itself a tab stop (`tabindex="0"`). A `badge` is part of the tab's name ("Inbox 4"). The sliding indicator is `aria-hidden`. An `icon` you pass is not hidden for you, and an icon-only tab needs `aria-label`. Pass `aria-label` to `TabsList` when the page has more than one tab list.

## Reduced motion
The indicator slides over 300 ms (`motion-reduce:transition-none` makes it jump) and the trigger colour fades are transitions that end in 1 ms. The active panel fades in with `animate-in fade-in-0`; the net removes any movement and the short fade remains.

## Server rendering
The server renders the tabs, the selected panel and a plain filled active tab. The sliding indicator is measured after mount (`data-indicator="ready"` on the list), and until then the active trigger paints its own fill, so the look shifts slightly at hydration. The root `dir` is also read after mount (the server writes `ltr`), so in an RTL document the first server paint has `dir="ltr"`.

## Gotchas
- Activation is automatic: moving focus with the arrows selects the tab and calls `onValueChange`. For panels that are costly to render or fetch, set `activationMode="manual"` so only Enter or Space selects.
- Inactive `TabsContent` is unmounted (state inside is lost); pass `forceMount` to keep it in the tree, hidden. `value` on `Tabs` and on each trigger and panel must match.
- `accent` on `Tabs` colours every active trigger and the indicator; `TabsTrigger accent` overrides it for one tab and inactive tabs stay neutral. `variant="ghost"` has no sliding indicator.
- `TabsList` scrolls horizontally (`overflow-x-auto`, no scrollbar) when the tabs do not fit; use `TabDropdown` if they should collapse instead. `fullWidth` stretches the triggers.

## Example
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <Tabs defaultValue="overview" variant="underline" className="max-w-md">
      <TabsList aria-label="Project sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="members" badge={12}>
          Members
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-4 text-sm">
        Atlas has 3 active sprints and 48 open issues.
      </TabsContent>
      <TabsContent value="members" className="pt-4 text-sm">
        Twelve people can edit this project.
      </TabsContent>
      <TabsContent value="settings" className="pt-4 text-sm">
        Rename, archive or delete the project.
      </TabsContent>
    </Tabs>
  );
}
```
