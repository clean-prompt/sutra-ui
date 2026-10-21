# AspectRatio

> Box that keeps a fixed width/height ratio for media and embeds.

- Import: `import { AspectRatio } from "@cleanprompt/sutra-ui"` (or from `@cleanprompt/sutra-ui/core`)
- Source: `packages/ui/src/primitives/aspect-ratio` (primitives)
- Also accepts the props of HTMLAttributes, PrimitivePropsWithRef

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `cover` | `boolean` | `true` | Make a direct img/video/iframe child fill the box with `object-cover`. |
| `framed` | `boolean` | `false` | Subtle muted background and border, useful as a placeholder frame. |
| `ratio` | `AspectRatioPreset \| number` | `"16/9"` | Preset like `"16/9"` or a number (width / height). Default 16/9. |
| `rounded` | `boolean` | `false` | Round the corners and clip content (`rounded-box`). |

## Notes

**When to use:** A box that keeps a fixed width-to-height ratio (a preset like `"16/9"` or a number) for images, video, embeds and placeholders, with optional rounded corners and frame.

**Use instead when:**
- `Frame`: a titled tray of rows
- `Carousel`: several slides
- `Card`: a content surface that grows with its content
- `Skeleton`: a loading placeholder with a set size

### Keyboard

Not focusable: no keyboard interaction.

### Screen readers

Adds no role or name: it is a plain `div` around its content. Give the image its `alt`, the video its controls and captions, and the iframe a `title`.

### Reduced motion

Static: no animation.

### Server rendering

Server render: same markup as the client. Plain markup with no browser API. The ratio is a padding-bottom on a wrapper (not measured in script), so the box has its final height on the first paint and the page does not jump when the media loads.

### Gotchas

- The width comes from the parent (`w-full`); the height follows from the ratio. `ratio` is a preset (`16/9`, `4/3`, `1/1`, `21/9`, `3/4`, `9/16`) or a number as width over height, default 16/9.
- Radix renders an outer wrapper and puts your `className`, `style` and other props on the inner box, which is absolutely positioned to fill it. Size and position the box through its parent, not with `className`.
- `cover` (default true) makes a direct `img` or `video` child fill the box with `object-cover` and an `iframe` child fill it; it does not reach images nested deeper.
- `rounded` clips the content to the box radius; `framed` adds a muted background and border, which suits a placeholder before the media loads.

## Example

```tsx
import { AspectRatio } from "@cleanprompt/sutra-ui";

export function Example() {
  return (
    <div className="w-72">
      <AspectRatio ratio="16/9" rounded framed>
        <img src="/images/lake.jpg" alt="Mountain lake at sunrise" />
      </AspectRatio>
    </div>
  );
}
```
