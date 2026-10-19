# TabMenu

> Link-style tab bar for page sections, with an animated underline and scroll fades.

- Import: `import { TabMenu } from "@sutra/ui"` (or from `@sutra/ui/navigation`)
- Source: `packages/ui/src/patterns/tab-menu` (patterns)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `TabMenuItem[]` |  | Tabs in order; each has a `value`, a `label` and optional icon, badge and disabled flag. |
| `bordered` | `boolean` | `true` | Draw the bottom border across the full width. Default true. |
| `defaultValue` | `string` |  | Initially selected tab value when uncontrolled. |
| `onValueChange` | `(value: string) => void` |  | Called with the value of the tab the user picked. |
| `renderLink` | `(props: TabMenuLinkProps, item: TabMenuItem) => React.ReactElement` |  | Render items with an `href` through your router's Link. Spread the given props onto it. |
| `size` | `Size` | `"md"` | Tab height and text size. |
| `value` | `string` |  | Controlled selected tab value. Use with `onValueChange`. |

## Example (live: `#/components/navigation/tab-menu` in the playground)

```tsx
import * as React from "react";
import { TabMenu } from "@sutra/ui/navigation";

function TabMenuDemo() {
  const [tab, setTab] = React.useState("issues");
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {/* Icons, counts, disabled item · active: {tab} */}
        <TabMenu items={projectTabs} value={tab} onValueChange={setTab} />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          {/* size="sm" · labels only */}
          <TabMenu
            size="sm"
            items={[
              { value: "all", label: "All" },
              { value: "unread", label: "Unread", count: 8 },
              { value: "mentions", label: "Mentions" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
        <div className="max-w-xs space-y-3">
          {/* Narrow container scrolls with edge fades */}
          <TabMenu items={projectTabs} defaultValue="analytics" size="lg" bordered={false} />
        </div>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): projectTabs.
