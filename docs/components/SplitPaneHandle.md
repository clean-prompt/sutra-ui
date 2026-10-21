# SplitPaneHandle

> Draggable divider: `role="separator"` with arrows/Home/End, Enter to collapse, double-click to reset.

- Import: `import { SplitPaneHandle } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/patterns/split-pane` (patterns)
- `data-slot`: `split-pane-handle`
- Part of [`SplitPane`](SplitPane.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `withGrip` | `boolean` | `true` | Show a grip in the middle of the divider. Default true. |

## Notes

See the notes in [`SplitPane`](SplitPane.md#notes).

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
