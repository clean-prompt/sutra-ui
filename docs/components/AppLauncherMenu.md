# AppLauncherMenu

> Waffle-button app switcher: a popover with a 3-column launcher grid.

- Import: `import { AppLauncherMenu } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/social`)
- Source: `packages/ui/src/kits/workspace/app-launcher` (kit `workspace`)
- `data-slot`: `app-launcher-menu`
- Part of [`AppLauncher`](AppLauncher.md)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` (required) | `AppLauncherItem[]` |  | Apps to show as tiles in the waffle menu. |
| `align` | `"start" \| "center" \| "end"` | `"end"` | Alignment of the menu against the trigger. |
| `className` | `string` |  | Extra classes for the menu content. |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is not controlled. |
| `footer` | `React.ReactNode` |  | Content below the grid, e.g. a "More apps" link. |
| `label` | `string` | `"Apps"` | Accessible name of the trigger and grid. |
| `onOpenChange` | `(open: boolean) => void` |  | Called when the menu opens or closes. |
| `onSelect` | `(item: AppLauncherItem) => void` |  | Called with the app when the user opens a tile. |
| `open` | `boolean` |  | Controlled open state of the menu. |
| `renderMenu` | `(item: AppLauncherItem) => React.ReactNode` |  | Right-click and long-press menu for a tile: return `ContextMenuItem`s. |
| `searchable` | `boolean` |  | Shows a search field that filters the tiles. |
| `trigger` | `React.ReactElement` |  | Custom trigger element (defaults to a waffle icon button). |

## Example (live: `#/components/social/app-launcher` in the playground)

```tsx
import * as React from "react";
import { Button } from "@cleanprompt/sutra-ui/core";
import { ContextMenuItem } from "@cleanprompt/sutra-ui/overlays";
import { AppLauncher, AppLauncherMenu } from "@cleanprompt/sutra-ui/social";

function LauncherDemo() {
  const [last, setLast] = React.useState<string | null>(null);
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-8 @2xl:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          {/* Grid · arrow keys move focus · right-click (long-press on touch) a tile for its menu */}
          <AppLauncher
            items={launcherItems}
            columns={4}
            searchable
            onSelect={(item) => setLast(item.label)}
            renderMenu={(item) => (
              <>
                <ContextMenuItem onSelect={() => setLast(`${item.label} (new window)`)}>Open in new window</ContextMenuItem>
                <ContextMenuItem onSelect={() => setLast(`${item.label} pinned`)}>Pin to dock</ContextMenuItem>
              </>
            )}
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">Last opened: {last ?? "nothing yet"}</p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            {/* Waffle menu */}
            <AppLauncherMenu
              items={launcherItems}
              onSelect={(item) => setLast(item.label)}
              footer={
                <Button variant="ghost" size="sm" fullWidth>
                  All apps
                </Button>
              }
            />
          </div>
          <div className="space-y-2">
            {/* Dock */}
            <AppLauncher variant="dock" items={launcherItems.slice(0, 5)} onSelect={(item) => setLast(item.label)} label="Dock" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

Playground helpers in this snippet (not part of the library): launcherItems.
