---
component: SplitPane
module: patterns/split-pane
covers: SplitPanePanel, SplitPaneHandle
use: Two resizable panes with a draggable, keyboard-operable divider, an optional saved size, and a narrow-width fallback that stacks the panes or shows one at a time. Use it for editor and preview, list and detail, or a sidebar next to content.
instead: TilingLayout = more than two panes, nested splits and tab groups; Sheet = a panel that overlays the page; Sidebar = app navigation that collapses; Tabs = switch between views rather than see both
server: mixed
---

## Keyboard
| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the divider (the only tab stop in the component) |
| ArrowLeft, ArrowRight | Horizontal split: move the divider left or right by `step` percent (Shift doubles it) |
| ArrowUp, ArrowDown | Vertical split: move the divider up or down |
| Home, End | Shrink the first panel to `min`, or grow it to `max` |
| Enter | Collapse the first panel, or restore it (unless `collapsible={false}`) |
| Double-click | Reset to `defaultSize` (pointer only) |

The divider follows the arrow you press in both directions: in RTL the first panel sits on the right and the two horizontal arrows swap their effect on its size. Dragging with a pointer also measures from the right edge in RTL.

## Screen readers
- The divider is a focusable `role="separator"` (the window-splitter pattern) with `aria-orientation` (`vertical` for side-by-side panes), `aria-valuenow` as the first panel's percent (0 when collapsed), `aria-valuemin`, `aria-valuemax`, and `aria-controls` pointing at the first panel. Its name is "Resize panels"; pass `aria-label` on `SplitPaneHandle` to say which panes ("Resize editor").
- A collapsed first panel gets `hidden`, so it leaves the accessibility tree. In `collapseMode="primary"` a group "Show panel" of `aria-pressed` buttons (named by each panel's `label`) switches panels; when stacked the divider is not rendered.
- The panels are plain `div`s with no role: add landmarks or labels yourself.

## Reduced motion
Nothing moves except a colour fade on the divider, which the global net ends in 1 ms. Resizing follows the pointer or key presses directly with no animation.

## Server rendering
The panes render on the server at `defaultSize` (or `size`). With `storageKey` the saved size is read from `localStorage` during the first client render, so when one is saved the client disagrees with the server markup (a hydration mismatch on the first panel's size); `collapseBelow` is judged from a measured width, so stacking only happens after mount.

## Slots
- `split-pane`: the root (`data-orientation`, `data-stacked`, `data-dragging`)
- `split-pane-panel`: one panel (`data-panel` index, `data-collapsed`)
- `split-pane-handle`: the divider (`data-collapsed`)

## Gotchas
- It is built for two panels: the first is sized (`size` percent, clamped to `min` 15 and `max` 85) and the second fills the rest. If you render no `SplitPaneHandle`, one is inserted before the second panel.
- Give the pane a height (for example `className="h-96"`): sizes are percentages of the container, the root clips overflow and each panel scrolls itself.
- `defaultSize` is the starting size and the double-click reset value. Controlled use is `size` with `onSizeChange`, which is called on every move, as is the write to `localStorage` when `storageKey` is set (a saved value beats `defaultSize` on mount; a blocked storage is ignored).
- `collapseBelow` is a container width in px: below it the divider is removed and the panes stack (`collapseMode="stack"`) or show one at a time (`"primary"`). Any resize, even from the keyboard, restores a collapsed first panel.

## Example
```tsx
import { SplitPane, SplitPaneHandle, SplitPanePanel } from "@sutra/ui";

export function Example() {
  return (
    <SplitPane
      className="h-72 rounded-box border border-border"
      defaultSize={35}
      min={20}
      max={70}
      collapseBelow={480}
      collapseMode="primary"
    >
      <SplitPanePanel label="Files" className="p-3">
        Files
      </SplitPanePanel>
      <SplitPaneHandle aria-label="Resize file list" />
      <SplitPanePanel label="Preview" className="p-3">
        Preview
      </SplitPanePanel>
    </SplitPane>
  );
}
```
