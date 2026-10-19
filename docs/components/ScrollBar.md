# ScrollBar

> Thin scrollbar track + thumb; rendered automatically by `ScrollArea`.

- Import: `import { ScrollBar } from "@sutra/ui"` (or from `@sutra/ui/core`)
- Source: `packages/ui/src/primitives/scroll-area` (primitives)
- Also accepts the props of HTMLAttributes, PrimitivePropsWithRef, ScrollAreaScrollbarProps, ScrollAreaScrollbarVisibleProps

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `thumbClassName` | `string` |  | Classes for the draggable thumb. |

## Notes

**When to use:** A scrolling region with thin overlay scrollbars that match the theme, optional edge fades and a ref to the viewport. Scrolling stays native (wheel, touch, keyboard). A plain `overflow-auto scrollbar-thin` element is enough when only a thin native scrollbar is needed.

**Use instead when:**
- `Carousel`: paged or snapping content that moves in steps

### Keyboard

No keys of its own and no tab stop: the viewport is the real scroller, so the browser's scrolling keys work whenever focus is inside it (on a focusable child, or on the viewport itself), and `ScrollArea` adds no `tabindex`. The custom scrollbars and thumbs are for the pointer only and are not focusable. Nothing swaps in RTL.

### Screen readers

Adds no role, name or state: the content reads in its normal order and the scrollbars are not exposed. Pass `aria-label` (it lands on the root) only when the region needs a name, and give a scroll region that holds no focusable content a way into the tab order yourself (for instance through `viewportRef`). The edge fades are a visual mask only.

### Reduced motion

The scrollbar fades in and out (`animate-in` and `animate-out` fades) and the thumb colour is a transition; the reduced-motion net ends the transitions in 1 ms and the fade stays. Scrolling itself is native and not affected. The scrollbar hides after Radix's `scrollHideDelay` of 600 ms, a timer.

### Server rendering

Server render: part of it fills in after mount. The server renders the root and the viewport with the content. With the default `type="hover"` the scrollbars do not exist until the pointer enters after mount, `fadeEdges` shows no fades until the edges are measured in an effect, and the root `dir` is read after mount (the server writes `ltr`), so the first server paint of an RTL page has `dir="ltr"` on the area.

### Gotchas

- Give it a bounded size: the root is `overflow-hidden`, so without a height (`className="h-64"`) or a `max-h` (`viewportClassName`) it grows with its content and nothing scrolls.
- `orientation` decides which axes scroll at all: Radix sets `overflow: hidden` on the axis without a scrollbar, so `orientation="vertical"` (the default) clips horizontal overflow and `"horizontal"` clips vertical overflow. Use `"both"` for two-way scrolling.
- Radix wraps the children in a `display: table; min-width: 100%` div, so long unbroken text or wide content widens the area (that is what makes horizontal scrolling work) instead of wrapping or truncating.
- `type` is a Radix prop (default `"hover"`; also `auto`, `always`, `scroll`). `viewportRef` is the element to `scrollTo` or attach scroll listeners to; the root `ref` is not the scroller. `fadeEdges` takes `true`, `"vertical"` or `"horizontal"` and fades only the edges that still have content beyond them.

## Example

```tsx
import { Button, ScrollArea } from "@sutra/ui";

const versions = Array.from({ length: 30 }, (_, i) => `v2.${30 - i}.0`);

export function Example({ onSelect }: { onSelect: (version: string) => void }) {
  return (
    <ScrollArea aria-label="Release history" fadeEdges="vertical" className="h-48 w-56 rounded-box border">
      <ul className="p-2">
        {versions.map((version) => (
          <li key={version}>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => onSelect(version)}>
              {version}
            </Button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
```
