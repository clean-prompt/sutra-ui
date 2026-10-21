# DividedGridItem

> One cell of a `DividedGrid`: icon tile, title, description, badge and meta. A link, a button or static, depending on `href` and `onSelect`.

- Import: `import { DividedGridItem } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/navigation`)
- Source: `packages/ui/src/patterns/divided-grid` (patterns)
- `data-slot`: `divided-grid-icon`, `divided-grid-number`, `divided-grid-badge`, `divided-grid-description`, `divided-grid-meta`, `divided-grid-cell`
- Part of [`DividedGrid`](DividedGrid.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` (required) | `React.ReactNode` |  | Cell heading. |
| `badge` | `React.ReactNode` |  | A short label next to the title ("New", "Beta"). Text is shown in a `Badge`; pass a node to style it yourself. |
| `description` | `React.ReactNode` |  | Up to three lines; longer text is clamped. |
| `disabled` | `boolean` |  | Disables the cell: dimmed and not interactive. |
| `href` | `string` |  | Makes the cell a link. Unsafe URLs (`javascript:`) are ignored and the cell stays static. |
| `icon` | `React.ReactNode` |  | Icon shown in a small tile above the title (decorative: the title names the cell). |
| `meta` | `React.ReactNode` |  | Small muted line at the bottom of the cell ("12 MB limit"). |
| `onSelect` | `(event: React.MouseEvent<HTMLElement>) => void` |  | Called when the cell is clicked (after `onClick`, unless that prevented the default). Alone it makes the cell a button; with `href` it runs before the link opens. |
| `rel` | `string` |  | Link `rel` when `href` is set. |
| `target` | `string` |  | Link `target` when `href` is set. |

## Example (live: `#/components/layout-patterns/tool-grid` in the playground)

```tsx
import * as React from "react";
import { Text } from "@cleanprompt/sutra-ui/core";
import { RiSettings4Line } from "@cleanprompt/sutra-ui/icons";
import { DividedGrid, DividedGridItem } from "@cleanprompt/sutra-ui/navigation";

function ToolGridDemo() {
  const [picked, setPicked] = React.useState<string | null>(null);
  return (
    <>
      <DividedGrid label="File tools" numbered columns={3} query="container">
        {tools.slice(0, 8).map((tool) => (
          <DividedGridItem key={tool.title} {...tool} />
        ))}
        <DividedGridItem
          title="Settings"
          description="Choose defaults for every tool. This cell is a button: it reports the pick below instead of opening a page."
          icon={<RiSettings4Line />}
          meta="Button cell"
          onSelect={() => setPicked("Settings")}
        />
      </DividedGrid>
      <Text size="sm" tone="neutral" aria-live="polite">
        {picked ? `${picked} picked.` : "Pick the Settings cell to see the button behaviour."}
      </Text>
    </>
  );
}
```

Playground helpers in this snippet (not part of the library): tools.
