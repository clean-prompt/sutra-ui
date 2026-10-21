# Collapse

> Height-auto open and close for a section, filter row or wizard step. The track goes from `0fr` to `1fr`, so the real content height animates with no measuring and no JS animation; closed content is `inert` (not focusable, out of the accessibility tree). Reduced motion ends the transition at once. It is controlled only: drive `open` yourself or use `Collapsible`.

- Import: `import { Collapse } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/collapse` (primitives)
- `data-slot`: `collapse`, `collapse-content`
- Also accepts the props of HTMLAttributes

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` (required) | `boolean` |  | Whether the content is shown. |
| `children` | `React.ReactNode` |  | Content that is revealed and hidden by the `open` prop. |
| `contentClassName` | `string` |  | Class names for the clipping wrapper around the children (put padding on a child inside, not here, or the closed state keeps it). |
| `fade` | `boolean` | `true` | Fade the content in and out while the height changes (default true). |
| `unmountOnExit` | `boolean` | `false` | Remove the children from the tree once the close transition has ended (and mount them again on open). |

## Notes

**When to use:** Opens and closes a block of your own content with a height animation from your own `open` state, with no measuring. For filter rows, wizard steps and expandable regions that have no built-in trigger.

**Use instead when:**
- `Collapsible`: a ready trigger, `aria-expanded` wiring and uncontrolled state
- `Accordion`: a group of sections with arrow-key navigation
- `Dialog`: content that should block the page

### Keyboard

Not focusable: no keyboard interaction. The trigger is yours; closed content is `inert`, so Tab skips everything inside it until it opens.

### Screen readers

`Collapse` adds no role, name or `aria-expanded`: put `aria-expanded` and `aria-controls` on your own trigger (pass an `id` to `Collapse` for it). The root carries `data-state="open"` or `"closed"`. Closed content is `inert`, which removes it from focus and the accessibility tree while it stays mounted (unless `unmountOnExit`). Nothing is announced when it opens.

### Reduced motion

The grid track animates from `0fr` to `1fr` with an opacity fade (`fade={false}` skips the fade). The reduced-motion net ends the transition in 1 ms, so the block still changes state, just at once; `transitionend` still fires, so `unmountOnExit` unmounts as usual.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API at render. A closed `Collapse` renders its children `inert` and collapsed, or nothing at all with `unmountOnExit`; an open one renders them. The first render is not animated.

### Slots

- `collapse`: the root grid that animates its rows
- `collapse-content`: the clipping wrapper around the children (`contentClassName`)

### Gotchas

- It is controlled only: `open` is required and there is no `onOpenChange`; drive it from your state, or use `Collapsible` for a trigger and uncontrolled state.
- Put padding on a child, not on `contentClassName`: padding on the clipping wrapper keeps its height when closed, so the block never reaches zero.
- `unmountOnExit` removes the children after the `grid-template-rows` transition ends, with a 600 ms timer as a fallback when no `transitionend` arrives (hidden tab, `display: none` ancestor). Reopening before that cancels the removal.
- Children stay mounted while closed by default, so effects, inputs and iframes inside keep running; use `unmountOnExit` to drop them.

## Example

```tsx
import * as React from "react";
import { Button, Collapse, Field, FieldLabel, Input } from "@cleanprompt/sutra-ui";

export function Example() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="max-w-sm">
      <Button variant="outline" aria-expanded={open} aria-controls="advanced-filters" onClick={() => setOpen(!open)}>
        {open ? "Hide filters" : "Show filters"}
      </Button>
      <Collapse id="advanced-filters" open={open}>
        <div className="pt-3">
          <Field>
            <FieldLabel>Assigned to</FieldLabel>
            <Input placeholder="Name or email" />
          </Field>
        </div>
      </Collapse>
    </div>
  );
}
```
