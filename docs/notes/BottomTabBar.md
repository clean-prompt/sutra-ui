---
component: BottomTabBar
module: patterns/bottom-tab-bar
covers: BottomTabBarItem, AdaptiveTabs
use: Mobile bottom navigation: icon over label tabs at least 44 px tall, count and dot badges, an optional raised centre action and safe-area padding. It hides itself from a breakpoint up. `AdaptiveTabs` shows the same items as inline pills on wide screens and as this bar on phones.
instead: Tabs = switch panels inside a page; Sidebar = app navigation on wide screens; HeaderNav = site navigation in a top bar; SegmentedControl = switch between a few views of one thing; FloatingActionButton = one pinned screen action
server: ssr-safe
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Each tab (and the centre action) is its own tab stop |
| Enter, Space | Press a button tab. A link tab follows on Enter only |

It is navigation, not a tablist: there is no arrow-key roving, and no key depends on direction, so RTL changes nothing except that the tabs run right to left.

## Screen readers
- A `nav` named "Primary" (`aria-label`; `AdaptiveTabs` names its two navigations "Sections" and "Sections tab bar") holding a list. The selected tab has `aria-current="page"`; there is no `aria-selected` or `tab` role.
- A badge is `aria-hidden`; a hidden "(3 new)" or "(new)" follows the label instead, so the tab reads "Inbox (3 new)". The icon is not hidden for you: pass `aria-hidden` icons.
- The centre action is a plain button named by `primaryAction.label`. A disabled link loses its `href` and gets `aria-disabled`.
- With `AdaptiveTabs` both navigations are in the page and CSS (`display: none`) hides one, so only one is exposed at a time.

## Reduced motion
The active pill grows in over 200 ms, a tap scales the centre action, and a changing badge pops (`animate-pop`). The global net ends the transitions in 1 ms and stops the pop.

## Server rendering
Plain markup from props; showing or hiding by breakpoint is CSS (`md:hidden`), so the server and client HTML match.

## Slots
- `bottom-tab-bar`: the `nav`
- `primary-action`: the raised centre button
- `indicator`: the active pill behind the icon
- `badge-count`, `badge-dot`: the badges
- `adaptive-tabs-inline`: the inline navigation of `AdaptiveTabs`

## Gotchas
- `position="fixed"` (default) pins the bar to the viewport bottom and hides it from `md` up (`hideAbove`, `"never"` keeps it): give the page bottom padding, and use `static` or `sticky` for previews and frames. The safe-area padding needs `viewport-fit=cover`.
- A click selects the tab at once, even for links. In a router app control `value` from the current route (and `onValueChange` for the rest), or the highlight and the page can disagree after back and forward.
- A tab is a `<button>`, an `<a>` when it has `href` (through `renderLink` for a router link, which receives `className`, `aria-current`, `onClick` and `data-state`), or your element with `asChild`. Pass `items` or `BottomTabBarItem` children, and `label` is required text.
- `primaryAction` is inserted in the middle of the tabs (after the first half), so use an even number of items. `badge` is a number (shown as `99+` above 99) or `true` for a dot; `0` and `false` hide it.

## Example
```tsx
import * as React from "react";
import { BottomTabBar } from "@cleanprompt/sutra-ui";
import { RiHomeLine, RiInboxLine, RiUserLine } from "@cleanprompt/sutra-ui/icons";

export function Example() {
  const [tab, setTab] = React.useState("home");
  return (
    <BottomTabBar
      position="static"
      hideAbove="never"
      value={tab}
      onValueChange={setTab}
      items={[
        { value: "home", label: "Home", icon: <RiHomeLine aria-hidden /> },
        { value: "inbox", label: "Inbox", icon: <RiInboxLine aria-hidden />, badge: 3 },
        { value: "profile", label: "Profile", icon: <RiUserLine aria-hidden /> },
      ]}
    />
  );
}
```
