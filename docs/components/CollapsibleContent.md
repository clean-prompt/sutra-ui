# CollapsibleContent

> Animated panel of a `Collapsible`. Padding goes on the inner box so the closed height is 0.

- Import: `import { CollapsibleContent } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/collapsible` (primitives)
- `data-slot`: `collapsible-content`
- Part of [`Collapsible`](Collapsible.md)
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `keepMounted` | `boolean` |  | Override the root's `keepMounted` for this panel. |

## Notes

See the notes in [`Collapsible`](Collapsible.md#notes).

## Example

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@sutra/ui";

export function Example() {
  return (
    <Collapsible variant="surface" className="max-w-md">
      <CollapsibleTrigger>Show release notes</CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="list-disc ps-5 text-sm text-muted-foreground">
          <li>Faster project search</li>
          <li>New keyboard shortcuts in the editor</li>
          <li>Fixed a crash when exporting large files</li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
```
