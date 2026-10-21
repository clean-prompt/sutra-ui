# SplitPanePanel

> One side of a `SplitPane`. The first panel is sized; the second fills the rest.

- Import: `import { SplitPanePanel } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/mobile`)
- Source: `packages/ui/src/patterns/split-pane` (patterns)
- `data-slot`: `split-pane-panel`
- Part of [`SplitPane`](SplitPane.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `React.ReactNode` |  | Label used by the narrow-width toggle (`collapseMode="primary"`). |

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
