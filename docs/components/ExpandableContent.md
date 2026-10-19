# ExpandableContent

> Height-capped container with a bottom fade and Show more / Show less.

- Import: `import { ExpandableContent } from "@sutra/ui"` (or from `@sutra/ui/agent`)
- Source: `packages/ui/src/kits/agent/tool-timeline` (kit `agent`)
- `data-slot`: `expandable-content`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `collapsedHeight` | `number` | `160` | Height (px) of the collapsed view. Default 160. |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state when `expanded` is not controlled. |
| `expanded` | `boolean` |  | Controlled expanded state. |
| `fadeClassName` | `string` | `"from-background"` | Classes for the gradient (match the surface, e.g. "from-card"). Default "from-background". |
| `lessLabel` | `React.ReactNode` | `"Show less"` | Label of the button that collapses the content. |
| `moreLabel` | `React.ReactNode` | `"Show more"` | Label of the button that expands the content. |
| `onExpandedChange` | `(expanded: boolean) => void` |  | Called with the new state when the user expands or collapses the content. |

## Example (live: `#/components/agent-timeline/expandable-content` in the playground)

```tsx
import { ExpandableContent } from "@sutra/ui/agent";

function ExpandableDemo() {
  return (
    <>
      <ExpandableContent collapsedHeight={96} className="mx-auto max-w-xl text-sm text-muted-foreground">
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <p key={i}>
              Paragraph {i + 1}. Tool results can be long: file listings, JSON payloads and logs. Capping them keeps the
              transcript scannable while leaving everything one click away.
            </p>
          ))}
        </div>
      </ExpandableContent>
    </>
  );
}
```
