# BottomTabBarItem

> One tab of a `BottomTabBar`; renders a button, a link, or your own element via `asChild`.

- Import: `import { BottomTabBarItem } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/patterns/bottom-tab-bar` (patterns)
- `data-slot`: `indicator`, `badge-dot`, `badge-count`
- Part of [`BottomTabBar`](BottomTabBar.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` (required) | `React.ReactNode` |  | Icon shown above the label (inactive state). |
| `label` (required) | `React.ReactNode` |  | Text label shown under the icon. |
| `value` (required) | `string` |  | Value this tab represents; the bar's `value` selects it. |
| `activeIcon` | `React.ReactNode` |  | Icon shown instead of `icon` while the tab is active (e.g. a filled variant). |
| `asChild` | `boolean` |  | Merge tab props into the single child element (e.g. a router `<Link>`). |
| `badge` | `number \| boolean` |  | Count badge on the icon; `true` shows a dot and `0` or `false` hides it. |
| `children` | `React.ReactElement` |  | The single child element to render as the tab when `asChild` is set. |
| `disabled` | `boolean` |  | Disables the tab. |
| `href` | `string` |  | Makes the tab a link to this URL. |

## Notes

See the notes in [`BottomTabBar`](BottomTabBar.md#notes).

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
