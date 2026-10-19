# CollapsibleTrigger

> Button that toggles its `Collapsible`; sets `aria-expanded` and `aria-controls`.

- Import: `import { CollapsibleTrigger } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/collapsible` (primitives)
- `data-slot`: `collapsible-trigger`
- Part of [`Collapsible`](Collapsible.md)
- Also accepts the props of HTMLAttributes, ButtonHTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `asChild` | `boolean` |  | Render the child (your own button) and only add the ARIA wiring and click handling. |
| `icon` | `"chevron" \| false` | `"chevron"` | Turning chevron after the label, or `false` for none (ignored with `asChild`). |

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
