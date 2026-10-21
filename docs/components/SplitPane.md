# SplitPane

> Two resizable panes with an accessible draggable divider, persistence and a narrow-width fallback.

- Import: `import { SplitPane } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/patterns/split-pane` (patterns)
- `data-slot`: `split-pane`
- Parts: [`SplitPaneHandle`](SplitPaneHandle.md), [`SplitPanePanel`](SplitPanePanel.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `collapseBelow` | `number` |  | Below this container width (px) the split collapses. |
| `collapseMode` | `"stack" \| "primary"` | `"stack"` | When collapsed: stack both panes, or show one at a time with a toggle. Default "stack". |
| `collapsible` | `boolean` | `true` | Allow Enter on the handle to collapse/restore the first panel. Default true. |
| `defaultSize` | `number` | `50` | Initial size of the first panel in percent; also the double-click reset value. Default 50. |
| `max` | `number` | `85` | Maximum first-panel size in percent. Default 85. |
| `min` | `number` | `15` | Minimum first-panel size in percent. Default 15. |
| `onSizeChange` | `(size: number) => void` |  | Called with the first panel's size in percent while the divider moves. |
| `orientation` | `Orientation` | `"horizontal"` | `horizontal`: panes side by side (vertical divider). `vertical`: stacked (horizontal divider). |
| `size` | `number` |  | Size of the first panel in percent (controlled). |
| `step` | `number` | `5` | Keyboard step in percent (Shift ×2). Default 5. |
| `storageKey` | `string` |  | Persist the size in localStorage under this key. |

## Part props

### SplitPaneHandle

Draggable divider: `role="separator"` with arrows/Home/End, Enter to collapse, double-click to reset.

| Prop | Type | Default | Description |
|---|---|---|---|
| `withGrip` | `boolean` | `true` | Show a grip in the middle of the divider. Default true. |

### SplitPanePanel

One side of a `SplitPane`. The first panel is sized; the second fills the rest.

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `React.ReactNode` |  | Label used by the narrow-width toggle (`collapseMode="primary"`). |

## Notes

**When to use:** Two resizable panes with a draggable, keyboard-operable divider, an optional saved size, and a narrow-width fallback that stacks the panes or shows one at a time. Use it for editor and preview, list and detail, or a sidebar next to content.

**Use instead when:**
- `TilingLayout`: more than two panes, nested splits and tab groups
- `Sheet`: a panel that overlays the page
- `Sidebar`: app navigation that collapses
- `Tabs`: switch between views rather than see both

### Keyboard

| Key | Action |
|---|---|
| Tab / Shift+Tab | Focuses the divider (the only tab stop in the component) |
| ArrowLeft, ArrowRight | Horizontal split: move the divider left or right by `step` percent (Shift doubles it) |
| ArrowUp, ArrowDown | Vertical split: move the divider up or down |
| Home, End | Shrink the first panel to `min`, or grow it to `max` |
| Enter | Collapse the first panel, or restore it (unless `collapsible={false}`) |
| Double-click | Reset to `defaultSize` (pointer only) |

The divider follows the arrow you press in both directions: in RTL the first panel sits on the right and the two horizontal arrows swap their effect on its size. Dragging with a pointer also measures from the right edge in RTL.

### Screen readers

- The divider is a focusable `role="separator"` (the window-splitter pattern) with `aria-orientation` (`vertical` for side-by-side panes), `aria-valuenow` as the first panel's percent (0 when collapsed), `aria-valuemin`, `aria-valuemax`, and `aria-controls` pointing at the first panel. Its name is "Resize panels"; pass `aria-label` on `SplitPaneHandle` to say which panes ("Resize editor").
- A collapsed first panel gets `hidden`, so it leaves the accessibility tree. In `collapseMode="primary"` a group "Show panel" of `aria-pressed` buttons (named by each panel's `label`) switches panels; when stacked the divider is not rendered.
- The panels are plain `div`s with no role: add landmarks or labels yourself.

### Reduced motion

Nothing moves except a colour fade on the divider, which the global net ends in 1 ms. Resizing follows the pointer or key presses directly with no animation.

### Server rendering

Server render: part of it fills in after mount. The panes render on the server and on the hydrating client render at `defaultSize` (or `size`), so the markup matches. With `storageKey` the saved size is read right after hydration, before paint, and applied without calling `onSizeChange`; `collapseBelow` is judged from a measured width, so stacking only happens after mount.

### Slots

- `split-pane`: the root (`data-orientation`, `data-stacked`, `data-dragging`)
- `split-pane-panel`: one panel (`data-panel` index, `data-collapsed`)
- `split-pane-handle`: the divider (`data-collapsed`)

### Gotchas

- It is built for two panels: the first is sized (`size` percent, clamped to `min` 15 and `max` 85) and the second fills the rest. If you render no `SplitPaneHandle`, one is inserted before the second panel.
- Give the pane a height (for example `className="h-96"`): sizes are percentages of the container, the root clips overflow and each panel scrolls itself.
- `defaultSize` is the starting size and the double-click reset value. Controlled use is `size` with `onSizeChange`, which is called on every move, as is the write to `localStorage` when `storageKey` is set (a saved value beats `defaultSize` on mount; a blocked storage is ignored).
- `collapseBelow` is a container width in px: below it the divider is removed and the panes stack (`collapseMode="stack"`) or show one at a time (`"primary"`). Any resize, even from the keyboard, restores a collapsed first panel.

## Example

```tsx
import { SplitPane, SplitPaneHandle, SplitPanePanel } from "@cleanprompt/sutra-ui";

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
