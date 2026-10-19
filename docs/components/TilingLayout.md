# TilingLayout

> IDE-style tiling workspace: nested resizable splits of tab groups with drag-and-drop, zoom and keep-alive panes.

- Import: `import { TilingLayout } from "@sutra/ui"` (or from `@sutra/ui/workspace`)
- Source: `packages/ui/src/patterns/tiling-layout` (patterns)
- `data-slot`: `tiling-layout`, `tiling-drag-ghost`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `renderPane` (required) | `(paneId: string) => React.ReactNode` |  | Renders the content of a pane from its pane id. |
| `createPane` | `(fromPaneId: string, direction: TilingDirection) => string \| null` |  | Supply a new pane id for "Split right/down". Without it, splitting moves the tab into a new group (or creates an empty group when it is the only tab). |
| `defaultLayout` | `LayoutNode` |  | Initial layout tree when uncontrolled. |
| `defaultMaximizedGroup` | `string \| null` | `null` | Initially maximized group id when uncontrolled. |
| `floating` | `FloatingPaneState[]` |  | Floating windows rendered over the layout; enables "Pop out" and "Dock". |
| `keepAlive` | `boolean` | `true` | Keep inactive tabs mounted (hidden) so their state survives. Default true. |
| `label` | `string` | `"Workspace"` | Accessible name of the workspace. Default "Workspace". |
| `layout` | `LayoutNode` |  | Controlled layout tree: nested splits (with a direction and sizes) and tab groups holding pane ids. Use with `onLayoutChange`. |
| `maximizedGroup` | `string \| null` |  | Maximized group id (controlled). |
| `minSize` | `number` | `0.08` | Minimum fraction per split child. Default 0.08. |
| `onFloatingChange` | `(panes: FloatingPaneState[]) => void` |  | Called with the new list of floating windows after one is moved, resized or closed; setting it also enables "Pop out" and "Dock". |
| `onLayoutChange` | `(layout: LayoutNode) => void` |  | Called with the new layout after a resize, split, move, close or drop. |
| `onMaximizedGroupChange` | `(groupId: string \| null) => void` |  | Called with the maximized group id (or `null` when restored). |
| `onPaneClose` | `(paneId: string) => void` |  | Called after a pane was closed from the UI. |
| `paneClosable` | `(paneId: string) => boolean` |  | Whether a pane shows a close button. Default: all closable. |
| `paneIcon` | `(paneId: string) => React.ReactNode` |  | Icon shown before the pane's tab title. |
| `paneLabel` | `(paneId: string) => string` |  | Plain-text name used in aria labels when `paneTitle` returns a node. |
| `paneTitle` | `(paneId: string) => React.ReactNode` |  | Tab title (default: the pane id). |
| `renderEmptyGroup` | `(groupId: string) => React.ReactNode` |  | Content for empty groups (default: a drop hint). |
| `shortcuts` | `boolean` | `false` | Register keyboard shortcuts (mod+\, mod+shift+\, mod+w, ctrl+tab, mod+1…9). |
| `step` | `number` | `0.02` | Keyboard resize step (fraction). Default 0.02. |
